# d-test-assumptions — Design Spec

**Date:** 2026-05-14
**Status:** design — approved in brainstorming, awaiting spec review → writing-plans
**Author:** Dalibor Druzinec (operator) + agent
**Repo target:** `claude-compliance-by-D`

---

## 1. Purpose

Minimize guessing before work locks in. When a recommended approach, plan, or hypothesis rests on **assumptions** rather than verifiable hard data, this skill drives those assumptions to a tested **CONFIRMED** or **REFUTED** state — testing locally where possible, with operator help where not — before the approach is committed to. It also installs a post-implementation reflex: after building an easily-verifiable code segment, quick-test it against spec immediately, and pause-and-rethink on mismatch instead of patching forward.

It is the **active** counterpart to the `d-assumption` rule. `d-assumption` *labels* claims (⚠️ Assumption / 🟢 CONFIRMED). `d-test-assumptions` *acts* on the ⚠️ labels — it is the machinery that converts them.

## 2. Relationship to d-assumption and the F-* metrics

- **d-assumption** (CLAUDE.md rule) tags every item in a plan/recommendation as ⚠️ Assumption or 🟢 CONFIRMED with a basis note. It owns the "is this claim backed by two-sided-impossible hard data" judgement.
- **d-test-assumptions** (this skill) consumes the ⚠️ Assumption tags as its test queue. A passed test promotes ⚠️ Assumption → 🟢 CONFIRMED — closing the loop between the two tools.
- **F-OVERFIT** and the usual project failure metrics (F-SEC, F-DEG, F-MISS, F-COST$, F-THRU, F-CHECK-EFF, F-IMPOSSIBLE) constrain test *design* — see §6.

## 3. Packaging & triggers

Two artifacts, both shipped in `claude-compliance-by-D`:

| Artifact | Role |
|---|---|
| `skills/d-test-assumptions/SKILL.md` | Full procedure (Phase 1 + Phase 2 + test-design rules + output formats). |
| `claude-rules/d-test-assumptions.md` | Thin CLAUDE.md instruction rule that makes the skill auto-fire at the two trigger points. Mirrors the `d-focus-tasks.md` rule/skill split. |

### Trigger points

- **Phase 1 — Pre-lock-in assumption audit.** Fires before locking any **non-trivial** approach: one with architectural weight, or 3+ steps (mirrors the P1 planning threshold). In practice this is the end of brainstorming before `writing-plans`, or any point where an approach/recommendation is about to be presented as "the plan." Skips obvious single-step fixes. Also runs on demand via `/d-test-assumptions`.
- **Phase 2 — Post-implementation verification reflex.** Fires after implementing a new code segment that is easily verifiable against the spec/design.

### Off switch (session-level enable/disable)

The rule is **on by default**. The operator can disable it for the current agent session and re-enable it, mirroring the `d-focus-tasks` override-command grammar.

| Command | Effect |
|---|---|
| `/d-test-assumptions off` (also `no`, `-off`, `--off`, `-no`, `--no`) | Suppresses **both phases** for the rest of the session. |
| `/d-test-assumptions on` (also `yes`, `-on`, `--on`) | Re-enables both phases. |
| `/d-test-assumptions` (no args) | Runs Phase 1 on demand. If currently off, reports the off state and asks whether to run once anyway or flip back on. |

- **Session-scoped, not permanent.** "Off" lasts until re-enabled or the session ends. A permanent disable means removing the rule block from `~/.claude/CLAUDE.md`.
- **Anchor lines.** On each transition, emit a chat-visible anchor line on its own line so the state survives compaction: `[d-test-assumptions — off for session]` / `[d-test-assumptions — on]`. Preserve the most recent anchor verbatim in compaction summaries — it is the load-bearing source of truth for the on/off state; an in-context variable is just a cache.
- **Flag matching is CLI-arg-only.** The off/on token is matched only against the `/d-test-assumptions` invocation arg string (per the `d-focus-tasks` no-ledger flag grammar) — never against broader message text, file contents, or conversation history. Free-text like "turn off d-test-assumptions for now" is honored only when intent is unambiguous in context.
- **While off:** Phase 1 and Phase 2 both no-op silently — no audit table, no verification-reflex line, no PAUSE alert.
- **Subagents** start with the rule **on** unless the parent passes an off token in the subagent prompt (`d-test-assumptions=off`).

## 4. Phase 1 — Pre-lock-in assumption audit

Procedure, in order:

1. **Inventory** the load-bearing claims behind the recommended approach. The ⚠️ Assumption items (from `d-assumption` tagging) are the test candidates; 🟢 CONFIRMED items need no testing.
2. **Quantify** the assumption load explicitly: *"N of M load-bearing claims are assumptions."* This is the headline answer to "how much of the reasoning is guessing."
3. **Triage** each ⚠️ Assumption into exactly one bucket:
   - `testable-locally` — can be confirmed/refuted with a local test, probe, or experiment the agent can run itself.
   - `testable-with-operator` — needs an operator action (production access, credentials, a manual observation).
   - `untestable-but-load-bearing` — cannot be tested now; must be carried forward as an explicit risk.
   - `not-worth-testing` — low impact; test cost exceeds value (F-COST$ judgement). Stays ⚠️ Assumption, acknowledged.
4. **Test the testables** — for each `testable-*` assumption, design and run a test per the §6 rules. Produce a per-assumption verdict: 🟢 CONFIRMED / 🔴 REFUTED / 🟡 INCONCLUSIVE.
5. **Approach loop** — if a 🔴 REFUTED assumption is load-bearing for the recommended approach, the approach is undermined:
   - Reposition: re-rank the candidate approaches, move to the next-best, and audit + test *its* load-bearing assumptions.
   - **Reposition once, then checkpoint.** If the second approach also has a load-bearing assumption refuted, **STOP** — bring the full picture (both refutations, the re-ranked options, what is now known) to the operator. Do not keep walking the ranked list autonomously.
6. **Emit** the inline assumption→test→verdict table (§7) plus the one-line assumption-load summary. The approach is "locked in" only when its load-bearing assumptions are 🟢 CONFIRMED, or explicitly accepted-as-risk by the operator.

## 5. Phase 2 — Post-implementation verification reflex

After implementing a code segment that is easily verifiable against the spec/design:

1. **Ask:** "Can I quickly test this works per spec?" If yes and the test is cheap, do it — create the quick test locally.
2. **Prefer a real test that joins the suite.** A throwaway probe is acceptable only when a permanent suite test would be disproportionate to the segment. Test the real call chain, not a mock seam — a test that mocks at the destination can pass while the plumbing between is broken (per `feedback_test_seam_bypasses_plumbing.md`).
3. **In line with spec?** → proceed.
4. **Not in line?** → **PAUSE.** Do not patch-and-continue. Ask:
   - Does this refute the working hypothesis or the spec?
   - Does it warrant an architectural rethink?
   - Then **alert the operator** with the finding: the observed mismatch, what it implies, and the options — before doing anything else.

## 6. Test-design rules

Apply to every test designed in Phase 1 and Phase 2.

- **N≥2 minimum — never N=1.** Use N=2 when results are tight (low spread). Escalate to **N=3 when the first two runs diverge** — i.e. they disagree on the verdict, or a measured value varies by more than roughly one-third between runs.
- **F-OVERFIT.** A test that exercises only one site / one fixture / one input proves the approach *for that case*, not in general. Where the assumption asserts generality, test across representative variety (corpus, multiple inputs, both devices, etc.). A single-case pass is reported as "confirmed for `<case>`" — never bare "confirmed."
- **The usual F-\*s apply to the test itself:**
  - F-COST$ / F-THRU — match test cost to assumption impact; do not over-test a low-stakes claim.
  - F-SEC — no hard-coded credentials in probe scripts, even throwaway ones (per `feedback_no_hardcoded_credentials_in_committed_scripts.md`); use env or CLI arg.
  - F-MISS / F-DEG — a test that cannot fail is not a test; the test must be able to refute.
- **Local first, operator second.** Exhaust local testability before escalating. When escalating to `testable-with-operator`, hand the operator the **exact** command or observation needed — do not make them design the test.

## 7. Verdict vocabulary & output formats

### Verdicts

| Verdict | Meaning | Effect |
|---|---|---|
| 🟢 CONFIRMED | Test passed, N≥2, evidence shown. | Promotes ⚠️ Assumption → 🟢 CONFIRMED (the d-assumption bridge). |
| 🔴 REFUTED | Test failed. | Triggers the Phase 1 approach loop (§4.5) or the Phase 2 pause (§5.4). |
| 🟡 INCONCLUSIVE | Test ran but did not decide — variance too high even at N=3, or the test could not isolate the claim. | Stays ⚠️ Assumption; flagged as a known risk going forward. |

### Phase 1 inline output

Lightweight, inline, no file written:

```
Assumption load: 3 of 5 load-bearing claims were assumptions.

| Claim | Triage | Test (N) | Verdict |
|---|---|---|---|
| <claim 1> | testable-local    | replay scan ×2 | 🟢 CONFIRMED — <evidence> |
| <claim 2> | testable-operator | —              | 🟡 INCONCLUSIVE — needs prod check |
| <claim 3> | not-worth-testing | —              | ⚠️ Assumption (accepted) |
```

### Phase 2 inline output

One line on success:

```
[d-test-assumptions — <segment>: quick test ×2 → 🟢 in line with spec]
```

On mismatch, emit the PAUSE alert instead: the observed-vs-expected mismatch, the implication, and the options for the operator.

## 8. What d-test-assumptions does NOT do

- Does not build full test suites — it designs the minimum test that decides the assumption.
- Does not block trivial single-step fixes (Phase 1 has a non-trivial threshold).
- Does not push, deploy, or open PRs.
- Does not auto-accept its own 🔴 REFUTED → reposition outcome silently — every refutation and repositioning is surfaced to the operator.
- Does not write a register file — output is inline only (operator decision: keep it cheap, "organize it only if not a large detour").
- Does not re-implement `d-assumption` tagging — it consumes those tags, it does not produce them.
- Does not provide a permanent disable — the off switch (§3) is session-scoped; a permanent disable means removing the rule block from `~/.claude/CLAUDE.md`.

## 9. Acceptance criteria

A correct implementation produces:

1. `skills/d-test-assumptions/SKILL.md` with frontmatter (`name`, `description`), a Triggers section, the Phase 1 procedure (§4), the Phase 2 procedure (§5), the test-design rules (§6), the verdict vocabulary + output formats (§7), and a "does NOT do" section (§8).
2. `claude-rules/d-test-assumptions.md` — a rule file matching the repo's existing `claude-rules/*.md` shape (slug h1, title, description, `## What it does`, `## How to install` with a copy-paste CLAUDE.md block, `## Notes`). The rule documents the session-level off switch and its command grammar (§3).
3. `README.md` updated: tool count bumped to **Eleven**, a new tool-table row, and a new numbered section (`## 11 — …`) with quick-install steps.
4. `CHANGELOG.md` `[Unreleased]` updated with an `### Added` entry for the skill + rule and a `### Changed — README.md` entry.
5. Phase 1, when run on a sample non-trivial approach, emits the §7 table with an explicit assumption-load count and a per-claim verdict.
6. Phase 2, when run after a verifiable code segment, emits either the one-line pass confirmation or the PAUSE alert — never silently proceeds on a mismatch.
7. The skill consumes ⚠️ Assumption tags from `d-assumption` rather than re-deriving them.
8. The skill recognizes the session-level off/on commands per §3, emits the anchor line on each transition, and no-ops both phases while off.

## 10. Open questions / deferred

- Whether `d-test-assumptions` should later register as a participating skill in the `d-focus-tasks` no-ledger convention — deferred; this skill does not currently write to any ledger.
- A future `register file` mode (for approach decisions with many assumptions) was considered and explicitly cut for v1 per the operator's "keep it cheap" steer. Revisit only if inline tables prove insufficient in practice.
