# GitHub Push Warning Rule

A CLAUDE.md rule that forces Claude to **first verify the remote default branch**, then stop and ask for explicit confirmation, before pushing, force-pushing, or creating a PR to any of your private GitHub repositories.

## What it does

Before executing any `git push`, `git push --force`, `git push --force-with-lease`, or `gh pr create` targeting the configured remote, Claude must:

1. **Verify the remote default branch first.** Run `git ls-remote --heads <remote>` to confirm which branch the repo actually publishes to (`main` vs `master` vs a feature branch) — never assume from the repo name or muscle memory. Misrouting a push to a non-existent or wrong branch silently creates a stale ref or overwrites the wrong line of history.

2. **Close doc-debt PRE-push** *(new Step 2 — added 2026-05-18)*. For significant pushes, inspect what is about to ship against project docs (`README.md` / `CHANGELOG.md` / plan / spec / ADR), propose specific edits inline, apply on operator approval, and stage them so they land in the same push as the work. Trivial pushes (per-push aggregate < 20 LOC, version bumps, typo / copy edits, mechanical chores) skip with one line. Operator can `skip doc-debt: <reason>` to bypass; skipped debt is re-flagged by the post-push Rule 9 Step 1 "Skipped-debt sweep first." backward-link. Emit `[doc-debt: <closed|skipped|none> — <reason>]` as the audit anchor before Step 3.

3. **Stop and display a warning** that includes the verified branch on its own line:

```
⚠️  PUSHING TO [REPO] GITHUB  ⚠️
Repository : github.com/yourname/repo
Branch     : <verified branch from step 1>
Command    : git push origin main
────────────────────────────────────
This will make changes to your online repo.
Confirm? (type YES to proceed)
```

Claude will not execute the push until you explicitly confirm with "YES".

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist).

Adjust the repo owner name (`2slowDD` in the example below) and remote name (`private`) to match your setup. If you maintain multiple repos under the same owner, list the known `repo → default-branch` mapping so Claude has a sanity-check anchor — but still require the live `git ls-remote` check on every push.

```markdown
## GitHub Push Warning

Before executing ANY push, force-push, or PR to `YOURNAME/*` (your private backup repo at `github.com/YOURNAME`):

- **Step 1 — Verify the remote default branch FIRST.** Before composing the push command, before writing the warning, before hardcoding any `HEAD:<branch>` refspec, run:

\```
git ls-remote --heads <remote-name>
\```

  to confirm which branch(es) exist on the remote and which one this repo pushes to (`main` vs `master` vs a feature branch). Known mapping for this setup: `<repo-A>` = `master`; `<repo-B>` + `<repo-C>` = `main`. **Never assume** — check every time. Misrouting a push to a non-existent or wrong branch silently creates a stale ref or overwrites the wrong line of history.

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
  - `[doc-debt: none — <one-of: trivial push / work commit is the doc-debt closure / already documented in work commit / repo has no documentation surface>]` — when the significance gate did not fire, or the doc-IS-the-work case, or the mixed-work-already-documented case, or the no-doc-surface case.

  **2i — Failure paths.** If `apply` cannot complete cleanly (dirty working tree, merge conflict in the proposed edits, pre-commit hook failure on the docs commit), PAUSE — do not push. Surface the failure with the offending file + hook output, and wait for `retry` / `revise <change>` / `skip doc-debt: <reason>`. Do not proceed to Step 3 with a dirty tree. On successful `retry`, emit the 2h audit-anchor line as if the original apply had succeeded; the retry itself is not separately announced.

- **Step 3 — Stop and display this warning in the chat** (include the verified branch on its own line):

\```
⚠️  PUSHING TO YOURNAME GITHUB  ⚠️
Repository : github.com/YOURNAME/...
Branch     : <verified branch from Step 1>
Command    : <exact git command>
────────────────────────────────────
This will make changes to your online backup repo.
Confirm? (type YES to proceed)
\```

- Do NOT execute the push until the user explicitly confirms with "YES" or equivalent.
- This applies to: `git push`, `git push --force`, `git push --force-with-lease`, `gh pr create`, and any other command that writes to these remotes.
- If the remote is named `private` and points to `YOURNAME`, treat it the same way.
```

Replace `YOURNAME` with your GitHub username throughout, and replace the `<repo-A>` / `<repo-B>` placeholders with your actual repo → branch mapping (or delete that sentence if you only have one repo).

## Notes

- This is a CLAUDE.md instruction rule, not a Claude Code skill — it lives in your global config, not in `~/.claude/skills/`.
- The rule applies in every project directory where the global CLAUDE.md is loaded.
- One-time authorizations ("push this now") do not grant standing permission for future pushes.
- The Step 1 branch check exists because LLMs can confidently hardcode the wrong branch (`main` vs `master`) from training-data muscle memory or a stale memory entry. A two-second `git ls-remote` is cheaper than a misrouted push.
- **Composition with the Post-Significant-Push Audit (`post-significant-push-audit.md`).** Step 2 above closes doc-debt **before** the push. Rule 9 Step 1 (post-push) now carries a new "Skipped-debt sweep first." lead sentence that grep-scans the session transcript for any `[doc-debt: skipped — ...]` audit-anchor line emitted by Step 2 and forces y/n to `y` with the skipped debt named as the close-now set when found. For non-`2slowDD`-style remotes (where this rule does not apply), rule 9 Step 1 remains the only doc-debt closure path. The new Step 2 also handles the *doc-IS-the-work edge case* (the work commit itself edits README/CHANGELOG) by emitting `[doc-debt: none — work commit is the doc-debt closure]` and proceeding to Step 3 without a separate Step 2 commit.
