# P9 Doc-Debt Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is targeted for **inline execution** in the same session that authored it (operator decision 2026-05-18).

**Goal:** Add Step 2 (pre-push doc-debt closure) to the P9 GitHub Push Warning rule and a narrow §4.6 backward-link amend to the Post-Significant-Push Audit (rule 9), so significant pushes to `2slowDD/*` ship with README/CHANGELOG/plan/spec docs closed in the same push.

**Architecture:** Edit 5 documentation files (local CLAUDE.md + 2 rule files + README + CHANGELOG in the compliance repo) and 2 memory files (new feedback memory + 1-line MEMORY.md index update). Single local commit in the compliance repo bundles the rule + README + CHANGELOG changes. The push that ships the commit is itself the V1 verification exercise of the new Step 2 (doc-IS-the-work case per §4.2 step 2c).

**Tech Stack:** Plain markdown + Claude Code instruction files. No code, no test suite. Verification is grep-based file-state checks (AC-P9-1 through AC-P9-7) + operator-eyeballed runtime traces (AC-P9-8 through AC-P9-11, deferred to opportunistic push exercises).

**Spec:** [`docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design.md`](../specs/2026-05-18-p9-doc-debt-closure-design.md) — rev 2 ready-to-plan (d-review 2026-05-18).

---

## Pre-flight (read-only, no edits)

### Task 0: Confirm working-tree state

**Files:** None modified.

- [ ] **Step 0.1: Verify the compliance repo working-tree status before any edits**

Run:
```
git -C "C:/Users/dalib/claude-compliance-by-D" status --short
```
Expected: new untracked files for `docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design.md` and `docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design-review.md` and `docs/superpowers/plans/2026-05-18-p9-doc-debt-closure.md`. No other unrelated changes should be present. If unrelated changes appear, PAUSE and surface them to the operator before proceeding.

- [ ] **Step 0.2: Verify the local CLAUDE.md is at the expected canonical baseline**

Use Grep on `C:\Users\dalib\.claude\CLAUDE.md`:
```
pattern: "## P9 — GitHub Push Warning"
output_mode: content
-A: 50
```
Expected: 2-step block matching the canonical install block from `claude-rules/github-push-warning.md` (Step 1 verify branch + Step 2 YES warning).

---

## Task 1: Edit local CLAUDE.md — replace P9 block with 3-step version

**Files:**
- Modify: `C:\Users\dalib\.claude\CLAUDE.md` (P9 block — exact location: between the `## P9 — GitHub Push Warning (2slowDD)` heading and the `## P10 — WordPress Code Compliance` heading)

- [ ] **Step 1.1: Read current P9 block to confirm exact text**

Read the file region around the P9 heading to capture exact whitespace + bullet formatting.

- [ ] **Step 1.2: Replace P9 block with 3-step version**

Use Edit to replace the existing P9 block. The new block keeps Step 1 (verify branch) and Step 3 (YES warning) **unchanged in wording from their current text**, inserts a new Step 2 (close doc-debt) between them. New block content:

```markdown
## P9 — GitHub Push Warning (2slowDD)
Before executing ANY push, force-push, or PR to `2slowDD/*` (the private backup repo at `github.com/2slowDD`):

- **Step 1 — Verify the remote default branch FIRST.** Before composing the push command, before writing the warning, before hardcoding any `HEAD:<branch>` refspec, run:
  ```
  git ls-remote --heads <remote-name>
  ```
  to confirm which branch(es) exist on the remote and which one this repo pushes to (`main` vs `master` vs a feature branch). Known mapping today: `cu-scanner-railway` = `master`; `AI-Assets-Scanner` + `wpservice-saas` = `main`. **Never assume** — check every time. Misrouting a push to a non-existent or wrong branch silently creates a stale ref or overwrites the wrong line of history.

- **Step 2 — Close doc-debt PRE-push.** Inspect the changes about to be pushed against project documentation, then close the debt before the YES warning fires.

  **2a — Inspection.** Run `git log <remote>/<branch>..HEAD --stat --no-merges` to enumerate the commits + touched files about to ship. If `<remote>/<branch>` does not exist locally (fresh tracking), `git fetch <remote> <branch>` first. If the branch has never been pushed to the remote at all (first-ever push to a brand-new branch), `<remote>/<branch>` also does not exist after fetch — fall back to `git log HEAD --stat --no-merges` (enumerate all local commits on this branch) and note the first-push context in any CHANGELOG proposal.

  **2b — Significance gate** (reused verbatim from the Post-Significant-Push Audit). Fires if **any** of: multi-file refactor / subsystem rewrite / architectural change; closes a written plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, design or brainstorm spec); ships a kill-switch flip, default-on flip, or bake closure; adds or substantively changes a skill, rule, or shipped feature. **Does NOT fire** on aggregate-trivial pushes: total < 20 LOC across all commits about to ship, single-paragraph doc edits, version bumps, typo / copy edits, or mechanical chores. The 20-LOC threshold is **per-push aggregate**, not per commit or per file. **Borderline → close anyway.**

  **2c — Doc-debt files.**
  - **Primary:** `README.md` and `CHANGELOG.md` if present at the repo root.
  - **Secondary:** `tasks/todo.md`, `04-development/*-implementation-plan.md`, design docs, ADRs that the push closes out or supersedes.
  - **Doc-IS-the-work edge case:** when the push's work commit *itself* is the README/CHANGELOG/spec edit, the work *is* the doc-debt closure; no separate Step 2 commit is needed. Emit `[doc-debt: none — work commit is the doc-debt closure]` and proceed to Step 3.
  - **Mixed-work edge case** (code change + an already-written README/CHANGELOG entry from a prior typing session): inspect the existing entry against the work being shipped. If it accurately describes the work → proceed as a `[doc-debt: none — already documented in work commit]`. If it is stale, incomplete, or describes a different scope → propose a revise stanza per 2d and treat as normal Step 2.
  - **No doc surface case:** if the repo has none of the above, emit `[doc-debt: none — repo has no documentation surface]` and proceed.

  **2d — Proposal shape.** For each file with debt, output one stanza in this exact form (five labeled fields):
  - First line: a horizontal-rule marker `── <relative/file/path> ──`.
  - Second line: `Section: <heading or anchor where the edit goes>`.
  - Third line: `Why: <one line tying the edit to the push>`.
  - Fourth line: `Before:` followed on the next lines by a fenced code block (≤ 6 lines, language tag matches the target file's language: `md`, `php`, `js`, etc.).
  - Fifth line: `After:` followed on the next lines by a fenced code block (≤ 6 lines, same language tag).

  For **pure additions** (e.g., a new `[Unreleased]` CHANGELOG entry), the `Before:` field reads `<append after line N>` or `<new section>` and only the `After:` fenced block is emitted. **Multi-file pushes** get one stanza per file, in fixed order: `README.md` → `CHANGELOG.md` → secondary docs in repo-walk order.

  **2e — Operator response tokens.** Operator approves with `apply` / `revise <change>` / `skip doc-debt: <reason>` OR a natural equivalent (`go ahead`, `ship it`, `looks good` → `apply`; `change X to Y`, `also update Z` → `revise`; `skip`, `skip docs`, `not now — <reason>` → `skip doc-debt`). The agent loose-matches by intent; on ambiguity, agent asks rather than guesses.

  **2f — Commit shape.** Default: doc-debt edits land as a *new commit on top of* the work commit (one push, two commits — `docs: close debt for <one-line work description>`). The operator may instead request `--amend` to fold the docs into the work commit; this is a per-push choice, never the default, and only safe when the work commit has not yet been pushed elsewhere.

  **2g — Skip override.** `skip doc-debt: <reason>` bypasses Step 2. **Skipped debt MUST be re-flagged** at the post-push Rule 9 Step 1 — rule 9 Step 1 carries a directive to scan this session for `[doc-debt: skipped — ...]` lines and close any such debt at that gate.

  **2h — Audit anchor.** Output exactly one line before Step 3. Format: `[doc-debt: <state> — <reason>]` where `<state>` ∈ {`closed`, `skipped`, `none`}:
  - `[doc-debt: closed — <comma-separated file list>]` — when 2c–2f ran and operator chose `apply`.
  - `[doc-debt: skipped — <operator-supplied reason>]` — when operator used the 2g override.
  - `[doc-debt: none — <one-of: trivial push / work commit is the doc-debt closure / already documented in work commit / repo has no documentation surface>]` — when the significance gate did not fire, or the doc-IS-the-work case, or the mixed-work-already-documented case, or no-doc-surface case.

  **2i — Failure paths.** If `apply` cannot complete cleanly (dirty working tree, merge conflict in the proposed edits, pre-commit hook failure on the docs commit), PAUSE — do not push. Surface the failure with the offending file + hook output, and wait for `retry` / `revise <change>` / `skip doc-debt: <reason>`. Do not proceed to Step 3 with a dirty tree. On successful `retry`, emit the 2h audit-anchor line as if the original apply had succeeded; the retry itself is not separately announced.

- **Step 3 — Stop and display this warning in the chat** (include the verified branch on its own line):

  ```
  ⚠️  PUSHING TO 2slowDD GITHUB  ⚠️
  Repository : github.com/2slowDD/...
  Branch     : <verified branch from Step 1>
  Command    : <exact git command>
  ────────────────────────────────────
  This will make changes to your online backup repo.
  Confirm? (type YES to proceed)
  ```

- Do NOT execute the push until the user explicitly confirms with "YES" or equivalent.
- This applies to: `git push`, `git push --force`, `git push --force-with-lease`, `gh pr create`, and any other command that writes to `2slowDD` remotes.
- If the remote is named `private` and points to `2slowDD`, treat it the same way.
```

- [ ] **Step 1.3: Verify the edit landed by grepping for the new Step 2 marker**

Use Grep on `C:\Users\dalib\.claude\CLAUDE.md`:
```
pattern: "Step 2 — Close doc-debt PRE-push"
output_mode: content
-n: true
```
Expected: one match inside the P9 block, line number visible.

- [ ] **Step 1.4: Verify Step 3 (YES warning) is unchanged in wording**

Use Grep on `C:\Users\dalib\.claude\CLAUDE.md`:
```
pattern: "PUSHING TO 2slowDD GITHUB"
output_mode: content
-A: 5
```
Expected: the warning template with `Repository`, `Branch`, `Command` lines exactly as before. **No `Commits:` field**.

---

## Task 2: Edit `claude-rules/github-push-warning.md` — canonical P9 rule

**Files:**
- Modify: `C:\Users\dalib\claude-compliance-by-D\claude-rules\github-push-warning.md`

- [ ] **Step 2.1: Read the current file end-to-end to confirm structure**

Read the full file (currently ~69 lines). Identify three regions:
- Intro paragraph + "What it does" 2-step list (lines ~1–23)
- Install block fenced with ` ```markdown ` (lines ~31–59)
- Notes section (lines ~63–69)

- [ ] **Step 2.2: Update the intro "What it does" 2-step list to 3 steps**

Use Edit to add a new bullet between current Step 1 and current Step 2 in the intro list. The new bullet reads:

```markdown
2. **Close doc-debt PRE-push** (new Step 2 — added 2026-05-18). For significant pushes, inspect what is about to ship against project docs (`README.md` / `CHANGELOG.md` / plan / spec / ADR), propose specific edits inline, apply on operator approval, and stage them so they land in the same push as the work. Trivial pushes (per-push aggregate < 20 LOC, version bumps, typo / copy edits, mechanical chores) skip with one line. Operator can `skip doc-debt: <reason>` to bypass; skipped debt is re-flagged by the post-push Rule 9 Step 1 backward-link sweep.
```

Renumber current Step 2 (Stop and display warning) to Step 3.

- [ ] **Step 2.3: Update the install block to add the Step 2 doc-debt clause**

Use Edit to insert the new Step 2 bullet block between current Step 1 (verify branch) and current Step 2 (YES warning) inside the ` ```markdown ` install block. The new bullet content is identical to Task 1 Step 1.2's Step 2 block. Renumber current Step 2 (YES warning) → Step 3.

- [ ] **Step 2.4: Update Notes section — add composition paragraph**

Use Edit to append one new bullet to the Notes section (currently at the bottom of the file):

```markdown
- **Composition with the Post-Significant-Push Audit (`post-significant-push-audit.md`).** Step 2 above closes doc-debt **before** the push. Rule 9 Step 1 (post-push) now carries a new "Skipped-debt sweep first." lead sentence that grep-scans the session transcript for any `[doc-debt: skipped — ...]` audit-anchor line emitted by Step 2 and forces y/n to `y` with the skipped debt named as the close-now set when found. For non-`2slowDD` remotes (where P9 does not apply), rule 9 Step 1 remains the only doc-debt closure path.
```

- [ ] **Step 2.5: Verify the edit landed**

Use Grep on `C:\Users\dalib\claude-compliance-by-D\claude-rules\github-push-warning.md`:
```
pattern: "Step 2 — Close doc-debt PRE-push"
output_mode: files_with_matches
```
Expected: one match.

Then:
```
pattern: "post-significant-push-audit.md"
output_mode: content
-n: true
```
Expected: at least one match in the new Notes-section composition paragraph.

---

## Task 3: Edit `claude-rules/post-significant-push-audit.md` — narrow §4.6 amend

**Files:**
- Modify: `C:\Users\dalib\claude-compliance-by-D\claude-rules\post-significant-push-audit.md`

- [ ] **Step 3.1: Read the current file end-to-end**

Read the full file. Identify the Step 1 quote block (lines ~15–24 in body, with a parallel block ~74–80 in the install block).

- [ ] **Step 3.2: Add the §4.6 lead sentence at top of the body's Step 1 description**

Use Edit. Locate the body's Step 1 heading (`### Step 1 — Documentation debt (y/n gate)`) and the next line which currently reads `Claude asks, verbatim:` followed by the `> The push is on the wire.` quote block. Insert this new paragraph **after** the `### Step 1` heading and **before** the `Claude asks, verbatim:` line:

```markdown
**Skipped-debt sweep first.** Before asking the y/n question below, scan the current session transcript for any line matching `[doc-debt: skipped — <reason>]` emitted by a P9 Step 2 invocation in this session. If one or more such lines exist, the y/n question below is **not optional**: answer `y` and treat the named skipped debt as the explicit set of files to ratify. If no skipped-debt line is found, the y/n question runs as written (operator may answer `y`, `n`, or `n — closed pre-push by P9 Step 2`).

**Implementation assumption (transcript scan).** "Scan the current session transcript" assumes the agent can grep its own active session content. For agents where prior turns may be summarized away, the absence of a confirmed `[doc-debt: skipped — ...]` line is treated as "no skipped debt this session" and the existing y/n question runs as before — no regression vs. the pre-amend behavior.

```

- [ ] **Step 3.3: Mirror the same addition in the install block's Step 1**

Use Edit. Locate the install block (the second ` ```markdown ` fence in the file, around line 60). Inside it, find the `**Step 1 — Doc-debt y/n gate. Ask, verbatim:**` line. Insert the same two paragraphs above the `> The push is on the wire.` quote block. Use the identical wording from Step 3.2.

- [ ] **Step 3.4: Append a cross-reference paragraph to the Notes section**

Use Edit. Append one new bullet at the bottom of the Notes section:

```markdown
- **Composition with P9 (`github-push-warning.md`).** P9's new Step 2 (added 2026-05-18) closes doc-debt **before** the push for `2slowDD/*` remotes. The "Skipped-debt sweep first." lead in Step 1 above is the backward-link: when P9 Step 2 was bypassed via `skip doc-debt: <reason>`, the skipped debt is named in this session as `[doc-debt: skipped — ...]` and gets closed at this gate instead. For non-`2slowDD` remotes (where P9 does not apply), Step 1 below runs as the existing y/n gate.
```

- [ ] **Step 3.5: Verify the edits landed**

Use Grep on `C:\Users\dalib\claude-compliance-by-D\claude-rules\post-significant-push-audit.md`:
```
pattern: "Skipped-debt sweep first"
output_mode: content
-n: true
```
Expected: two matches (body + install block).

Then:
```
pattern: "github-push-warning.md"
output_mode: files_with_matches
```
Expected: one match (the Notes-section cross-reference paragraph).

---

## Task 4: Edit `claude-compliance-by-D/README.md`

**Files:**
- Modify: `C:\Users\dalib\claude-compliance-by-D\README.md`

- [ ] **Step 4.1: Read the current §6 (GitHub Push Warning Rule) and §9 (Post-Significant-Push Audit Rule) and §9 + §10 composition table at L290-302**

Read the relevant regions (around lines 226–250 for §6/§7; ~262–272 for §9; ~290–302 for the composition table).

- [ ] **Step 4.2: Update §6 quick-install paragraph to mention doc-debt step**

Use Edit. Locate §6 "GitHub Push Warning Rule" and its current "Quick install" sub-section (currently 2 sentences). Update the description paragraph above "Quick install" to mention the new Step 2. New text:

```markdown
A CLAUDE.md instruction that stops Claude before any push to your private GitHub repository: (1) verifies the remote default branch via `git ls-remote --heads`, (2) **closes doc-debt by proposing README/CHANGELOG/plan/spec edits and committing them so they ship in the same push as the work** (significant pushes only — trivial pushes skip with one line), then (3) requires explicit "YES" confirmation. Composes with the Post-Significant-Push Audit (§9): rule 9 Step 1 carries a "Skipped-debt sweep first." lead that closes any debt that was bypassed via the `skip doc-debt` override.
```

- [ ] **Step 4.3: Update §9 quick-install paragraph to mention "Skipped-debt sweep first." lead**

Use Edit. Locate §9 "Post-Significant-Push Audit Rule" description paragraph. Append the following sentence at the end of that paragraph:

```markdown
As of 2026-05-18 (v0.12.0 unreleased), Step 1 carries a "Skipped-debt sweep first." lead sentence: before asking the y/n question, Claude scans the current session for any `[doc-debt: skipped — ...]` line emitted by P9 Step 2; if found, the y/n is forced to `y` with the named skipped debt as the close-now set. This makes the skipped-debt mitigation enforced rather than operator-memory-dependent.
```

- [ ] **Step 4.4: Update the §9 + §10 composition table at L290-302 — add one new row**

Use Edit. Locate the existing 5-row composition table (header + 4 data rows: "When it fires", "Trigger surface", "What it does", "Role", "Threshold"). Append one new row at the bottom:

```markdown
| **P9 ↔ Rule 9 composition (new 2026-05-18)** | — | **P9 Step 2 closes doc-debt pre-push** for `2slowDD/*`. **Rule 9 Step 1 carries the "Skipped-debt sweep first." backward-link**: scans this session for `[doc-debt: skipped — ...]` lines from P9 Step 2 and forces the y/n to `y` with the skipped debt as the close-now set. For non-`2slowDD/*` remotes (where P9 doesn't apply), rule 9 Step 1 is the primary closure path. |
```

- [ ] **Step 4.5: Verify the edits landed**

Use Grep on `C:\Users\dalib\claude-compliance-by-D\README.md`:
```
pattern: "closes doc-debt by proposing"
output_mode: files_with_matches
```
Expected: one match (§6 description).

```
pattern: "Skipped-debt sweep first"
output_mode: count
```
Expected: count ≥ 2 (§9 description + composition table row).

---

## Task 5: Edit `claude-compliance-by-D/CHANGELOG.md` — new `[Unreleased]` entries

**Files:**
- Modify: `C:\Users\dalib\claude-compliance-by-D\CHANGELOG.md`

- [ ] **Step 5.1: Read the current `[Unreleased]` section**

Read lines ~16–160 (existing `[Unreleased]` has 5+ entries). Verify the format pattern used by existing entries (`### Changed — <file>` / `### Added — <file>` etc.).

- [ ] **Step 5.2: Append two new `### Changed —` sub-sections under `[Unreleased]`**

Use Edit. Locate the `## [Unreleased]` heading and the first existing entry under it. Insert the two new entries **at the top of [Unreleased]** (above all existing entries — newest at the top is the convention used by this file):

```markdown
### Changed — `claude-rules/github-push-warning.md`

**Step 2 — pre-push doc-debt closure** added between the existing Step 1 (verify branch) and the YES warning (renumbered to Step 3). For significant pushes (same gate as the Post-Significant-Push Audit), Claude inspects what is about to ship via `git log <remote>/<branch>..HEAD --stat --no-merges`, identifies doc-debt files (`README.md` / `CHANGELOG.md` / plan / spec / ADR), proposes specific edits per a five-field stanza (file path / Section / Why / Before / After), applies on operator approval (`apply` / `revise` / `skip doc-debt: <reason>` or natural equivalents), and stages them so they ship in the same push as the work. Trivial pushes (per-push aggregate < 20 LOC, single-paragraph doc edits, version bumps, typo / copy edits, mechanical chores) skip with one line. A new audit-anchor convention `[doc-debt: <closed|skipped|none> — <reason>]` is emitted before the YES warning.

**Why:** the prior P9 left doc updates as trailing commits or post-push catch-ups, so the wire-state lagged the work. Operator framing (2026-05-18): "whenever pushing remotely, close the debt (update) the appropriate sections in readme/changelog files." Pre-push closure ships docs and code in the same push, eliminating the lag.

**Surfaced by** operator request 2026-05-18 via a `/superpowers:brainstorming` session. Design spec at `docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design.md` (rev 2, d-review verdict `ready-to-plan`). Plan at `docs/superpowers/plans/2026-05-18-p9-doc-debt-closure.md`.

### Changed — `claude-rules/post-significant-push-audit.md`

**Step 1 gains a "Skipped-debt sweep first." lead sentence** at the top of the y/n gate, before the existing `> The push is on the wire.` quote block. Before asking the y/n question, Claude scans the current session transcript for any line matching `[doc-debt: skipped — <reason>]` emitted by a P9 Step 2 invocation; if found, y/n is forced to `y` with the named skipped debt as the close-now set. Mirrored in the install block. A new Notes-section paragraph cross-references P9 Step 2 as the pre-push closure path. **Implementation assumption documented**: for agents where prior turns may be summarized away, the absence of a confirmed skipped-debt line degrades to the existing y/n behavior — no regression.

**Why:** the new P9 Step 2 (above) introduces a `skip doc-debt: <reason>` operator override; without the backward-link sweep here, skipped debt would rely on operator memory + chat anchor only — a wishful mitigation flagged Critical by d-review rev 1. The lead sentence makes the mitigation enforced.

**Composition note:** P9 Step 2 + rule 9 Step 1 sweep are temporally complementary. Pre-push for `2slowDD/*`, post-push backstop for everything else. The composition table in README §9 + §10 (L290-302) gains a new row documenting this.
```

- [ ] **Step 5.3: Verify the edit landed**

Use Grep on `C:\Users\dalib\claude-compliance-by-D\CHANGELOG.md`:
```
pattern: "Step 2 — pre-push doc-debt closure"
output_mode: content
-n: true
```
Expected: one match in the `[Unreleased]` section.

```
pattern: "Skipped-debt sweep first"
output_mode: count
```
Expected: count = 1 in CHANGELOG.

---

## Task 6: Write new memory file

**Files:**
- Create: `C:\Users\dalib\.claude\projects\d--AI-ChatGPT\memory\feedback_p9_doc_debt_closure.md`

- [ ] **Step 6.1: Write the new memory file**

Use Write. Exact content:

```markdown
---
name: feedback-p9-doc-debt-closure
description: P9 Step 2 closes README/CHANGELOG/plan-spec doc-debt PRE-push for 2slowDD/* — docs ship in the same push as the work
metadata:
  type: feedback
---

P9 (the GitHub Push Warning rule for `2slowDD/*` pushes) now has Step 2 = pre-push doc-debt closure between the existing Step 1 (verify branch) and Step 3 (YES warning). On significant pushes (multi-file refactor, plan-closing commit, kill-switch/default-on/bake flip, skill/rule/feature change), Claude inspects what is about to ship, proposes specific README/CHANGELOG/plan/spec/ADR edits via a five-field stanza, applies on operator approval, and stages them so the docs ship in the same push as the work. Trivial pushes (per-push aggregate < 20 LOC, version bumps, typo/copy edits, single-paragraph doc edits, mechanical chores) skip with one line. Operator override `skip doc-debt: <reason>` is re-flagged at the post-push Rule 9 Step 1 via its new "Skipped-debt sweep first." lead.

**Why:** the prior P9 left doc updates as trailing commits or post-push catch-ups, so the wire-state of the repo lagged the work. Operator framing 2026-05-18: "whenever pushing remotely, close the debt (update) the appropriate sections in readme/changelog files." Pre-push closure ships docs + code together. Rule 9 Step 1 sweep makes skipped debt enforced rather than memory-dependent (d-review rev 1 Critical fix). See also [[feedback_check_remote_branch_before_push]] (Step 1 branch-verify) and [[project_compliance_repo_v_0_8_0_post_push_audit_rule]] (rule 9 origin).

**How to apply:** every push to a `2slowDD/*` remote. Run `git log <remote>/<branch>..HEAD --stat --no-merges` to enumerate the push, check the §4.2 significance gate from spec `2026-05-18-p9-doc-debt-closure-design.md`, propose stanzas per §4.2 step 2d, emit audit-anchor `[doc-debt: <closed|skipped|none> — <reason>]` before the YES warning. Self-referential push (this very rule shipping): doc-IS-the-work case, emit `[doc-debt: none — work commit is the doc-debt closure]`.
```

- [ ] **Step 6.2: Verify the file exists and has correct frontmatter**

Use Grep on `C:\Users\dalib\.claude\projects\d--AI-ChatGPT\memory\feedback_p9_doc_debt_closure.md`:
```
pattern: "type: feedback"
output_mode: content
-n: true
```
Expected: one match on the frontmatter line.

```
pattern: "How to apply"
output_mode: count
```
Expected: count = 1.

---

## Task 7: Update `MEMORY.md` index — one new line

**Files:**
- Modify: `C:\Users\dalib\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md`

- [ ] **Step 7.1: Read the current top of MEMORY.md to find the insertion point**

Read lines 1–5 to find where the newest entry is placed (convention: most recent first).

- [ ] **Step 7.2: Insert the new index line at the top of the memory list**

Use Edit. Insert above the current top entry (which is `[AAS 1.4.0 Optimizer Fingerprint Broadening SHIPPED + PUSHED 2026-05-17]`):

```markdown
- [P9 Step 2 = pre-push doc-debt closure (2026-05-18, v0.12.0 unreleased)](feedback_p9_doc_debt_closure.md) — README/CHANGELOG/spec ship in the same push as the work for 2slowDD/* significant pushes; rule 9 Step 1 backward-link sweep enforces skipped-debt closure.
```

- [ ] **Step 7.3: Verify the index line landed**

Use Grep on `C:\Users\dalib\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md`:
```
pattern: "feedback_p9_doc_debt_closure.md"
output_mode: content
-n: true
```
Expected: one match near the top of the file.

---

## Task 8: AC verification grep pass — file-state ACs

**Files:** None modified (read-only verification).

- [ ] **Step 8.1: AC-P9-1 — `~/.claude/CLAUDE.md` P9 block has 3 steps**

Use Grep on `C:\Users\dalib\.claude\CLAUDE.md`:
```
pattern: "Step 1 — Verify the remote default branch"
output_mode: files_with_matches
```
Plus:
```
pattern: "Step 2 — Close doc-debt PRE-push"
output_mode: files_with_matches
```
Plus:
```
pattern: "Step 3 — Stop and display this warning"
output_mode: files_with_matches
```
Expected: all three match. Step 3 (YES warning) wording unchanged from current.

- [ ] **Step 8.2: AC-P9-2 — `github-push-warning.md` "What it does" 3 steps + install block + Notes**

Use Grep on `C:\Users\dalib\claude-compliance-by-D\claude-rules\github-push-warning.md`:
```
pattern: "Close doc-debt PRE-push"
output_mode: count
```
Expected: count ≥ 2 (intro list + install block).

```
pattern: "post-significant-push-audit.md"
output_mode: files_with_matches
```
Expected: one match (Notes composition paragraph).

- [ ] **Step 8.3: AC-P9-3 — `post-significant-push-audit.md` Step 1 amend + install block mirror + Notes cross-ref**

Use Grep on `C:\Users\dalib\claude-compliance-by-D\claude-rules\post-significant-push-audit.md`:
```
pattern: "Skipped-debt sweep first"
output_mode: count
```
Expected: count = 2 (body + install block).

```
pattern: "github-push-warning.md"
output_mode: files_with_matches
```
Expected: one match (Notes cross-ref).

- [ ] **Step 8.4: AC-P9-4 — `README.md` §6 + §9 + composition-table updates**

Use Grep on `C:\Users\dalib\claude-compliance-by-D\README.md`:
```
pattern: "closes doc-debt by proposing"
output_mode: files_with_matches
```
Expected: one match (§6 description).

```
pattern: "Skipped-debt sweep first"
output_mode: count
```
Expected: count ≥ 2 (§9 description + composition table row).

- [ ] **Step 8.5: AC-P9-5 — `CHANGELOG.md` has two new `Changed —` sub-sections**

Use Grep on `C:\Users\dalib\claude-compliance-by-D\CHANGELOG.md`:
```
pattern: "Step 2 — pre-push doc-debt closure"
output_mode: files_with_matches
```
Expected: one match.

```
pattern: "Skipped-debt sweep first"
output_mode: files_with_matches
```
Expected: one match.

- [ ] **Step 8.6: AC-P9-6 — new memory file has frontmatter + body**

Use Grep on `C:\Users\dalib\.claude\projects\d--AI-ChatGPT\memory\feedback_p9_doc_debt_closure.md`:
```
pattern: "type: feedback"
output_mode: count
```
Expected: count = 1.

```
pattern: "\\[\\[feedback_check_remote_branch_before_push\\]\\]"
output_mode: count
```
Expected: count = 1.

- [ ] **Step 8.7: AC-P9-7 — MEMORY.md has one new index line**

Use Grep on `C:\Users\dalib\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md`:
```
pattern: "feedback_p9_doc_debt_closure.md"
output_mode: count
```
Expected: count = 1.

- [ ] **Step 8.8: AC-P9-12 — scope fence**

Run `git -C "C:/Users/dalib/claude-compliance-by-D" status --short` and verify the working tree shows exactly these modified/created files (in any order):
- `claude-rules/github-push-warning.md` (modified)
- `claude-rules/post-significant-push-audit.md` (modified)
- `README.md` (modified)
- `CHANGELOG.md` (modified)
- `docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design.md` (new, from earlier conversation phase)
- `docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design-review.md` (new, from earlier conversation phase)
- `docs/superpowers/plans/2026-05-18-p9-doc-debt-closure.md` (new, from this plan-writing phase)

No other files modified. `feedback_check_remote_branch_before_push.md` confirmed untouched via:
```
git -C "C:/Users/dalib/claude-compliance-by-D" status --short
```
returning no entry for it (the file isn't in this repo — it's in the memory dir, which isn't tracked by this repo's git, so trivially untouched here).

For the memory dir + local CLAUDE.md, manually confirm via Grep that `feedback_check_remote_branch_before_push.md` has unchanged content compared to its current state (no edit needed; just confirm via file existence + first-line check).

---

## Task 9: Local commit in the compliance repo

**Files:** Commit operation, no file modification.

- [ ] **Step 9.1: Stage the compliance-repo changes**

Run from the compliance repo:
```
git -C "C:/Users/dalib/claude-compliance-by-D" add claude-rules/github-push-warning.md claude-rules/post-significant-push-audit.md README.md CHANGELOG.md docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design.md docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design-review.md docs/superpowers/plans/2026-05-18-p9-doc-debt-closure.md
```
Expected: no errors. Verify with `git status --short` showing all 7 files staged (M for the 4 modified, A for the 3 new).

- [ ] **Step 9.2: Show the staged diff for operator review**

Run:
```
git -C "C:/Users/dalib/claude-compliance-by-D" diff --staged --stat
```
Expected: 7 files changed. Operator can request a fuller diff with `--staged` (no `--stat`) if needed.

- [ ] **Step 9.3: Create the local commit**

Run (HEREDOC for multiline message):
```
git -C "C:/Users/dalib/claude-compliance-by-D" commit -m "$(cat <<'EOF'
feat(p9): add Step 2 pre-push doc-debt closure + narrow rule 9 amend

P9 (GitHub Push Warning) gains a new Step 2 between the existing Step 1
(verify remote default branch) and Step 3 (YES warning, renumbered).
On significant pushes, Step 2 inspects what's about to ship, proposes
specific README/CHANGELOG/plan/spec/ADR edits via a five-field stanza,
applies on operator approval (apply / revise / skip doc-debt: <reason>
or natural equivalents), and stages them so docs ship in the same push
as the work. Trivial pushes (per-push aggregate < 20 LOC, version bumps,
typo / copy edits, mechanical chores) skip with one line. Audit-anchor
convention: [doc-debt: <closed|skipped|none> — <reason>] emitted before
Step 3.

Post-Significant-Push Audit (rule 9) Step 1 gains a "Skipped-debt sweep
first." lead sentence: scans this session for [doc-debt: skipped — ...]
lines from P9 Step 2 and forces y/n to y with the named skipped debt as
the close-now set. Mirrored in install block + Notes cross-reference.
Makes the skipped-debt mitigation enforced rather than memory-dependent
(d-review rev 1 Critical fix).

Surfaces touched (7 files):
  - claude-rules/github-push-warning.md (P9: new Step 2 + Notes)
  - claude-rules/post-significant-push-audit.md (rule 9: Step 1 lead)
  - README.md (§6 + §9 + composition table L290-302)
  - CHANGELOG.md (two new Changed entries under [Unreleased])
  - docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design.md
  - docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design-review.md
  - docs/superpowers/plans/2026-05-18-p9-doc-debt-closure.md

Local CLAUDE.md (~/.claude/CLAUDE.md) updated separately — it's not in
this repo. New memory feedback_p9_doc_debt_closure.md + MEMORY.md index
line also outside this repo's tree.

Spec: docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design.md
Plan: docs/superpowers/plans/2026-05-18-p9-doc-debt-closure.md
d-review: ready-to-plan rev 2 (2026-05-18).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
Expected: commit lands with the above message; commit hash returned. `git -C ... status` shows clean working tree.

- [ ] **Step 9.4: Verify the commit and show the resulting log**

Run:
```
git -C "C:/Users/dalib/claude-compliance-by-D" log -1 --stat
```
Expected: the new commit at HEAD, showing 7 files changed.

---

## Task 10: V1 verification — push to 2slowDD (FIRST EXERCISE OF NEW P9 STEP 2)

**Files:** None modified. This is the verification exercise per spec §10.2 V1+V2.

**Important:** This task IS the first runtime exercise of the new P9 Step 2. It will exercise Step 1 (branch verify), Step 2 (doc-debt closure — expected to land in the **doc-IS-the-work edge case** per §4.2 step 2c because the work commit itself edits README + CHANGELOG), and Step 3 (YES warning + push).

- [ ] **Step 10.1: P9 Step 1 — verify remote default branch**

Run:
```
git -C "C:/Users/dalib/claude-compliance-by-D" ls-remote --heads origin
```
(Or `private` if that's the configured remote — confirm before running.) Expected: `main` listed. Confirm the compliance repo pushes to `main`, not `master`.

- [ ] **Step 10.2: P9 Step 2 — doc-debt inspection + significance check + audit anchor**

Run:
```
git -C "C:/Users/dalib/claude-compliance-by-D" log origin/main..HEAD --stat --no-merges
```
Expected: one commit (the Task 9.3 commit), 7 files. Significance gate fires (adds + substantively changes a rule + skill-like feature).

**Doc-IS-the-work check:** The work commit itself edits README + CHANGELOG with the doc closure for this exact push. Per §4.2 step 2c "Doc-IS-the-work edge case": emit:

```
[doc-debt: none — work commit is the doc-debt closure]
```

This is the audit anchor for this push. No separate Step 2 commit is needed; the work commit IS the doc-debt closure.

- [ ] **Step 10.3: P9 Step 3 — display YES warning**

Display this warning in chat (substituting the verified branch from Step 10.1):

```
⚠️  PUSHING TO 2slowDD GITHUB  ⚠️
Repository : github.com/2slowDD/claude-compliance-by-D
Branch     : main
Command    : git push origin main
────────────────────────────────────
This will make changes to your online backup repo.
Confirm? (type YES to proceed)
```

Wait for operator `YES`. Do not proceed to Step 10.4 without it.

- [ ] **Step 10.4: Execute the push only on `YES`**

On operator `YES`:
```
git -C "C:/Users/dalib/claude-compliance-by-D" push origin main
```
Expected: push succeeds; `git log -1` on remote (via subsequent `git fetch + log origin/main -1`) shows the new commit at the tip.

- [ ] **Step 10.5: Trigger Post-Significant-Push Audit (rule 9) — the new lead sentence's first exercise**

Per rule 9 (with the new §4.6 lead sentence just shipped + now active in the local CLAUDE.md):

1. Scan this session for any `[doc-debt: skipped — ...]` line emitted by a P9 Step 2 invocation. (Expected: none — this push used the doc-IS-the-work case and emitted `[doc-debt: none — ...]` instead of `skipped`.)
2. Since no skipped-debt line found, run the existing y/n question:
   > "The push is on the wire. Before moving on:
   > Ratify project docs/plans against what we just shipped — `tasks/todo.md`, design docs, `04-development/*-implementation-plan.md`, roadmap entries, ADRs, README, CHANGELOG?
   > (y/n)"
3. Recommended answer: `n — closed pre-push by P9 Step 2 (doc-IS-the-work case; README + CHANGELOG already in the work commit)`.
4. Proceed to rule 9 Step 2 (F-CHECK-EFF sweep): review the just-pushed changes for ≥ 20 % alternative approaches on any project failure metric. Expected: none — this is a single-rule-amend ship; one-line "none — silence is the failure" emit.

- [ ] **Step 10.6: Optional ledger update (P11)**

If a session-active focus-tasks ledger is set (per `d-focus-tasks` session-gating), emit the post-push ledger update line:
```
[focus-tasks-ledger updated — commit <short-sha> — <ledger path>]
```
If no ledger active this session, skip silently. (Per `d-focus-tasks` session-gating, the session-active ledger choice is already established from earlier in this conversation if at all.)

---

## Self-Review (run before declaring plan complete)

### Spec coverage
- AC-P9-1 → Task 1 + Task 8.1 ✓
- AC-P9-2 → Task 2 + Task 8.2 ✓
- AC-P9-3 → Task 3 + Task 8.3 ✓
- AC-P9-4 → Task 4 + Task 8.4 ✓
- AC-P9-5 → Task 5 + Task 8.5 ✓
- AC-P9-6 → Task 6 + Task 8.6 ✓
- AC-P9-7 → Task 7 + Task 8.7 ✓
- AC-P9-8 → Task 10 (significant-push dry-run — exercised by V1) ✓
- AC-P9-9 → Deferred per spec §10.2 V3 (trivial-push trace — needs opportunistic future push) — plan acknowledges this as out-of-scope-now.
- AC-P9-10 → Deferred per spec §10.2 V3 (override trace — needs opportunistic future push).
- AC-P9-11 → Partially exercised by Task 10.5 (no-skipped-debt branch). Override branch deferred.
- AC-P9-12 → Task 8.8 (scope fence verification) ✓

### Placeholder scan
No "TBD" / "TODO" / "implement later" / "similar to Task N" / "fill in details" anywhere in this plan. Every step has the exact code, command, or expected output.

### Type consistency
- All references to spec sections (§4.2, §4.6, etc.) consistent across tasks.
- Audit-anchor format `[doc-debt: <state> — <reason>]` consistent across Tasks 1, 2, 3, 5, 6, 10.
- File paths absolute and consistent.
- The "Skipped-debt sweep first." lead-sentence wording is identical in Task 3.2 (body), Task 3.3 (install block mirror), and the verification greps.

### Notes
- Tasks 1, 6, 7 are outside the compliance repo (local CLAUDE.md + memory dir). Their changes are NOT included in the Task 9 commit and are NOT pushed by Task 10. They are local-runtime + memory updates only.
- Task 9 commit + Task 10 push are the only operations that touch shared state.
- Task 10.3 YES warning is a hard checkpoint; no push without operator `YES`.
