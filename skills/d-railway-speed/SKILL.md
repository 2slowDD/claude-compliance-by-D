---
name: d-railway-speed
description: Use when the operator asks how fast or slow the Railway worker's host is, right after any Railway deployment or redeploy of the worker, when scan timings look slower than usual (long captures, bisect starved at its deadline, "is it the code or the host?"), on the daily host check, or when `/d-railway-speed` is invoked.
---

# Railway host speed

## Overview

Shared Railway hosts differ ×2–3 in CPU speed between deployments and degrade within one as other tenants load the box. A slow host looks exactly like a code regression or a failed bake. A 10-second benchmark inside the live container settles "host or code" before any scan is read; a same-build redeploy rolls the dice for a faster box.

## Setup (once per machine)

Railway CLI logged in and `railway ssh` working for the service. Copy `scripts/config.example.json` to `scripts/config.json` and fill in the linked repo dir, service name and record paths. `config.json` is local — never commit it.

## `/d-railway-speed` — the check (read-only on Railway)

```
node "<this skill dir>/scripts/bench-now.mjs" --note "<trigger: after deploy <id> | daily check | operator on-demand | scan <id> looked slow>"
```

**The reply IS this, in this order:**

1. If the verdict is SLOW and the operator is running scans (ask, or read the log tail: last `job_start` newer than last `job.summary`): one line `⚠️ SLOW HOST — ` then the printed `host bench — …` line verbatim. Otherwise the `host bench — …` line verbatim is line 1.
2. One sentence naming the rule from the final parentheses after `⇒`. `slow ref N ms` there is the historical slowest-host anchor for scale, not a threshold.
3. On SLOW: offer `/d-railway-speed gate`. On CALIBRATING: say how many deployments are sampled and that no verdict exists yet. On a script failure: paste its error line and stop — no verdict.

The script appends the sample to the machine record and the human log; that append is the record, nothing else to write.

**Cadence:** after every real deployment (right after the build-stamp read-back), once every 24 h, and on demand. When a scan read itself shows a slow host (unchanged-code capture clocks ×2 per 1 000 px, bisect ending at `worker_deadline_imminent` with 0 rounds), say so in that read's first line, bench or not.

## `/d-railway-speed gate` — redeploy until fast (production writes)

Only under the operator's explicit standing authorization for this gate. Redeploys interrupt a running job; everything on Railway outside this gate stays confirm-gated.

```
node "<this skill dir>/scripts/gate.mjs" --note "<trigger>"      # --dry-run: bench + decide, no redeploy
```

It waits while a job is in flight, benches, and while the verdict is not FAST runs `railway redeploy -y` (same build — the stamp is read back; a change aborts), up to `max_redeploys_per_run` tries. It prints an attempt table and **which attempt satisfied**. It cannot return to an earlier box, so it stops at the first FAST host; if none satisfies it stays on the last host and prints the retry due time. A run fires after every real deployment (those tries do not count against the daily check and reset its clock) and on the daily check when the bench reads SLOW.

## Reading the numbers

| field | meaning |
|---|---|
| `CPU loop N ms` | min of 3 single-thread loops; lower = faster; same-host noise ≈ 2 % |
| `load L on C cores` | the box's 1-min load average — how crowded the host is |
| verdict | a CPU model matching `slow_cpu_models` (default `["Icelake"]` — the generic hypervisor string of rented cloud-burst capacity) is SLOW whatever the score; otherwise FAST = at or below the median of per-deployment best scores (needs `min_deployments_for_median` deployments), SLOW above, CALIBRATING before |
| `capture_ms_per_kpx` | fill by hand from a real scan's unchanged-code capture clocks per 1 000 px, one pair per accepted host — the pairs make the bench trustworthy |

## Common mistakes

- `node -e "<code>"` through `railway ssh` — the relay strips quotes; the script pipes `hostbench.js` on stdin.
- Reading the build stamp from the tail after a few scans — it has rolled out; the script reuses an earlier sample of the same deployment.
- Redeploying with a job in flight — the guard exists for this; never bypass it.
- Treating a slow bench as a code verdict — it is a host verdict; a regression claim still needs the local interleaved A/B.
