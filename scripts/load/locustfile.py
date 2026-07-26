"""
TedIS load test — Locust (https://locust.io). Alternative to k6-tedis.js.

Use Locust when you want a distributed swarm with a live web UI and Python-side
logic (e.g. reading real fixtures, complex branching). k6 is better for CI
thresholds and CPU efficiency; both drive the same tRPC surface.

    locust -f scripts/load/locustfile.py --host https://staging.tedis.app
    # then open http://localhost:8089 and ramp users to 100 / 250 / 500 / 1000

tRPC v11 + superjson envelope: input -> {"0":{"json": <input>}}; output unwraps
from [{"result":{"data":{"json": <output>}}}]. Mutations need the x-csrf-token
header (echo of the tedis_csrf cookie) and a same-site Origin.
"""
import json
import random
import time
from locust import HttpUser, task, between


def _wrap(inp):
    return {"0": {"json": inp or {}}}


class TedisUser(HttpUser):
    # Human think time between actions.
    wait_time = between(1, 5)

    def on_start(self):
        uid = f"{int(time.time()*1000)}_{random.randint(0, 1_000_000)}"
        self.email = f"load_{uid}@tedis.test"
        self.password = "LoadTest123!aA"
        self.username = f"load_{uid}"[:20]
        self._origin = self.host
        r = self._mutation("auth.register", {
            "fullName": f"Load {uid}", "username": self.username,
            "email": self.email, "password": self.password,
        })
        if r.status_code != 200 or '"error"' in r.text:
            self._mutation("auth.login", {"email": self.email, "password": self.password})

    # ---- tRPC helpers ----
    def _headers(self, mutation=False):
        h = {"Content-Type": "application/json", "Origin": self._origin, "Sec-Fetch-Site": "same-origin"}
        if mutation:
            csrf = self.client.cookies.get("tedis_csrf")
            if csrf:
                h["x-csrf-token"] = csrf
        return h

    def _query(self, proc, inp=None):
        q = json.dumps(_wrap(inp))
        return self.client.get(f"/api/trpc/{proc}?batch=1&input={q}", headers=self._headers(), name=proc)

    def _mutation(self, proc, inp=None):
        return self.client.post(f"/api/trpc/{proc}?batch=1", data=json.dumps(_wrap(inp)),
                                headers=self._headers(mutation=True), name=proc)

    # ---- weighted tasks (higher weight = more frequent) ----
    @task(20)
    def browse_feed(self):
        cursor = None
        for _ in range(random.randint(2, 5)):
            r = self._query("feed.home", {"limit": 20, "cursor": cursor})
            try:
                cursor = r.json()[0]["result"]["data"]["json"]["nextCursor"]
            except Exception:
                cursor = None
            if not cursor:
                break
            time.sleep(random.uniform(2, 6))

    @task(8)
    def open_project(self):
        self._query("project.list", {"limit": 12})
        self._query("project.bySlug", {"slug": "atlas-agents"})

    @task(6)
    def open_profile(self):
        self._query("profile.byUsername", {"username": "ada"})

    @task(6)
    def search(self):
        self._query("search.global", {"query": random.choice(["agent", "ai", "cloud", "spec"])})

    @task(3)
    def create_post(self):
        self._mutation("feed.createPost", {"body": f"Update {random.randint(0, 99999)} 🚀"})

    @task(1)
    def create_project(self):
        self._mutation("project.create", {"name": f"Load Project {random.randint(0, 99999)}", "status": "BUILDING"})

    @task(2)
    def notifications(self):
        self._query("notification.unreadCount", {})
