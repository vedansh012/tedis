/**
 * TedIS load test — k6 (https://k6.io)
 *
 * Simulates realistic user journeys against the real tRPC + REST surface:
 *   signup → login → browse/scroll feed → open profiles/projects/posts →
 *   like/comment/share → create post → upload image/video → create project →
 *   search → follow → logout, with human-like think times.
 *
 * Ramps through 100 → 250 → 500 → 1000 concurrent VUs so you can watch where
 * latency/error-rate cliffs appear. Run one tier at a time with TARGET=250 etc,
 * or the full staged profile (default).
 *
 *   BASE_URL=https://staging.tedis.app k6 run scripts/load/k6-tedis.js
 *   TARGET=500 k6 run scripts/load/k6-tedis.js        # single plateau
 *
 * NOTE ON TRANSPORT: the app uses tRPC v11 httpBatchLink + superjson. Inputs are
 * wrapped as {"0":{"json": <input>}} and outputs unwrap from
 * [{"result":{"data":{"json": <output>}}}]. Mutations require the double-submit
 * CSRF header (x-csrf-token cookie echoed back) and a same-site Origin. This is a
 * realistic starting point — smoke-run it once (`TARGET=1 k6 run …`) and adjust
 * procedure names/inputs if the schema drifts.
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TRPC = `${BASE_URL}/api/trpc`;
const TARGET = __ENV.TARGET ? parseInt(__ENV.TARGET, 10) : null;

// ---- custom metrics -------------------------------------------------------
const feedLatency = new Trend("feed_latency", true);
const writeLatency = new Trend("write_latency", true);
const uploadLatency = new Trend("upload_latency", true);
const bizErrors = new Rate("business_errors");
const actions = new Counter("user_actions");

// ---- load profile ---------------------------------------------------------
const stagedProfile = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "1m", target: 100 }, { duration: "3m", target: 100 },
    { duration: "1m", target: 250 }, { duration: "3m", target: 250 },
    { duration: "1m", target: 500 }, { duration: "3m", target: 500 },
    { duration: "2m", target: 1000 }, { duration: "4m", target: 1000 },
    { duration: "2m", target: 0 },
  ],
  gracefulRampDown: "30s",
};
const flatProfile = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "1m", target: TARGET }, { duration: "5m", target: TARGET }, { duration: "1m", target: 0 },
  ],
};

export const options = {
  scenarios: { tedis: TARGET ? flatProfile : stagedProfile },
  thresholds: {
    http_req_failed: ["rate<0.02"],          // <2% transport errors
    business_errors: ["rate<0.05"],           // <5% app-level errors
    feed_latency: ["p(95)<800"],              // feed p95 under 800ms
    write_latency: ["p(95)<1500"],            // writes p95 under 1.5s
    http_req_duration: ["p(99)<3000"],
  },
};

// ---- tRPC helpers ---------------------------------------------------------
function commonHeaders() {
  // Same-site origin so the CSRF Origin/Sec-Fetch gate passes.
  return { "Content-Type": "application/json", Origin: BASE_URL, "Sec-Fetch-Site": "same-origin" };
}
function csrfHeader() {
  const jar = http.cookieJar();
  const c = jar.cookiesForURL(BASE_URL);
  return c["tedis_csrf"] ? { "x-csrf-token": c["tedis_csrf"][0] } : {};
}
function trpcQuery(proc, input) {
  const q = encodeURIComponent(JSON.stringify({ 0: { json: input ?? {} } }));
  const res = http.get(`${TRPC}/${proc}?batch=1&input=${q}`, { headers: commonHeaders(), tags: { proc } });
  return res;
}
function trpcMutation(proc, input) {
  const body = JSON.stringify({ 0: { json: input ?? {} } });
  const res = http.post(`${TRPC}/${proc}?batch=1`, body, {
    headers: { ...commonHeaders(), ...csrfHeader() },
    tags: { proc },
  });
  return res;
}
function ok(res) {
  const good = res.status === 200 && String(res.body).indexOf('"error"') === -1;
  bizErrors.add(!good);
  return good;
}
const think = () => sleep(randomIntBetween(1, 5)); // human pause 1–5s

// ---- a single virtual user's session -------------------------------------
export default function () {
  const uid = `${__VU}_${__ITER}_${Date.now()}`;
  const email = `load_${uid}@tedis.test`;
  const password = "LoadTest123!aA";

  // SIGN UP (or fall back to LOGIN on conflict)
  group("auth", () => {
    let r = trpcMutation("auth.register", {
      fullName: `Load User ${uid}`, username: `load_${__VU}_${__ITER}`.slice(0, 20), email, password,
    });
    if (!ok(r)) {
      r = trpcMutation("auth.login", { email, password });
      ok(r);
    }
    actions.add(1);
  });
  think();

  // BROWSE + SCROLL FEED (infinite scroll = repeated cursor pages)
  group("feed", () => {
    let cursor = null;
    for (let page = 0; page < randomIntBetween(2, 5); page++) {
      const r = trpcQuery("feed.home", { limit: 20, cursor });
      feedLatency.add(r.timings.duration);
      check(r, { "feed 200": (x) => x.status === 200 });
      ok(r);
      try {
        const data = JSON.parse(r.body)[0].result.data.json;
        cursor = data.nextCursor;
      } catch (_) { cursor = null; }
      actions.add(1);
      if (!cursor) break;
      sleep(randomIntBetween(2, 6)); // reading time between scrolls
    }
  });

  // OPEN A PROFILE, A PROJECT, A POST
  group("browse", () => {
    ok(trpcQuery("profile.byUsername", { username: "ada" })); think();
    ok(trpcQuery("project.list", { limit: 12 }));
    ok(trpcQuery("project.bySlug", { slug: "atlas-agents" }));
    ok(trpcQuery("project.timeline", { projectId: __ENV.SAMPLE_PROJECT_ID || "seed" }));
    actions.add(3);
  });
  think();

  // ENGAGE: like / comment / share  (needs a real post id; supply via env)
  const postId = __ENV.SAMPLE_POST_ID;
  if (postId) {
    group("engage", () => {
      ok(trpcMutation("feed.toggleReaction", { targetType: "POST", targetId: postId }));
      ok(trpcMutation("comment.add", { postId, body: `Nice work! ${uid}` }));
      ok(trpcMutation("feed.share", { postId, target: "COPY_LINK" }));
      ok(trpcMutation("feed.toggleBookmark", { targetType: "POST", targetId: postId }));
      actions.add(4);
    });
    think();
  }

  // CREATE A POST (20% of users), optionally attached to a project
  if (Math.random() < 0.2) {
    group("create_post", () => {
      const r = trpcMutation("feed.createPost", { body: `Shipping progress update ${uid} 🚀` });
      writeLatency.add(r.timings.duration);
      ok(r);
      actions.add(1);
    });
    think();
  }

  // UPLOAD IMAGE (10%) — hits the REST /api/upload route (multipart)
  if (Math.random() < 0.1) {
    group("upload", () => {
      // 60KB synthetic JPEG-ish payload; swap for open('image.jpg','b') for realism.
      const bytes = new Uint8Array(60 * 1024).fill(0xff);
      const r = http.post(`${BASE_URL}/api/upload`, { file: http.file(bytes.buffer, "load.jpg", "image/jpeg") },
        { headers: { ...csrfHeader(), Origin: BASE_URL }, tags: { proc: "upload" } });
      uploadLatency.add(r.timings.duration);
      bizErrors.add(r.status !== 200);
      actions.add(1);
    });
    think();
  }

  // CREATE PROJECT (5%)
  if (Math.random() < 0.05) {
    ok(trpcMutation("project.create", { name: `Load Project ${uid}`.slice(0, 60), status: "BUILDING" }));
    actions.add(1);
    think();
  }

  // SEARCH (every keystroke would be worse; here one settled query)
  group("search", () => {
    ok(trpcQuery("search.global", { query: "agent" }));
    actions.add(1);
  });
  think();

  // FOLLOW a person + a universe
  if (__ENV.SAMPLE_USER_ID) ok(trpcMutation("profile.follow", { userId: __ENV.SAMPLE_USER_ID }));
  ok(trpcQuery("notification.unreadCount", {}));

  // LOGOUT
  ok(trpcMutation("auth.logout", {}));
  think();
}
