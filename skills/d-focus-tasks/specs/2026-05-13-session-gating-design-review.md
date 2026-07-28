# D-review: d-focus-tasks — Session Gating + Project Routing Design (R1)
**Reviewed:** 2026-05-13 (R1) · **Spec:** `C:\Users\Korisnik\.claude\skills\d-focus-tasks\specs\2026-05-13-session-gating-design.md` · **Verdict:** ready-to-plan

## 1. Context Scanned
- Files read:
  - `C:\Users\Korisnik\.claude\skills\d-focus-tasks\specs\2026-05-13-session-gating-design.md` (R1)
  - `C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md` (skill being rewritten)
  - `C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_no_cu_ledger_for_global_skill_design.md` (memory disposition target)
  - `~/.claude/CLAUDE.md` (P11 — via global instructions in context)
- Carried-forward unverifiable assumptions (unchanged from R0):
  - Compaction agents preserve the `[focus-tasks-session — …]` anchor line verbatim. §4.1 now makes loss safe-by-design (re-prompt rather than misroute) — risk accepted explicitly.
  - Future skills voluntarily adopt the §6 grammar; no programmatic enforcement (acknowledged in §3 and §15).
  - `d-handover` is authored later and AC-INT-1 catches the §12 clause integration at that skill's first commit.

## 2. R0 → R1 disposition

| R0 finding | R1 disposition | Verified by |
|---|---|---|
| **[Critical] §6 substring match false positives** | Fixed: matching restricted to invocation arg string only; bare `no ledger` / `no-ledger` forms removed from §6.1; regex `(?:^|\s)--?no[-\s]ledger(?:$|\s)` provided; §6.2 examples include explicit NO-MATCH cases for file paths and free text. | §6.1, §6.2, AC-FLAG-1..4 |
| **[Major] §8.2 Option 2 anchor missing** | Fixed: row added emitting both `[focus-tasks-ledger created — <path>]` and `[focus-tasks-session — ledger active: <path>]`. | §8.2, AC-STATE-2 |
| **[Major] §11 dropped P11 clauses** | Fixed: history preservation clause + missing-ledger handling clause both present in §11 P11 text; AC-INT-2 verifies both. | §11, AC-INT-2 |
| **[Major] §4 state-recovery contract** | Fixed: new §4.1 with explicit reconciliation algorithm; anchor wins by absence; AC-REC-1..4 cover the four cases. | §4.1, AC-REC-1..4 |
| **[Major] §10 Windows path collision** | Fixed: token changed to `ledger=<path>` with split-on-first-equals; explicit `D:\…` example. | §10.1, AC-SUB-1 |
| **[Major] §10 precedence undefined** | Fixed: §10.2 "no-ledger wins" with rationale. | §10.2, AC-SUB-3 |
| 8× Minors | All fixed (§6 "surrounding instruction" removed; §7.1 touched-paths enumerated; §8.1 path resolution rules; §9.1 validation failure; §9.2 ambiguity-then-ask; §11 "material followup" defined; §13.2 MEMORY.md index; §14 subagent ACs added). | §6, §7.1, §8.1, §9.1, §9.2, §11, §13.2, AC-SUB-1..4 |

## 3. New findings (R1)

Zero Critical, zero Major. Nits only — listed because verdict is `ready-to-plan`.

### Nits (style / optional)

- **[Ambiguity]** §6.2 — "the text immediately following the skill/command name on the invocation line" is precise for `/slash-style` invocations and for the Skill tool's `args` field. For natural-language invocations like `D-handover, please skip ledger this time`, the example asserts the arg string is `[, please skip ledger this time]`, but the parser rule for where the skill name ends and the arg string begins is implicit. Practically harmless because §6 only fires on the dashed flag form (which won't accidentally appear in conversational tails). A one-liner — "for free-text invocations, the arg string is everything after the first comma/whitespace following the skill reference" — would close the loop.

- **[Gap]** §6 vs §9.2 — Natural-language one-time skip (e.g., `please skip this one ledger update`) has no path. §6 dashed flag = one invocation suppression; §9.2 free-text = session-level override. An operator who says `D-handover, skip the ledger just this once` in plain prose will see neither effect (no dashed flag → §6 misses; not a `/d-focus-tasks` override → §9 misses). Documenting "use `-no-ledger` for one-time skip" prominently in SKILL.md is enough; not a behaviour bug.

- **[Ambiguity]** §9.2 option (a) — "skip this one update only" is exactly the §6-flag-style suppression semantics, but the spec does not explicitly say "option (a) maps to the §6 flag effect (suppress this invocation; do not change state)". An implementer will infer correctly, but one sentence pinning the mapping would prevent drift.

- **[Style]** §10.1 — "Paths may contain `=` only after the first one (rare; documented edge case)" reads as a restriction on path content. The intended meaning is "the first `=` is the delimiter; subsequent `=` characters are part of the path." Reword to make the rule about the parser, not the path.

- **[Gap]** §13.3 — New `feedback_d_focus_tasks_session_gating.md` enumerates the 3-option prompt, anchor catalogue, override commands, and subagent token but does NOT mention the §4.1 recovery algorithm. Since recovery is the load-bearing cross-compaction contract, the memory should reference it too (one bullet pointing at §4.1).

## 4. Findings by Dimension

### Gaps
- [Nit] §6 vs §9.2 — natural-language one-time skip path.
- [Nit] §13.3 — recovery-algorithm pointer missing from new memory.

### Inconsistencies
- None.

### Ambiguity
- [Nit] §6.2 — natural-language invocation arg-string boundary.
- [Nit] §9.2 — option (a) mapping to §6 flag effect not stated.

### Errors
- None.

### Improvements / Simplifications
- [Nit] §10.1 — reword the "=" rule.

### Testability
- None. AC-STATE/REC/FLAG/SUB/INT cover the §4–§13 behavior completely.

### Risks / Unknowns
- §4.1 turns compaction loss from a silent-failure mode into a safe re-prompt. Residual risk: an over-eager compaction agent strips both the anchor AND retains a stale variable representation in the summary. §4.1 step 5 + step 3 last branch (disagree → anchor wins) covers this. Risk accepted.

### Missing Acceptance Criteria
- None. R1 adds AC-REC-1..4, AC-SUB-1..4, AC-FLAG-1..4 on top of the original AC-STATE/OVERRIDE/INT — coverage is now strong.

## 5. Verdict
**ready-to-plan**

All R0 Critical + Major + Minor findings are addressed with corresponding ACs. R1 introduces no new Critical or Major issues. Remaining items are Nits — documentation polish that can be folded into the SKILL.md rewrite without rework. Safe to hand to `writing-plans`.
