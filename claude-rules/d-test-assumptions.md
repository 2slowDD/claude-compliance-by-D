# d-test-assumptions

# Assumption Testing & Verification Discipline Rule

A CLAUDE.md instruction that pairs with the `d-test-assumptions` skill. It makes the skill auto-fire at two points: **before locking in a non-trivial approach** (test the assumptions behind it instead of guessing), and **after implementing an easily-verifiable code segment** (quick-test it against spec, pause-and-rethink on mismatch).

This is the **active** counterpart to the `d-assumption.md` rule. `d-assumption` *labels* claims (⚠️ Assumption / 🟢 CONFIRMED); `d-test-assumptions` *acts* on the ⚠️ labels — it drives them to a tested verdict.

## What it does

Two trigger points, both handled by the `d-test-assumptions` skill:

- **Phase 1 — pre-lock-in assumption audit.** Before any non-trivial approach (architectural weight, or 3+ steps) is presented as "the plan", the skill inventories the load-bearing claims, quantifies the assumption load ("N of M claims are assumptions"), triages each ⚠️ Assumption (`testable-locally` / `testable-with-operator` / `untestable-but-load-bearing` / `not-worth-testing`), tests the testables (N≥2, F-OVERFIT-aware), and emits a per-claim 🟢 CONFIRMED / 🔴 REFUTED / 🟡 INCONCLUSIVE verdict. A refuted load-bearing assumption repositions to the next-best approach — reposition once, then checkpoint with the operator.
- **Phase 2 — post-implementation verification reflex.** After implementing an easily-verifiable code segment, the skill quick-tests it against spec. In line → proceed. Not in line → **PAUSE**, do not patch-and-continue, and alert the operator with the mismatch + implications.

It is **on by default** and has a session-level off switch (see below).

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist). If your CLAUDE.md uses numbered rules, give it a number that fits your scheme (e.g. `## P13 — Assumption Testing & Verification Discipline (d-test-assumptions)`). Then install the skill file (see the repo README for the copy command).

```markdown
## Assumption Testing & Verification Discipline (d-test-assumptions)
Invoke the `d-test-assumptions` skill at two points. On by default; session-level off switch via `/d-test-assumptions off` / `on`.

- **Phase 1 — before locking in any non-trivial approach** (architectural weight, or 3+ steps — mirrors P1): inventory the load-bearing claims, state the assumption load ("N of M claims are assumptions"), triage each ⚠️ Assumption, test the testable ones (N≥2; N≥3 on divergence; F-OVERFIT and the usual F-* metrics constrain test design), and emit a per-claim 🟢 CONFIRMED / 🔴 REFUTED / 🟡 INCONCLUSIVE verdict. A refuted load-bearing assumption repositions to the next-best approach — reposition once, then checkpoint with the operator. Lock the approach in only when load-bearing assumptions are 🟢 CONFIRMED or explicitly accepted-as-risk.
- **Phase 2 — after implementing an easily-verifiable code segment**: quick-test it against spec locally. In line → proceed. Not in line → PAUSE, do not patch-and-continue, alert the operator with the mismatch and whether it warrants an architectural rethink.
- Consumes the ⚠️ Assumption tags from the d-assumption rule; a passed test promotes ⚠️ Assumption → 🟢 CONFIRMED.
- Output is inline only — no register file. Skip for obvious single-step fixes.
- **Off switch (session-scoped):** `/d-test-assumptions off` (also `no`, `-off`, `--off`) suppresses both phases for the session; `/d-test-assumptions on` re-enables. Emit `[d-test-assumptions — off for session]` / `[d-test-assumptions — on]` on transition. A permanent disable means removing this block.
```

## Notes

- This is a CLAUDE.md instruction rule paired with a Claude Code skill — the rule lives in your global config, the procedure lives in `~/.claude/skills/d-test-assumptions/SKILL.md`. The rule makes the skill auto-fire; the skill holds the full procedure (Phase 1/2 steps, test-design rules, output formats).
- **Composes with `d-assumption`.** `d-assumption` produces the ⚠️ Assumption / 🟢 CONFIRMED tags; `d-test-assumptions` consumes the ⚠️ tags as its test queue and promotes them. Install both for the full loop.
- **The off switch is session-scoped, not permanent**, mirroring the `d-focus-tasks` override-command model. The off/on token is matched CLI-arg-only (against the `/d-test-assumptions` invocation arg string), so it cannot be triggered by file paths or doc text. The anchor lines (`[d-test-assumptions — off for session]` / `[d-test-assumptions — on]`) are load-bearing across compaction.
- **N≥2 is a floor, not a target.** N=2 for tight results, N=3 when the first two runs diverge. The point is to refuse N=1 conclusions, not to inflate test counts — F-COST$ still applies.
- The Phase 2 reflex is deliberately a *pause*, not a *fix*. A spec mismatch found right after implementation is the cheapest possible moment to discover the spec or hypothesis was wrong — patching forward silently throws that signal away.
