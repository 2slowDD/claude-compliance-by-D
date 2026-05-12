---
name: d-focus-tasks
description: Use when committing work, reconciling remote-only commits, preparing or receiving handovers, approving plans/specs/architecture changes, or when a fresh agent needs current project task context.
---

# d-focus-tasks

Keep a lightweight project ledger at `docs/product-docs/master-tasks.md` so fresh agents can recover current tasks, commits, plans, followups, and handover state without reading the whole repo.

## Triggers

Run this skill after:
- A successful local commit.
- A remote-only commit/push if its SHA is not already logged.
- Every handover, before writing the handover prompt.
- Approval of any plan, spec, architectural change, or material followup.
- Fresh-agent start when the user points to this skill or ledger.

This skill updates local files only. It does not push, publish, deploy, or open PRs.

## Mandatory Project / Global Rule

Install this rule in project instructions (`AGENTS.md`, `CLAUDE.md`) and/or global agent instructions so the operator does not need to invoke the skill manually:

```markdown
## Focus Tasks Ledger

After every successful local commit, remote-only commit reconciliation, approved plan/spec/architecture change, and before every handover, run the `d-focus-tasks` skill and update `docs/product-docs/master-tasks.md`.

- Do not wait for the operator to invoke `d-focus-tasks`.
- If `master-tasks.md` is missing, ask whether to scan the current project and create a populated ledger or start with a blank ledger.
- For local commits, record the short SHA, date, task/source, purpose, status, and next action.
- For remote-only commits, check for the SHA first; add it only if it is not already logged.
- For handovers without a commit, record uncommitted followups with `commit: none yet`, then update that same row when a commit lands.
- Every handover prompt must point the fresh agent to `docs/product-docs/master-tasks.md` and name the current top active row.
```

## Locate or Create

Use the explicit ledger path if provided. Otherwise use `docs/product-docs/master-tasks.md` under the current project root.

If the ledger is missing, ask once:

```text
master-tasks.md is missing. Should I scan the current project and create a populated ledger, or start with a blank ledger?
```

Then follow the operator answer.

## Update Rules

- Deduplicate by full commit SHA first, then linked plan/spec path.
- Local commit: add/update the matching task with date, short SHA, purpose, status, and next action.
- Remote-only commit: check the ledger first; add it only if no matching SHA exists.
- Handover with no commit: record `commit: none yet`, status `active`, `followup`, or `pending decision`; later update the same row when committed.
- Do not paste long specs. Link paths and summarize in one short purpose sentence.
- Preserve progression from start to finish, but archive stale detail into compact completed/deferred rows.

## Scope Calibration

Do not undershoot large projects. If the project has multiple repos/plugins, subagents, sub-specs, phase numbers, handover chains, or more than about 20 dated plans/specs, create a fuller ledger rather than a short todo list.

For large projects, include:
- A phase/sub-spec decoder near the top when names overlap (`Sub-spec A` vs `Phase A`, `Phase 2` in separate workstreams, etc.).
- A current-work queue with the top active row first.
- A major milestone spine, newest first, bolding foundational stepstones.
- A dedicated section for major subagents/sub-specs/MVP lanes.
- A roadmap section for the current phase family when the project has numbered phases.
- A complete but compact plan/spec register, newest first, linking primary docs and avoiding duplicate review rows unless the verdict matters.
- Dirty/uncommitted state when it affects handover or followup work.

Keep it lightweight by summarizing each row in one sentence and linking details. A large project ledger may be 100-250 lines if that is what prevents context loss.

## Ledger Shape

Keep these base sections, expanding with Scope Calibration when needed:

1. Fresh-agent start: project root, how to use the file, current next step.
2. Active / next tasks.
3. Approved plans/specs awaiting implementation.
4. Followups and pending decisions.
5. Completed / committed progression.
6. Deferred / canceled.
7. Commit ledger.
8. Handover notes.

Use compact rows:

```markdown
| Status | Date | Task | Source | Commit | Purpose | Next |
|---|---:|---|---|---|---|---|
| active | 2026-05-12 | Example | `docs/...plan.md` | none yet | One sentence. | Next action. |
```

## Handover Rule

Every handover must point the fresh agent to the ledger path and mention the current top active row. If you discover uncommitted followups during handover, update the ledger before handing off.
