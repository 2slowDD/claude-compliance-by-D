---
name: d-test-assumptions
description: Use before locking in a non-trivial approach, plan, or hypothesis — drives assumption-based reasoning to a tested CONFIRMED or REFUTED state by testing locally where possible and with operator help where not. Also a post-implementation reflex — after building an easily-verifiable code segment, quick-test it against spec and pause-and-rethink on mismatch. The active counterpart to the d-assumption tagging rule. Triggers on "test assumptions", "test the assumptions", "how much of this is guessing", "/d-test-assumptions", before presenting an approach as the plan, and after implementing a verifiable code segment.
---

# d-test-assumptions — Assumption Testing & Verification Discipline

Minimize guessing before work locks in. When a recommended approach, plan, or hypothesis rests on **assumptions** rather than verifiable hard data, drive those assumptions to a tested **🟢 CONFIRMED** or **🔴 REFUTED** state — locally where possible, with operator help where not — before the approach is committed to. After implementing an easily-verifiable code segment, quick-test it against spec immediately and pause-and-rethink on mismatch instead of patching forward.

This is the **active** counterpart to the `d-assumption` rule. `d-assumption` *labels* claims (⚠️ Assumption / 🟢 CONFIRMED); `d-test-assumptions` *acts* on the ⚠️ labels — it is the machinery that converts them.

## Triggers

The skill fires on:
- Operator phrasing: "test assumptions", "test the assumptions", "how much of this is guessing", "/d-test-assumptions".
- **Phase 1** — automatically, before locking in any **non-trivial** approach: one with architectural weight, or 3+ steps (mirrors the P1 planning threshold). In practice this is the end of brainstorming before `writing-plans`, or any point where an approach is about to be presented as "the plan." Skips obvious single-step fixes.
- **Phase 2** — automatically, after implementing a new code segment that is easily verifiable against the spec/design.

## On/Off — session-level switch

The skill is **on by default**. The operator can disable it for the current agent session and re-enable it, mirroring the `d-focus-tasks` override-command grammar.

| Command | Effect |
|---|---|
| `/d-test-assumptions off` (also `no`, `-off`, `--off`, `-no`, `--no`) | Suppresses **both phases** for the rest of the session. |
| `/d-test-assumptions on` (also `yes`, `-on`, `--on`) | Re-enables both phases. |
| `/d-test-assumptions` (no args) | Runs Phase 1 on demand. If currently off, reports the off state and asks whether to run once anyway or flip back on. |

- **Session-scoped, not permanent.** "Off" lasts until re-enabled or the session ends. A permanent disable means removing the rule block from `~/.claude/CLAUDE.md`.
- **Anchor lines.** On each transition, emit a chat-visible anchor line on its own line so the state survives compaction: `[d-test-assumptions — off for session]` / `[d-test-assumptions — on]`. Preserve the most recent anchor verbatim in compaction summaries — it is the load-bearing source of truth; an in-context variable is just a cache.
- **Flag matching is CLI-arg-only.** The off/on token is matched ONLY against the `/d-test-assumptions` invocation arg string (per the `d-focus-tasks` no-ledger flag grammar) — never against broader message text, file contents, or conversation history. Free-text like "turn off d-test-assumptions for now" is honored only when intent is unambiguous in context.
- **While off:** Phase 1 and Phase 2 both no-op silently — no audit table, no verification-reflex line, no PAUSE alert.
- **Subagents** start with the skill **on** unless the parent passes an off token in the subagent prompt (`d-test-assumptions=off`).

## Phase 1 — Pre-lock-in assumption audit

Run this procedure in order before locking a non-trivial approach.

1. **Inventory** the load-bearing claims behind the recommended approach. The ⚠️ Assumption items (from `d-assumption` tagging) are the test candidates; 🟢 CONFIRMED items need no testing.
2. **Quantify** the assumption load explicitly: *"N of M load-bearing claims are assumptions."* This is the headline answer to "how much of the reasoning is guessing."
3. **Triage** each ⚠️ Assumption into exactly one bucket:
   - `testable-locally` — can be confirmed/refuted with a local test, probe, or experiment the agent can run itself.
   - `testable-with-operator` — needs an operator action (production access, credentials, a manual observation).
   - `untestable-but-load-bearing` — cannot be tested now; must be carried forward as an explicit risk.
   - `not-worth-testing` — low impact; test cost exceeds value (F-COST$ judgement). Stays ⚠️ Assumption, acknowledged.
4. **Test the testables** — for each `testable-*` assumption, design and run a test per the Test-design rules below. Produce a per-assumption verdict: 🟢 CONFIRMED / 🔴 REFUTED / 🟡 INCONCLUSIVE.
5. **Approach loop** — if a 🔴 REFUTED assumption is load-bearing for the recommended approach, the approach is undermined:
   - Reposition: re-rank the candidate approaches, move to the next-best, and audit + test *its* load-bearing assumptions.
   - **Reposition once, then checkpoint.** If the second approach also has a load-bearing assumption refuted, **STOP** — bring the full picture (both refutations, the re-ranked options, what is now known) to the operator. Do not keep walking the ranked list autonomously.
6. **Emit** the inline assumption→test→verdict table (see Output formats) plus the one-line assumption-load summary. The approach is "locked in" only when its load-bearing assumptions are 🟢 CONFIRMED, or explicitly accepted-as-risk by the operator.

## Phase 2 — Post-implementation verification reflex

After implementing a code segment that is easily verifiable against the spec/design:

1. **Ask:** "Can I quickly test this works per spec?" If yes and the test is cheap, do it — create the quick test locally.
2. **Prefer a real test that joins the suite.** A throwaway probe is acceptable only when a permanent suite test would be disproportionate to the segment. Test the real call chain, not a mock seam — a test that mocks at the destination can pass while the plumbing between is broken.
3. **In line with spec?** → proceed.
4. **Not in line?** → **PAUSE.** Do not patch-and-continue. Ask:
   - Does this refute the working hypothesis or the spec?
   - Does it warrant an architectural rethink?
   - Then **alert the operator** with the finding: the observed mismatch, what it implies, and the options — before doing anything else.

## Test-design rules

Apply to every test designed in Phase 1 and Phase 2.

- **N≥2 minimum — never N=1.** Use N=2 when results are tight (low spread). Escalate to **N=3 when the first two runs diverge** — i.e. they disagree on the verdict, or a measured value varies by more than roughly one-third between runs.
- **F-OVERFIT.** A test that exercises only one site / one fixture / one input proves the approach *for that case*, not in general. Where the assumption asserts generality, test across representative variety (corpus, multiple inputs, both devices, etc.). A single-case pass is reported as "confirmed for `<case>`" — never bare "confirmed."
- **The usual F-\*s apply to the test itself:**
  - F-COST$ / F-THRU — match test cost to assumption impact; do not over-test a low-stakes claim.
  - F-SEC — no hard-coded credentials in probe scripts, even throwaway ones; use env or a CLI arg.
  - F-MISS / F-DEG — a test that cannot fail is not a test; the test must be able to refute.
- **Local first, operator second.** Exhaust local testability before escalating. When escalating to `testable-with-operator`, hand the operator the **exact** command or observation needed — do not make them design the test.

## Verdicts & output formats

### Verdicts

| Verdict | Meaning | Effect |
|---|---|---|
| 🟢 CONFIRMED | Test passed, N≥2, evidence shown. | Promotes ⚠️ Assumption → 🟢 CONFIRMED (the d-assumption bridge). |
| 🔴 REFUTED | Test failed. | Triggers the Phase 1 approach loop or the Phase 2 pause. |
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

## What d-test-assumptions does NOT do

- Does not build full test suites — it designs the minimum test that decides the assumption.
- Does not block trivial single-step fixes (Phase 1 has a non-trivial threshold).
- Does not push, deploy, or open PRs.
- Does not auto-accept its own 🔴 REFUTED → reposition outcome silently — every refutation and repositioning is surfaced to the operator.
- Does not write a register file — output is inline only. Keep it cheap; organize it into a durable artifact only if that is not a large detour.
- Does not re-implement `d-assumption` tagging — it consumes those tags, it does not produce them.
- Does not provide a permanent disable — the off switch is session-scoped; a permanent disable means removing the rule block from `~/.claude/CLAUDE.md`.
