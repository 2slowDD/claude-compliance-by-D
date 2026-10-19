---
name: d-show-host
description: Use when the operator invokes `/d-show-host`, or asks to see the current Railway worker host (CPU model, cores, load, speed) without a verdict discussion — a read-out of where the worker is running right now.
---

# Show host

## Overview

A read-out of the Railway worker's current box: which deployment, which CPU, how crowded, how fast. It runs the `d-railway-speed` bench (10 s, read-only on Railway) so the numbers are current, then shows them as a table with the recent trend. No gate, no redeploy, no cadence rules — those live in `d-railway-speed`.

**REQUIRED:** the `d-railway-speed` skill installed and configured (`scripts/config.json`).

## Command

```
node "<d-railway-speed skill dir>/scripts/bench-now.mjs" --note "operator /d-show-host"
```

Then read the samples file named in `config.json` (`samples_json`): a flat JSON array, one object per bench, `ts` in UTC (`deployed_at` carries its own offset).

## The reply IS this table, nothing before it

| field | value |
|---|---|
| deployment | short id · status · deployed at (as stored, with its offset) |
| build | `commit_short` |
| CPU | model · `nproc` cores |
| load (1 min) | `load1` on `nproc` cores → "quiet" < 0.5 × cores, "busy" 0.5–1 ×, "crowded" > 1 × |
| speed | `CPU loop N ms` (min of 3) |
| verdict | FAST / SLOW / CALIBRATING + the whole final parenthesis after `⇒` (rule and slow reference) |

Below it, up to 3 trend lines, newest first, all times in UTC and labelled so: `when UTC · deployment · CPU loop ms · load (quiet/busy/crowded) · verdict`. Pick them so they show change, not repetition: the newest earlier sample of the current deployment that is ≥ 30 min older than this bench, then the newest sample of each earlier deployment. Skip samples minutes apart from one another.

If the bench fails, show the script's error line and stop.
