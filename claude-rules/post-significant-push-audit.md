# post-significant-push-audit

# Post-Significant-Push Audit Rule

A CLAUDE.md instruction that forces Claude, immediately after a **significant** remote push, to run a two-step audit: (1) close documentation debt, then (2) surface improvement opportunities the work touched but did not act on.

This is the **post-push** counterpart to `github-push-warning.md` (the pre-push P9 gate). The two compose: pre-push warning gates the push itself; post-push audit gates the next step after.

## What it does

After Claude completes any command that writes commits to a remote (`git push`, `git push --force`, `gh pr create`, etc.), Claude evaluates whether the push qualifies as a **significant change** (criteria below). If it does, Claude runs the two-step audit in the **same response** that confirms the push, before moving on.

### Step 1 — Documentation debt (y/n gate)

Claude asks, verbatim:

> The push is on the wire. Before moving on:
>
> Ratify project docs/plans against what we just shipped — `tasks/todo.md`, design docs, `04-development/*-implementation-plan.md`, roadmap entries, ADRs, README, CHANGELOG?
>
> (y/n)

- `y` → propose specific files + sections; wait for confirmation before editing.
- `n` → proceed to Step 2. **Declining Step 1 does not skip Step 2.**

### Step 2 — Improvement-opportunity sweep (F-CHECK-EFF)

Claude reviews the just-pushed change set and surfaces alternatives that, with reasonable diligence, could improve any project failure metric (efficiency / cost / throughput / miss-rate / security / gap-fill) by an estimated **≥ 20 %**. Per item:

```
- [one-line description] — F-METRIC, ~N% gain — bundle | defer (reason)
```

**Bundle vs defer:** lean *bundle* if same files / subsystem and < ~30 % LOC; lean *defer* if it introduces a new failure surface, needs its own AC/test design, or expands scope past the just-merged review window.

- Items found → offer to file as the **next todo** (current plan's "Follow-ups discovered during this task" section, or a new roadmap entry).
- None → say so explicitly in one line. **Silence is itself the failure.**

## When the rule applies — significance gate

Fires if **any** of:

- Multi-file refactor, subsystem rewrite, or architectural change.
- Push closed out a written plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, design or brainstorm spec).
- Push ships a kill-switch flip, default-on flip, or production-bake closure.
- Push adds or substantively changes a skill, rule, or shipped feature.

Does **not** fire on:

- Single-file < 20 LOC hotfixes.
- Single-line bug fixes, typo / copy edits, version bumps.
- Single-paragraph doc edits.
- Mechanical chores (lint, formatting, dead-code removal already greenlit).

**Borderline → run the audit anyway.** Over-checking is preferred to silently passing.

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist).

```markdown
## Post-Significant-Push Audit

After any successful remote push (`git push`, `gh pr create`, etc.) of a **significant change**, run a two-step audit in the same response that confirms the push, before moving on.

**Significance gate — fires if any of:**
- Multi-file refactor, subsystem rewrite, or architectural change.
- Push closed out a written plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, design or brainstorm spec).
- Push ships a kill-switch flip, default-on flip, or bake closure.
- Push adds or substantively changes a skill, rule, or shipped feature.

**Does NOT fire** on single-file < 20 LOC hotfixes, typo / copy edits, version bumps, single-paragraph doc edits, or mechanical chores. **Borderline → run anyway.**

**Step 1 — Doc-debt y/n gate. Ask, verbatim:**

> The push is on the wire. Before moving on:
>
> Ratify project docs/plans against what we just shipped — `tasks/todo.md`, design docs, `04-development/*-implementation-plan.md`, roadmap entries, ADRs, README, CHANGELOG?
>
> (y/n)

- `y` → propose specific files + sections; wait for confirmation before editing.
- `n` → proceed to Step 2. **Declining Step 1 does NOT skip Step 2.**

**Step 2 — Improvement-opportunity sweep (F-CHECK-EFF):**

Review the just-pushed change set. Surface alternatives that, with reasonable diligence, could improve any project failure metric (efficiency / cost / throughput / miss-rate / security / gap-fill) by an estimated **≥ 20 %**. Per item, one line:

`- [one-liner] — F-METRIC, ~N% gain — bundle | defer (reason)`

Bundle if same files/subsystem and < ~30 % LOC; defer if it adds a new failure surface or needs its own AC/test design.

- Items found → offer to file as the **next todo** (current plan's "Follow-ups discovered during this task" section, or a new roadmap entry). Wait for y/n.
- None → say so in one line. **Silence is itself the failure.**
```

## Notes

- This is a CLAUDE.md instruction rule, not a Claude Code skill — it lives in your global config, not in `~/.claude/skills/`.
- Applies in every project directory where the global CLAUDE.md is loaded.
- It is a **post-push** rule. Pre-push confirmation (P9 / `github-push-warning.md`) is a separate rule that runs **before** the push.
- The improvement-opportunity step uses the same threshold as the global `F-CHECK-EFF` rule (`claude-rules/f-check-eff.md`): silently passing on a ≥ 20 % gain is the failure, not the bundle-vs-defer judgement call.
- The Step 1 y/n is intentional. It forces an explicit operator decision and prevents Claude from drifting into uncontrolled doc edits. A `n` answer does NOT skip Step 2.
- One-time authorizations ("skip audit this once") do not grant standing permission for future pushes.
