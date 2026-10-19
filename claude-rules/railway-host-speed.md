# Railway Host Speed Rule

A CLAUDE.md instruction that makes host speed a first-class fact for a worker running on Railway's shared hosts: bench the live host after every deployment and on a daily schedule, flag a slow host wherever a scan read shows one, and pre-authorize one narrow remedy — same-build redeploys through the `d-railway-speed` gate — while every other Railway write stays confirm-gated.

## Why

Shared hosts differ ×2–3 in CPU speed between deployments and degrade within one as other tenants load the box. A slow host produces slower captures, starved time budgets and fewer results — exactly the shape of a code regression or a failed bake. Without a number taken from inside the container, agents argue about code while the cause is the box.

## What it does

- After every deployment of the worker and once every 24 h, the agent runs `/d-railway-speed` (the companion skill) and pastes its one-line result in chat; the skill appends the sample to the records.
- Whenever a scan read itself shows a slow host, the agent says so in the first line of that read, bench or not.
- `/d-railway-speed gate` is pre-authorized for same-build redeploys only, up to a configured number of tries per run (default 5), after an in-flight-job guard, reporting which attempt satisfied. A run fires after every real deployment and on the daily check when the bench reads SLOW; if none satisfies, the agent stays on the last host and records the retry time. Every other Railway write (variables, image deploys, restarts) stays behind an explicit confirmation.
- The verdict is relative — "better half of the deployments seen so far" — because "slow" is only known from accumulated data.

## How to install

Install the `d-railway-speed` and `d-show-host` skills first (see `skills/`). Then add this block to your global `~/.claude/CLAUDE.md`, adjusting the record paths to the ones in your `config.json`:

```markdown
## Railway Host Speed

Railway's shared hosts differ ×2–3 in CPU speed per deployment and degrade within one; a slow host looks like a code regression or a failed bake.

- **Bench after EVERY deployment** of the worker (right after the build-stamp read-back) and **once every 24 h**: `/d-railway-speed` (10 s, read-only on Railway). Paste its one `host bench — …` line in chat; the script appends the sample to the record. `/d-show-host` = the table read-out.
- **Always flag a slow host in the FIRST line of a scan read** when the scan itself shows it (unchanged-code capture clocks ×2 per 1 000 px, a time budget exhausted before the work ran) — bench or not.
- **The gate (`/d-railway-speed gate`) is pre-authorized for same-build redeploys ONLY** (`railway redeploy -y`; in-flight-job guard first; max 5 tries per run; report which attempt satisfied). A run fires after every real deployment (those tries do not count against the 24-h check and reset its clock) and on the 24-h check when the bench reads SLOW; none satisfied ⇒ stay on the last host, retry at the next 24-h check and write the due time into the record. Every OTHER Railway write stays confirm-gated.
- The verdict is relative (median of per-deployment best scores once ≥ 4 deployments are sampled; CALIBRATING before) — "slow" is only known from data.
```

## Notes

- A CLAUDE.md instruction rule plus two skills; the rule sets the cadence and the authorization boundary, the skills do the measuring.
- A session timer does not survive the session: the 24-h retry is written into the record so the next agent runs it.
- A redeploy lands whatever box the platform picks and cannot return to an earlier one, so the gate stops at the first FAST host rather than hunting for the fastest.
