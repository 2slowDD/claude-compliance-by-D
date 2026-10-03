# post-significant-push-audit

# Post-Significant-Push Audit Rule

A CLAUDE.md instruction that makes Claude, immediately after **any** remote push, open with a plain summary of what shipped, how it helps the project, and what to scan / test. After a **significant** push it then runs a two-step audit: (1) close documentation debt, then (2) surface improvement opportunities the work touched but did not act on.

This is the **post-push** counterpart to `github-push-warning.md` (the pre-push P9 gate). The two compose: pre-push warning gates the push itself; post-push audit gates the next step after.

## What it does

After Claude completes any command that writes commits to a remote (`git push`, `git push --force`, `gh pr create`, etc.), the response that confirms the push opens with the Step 0 push summary — on **every** push. Claude then evaluates whether the push qualifies as a **significant change** (criteria below). If it does, Claude runs Steps 1–2 in the **same response**, before moving on.

### Step 0 — Plain push summary (every push)

Not gated by significance. Plain language: no jargon, and no codename without a short gloss. Three labelled parts:

1. **What we pushed** — repo, branch, short SHA(s); one plain sentence per logical change saying what it does, not how it is coded.
2. **How it helps the project** — each change tied to the project's goal (the ledger's active row, else the README / spec framing, naming which), the failure metric it moves if any, and whether the gain is **measured** (with the test / bake / scan cited) or **expected** (not yet seen live). A chore says `no direct benefit — <why it was needed>`.
3. **What to scan / test** — if the change is not live until a deploy, release or rebuild, that comes first and the checks are listed as post-deploy. URLs go one code block per scan, one bare URL per line, nothing else on the line: scanner-added parameters (`nowprocket`, `nowpcu`, `perfmattersoff`, `LSCWP_CTRL`) are stripped, every other query string is kept, and a line above each block says what to look for and what pass vs fail looks like. Non-URL checks (admin screen, log pull, test command) follow as a short list. URLs are never invented — they come from the session's evidence (bug report, repro site, scans run); when the right pages are unknown, Claude names the kind of page to test and asks. Nothing to test → one line saying so and why.

A trivial push gets one line per part.

### Step 1 — Documentation debt (y/n gate)

**Skipped-debt sweep first.** Before asking the y/n question below, scan the current session transcript for any line matching `[doc-debt: skipped — <reason>]` emitted by a P9 Step 2 invocation in this session. If one or more such lines exist, the y/n question below is **not optional**: answer `y` and treat the named skipped debt as the explicit set of files to ratify. If no skipped-debt line is found, the y/n question runs as written (operator may answer `y`, `n`, or `n — closed pre-push by P9 Step 2`).

**Implementation assumption (transcript scan).** "Scan the current session transcript" assumes the agent can grep its own active session content. For agents where prior turns may be summarized away, the absence of a confirmed `[doc-debt: skipped — ...]` line is treated as "no skipped debt this session" and the existing y/n question runs as before — no regression vs. the pre-amend behavior.

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

Applies to Steps 1–2 only; Step 0 runs on every push. Fires if **any** of:

- Multi-file refactor, subsystem rewrite, or architectural change.
- Push closed out a written plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, design or brainstorm spec).
- Push ships a kill-switch flip, default-on flip, or production-bake closure.
- Push adds or substantively changes a skill, rule, or shipped feature.

Does **not** fire on:

- Single-file < 20 LOC hotfixes.
- Single-line bug fixes, typo / copy edits, version bumps.
- Single-paragraph doc edits.
- Mechanical chores (lint, formatting, dead-code removal already greenlit).
- UI / admin-page rendering / observability / telemetry-channel pushes that do not touch scan rule generation, scan pipeline behavior, customer-facing scan results, or scan-credit accounting — for these, Step 2 is N/A (the F-* yardstick is scan-pipeline-scoped) but Step 1 still fires.

**Borderline → run the audit anyway.** Over-checking is preferred to silently passing.

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist).

```markdown
## Post-Significant-Push Audit

After **any** successful remote push (`git push`, `gh pr create`, etc.), open the response that confirms the push with the **Step 0 push summary**, on every push, significant or not. If the push is a **significant change**, Steps 1–2 follow in that same response, before moving on.

**Significance gate (Steps 1–2 only — Step 0 always runs) — fires if any of:**
- Multi-file refactor, subsystem rewrite, or architectural change.
- Push closed out a written plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, design or brainstorm spec).
- Push ships a kill-switch flip, default-on flip, or bake closure.
- Push adds or substantively changes a skill, rule, or shipped feature.

**Does NOT fire** on single-file < 20 LOC hotfixes, typo / copy edits, version bumps, single-paragraph doc edits, or mechanical chores. **Also does NOT fire** on UI / admin-page rendering / observability / telemetry-channel pushes that do NOT touch scan rule generation, scan pipeline behavior, customer-facing scan results, or scan-credit accounting. Step 2 F-CHECK-EFF sweep is N/A for those (F-* yardstick is scan-pipeline-scoped); Step 1 doc-debt gate still fires normally. **Borderline → run anyway.**

**Step 0 — Plain push summary (every push, before Step 1).** Plain language: no jargon, no codename without a short gloss. Three labelled parts:

1. **What we pushed** — repo, branch, short SHA(s); one plain sentence per logical change saying what it does, not how it is coded.
2. **How it helps the project** — tie each change to the project's goal (the ledger's active row, else the README / spec framing — say which). Name the F-metric it moves, if any. Say whether the gain is **measured** (cite the test / bake / scan) or **expected** (⚠️ — not yet seen live). A chore says `no direct benefit — <why it was needed>`.
3. **What to scan / test:**
   - **Not live yet?** If the change needs a deploy, release or rebuild before it can be seen, say so first and list the checks as post-deploy.
   - **URLs** — one code block per scan, one bare URL per line, nothing else on the line. Strip `nowprocket`, `nowpcu`, `perfmattersoff`, `LSCWP_CTRL` (the scanner adds them); keep every other query string. Above each block, one line: what to look for, and what pass vs fail looks like.
   - **Other checks** (admin screen, log pull, test command) — a short list.
   - **Never invent a URL** — take it from this session's evidence (bug report, repro site, scans run, corpus `page_url`). Right pages unknown → say what kind of page to test and ask.
   - Nothing to test → one line saying so and why.

Keep it short: a trivial push gets one line per part.

**Step 1 — Doc-debt y/n gate.**

**Skipped-debt sweep first.** Before asking the y/n question below, scan the current session transcript for any line matching `[doc-debt: skipped — <reason>]` emitted by a P9 Step 2 invocation in this session. If one or more such lines exist, the y/n question below is **not optional**: answer `y` and treat the named skipped debt as the explicit set of files to ratify. If no skipped-debt line is found, the y/n question runs as written.

**Implementation assumption (transcript scan).** Assumes the agent can grep its own active session content. For context-managed agents where prior turns may be summarized away, the absence of a confirmed `[doc-debt: skipped — ...]` line is treated as "no skipped debt this session" and the existing y/n question runs as before — no regression vs. the pre-amend behavior.

Ask, verbatim:

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
- **Composition with P9 (`github-push-warning.md`).** P9's Step 2 closes doc-debt **before** the push for `2slowDD/*`-style remotes. The "Skipped-debt sweep first." lead in Step 1 above is the backward-link: when P9 Step 2 was bypassed via `skip doc-debt: <reason>`, the skipped debt is named in this session as `[doc-debt: skipped — ...]` and gets closed at this gate instead. For non-`2slowDD` remotes (where P9 does not apply), Step 1 runs as the existing y/n gate. The "Skipped-debt sweep first." mechanism is documented in spec `docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design.md` §4.6.
