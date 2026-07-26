# TedIS load tests

Two equivalent load generators drive the real tRPC + `/api/upload` surface with
realistic user journeys and human think times.

| Tool | File | Use when |
|---|---|---|
| **k6** (primary) | `k6-tedis.js` | CI gates, pass/fail thresholds, cheap high-VU runs |
| **Locust** | `locustfile.py` | live web UI, distributed swarm, Python fixtures |

Not generated (and why): **Artillery** overlaps k6 with no gain here; **Playwright**
load = real browsers, only worth it to measure client render/JS cost, not backend
throughput — reach for it once the API bottlenecks below are fixed.

## Run

```bash
# staged ramp 100 → 250 → 500 → 1000
BASE_URL=https://staging.tedis.app k6 run scripts/load/k6-tedis.js

# single plateau
TARGET=500 BASE_URL=https://staging.tedis.app k6 run scripts/load/k6-tedis.js

# smoke-run once to validate the tRPC envelope before a real test
TARGET=1 k6 run scripts/load/k6-tedis.js

# Locust (web UI on :8089)
locust -f scripts/load/locustfile.py --host https://staging.tedis.app
```

Optional fixtures make more journeys fire (engagement, follow):
`SAMPLE_POST_ID`, `SAMPLE_PROJECT_ID`, `SAMPLE_USER_ID`.

## Before you trust the numbers

1. **Run against a staging replica of prod infra**, never a dev laptop — Postgres
   `connection_limit`, CPU cores, and object storage dominate the result.
2. **Seed realistic volume first** (≥1M posts, ≥100k users, ≥500 projects, some
   projects with 1k+ posts) so index/seq-scan behavior is real. A load test on an
   empty DB is meaningless.
3. Watch Postgres `pg_stat_activity` (active/waiting connections), CPU, and app
   RSS during the run — the failure modes predicted in the report are all
   observable there.
