# P9 Doc-Debt Closure — Design Spec

**Date:** 2026-05-18
**Status:** Design (awaiting operator review → writing-plans)
**Author:** Dalibor Druzinec (via Claude, `/superpowers:brainstorming`)
**Approach:** A — Pre-push doc-debt step inside P9
**Scope:** `claude-rules/github-push-warning.md` (P9) + 3 surfaces (local CLAUDE.md, compliance repo, memory)

---

## 1. Problem

P9 today gates the moment of `git push` with a verified-branch check and an explicit `YES` confirmation, but it has no opinion about whether the push itself ships with the docs that describe it. Doc-debt closure is currently handled *after* the push by `claude-rules/post-significant-push-audit.md` Step 1 (a y/n gate). That means:

1. Significant changes routinely ship to remote with stale `README.md` / `CHANGELOG.md` / plan / spec docs.
2. Doc updates land as trailing commits (or never), so the wire-state of the repo lags the work.
3. The audit's y/n gate produces an explicit decision but does not close debt unless the operator then walks the agent through specific edits — it is not action-oriented by default.

Operator framing (2026-05-18): *"whenever pushing remotely, close the debt (update) the appropriate sections in readme/changelog files."*

The intended outcome: the doc updates that describe the push are part of the same push, every time the push is non-trivial.

## 2. Goal

Add a pre-push doc-debt closure obligation to P9, scoped by the same significance gate that already governs the post-push audit, so that:

- Significant pushes to `2slowDD/*` ship with `README.md` + `CHANGELOG.md` (and any plan/spec docs the push closes) updated in the **same push**.
- Trivial pushes pass through unchanged.
- The post-push audit (rule 9 Step 1) stays in place as a backstop and as the doc-debt path for any non-`2slowDD` remote.

## 3. Non-goals (and one narrow in-scope rule 9 amend)

- **In scope — narrow rule 9 amend.** `claude-rules/post-significant-push-audit.md` Step 1 gains **one new sentence** at the top: a directive to scan the current session for any `[doc-debt: skipped — ...]` audit-anchor line from a P9 Step 2 invocation in this session, and to treat any such line as the explicit debt-to-close at this gate. Wording in §4.6 below. This is the minimum change required to make the skipped-debt mitigation in §8 enforceable rather than wishful. Reviewer-driven (d-review 2026-05-18 critical finding).
- Full rule 9 restructure (collapsing Step 1 entirely, changing its y/n shape, or modifying its Step 2 F-CHECK-EFF sweep) is **out of scope**. A future tightening pass may collapse rule 9 Step 1; not this change.
- Not introducing a new threshold. The significance gate is reused **verbatim** from `claude-rules/post-significant-push-audit.md` lines 41-55.
- Not auto-committing without operator approval — the doc-debt step proposes specific edits inline and waits for an `apply` / `revise` / `skip` response (or natural equivalents — see §4.2) before staging.
- Not extending P9 scope beyond `2slowDD/*` remotes. The pre-push doc-debt obligation lives inside P9 and inherits its scope.
- Not auto-bumping a SemVer release on the compliance repo. The change lands under `[Unreleased]`; the operator decides when to cut `v0.12.0`.
- Not adding a `Commits:` count line to Step 3's YES warning template. The template stays at 3 fields (`Repository`, `Branch`, `Command`) + divider + confirm prompt, exactly as today.

## 4. Approach (Approach A — recommended and approved 2026-05-18)

Insert a new **Step 2 — Close doc-debt PRE-push** into P9, between current Step 1 (verify remote default branch) and current Step 2 (YES warning, which becomes Step 3).

### 4.1 New P9 sequence

| Step | Name | Status |
|------|------|--------|
| 1 | Verify remote default branch | Unchanged from current P9 |
| **2** | **Close doc-debt PRE-push** | **NEW** |
| 3 | Display YES warning | Renumbered from current Step 2 |
| (push) | Execute push only on `YES` | Unchanged (implicit) |

### 4.2 Step 2 rule text — exactly as it will be installed

The outer fence below is **four backticks** so the spec renders correctly despite the inner three-backtick references. When copying into `claude-rules/github-push-warning.md` (an existing file whose install block uses backslash-escaped backticks `` \``` `` inside a triple-backtick fence), choose ONE convention for the install-block copy: either widen that file's install-block fence to four backticks **OR** escape the inner three-backtick references inline as `` \``` ``. AC-P9-2's "verbatim" requirement is satisfied by either choice as long as the rendered text matches.

````markdown
- **Step 2 — Close doc-debt PRE-push.** Inspect the changes about to be pushed against project documentation, then close the debt before the YES warning fires.

  **2a — Inspection.** Run `git log <remote>/<branch>..HEAD --stat --no-merges` to enumerate the commits + touched files about to ship. If `<remote>/<branch>` does not exist locally (fresh tracking), `git fetch <remote> <branch>` first. If the branch has never been pushed to the remote at all (first-ever push to a brand-new branch), `<remote>/<branch>` also does not exist after fetch — fall back to `git log HEAD --stat --no-merges` (enumerate all local commits on this branch) and note the first-push context in any CHANGELOG proposal.

  **2b — Significance gate** (reused verbatim from the Post-Significant-Push Audit). Fires if **any** of: multi-file refactor / subsystem rewrite / architectural change; closes a written plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, design or brainstorm spec); ships a kill-switch flip, default-on flip, or bake closure; adds or substantively changes a skill, rule, or shipped feature. **Does NOT fire** on aggregate-trivial pushes: total < 20 LOC across all commits about to ship, single-paragraph doc edits, version bumps, typo / copy edits, or mechanical chores. The 20-LOC threshold is **per-push aggregate**, not per commit or per file. **Borderline → close anyway.**

  **2c — Doc-debt files.**
  - **Primary:** `README.md` and `CHANGELOG.md` if present at the repo root.
  - **Secondary:** `tasks/todo.md`, `04-development/*-implementation-plan.md`, design docs, ADRs that the push closes out or supersedes.
  - **Doc-IS-the-work edge case:** when the push's work commit *itself* is the README/CHANGELOG/spec edit, the work *is* the doc-debt closure; no separate Step 2 commit is needed. Emit `[doc-debt: none — work commit is the doc-debt closure]` and proceed to Step 3.
  - **Mixed-work edge case** (code change + an already-written README/CHANGELOG entry from a prior typing session): inspect the existing entry against the work being shipped. If it accurately describes the work → proceed as a `[doc-debt: none — already documented in work commit]`. If it is stale, incomplete, or describes a different scope → propose a revise stanza per 2d and treat as normal Step 2.
  - **No doc surface case:** if the repo has none of the above, emit `[doc-debt: none — repo has no documentation surface]` and proceed.

  **2d — Proposal shape.** For each file with debt, output one stanza in this exact form (five labeled fields, no nested code-fence wrappers around the stanza itself — the Before/After bodies *are* fenced code blocks):

  - First line: a horizontal-rule marker `── <relative/file/path> ──`.
  - Second line: `Section: <heading or anchor where the edit goes>`.
  - Third line: `Why: <one line tying the edit to the push>`.
  - Fourth line: `Before:` followed on the next lines by a fenced code block (≤ 6 lines, language tag matches the target file's language: `md`, `php`, `js`, etc.).
  - Fifth line: `After:` followed on the next lines by a fenced code block (≤ 6 lines, same language tag).

  For **pure additions** (e.g., a new `[Unreleased]` CHANGELOG entry), the `Before:` field reads `<append after line N>` or `<new section>` and only the `After:` fenced block is emitted. **Multi-file pushes** get one stanza per file, in fixed order: `README.md` → `CHANGELOG.md` → secondary docs in repo-walk order.

  **2e — Operator response tokens.** Operator approves with `apply` / `revise <change>` / `skip doc-debt: <reason>` OR a natural equivalent (`go ahead`, `ship it`, `looks good` → `apply`; `change X to Y`, `also update Z` → `revise`; `skip`, `skip docs`, `not now — <reason>` → `skip doc-debt`). The agent loose-matches by intent; on ambiguity, agent asks rather than guesses.

  **2f — Commit shape.** Default: doc-debt edits land as a *new commit on top of* the work commit (one push, two commits — `docs: close debt for <one-line work description>`). The operator may instead request `--amend` to fold the docs into the work commit; this is a per-push choice, never the default, and only safe when the work commit has not yet been pushed elsewhere.

  **2g — Skip override.** `skip doc-debt: <reason>` bypasses Step 2. **Skipped debt MUST be re-flagged** at the post-push Rule 9 Step 1 — rule 9 Step 1 carries a directive (see §4.6) to scan this session for `[doc-debt: skipped — ...]` lines and close any such debt at that gate.

  **2h — Audit anchor.** Output exactly one line before Step 3. The format is `[doc-debt: <state> — <reason>]` where `<state>` is `closed` / `skipped` / `none` and `<reason>` is free-form, no required prefix:
  - `[doc-debt: closed — <comma-separated file list>]` — when 2c–2f ran and operator chose `apply` (the `<reason>` slot carries the file list).
  - `[doc-debt: skipped — <operator-supplied reason>]` — when operator used the 2g override.
  - `[doc-debt: none — <one-of: trivial push / work commit is the doc-debt closure / already documented in work commit / repo has no documentation surface>]` — when significance gate did not fire, doc-IS-the-work case, mixed-work-already-documented case, or no-doc-surface case.

  **2i — Failure paths.** If `apply` cannot complete cleanly (dirty working tree, merge conflict in the proposed edits, pre-commit hook failure on the docs commit), PAUSE — do not push. Surface the failure to the operator with the offending file + hook output, and wait for one of: `retry` (re-run apply), `revise <change>` (modify the proposal), or `skip doc-debt: <reason>` (escalate to 2g override). Do not proceed to Step 3 with a dirty tree. On successful `retry`, emit the 2h audit-anchor line as if the original apply had succeeded (`[doc-debt: closed — ...]`); the retry itself is not separately announced.
````

### 4.3 Why pre-push, not post-push

Three placements were considered: pre-push (chosen, Approach A), post-push y/n (the existing rule 9 Step 1), and a hybrid where rule 9 Step 1 is *upgraded* to propose-specific-edits without touching P9 (Approach B from the brainstorm).

| Property | **Pre-push (chosen)** | Post-push y/n (today) | Post-push upgraded-to-propose-edits |
|----------|------------------------|------------------------|--------------------------------------|
| Wire-state correctness | Docs ship on the *same* push as the work | Docs lag by one commit/push | Docs lag by one commit/push |
| History readability | Work + docs together in one push event | Work pushed, then "docs catch-up" commit | Work pushed, then "docs catch-up" commit |
| Operator decision window | Already engaged for YES warning — same decision context | Decision context already closed; reopens after push | Decision context already closed; reopens after push |
| Risk of skipping | Lower — gate is between work and wire | Higher — easy to defer ("I'll do it next push") | Medium — propose-edits forces a response, but push has already happened |
| Friction on trivial pushes | None (significance gate skips) | None (significance gate skips) | None (significance gate skips) |
| Surface change footprint | 6 files + narrow rule 9 amend (§4.6) | Zero | One file (`post-significant-push-audit.md`) |
| Reason for not picking | — | Doesn't match operator framing ("close the debt" → push includes debt) | Smaller footprint, but leaves wire-state lag unfixed; operator framing explicitly calls for same-push closure |

### 4.4 Why reuse rule 9's significance gate verbatim

- Two thresholds for "significant push" in the same instruction set would diverge.
- Rule 9 README §9+§10 composition table already pins the same threshold (`≥ 20 %`) for the F-CHECK-EFF sweep. Doc-debt should align.
- Reduces install-block surface area: one gate definition, two attachment points.

### 4.5 Why placement between Step 1 and Step 3 (not before Step 1, not after Step 3)

- **Before Step 1 (branch verify):** Step 1 produces information the doc step may consume (verified branch may need mentioning in a CHANGELOG entry, "Pushed to `main`" wording, or in a release-note section). Placing doc step first inverts the dependency.
- **After Step 3 (YES warning):** the YES warning is the operator's commit-to-push decision point. Its `Command:` line shows the exact `git push <remote> <branch>` that will execute. Putting Step 2 *after* the warning means the operator would `YES` the push, then have a doc-debt commit appended to the working tree, then have to re-issue the warning to cover the new commit — or push without re-warning, which silently changes the push contents after operator approval. Both options break the warning's role as the final commit-to-push gate.
- **Between Step 1 and Step 3 (chosen):** branch is known (Step 1 output); Step 2 may add one doc-debt commit to the working tree; Step 3 fires once over the *final* push contents (the work commit + the optional doc-debt commit). The `Command:` line in the YES warning still reads `git push <remote> <branch>` unchanged — what changes is the set of local commits the push will carry, which the operator inspects via the `git log` from Step 2a's inspection command. No new field is added to the YES warning template.

### 4.6 Rule 9 backward-link amend — exactly as it will be installed

`claude-rules/post-significant-push-audit.md` Step 1 gains a single new lead sentence at the top of the y/n gate, before the existing `> The push is on the wire. Before moving on:` quote block:

```markdown
**Skipped-debt sweep first.** Before asking the y/n question below, scan the current session transcript for any line matching `[doc-debt: skipped — <reason>]` emitted by a P9 Step 2 invocation in this session. If one or more such lines exist, the y/n question below is **not optional**: answer `y` and treat the named skipped debt as the explicit set of files to ratify. If no skipped-debt line is found, the y/n question below runs as written (operator may answer `y`, `n`, or `n — closed pre-push by P9 Step 2`).
```

This is the **only** change to rule 9 in this spec. Rule 9's Step 1 y/n shape, Step 2 F-CHECK-EFF sweep, threshold, and significance gate all remain unchanged.

**Implementation assumption (transcript scan).** "Scan the current session transcript" assumes the agent can grep its own active session content. In Claude Code (CLI / VSCode / web), the conversation history is in-context and grep-able. Smaller-context or context-managed agents (where prior turns may be summarized away) may need a fallback: if the session transcript cannot be reliably scanned, the agent treats the absence of a confirmed `[doc-debt: skipped — ...]` line as "no skipped debt this session" and runs the existing y/n question. This fallback degrades to the rule-9-as-shipped-today behavior — no regression vs. the pre-spec state.

## 5. Composition with the Post-Significant-Push Audit (rule 9)

| Aspect | P9 Step 2 (new) | Rule 9 Step 1 (existing) |
|--------|------------------|---------------------------|
| When it fires | Before push, inside the YES-warning window | After push success |
| Scope of remotes | `2slowDD/*` only (inherits P9 scope) | Any remote |
| Form | Propose specific edits → operator `apply`/`revise`/`skip` | y/n gate ("ratify project docs?") |
| Closes debt? | Yes — edits land in the same push | Only if operator says `y` and walks the agent through edits |
| Threshold | Significance gate from rule 9 (reused verbatim) | Same significance gate |
| Backstop role | Primary closure for `2slowDD/*` pushes | Backstop for `2slowDD/*` + primary for non-`2slowDD` |

In practice for `2slowDD/*` pushes:

- **P9 Step 2 closed debt cleanly →** operator answers rule 9 Step 1 with `n — closed pre-push by P9 Step 2`. No double-work. Rule 9 Step 2 (F-CHECK-EFF sweep) is unaffected and always runs on significant pushes.
- **P9 Step 2 was skipped via 2g override →** rule 9 Step 1's new §4.6 lead sentence fires: agent scans the session for the `[doc-debt: skipped — ...]` line, treats it as the explicit close-now set, and the y/n is forced to `y`. This is the load-bearing mitigation against the "skipped debt forgotten" risk in §8.
- **P9 Step 2 emitted `[doc-debt: none — ...]` (significance gate did not fire) →** rule 9 Step 1 also will not fire (same gate); both rules are silent.

For non-`2slowDD` remotes (rare today), rule 9 Step 1 remains the only doc-debt closure path. P9 does not apply. The §4.6 amend's skipped-debt sweep still fires but trivially finds no `[doc-debt: skipped — ...]` lines, so the gate runs as the existing y/n.

## 6. Surfaces to update

Seven files across three locations:

| # | File | Change |
|---|------|--------|
| 1 | `C:\Users\dalib\.claude\CLAUDE.md` (local runtime) | Replace existing P9 block with 3-step version. Step 2 is the new clause from §4.2. Step 3 = current Step 2 (YES warning) renumbered, unchanged in wording. |
| 2 | `claude-compliance-by-D/claude-rules/github-push-warning.md` (canonical P9 rule) | (a) Add Step 2 description to "What it does" list. (b) Add Step 2 to the **P9 install block in this file — NOT rule 9's install block in `post-significant-push-audit.md`; those are two separate install blocks in two separate files**. Use the escape convention noted in §4.2 lead paragraph (widen install-block fence to four backticks OR backslash-escape inner three-backtick references inline). (c) Notes section gains one paragraph on composition with `post-significant-push-audit.md` plus a pointer to the new §4.6 backward-link sweep over there. |
| 3 | `claude-compliance-by-D/claude-rules/post-significant-push-audit.md` (rule 9, narrow amend) | Step 1 gains the new `**Skipped-debt sweep first.**` lead sentence from §4.6 at the top of the y/n gate, before the existing `> The push is on the wire.` quote block. Install block mirrors the same addition. Notes section gains one paragraph cross-referencing P9 Step 2 as the pre-push closure path. **No other change** to rule 9. |
| 4 | `claude-compliance-by-D/README.md` | (a) §6 quick-install paragraph mentions the doc-debt step. (b) §9 quick-install paragraph mentions the new "Skipped-debt sweep first" lead. (c) §9 + §10 composition table at L290-302 gains one row noting "P9 Step 2 closes doc-debt pre-push for `2slowDD/*`; Rule 9 Step 1 backward-links via §4.6 lead sentence". (d) No section renumbering — these are edits to existing §6 and §9 in README, not new sections. |
| 5 | `claude-compliance-by-D/CHANGELOG.md` | New entry under `[Unreleased]` covering both rules: `Changed — claude-rules/github-push-warning.md` (Step 2 pre-push doc-debt closure) AND `Changed — claude-rules/post-significant-push-audit.md` (Step 1 backward-link sweep). Includes the Why (operator framing 2026-05-18 + d-review consistency fix) and the composition note. |
| 6 | `~/.claude/projects/d--AI-ChatGPT/memory/feedback_p9_doc_debt_closure.md` | New feedback memory. Frontmatter `type: feedback`, terse one-line `description:` field mirroring existing feedback-memory format. Body: leading rule, **Why:** line, **How to apply:** line. Links `[[feedback_check_remote_branch_before_push]]` and `[[project_compliance_repo_v_0_8_0_post_push_audit_rule]]`. |
| 7 | `~/.claude/projects/d--AI-ChatGPT/memory/MEMORY.md` | One new index line under ~150 chars pointing at file 6. |

`feedback_check_remote_branch_before_push.md` is **not** modified — it is scoped to the branch-verify step (Step 1). The new memory (file 6) covers doc-debt scope (Step 2) separately so each memory has a tight single-topic frame.

## 7. Acceptance criteria

The change is complete when **all** of the following hold. ACs are split into **file-state ACs** (grep-able / file-content check) and **behavioral dry-run ACs** (operator-inspected trace against the audit-anchor line in chat). Verification protocol for each kind is named.

### 7.1 File-state ACs (verified by file read / grep)

- **AC-P9-1.** `~/.claude/CLAUDE.md` P9 block has three numbered steps, with Step 2 matching the §4.2 clause and Step 3 = current Step 2 (YES warning) renumbered, **unchanged in wording**. Verify by reading the file and diffing against §4.2.
- **AC-P9-2.** `claude-rules/github-push-warning.md` "What it does" intro list enumerates 3 steps. The P9 install block in that file reproduces the Step 2 clause from §4.2 verbatim (modulo placeholder substitution `YOURNAME` etc.). Notes section has one paragraph on composition with `post-significant-push-audit.md` plus a pointer at §4.6 backward-link.
- **AC-P9-3.** `claude-rules/post-significant-push-audit.md` Step 1 has the new `**Skipped-debt sweep first.**` lead sentence from §4.6 at the top of the y/n gate, before the `> The push is on the wire.` quote block. Install block mirrors the addition. Notes section cross-references P9 Step 2. No other change to rule 9 (verify by `git diff` showing the lead sentence + install block + notes only; no other lines modified).
- **AC-P9-4.** `claude-compliance-by-D/README.md` §6 quick-install paragraph mentions the doc-debt step. §9 quick-install paragraph mentions the new skipped-debt sweep lead. §9 + §10 composition table at L290-302 gains one new row referencing P9 Step 2 ↔ rule 9 backward-link.
- **AC-P9-5.** `claude-compliance-by-D/CHANGELOG.md` has a new entry under `[Unreleased]` with **two** `Changed — ...` sub-sections (one per modified rule), each carrying the Why and the composition note.
- **AC-P9-6.** `~/.claude/projects/d--AI-ChatGPT/memory/feedback_p9_doc_debt_closure.md` exists with `type: feedback` frontmatter, a terse one-line `description:` field mirroring existing feedback-memory format (≤ ~150 chars, no trailing period if existing convention omits one), leading rule, **Why:** line, **How to apply:** line, and `[[...]]` links to the two related memories listed in §6 row 6.
- **AC-P9-7.** `~/.claude/projects/d--AI-ChatGPT/memory/MEMORY.md` has one new line under ~150 chars indexing the new memory.

### 7.2 Behavioral dry-run ACs (verified by operator inspection of chat trace)

Each dry-run AC is checked by reading the agent's chat transcript for the named audit-anchor line + correct sequencing. Verification is operator-eyeball; no automated trace harness exists.

- **AC-P9-8.** Dry-run on a hypothetical significant push (e.g., shipping this very change to the compliance repo): chat trace shows, in order, (a) `git log <remote>/<branch>..HEAD --stat` output from Step 2a, (b) Step 2b significance-gate firing positively, (c) Step 2d proposal stanzas for each doc-debt file, (d) operator `apply` response, (e) audit-anchor line `[doc-debt: closed — README.md, CHANGELOG.md, ...]` emitted before Step 3, (f) Step 3 YES warning with unchanged template (no `Commits:` field).
- **AC-P9-9.** Dry-run on a hypothetical trivial push (e.g., a single-line typo fix in one comment, < 5 LOC total): chat trace shows audit-anchor line `[doc-debt: none — trivial push]` immediately after Step 1, then Step 3 fires. No proposal stanzas, no operator interaction in Step 2. The `<reason>` slot matches the §4.2 step 2h canonical reasons (`trivial push`, no `aggregate-trivial push:` prefix).
- **AC-P9-10.** Dry-run on a hypothetical operator-override push: operator says `skip doc-debt: hotfix urgent`; chat trace shows audit-anchor line `[doc-debt: skipped — hotfix urgent]` before Step 3, then push completes. **After push**, post-significant-push-audit fires with the new §4.6 lead sentence: agent grep-scans the session for `[doc-debt: skipped — ...]`, finds the line, and the y/n is forced to `y` with the skipped debt named as the close-now set.
- **AC-P9-11.** Dry-run of the §4.6 backward-link sweep: on a post-push audit where no `[doc-debt: skipped — ...]` line exists in the session, the agent runs the sweep (visible in chat as a one-line `[doc-debt sweep: none found in session]` anchor or similar) and then asks the existing y/n question unchanged.

### 7.3 Scope fence

- **AC-P9-12.** **Scope of the edit deliverable** (not the first push exercising it): no file outside the 7 listed in §6 is modified by the implementation plan's edits. Specifically, `feedback_check_remote_branch_before_push.md` is untouched. The first push that *exercises* P9 Step 2 will itself create a doc-debt commit and possibly other working-tree changes — those are downstream of the deliverable, not part of it.

## 8. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Friction on every significant push slows the operator | Medium | Low | Significance gate skips trivial pushes; override exists for urgent cases. |
| Doc-debt step proposes irrelevant edits (e.g., README change that does not match the actual work) | Medium | Medium | "Propose specific edits inline" requires the agent to surface a diff for review; operator `revise` / `skip` are first-class responses. |
| Skipped debt is forgotten because rule 9 Step 1 is not actually re-flagged | Low | Medium | **Enforced by §4.6.** Rule 9 Step 1 gains a new lead sentence (the **only** rule 9 change in this spec) that grep-scans the current session for any `[doc-debt: skipped — ...]` line from P9 Step 2 and, when one is found, forces the y/n answer to `y` with the skipped debt named as the close-now set. AC-P9-3 verifies the wording is installed; AC-P9-10 + AC-P9-11 verify the runtime behavior. **Not** operator-discipline-only. |
| Step 2 introduces a doc-debt commit that operator did not intend (e.g., wrong file edited) | Low | Medium | Step 2 stages and commits only after operator approval. `revise` is a first-class response. Step 3 (YES warning) gives a second confirmation point before the push goes through. |
| Wording divergence between the 3 surfaces (local CLAUDE.md, canonical rule file, README) | Medium | Low | The install block in `github-push-warning.md` is the single source of truth; the other two surfaces quote it verbatim or cross-reference it. README change is descriptive (no rule text duplication). |
| Significance gate ambiguity — operator and agent disagree on whether a push is significant | Medium | Low | "Borderline → close anyway" rule borrowed verbatim from rule 9. Same ambiguity, same resolution discipline. |

## 9. Out of scope (intentional non-changes)

- **Rule 9 wording — except** the narrow §4.6 lead-sentence amend. Rule 9's y/n shape, Step 2 F-CHECK-EFF sweep, threshold, and significance gate all stay as-is. The only modification is the new "Skipped-debt sweep first." lead sentence in Step 1. A future ratification may collapse rule 9 Step 1 entirely; not this change.
- **F-CHECK-EFF threshold.** Unchanged — ≥ 20 % stays the floor for both rule 9 Step 2 and the global F-CHECK-EFF rule. This change does not touch the threshold.
- **Compliance repo SemVer bump.** Lands under `[Unreleased]`. Operator cuts the next release (`v0.12.0` likely, but operator's call) at a separate moment.
- **`feedback_check_remote_branch_before_push.md`.** Stays branch-verify-scoped. The new memory covers doc-debt-scope separately so each memory has a single tight topic.
- **Non-`2slowDD` remote scope.** P9 applies to `2slowDD/*` only. Non-`2slowDD` remotes continue to rely on rule 9 Step 1 alone.

## 10. Implementation order (preview — writing-plans will produce the full ordered plan)

### 10.1 Edit-deliverable tasks (orderable by writing-plans)

1. Spec write + self-review + operator review (this step — current state).
2. `writing-plans` produces an ordered task list.
3. Plan execution proceeds **local-only by default**:
   1. Edit `~/.claude/CLAUDE.md` (local — no remote impact).
   2. Edit `claude-rules/github-push-warning.md` in the compliance repo (working tree, not pushed).
   3. Edit `claude-rules/post-significant-push-audit.md` in the compliance repo — narrow §4.6 amend only (working tree, not pushed).
   4. Edit `README.md` in the compliance repo (working tree).
   5. Edit `CHANGELOG.md` `[Unreleased]` — two `Changed — ...` sub-sections, one per modified rule (working tree).
   6. Write the new memory file `feedback_p9_doc_debt_closure.md` + add the one new index line to `MEMORY.md`.
   7. Local commit in the compliance repo bundling steps 3.2–3.5.

### 10.2 Verification phase (not orderable by writing-plans — operator-driven)

These steps are runtime exercises, not file edits. They verify the deliverable behaves correctly. They produce no new deliverable artifact and should not be treated as writing-plans tasks with deliverables.

- V1. P9 dry-run trace on this very compliance-repo push (the push that ships the spec's implementation). Operator inspects the chat trace against AC-P9-8 (significant-push dry-run) before the actual push.
- V2. Push to `2slowDD/claude-compliance-by-D` only after explicit operator `YES` per P9 itself. This is the first real exercise of the new Step 2.
- V3. Defer AC-P9-9 (trivial-push trace) and AC-P9-10/AC-P9-11 (override + backward-link traces) to a future opportunistic push that matches each shape — these cannot be forced without contriving a push, and a contrived push pollutes git history.

## 11. Open questions

None at design time as of revision 2 (2026-05-18 PM after d-review).

**Reconsideration log:**
- Revision 1 spec marked "None" but contained a load-bearing §3↔§6↔§8 contradiction around whether rule 9 was modified. Surfaced by d-review (`2026-05-18-p9-doc-debt-closure-design-review.md`) as Critical. Resolved by adopting Option (a) from the d-review's top-3 list: narrow rule 9 amend (§4.6), 7th surface added to §6, AC-P9-3/-10/-11 added, §8 risk row rewired to the enforced mechanism. Trade-off chosen: one extra rule file in scope, for an enforced (not wishful) skipped-debt mitigation.
- The override token wording (`skip doc-debt: <reason>`) was the only inline-confirm design call; operator approved Approach A as a whole including that token (2026-05-18). §4.2 step 2e expanded to allow natural equivalents, also reviewer-driven.

## 12. Follow-ups discovered during this task

- **(deferred)** Rule 9 Step 1 could eventually become "if P9 Step 2 ran cleanly on this push: pass through silently; otherwise ask y/n" — collapsing the redundant post-push question for `2slowDD/*` pushes. Out of scope here; bring up as a future tightening pass once P9 Step 2 has soaked for a session or two.
- **(deferred)** Non-`2slowDD` remotes don't currently have pre-push doc-debt closure. If push targets diversify (e.g., a public mirror, a npm registry deploy hook), consider lifting P9 Step 2 into a generic pre-push rule. Out of scope at design time because there is currently only one non-`2slowDD` push surface used regularly (and that is also `2slowDD`).
