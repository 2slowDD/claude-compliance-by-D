# F-CHECK-EFF — Improvement Opportunity Surfacing

A CLAUDE.md instruction that applies to **every project**. When executing a **bigger change**, an agent must surface any alternative approach that could improve a project failure metric (efficiency / cost / throughput / miss-rate / security / gap-fill) by an estimated **≥ 20 %**. Shipping the original without flagging the alternative is the failure — even when the alternative isn't acted on.

This is the global counterpart to the per-task discipline historically tracked as `F-CHECK-EFF` inside individual project specs. Composes with rule 9 (`post-significant-push-audit.md`): post-push uses the same threshold for its post-merge sweep.

## When the rule fires — significance gate

Any of:

- New phases, sub-specs, brainstorm specs, or architectural changes.
- Multi-file refactors or subsystem rewrites.
- Tasks carrying a written plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, design / brainstorm spec).
- Reviews of bigger changes (PR review, design-doc review, spec ratification).

## Does NOT fire on

- Single-line fixes, typo / copy edits, version bumps.
- Single-file isolated patches that don't touch architectural surface.
- Doc-only edits scoped to one paragraph / section.
- Mechanical chores (lint, formatting, greenlit dead-code removal).

**Borderline → run the check anyway.** Over-flagging beats silent passing.

## Two shapes

1. **In-scope detour** (≥ 20 % gain on the *current task's primary* failure metric) — pause, surface the alternative, ask whether to bundle into this task.
2. **Out-of-scope flag** (≥ 20 % gain on a *different* failure metric) — append as a follow-up to the current plan's "Follow-ups discovered during this task" section, or defer to a future spec. If uncertain which fits, ask.

## Threshold

"≥ 20 %" is a **discipline floor**, not a measured gate. Estimate using project signals (proxy rates, wall-clock budgets, error rates, throughput, cost). When the estimate is uncertain, **surface anyway** — one extra operator decision is cheaper than an unflagged improvement nobody re-discovers.

## Bundling vs deferring

| Signal | Lean bundle | Lean defer |
|---|---|---|
| Same files / subsystem as current task | ✅ | |
| Adds < ~30 % LOC vs current task | ✅ | |
| New failure-mode surface area | | ✅ |
| Needs its own AC / test design pass | | ✅ |
| Expands scope past current PR's review window | | ✅ |
| Operator hasn't ratified scope expansion | | ✅ |

**Tolerance:** zero on the *flagging* obligation. Bundling vs deferring is a judgement call. **Silent passing is the failure.**

## Operational signal — process detector

Every plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, brainstorm specs) carries an explicit **"Follow-ups discovered during this task"** section, populated as work proceeds (not backfilled at the end). Absent on a multi-step task is itself the trip — same enforcement model as `F-SECURITY`: review-time, not runtime.

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist).

````markdown
## F-CHECK-EFF — Improvement Opportunity Surfacing

While executing a **bigger change**, surface any alternative approach that could improve a project failure metric (efficiency / cost / throughput / miss-rate / security / gap-fill) by an estimated **≥ 20 %**. Silently shipping the original is the failure.

**Significance gate — fires if any of:**
- New phases, sub-specs, brainstorm specs, or architectural changes.
- Multi-file refactors or subsystem rewrites.
- Tasks carrying a written plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, design / brainstorm spec).
- Reviews of bigger changes (PR review, design-doc review, spec ratification).

**Does NOT fire** on single-line fixes, typo / copy edits, version bumps, single-file isolated patches, single-paragraph doc edits, or mechanical chores. **Borderline → run anyway.**

**Two shapes:**
- **In-scope detour** (≥ 20 % on the *current task's primary* metric) — pause, surface, ask whether to bundle.
- **Out-of-scope flag** (≥ 20 % on a *different* metric) — append to the current plan's "Follow-ups discovered during this task" section, or defer to a future spec. If unsure which fits, ask.

**Threshold:** ≥ 20 % is a discipline floor, not a measured gate. Estimate from project signals. When uncertain, surface anyway.

**Operational signal:** every plan carries a **"Follow-ups discovered during this task"** section, populated as work proceeds. Absent on a multi-step task = trip.

**Tolerance:** zero on the flagging obligation. Bundling vs deferring is a judgement call. **Silent passing is the failure.**
````
