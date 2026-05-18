# D-review: P9 Doc-Debt Closure — Design Spec
**Reviewed (rev 1):** 2026-05-18 (initial) · **Reviewed (rev 2):** 2026-05-18 (post-revision) · **Spec:** `C:\Users\dalib\claude-compliance-by-D\docs\superpowers\specs\2026-05-18-p9-doc-debt-closure-design.md` · **Verdict:** ready-to-plan

> This file is the **rev-2 review** of the same spec. Rev-1 verdict was `needs-revision`; the spec author resolved all 1 Critical + 5 Major findings from rev 1, and the spec now stands at `ready-to-plan`. Rev-1 findings retained at the bottom (§5) for traceability.

## 1. Context Re-scanned (rev 2)

- Read the revised spec end-to-end against rev 1.
- Cross-checked the new §4.6 rule-9 amend against current `claude-rules/post-significant-push-audit.md` Step 1 wording — the lead-sentence placement (before `> The push is on the wire.`) is valid; the existing rule has no header competing for that slot.
- Cross-checked §4.2 step 2d proposal stanza shape against the existing `github-push-warning.md` install-block fencing convention.

## 2. Rev-1 Findings — Resolution Audit

All 1 Critical + 5 Major + 5 Minor + 3 Nits from rev 1 are addressed. Each is named below with the resolving section.

| Rev-1 Finding | Severity | Resolution in rev 2 |
|---------------|----------|---------------------|
| §3 vs §8 vs §6 rule-9 contradiction | Critical | §3 reframed "In scope — narrow rule 9 amend"; §6 now 7 surfaces with `post-significant-push-audit.md` as #3; §4.6 carries the exact amend wording; §8 risk row rewired; AC-P9-3/-10/-11 verify both file state and runtime behavior. |
| §4.5 `Commits to push: N` field that doesn't exist | Major | §4.5 rewritten — placement argument now anchors on `Command:` line and the local-commit-set the operator inspects via Step 2a's `git log`. §3 explicit non-goal: "Not adding a `Commits:` count line". |
| Step 2 inspection command unspecified | Major | §4.2 step 2a names `git log <remote>/<branch>..HEAD --stat --no-merges` with `git fetch` fallback. |
| Proposal shape unspecified | Major | §4.2 step 2d gives an exact stanza format (file path / Section / Why / Before / After). Multi-file ordering rule (README → CHANGELOG → secondary) also added. |
| No AC for §8 backward-link claim | Major | AC-P9-3 (file state), AC-P9-10 (runtime: skipped-debt found), AC-P9-11 (runtime: no skipped-debt found). |
| Operator response token equivalents | Major | §4.2 step 2e: explicit natural-equivalent mapping + "loose-matches by intent; on ambiguity, agent asks". |
| 20-LOC threshold per-commit vs per-push | Minor | §4.2 step 2b: "The 20-LOC threshold is per-push aggregate". |
| "Single-paragraph doc edit" vs work-is-the-doc | Minor | §4.2 step 2c "Doc-IS-the-work edge case" — emit `[doc-debt: none — work commit is the doc-debt closure]`. |
| AC-P9-10 scope ambiguity (spec deliverable vs first push) | Minor | New AC-P9-12 explicit: "Scope of the edit deliverable (not the first push exercising it)". |
| §4.3 missing third-way comparison | Minor | §4.3 now a 3-column table — pre-push (chosen), post-push y/n (today), post-push-upgraded-to-propose-edits — with explicit "Reason for not picking" row. |
| Memory `description:` field unspecified | Minor | AC-P9-6 names "a terse one-line `description:` field mirroring existing feedback-memory format (≤ ~150 chars...)". |
| §10 dry-run as task | Nit | §10 split into 10.1 edit-deliverable + 10.2 verification phase (V1/V2/V3). |
| §6 #2 install-block confusion | Nit | §6 #2 explicit aside: "the P9 install block in this file — NOT rule 9's install block in `post-significant-push-audit.md`". |
| §11 reconsideration | Nit | §11 now has a reconsideration log naming the d-review-driven changes. |

## 3. New Findings (rev 2)

### Critical (blocks implementation)
None.

### Major (should fix before planning)
None.

### Minor (clarify when convenient)

- **[Errors / Markdown rendering]** §4.2's outer ` ```markdown ` fence (line 56) contains nested ` ``` ` fences inside the 2d proposal stanza (lines 71, 75, 78, 80, 82). In CommonMark/GFM a same-length nested fence closes the outer block early — the rendered spec right now is structurally broken at the 2d stanza. The existing `github-push-warning.md` install block solves this with backslash-escaped backticks (`\`\`\``); the spec doesn't specify which convention the implementer should follow when copy-pasting 2d into the canonical rule file. **Fix:** add one line to §6 row 2 or §4.2 noting "use the existing escape convention (`\`\`\``) for the 2d nested fences in the install block, OR widen the outer fence to four backticks." Not a planning blocker but will trip the implementer if undocumented. *Why it matters:* AC-P9-2 says the install block "reproduces the Step 2 clause from §4.2 verbatim" — verbatim copy of a 3+3 nested fence produces broken markdown in the destination file.

- **[Ambiguity]** AC-P9-9's audit-anchor wording reads `[doc-debt: none — aggregate-trivial push: <reason>]` (prefix `aggregate-trivial push:`), but §4.2 step 2h's general form is `[doc-debt: none — <reason>]` with no prefix requirement. The two specifications agree the line is `none — <something>` but disagree on whether `aggregate-trivial push:` is part of the spec or just a sample reason. *Why it matters:* a grep-based AC checker would fail one or the other depending on which it pattern-matches. Pick one: either §4.2 step 2h adds the prefix as a required token for the trivial-push case, or AC-P9-9 drops the prefix.

- **[Gaps]** §4.2 step 2a covers the case where `<remote>/<branch>` doesn't exist locally (fetch first), but not the case where the branch has never been pushed at all (first-ever push to a brand-new branch — `<remote>/<branch>` doesn't exist on the remote either, fetch returns empty, `git log <remote>/<branch>..HEAD` errors). Likely rare for the `2slowDD/*` repos in current use but worth one line. *Why it matters:* fresh-repo bootstrapping push is exactly the moment when "what's about to ship?" is least obvious and Step 2 is most useful — a documented fallback (`git log HEAD --stat` on first push) prevents an error path.

- **[Gaps]** §4.2 step 2i (Failure paths) lists `retry` / `revise` / `skip` as recovery tokens but doesn't say whether the audit-anchor line still emits after a successful `retry`. By default the answer should be yes (treat retry as the original apply that finally succeeded), but the spec is silent. One line in 2i closes it.

### Nits (style / optional)

- §4.2 step 2c "Doc-IS-the-work edge case" handles the case where the work commit IS the CHANGELOG/README/spec edit. Sub-edge: what if the work is *mixed* — code changes + an already-written CHANGELOG entry from a prior typing session? Probably "agent inspects the proposed CHANGELOG entry, asks operator whether to leave or revise" — but the spec is silent. Minor real-world case; not a planning blocker.

- §4.6 says "scan the current session transcript for any line matching `[doc-debt: skipped — ...]`". The agent's ability to grep its own transcript is implementation-dependent. For Claude Code in practice this works (the conversation is in context); for a smaller-context or context-managed agent it may not. The spec implicitly assumes context-access; worth one line acknowledging the assumption.

## 4. Verdict
**ready-to-plan**

The rev-1 critical contradiction is resolved with the right shape (narrow rule 9 amend rather than wishful-thinking mitigation); §4.2 is now reproducible (named inspection command + proposal-shape template); §4.3 has the missing third-way comparison; AC set is split into file-state vs behavioral with verification protocol named for each. All rev-2 new findings are Minor or Nit and resolvable during writing-plans / implementation without spec changes — though I recommend the nested-fence escape convention call (§3 new finding #1) gets a one-line clarification in §6 row 2 before the implementer hits it.

Hand to `writing-plans`. The rev-2 Minors do not block.

## 5. Rev-1 Findings (archived for traceability)

Original review at the time the spec author started revision 2. Severity counts: Critical 1 · Major 5 · Minor 5 · Nits 3. All resolved per §2 audit above. Full rev-1 narrative below.

### 5.1 Critical (rev 1)
- **[Inconsistencies]** §3 Non-goals vs §8 Risk row "Skipped debt is forgotten" vs §6 Surfaces table — three sections gave contradictory answers to whether rule 9 was modified. §8 cited "this design adds wording" to rule 9; §3 forbade rule 9 modification; §6 didn't list rule 9 as a surface. Mitigation was unenforced. → **Resolved** by narrow §4.6 amend + 7th surface.

### 5.2 Major (rev 1)
- **[Errors]** §4.5 cited a `Commits to push: N` line in the YES warning that does not exist in the current Step 3 template. → **Resolved** in §4.5 rewrite + §3 explicit non-goal.
- **[Ambiguity]** §4.2 Step 2 did not specify the inspection command for "changes about to be pushed". → **Resolved** in §4.2 step 2a.
- **[Ambiguity]** §4.2 "Propose specific edits inline" did not specify the proposal shape. → **Resolved** in §4.2 step 2d.
- **[Missing AC]** No AC verified the §8 backward-link claim. → **Resolved** by AC-P9-3 / AC-P9-10 / AC-P9-11.
- **[Ambiguity]** Operator response tokens — no "or equivalent" allowance specified. → **Resolved** in §4.2 step 2e.

### 5.3 Minor (rev 1) — all resolved per §2 audit
LOC threshold per-commit vs per-push; doc-IS-the-work edge case; AC-P9-10 scope ambiguity; §4.3 missing third-way comparison; memory `description:` field unspecified.

### 5.4 Nits (rev 1) — all resolved per §2 audit
§10 dry-run as task; §6 #2 install-block confusion; §11 reconsideration.
