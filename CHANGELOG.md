# Changelog

All notable changes to this repository are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This repo follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — at the package-of-rules level, so:

- **MAJOR** — backwards-incompatible changes to an existing skill or rule (removal, renaming, semantic changes that break callers)
- **MINOR** — a new skill, a new rule, or a non-breaking capability added to an existing one
- **PATCH** — wording fixes, typos, install-instruction tweaks

Dates are YYYY-MM-DD. Pre-1.0 — breaking changes may still ship in MINOR releases; the bar goes up at 1.0.0.

---

## [Unreleased]

---

## [0.11.1] — 2026-05-13

### Fixed — `skills/d-handover/SKILL.md`

Broaden the v0.11.0 pre-flight no-ledger clause from "gates Steps 5 + 10" to "gates Steps 3, 4, 5, 10 + omits Step 7.4 ledger-row auto-pre-fill + adjusts Step 11 audit footer `ledger path` field".

**Bug:** the v0.11.0 clause skipped only the `d-focus-tasks` pre-flight call (Step 5) and the post-emit ledger touch (Step 10), but left Step 3 (locate ledger) and Step 4 (ledger ↔ session topic mismatch) running. On the canonical use case of `-no ledger` — a handover for work unrelated to the active project ledger — Step 4's keyword-overlap mismatch check would **halt the skill** and ask "is this current work a sub-thread of the active row, or does the ledger need updating?" — even though the operator had already explicitly said no-ledger via the flag. The flag is precisely meant to bypass that question. Additionally, Step 7.4's auto-pre-fill of the ledger top row in the must-read list would surface a ledger that is unrelated to the handover's content, misleading the fresh agent.

**Fix:** when `no_ledger=true`, the entire ledger interaction is now out of scope. Steps 3, 4, 5, 10 all skip; Step 7.4's auto-pre-fill of the ledger top row in the must-read list is omitted (operator supplies all entries manually via intake Q4); the Step 9.1 `{{READ_FIRST_NUMBERED_LIST}}` placeholder rendering also omits the ledger-row prefix; Step 11 audit footer reads `skipped (no-ledger flag)` for `ledger pre-flight P11 line`, `ledger post-emit P11 line`, AND `ledger path` fields.

**Surfaced by** an operator behaviour-trace 2026-05-13 immediately after the v0.11.0 push: "In that `-no ledger` case why is `locate ledger (cwd/keyword/recency heuristics) → check for ledger ↔ session topic mismatch` still working?"

### Changed — `README.md`

§5 (D-handover Skill) gains an explicit subsection "Suppressing the ledger for one handover — `-no-ledger` flag" with example invocation, the full list of what the flag suppresses (4 step skips + 2 placeholder/render omissions + 3 audit-footer field overrides), the canonical use case (handover unrelated to any project ledger), and the safety note that the flag is matched against the d-handover invocation arg string only (CLI-arg-only — no false positives on file paths like `tests/no-ledger-helpers.test.js`).

### Commits
- `fix(d-handover): broaden -no-ledger pre-flight skip to Steps 3, 4 + Step 7.4 + Step 11 ledger-path field`
- `docs(readme): mention -no-ledger flag in §5 d-handover section`
- `chore: release v0.11.1`

---

## [0.11.0] — 2026-05-13

### Changed — `skills/d-focus-tasks/SKILL.md`

Full rewrite around a session-state model (`unset` / `active(<path>)` / `off`). Replaces the prior model where the skill wrote to a hardcoded ledger path on every trigger.

**New behaviour:**
- **Session-start prompt** on first qualifying trigger: operator picks one of 3 options — select a different ledger / create a new one / no ledger for this session. Choice is anchored in chat via `[focus-tasks-session — ledger active: <path>]` or `[focus-tasks-session — ledger off]` so it survives compaction.
- **Override commands**: `/d-focus-tasks -no-ledger` (deactivate), `/d-focus-tasks` (re-prompt), `/d-focus-tasks <path>` (switch). Free-text overrides honoured only when intent is unambiguous in context.
- **No-ledger flag grammar**: CLI-arg-only matching (`(?:^|\s)--?no[-\s]ledger(?:$|\s)` against the invocation arg string, never broader text). Prevents false positives on file paths (`tests/no-ledger-helpers.test.js`), doc content, commit messages, or the spec text itself.
- **Subagent inheritance tokens**: `ledger=<path>` (equals sign — avoids Windows `D:\…` colon collision) and dashed no-ledger flags. If both tokens present, no-ledger wins (safer default).
- **State-recovery contract**: anchor lines are the load-bearing source of truth; the in-context variable is a cache. Anchor-wins-by-absence on conflict — if the anchor is lost in compaction but the variable persists, re-prompt rather than write to a stale ledger.
- **Candidate discovery**: walks up from touched paths + cwd to find existing `master-tasks.md` files. No hardcoded project table inside the skill.
- **History preservation rule preserved**: never delete completed milestones from a ledger on edit.

**Why:** the prior model wrote to `docs/product-docs/master-tasks.md` relative to project root on every trigger, which polluted unrelated project ledgers when the agent worked across multiple project trees in one session (e.g., a CU Scanner work-track + a global skill design work-track using the project docs folder as a writing surface). The workaround was per-session operator directives like "do NOT invoke d-focus-tasks for this skill design work" — tedious, error-prone, and easy to forget. The session-gating model makes the choice explicit and durable across the session.

**Surfaced by** the `d-handover` skill authoring session on 2026-05-13, where the operator had to manually suppress d-focus-tasks invocations to keep skill-design rows out of the CU Scanner ledger. The fix generalizes the suppression into the skill itself with operator-consent semantics.

### Added — `skills/d-focus-tasks/specs/`

Co-located design artifacts for the v0.11.0 rewrite:
- `2026-05-13-session-gating-design.md` (R1 — d-review verdict: ready-to-plan).
- `2026-05-13-session-gating-design-review.md` (d-review R0 verdict `needs-revision` + R1 verdict `ready-to-plan` with 5 nits suppressed).
- `2026-05-13-session-gating-plan.md` (8-task implementation plan).

### Changed — `skills/d-handover/SKILL.md`

Added a `## Pre-flight: no-ledger flag check (gates Steps 5 + 10)` section between the Triggers and Execution Sequence sections. The section inspects the `d-handover` invocation arg string for any of `-no-ledger` / `-no ledger` / `--no-ledger` / `--no ledger` (case-insensitive, CLI-arg-only matching per the d-focus-tasks grammar). When matched, both Step 5 (d-focus-tasks pre-flight ledger update) and Step 10 (final ledger touch) are skipped entirely; Step 11 audit-footer fields `ledger pre-flight P11 line` and `ledger post-emit P11 line` read `skipped (no-ledger flag)`. The flag suppresses one invocation only and does not change d-focus-tasks session state.

Implements the §12 ledger-interaction clause from the d-focus-tasks v0.11.0 design spec.

### Changed — `claude-rules/d-focus-tasks.md`

Rule Block rewritten to match the new session-gating model. Triggers list now includes "material followup" with an explicit definition (introduces a new spec/plan, materially shifts task graph, or changes risk profile — routine cleanup is NOT material). Rule Block describes the 3-option prompt, anchor-line contract, override commands, and the no-ledger flag grammar that participating skills must honour. Preserve-history and visible-confirmation behaviours retained but reframed under the new model — anchor lines (`[focus-tasks-session — …]`) are now the durable session-state record across compaction. Notes section documents the session-gating motivation and the no-ledger flag false-positive guard.

### Changed — `README.md`

§4 (Focus Tasks Ledger Skill) gains a one-paragraph session-gating summary pointing at the new 3-option prompt, override commands, participating-skill flag suppression, and the CLI-arg-only matching rule that protects against false positives on file paths.

### Commits
- `feat(d-focus-tasks): session-gated ledger tracking with operator consent`
- `feat(d-handover): no-ledger flag pre-flight clause`
- `feat(claude-rules/d-focus-tasks): rewrite rule block for session gating`
- `chore: release v0.11.0`

---

## [0.10.0] — 2026-05-13

### Added — `skills/d-handover`

A new Claude Code skill that packages saturated-context work into a copy/paste-ready handover prompt for a fresh agent. The skill walks an 11-step execution sequence: verify global CLAUDE.md → resolve `project_root` + `profile_key` (CU / wpservice-saas / AI-Assets-Scanner / claude-skill-dev / other) → locate the ledger (multi-ledger disambiguation by cwd-ancestor + keyword-overlap + recency) → detect ledger/session topic mismatch → invoke `d-focus-tasks` for the P11 pre-flight ledger update → auto-detect F-* priority (memory → project CLAUDE.md → recent specs; 14-day staleness flag) → structured intake (topic slug + state summary + first action enum + must-read sequence + project-aware constraint defaults + do-NOT list) → single-pass complexity classifier (6 flags; ≥2 = load-bearing) → render templates → final ledger touch (if load-bearing) → print 11-field audit footer.

**What it produces:**
- An inline copy/paste prompt in a single fenced code block, structured per `templates/inline-prompt.md`.
- For load-bearing handovers, a `<date>-<slug>-handoff.md` document under `docs/product-docs/04-development/` matching `templates/handoff-doc.md`.
- A P11 confirmation strip (`[focus-tasks-ledger updated — handover prep — <path>]`, plus a second `… — handover doc written — …` line for load-bearing) that lets the operator verify the ledger update fired from chat alone.

**Why:** when a session's context window saturates mid-project, the operator needs to boot a fresh agent into the same work without losing F-* framing, hard constraints, read-first sequence, or the specific next action. Today this is a manual ritual with inconsistent quality and high risk of forgetting one of: ledger update (P11), F-* priority, P9 push gate, the "what NOT to do" list, or the specific next-skill invocation. The skill turns the ritual into a structured artifact-builder with built-in P11 compliance.

**Surfaced by** repeated context-saturation handovers across the CU scanner project (mobile-determinism instrumentation 2026-05-11, Adaptive Visual-Diff Wrapper 2026-05-13) where each handover required ~30 minutes of hand-crafting a load-bearing doc plus a kickoff prompt — and each had small inconsistencies (forgotten F-* priority line, wrong hard-constraint set, ambiguous next-skill invocation) that the receiving fresh agent had to surface and clarify before starting real work.

### Added — `skills/d-handover/templates/`

Two skeleton files used by the skill at render time:

- `templates/inline-prompt.md` — the single fenced copy/paste block with 10 placeholders (`{{LEAD_PARAGRAPH}}`, `{{NEXT_SKILL}}`, `{{FIRST_ACTION_VERB}}`, `{{READ_FIRST_NUMBERED_LIST}}`, `{{CARRY_OVER_FRAMING_OR_EMPTY}}`, `{{HARD_CONSTRAINTS_BULLETS}}`, `{{F_STAR_PRIORITY_INLINE}}`, `{{HANDOFF_DOC_REF_PARENTHETICAL_OR_EMPTY}}`, `{{DO_NOT_LIST}}`, `{{KICKOFF_INSTRUCTION}}`).
- `templates/handoff-doc.md` — the load-bearing document skeleton with 6 numbered sections (§0 read-first, §1 picking-up paragraph, §2 first action, §3 framing, §4 hard constraints, §5 do-NOT list, §6 start).

Templates are externalised (not inlined in `SKILL.md`) so the output format can be tuned without touching skill behaviour.

### Changed — `README.md`

- Intro count updated `Eight tools` → `Nine tools`.
- Tool table gains a new row for `skills/d-handover` immediately after `skills/d-focus-tasks`.
- New "## 5 — D-handover Skill" section inserted between section 4 (Focus Tasks Ledger Skill) and the rule sections, with Install + Verify steps mirroring the existing skill sections.
- Rule sections renumbered: 5 → 6 (GitHub Push Warning), 6 → 7 (Deploy Reminder), 7 → 8 (Local-Only Default), 8 → 9 (Post-Significant-Push Audit). Mirrors the v0.9.0 renumbering precedent when `d-focus-tasks` was inserted at section 4.

### Commits
- `feat(d-handover): scaffold skill — frontmatter + triggers`
- `feat(d-handover): execution sequence + CLAUDE.md verify + root/profile resolution`
- `feat(d-handover): ledger location + keyword-overlap + mismatch detection`
- `feat(d-handover): d-focus-tasks invocation + F-* auto-detection`
- `feat(d-handover): structured intake + constraint defaults + classifier`
- `feat(d-handover): render rules + inline-prompt + handoff-doc templates`
- `feat(d-handover): final ledger touch + audit footer`
- `feat(d-handover): failure modes + NOT-list + ACs self-check`
- `docs(readme): add d-handover skill section + tool table row; renumber rules 5-8 -> 6-9`
- `chore: release v0.10.0`

---

## [0.9.1] — 2026-05-12

### Changed — `claude-rules/d-focus-tasks.md`

Added a **visible-confirmation clause** to the Rule Block + a matching Notes paragraph. Every ledger update must now print a one-line status to chat:

```
[focus-tasks-ledger updated — <trigger> — <ledger path>]
```

Where `<trigger>` is one of: `commit <short-sha>`, `plan approved`, `spec approved`, `architectural change`, `handover prep`, or `material followup`.

**Why:** a rule that fires silently is operationally indistinguishable from a rule that never fired. Without a visible confirmation, operators can't verify the rule is active from the chat transcript alone — they'd have to grep diffs or open the ledger file to confirm anything happened. Format mirrors the existing `[WP Code Compliance applied — N rules active]` precedent.

**Surfaced by** a live-session operator question after v0.9.0 install: "how would I know it has updated the ledger?" The implicit answer ("you'd see the diff in master-tasks.md") wasn't sufficient — operators monitoring a long-running session need an in-flow signal.

### Commits
- `feat(d-focus-tasks): add visible-confirmation clause`
- `chore: release v0.9.1`

---

## [0.9.0] — 2026-05-12

### Added
- **`skills/d-focus-tasks`** — portable Codex / Claude Code skill for maintaining `docs/product-docs/master-tasks.md` as a lightweight project ledger across commits, remote-only reconciliation, handovers, approved plans/specs/architecture changes, and followups. Includes large-project scope calibration for multi-repo, multi-phase, sub-spec-heavy projects.
- **`claude-rules/d-focus-tasks.md`** — project/global instruction block that makes focus-ledger updates mandatory without waiting for manual skill invocation. **Preserve-history clause** added during runtime install: split or update rows in place; never delete completed milestones; the Edit tool's red/green diff visualization on a row update is not content loss. Surfaced after a real-session incident where a row-split during ledger update produced alarming-looking red/green diffs that the operator initially read as deletions.

### Changed
- **`README.md`** — adds d-focus-tasks to the tool table and install docs; renumbers later rule sections.

### Commits
- `Add d-focus-tasks ledger skill` (`abe762a`)
- `docs: add d-focus install section` (`83a4d68`)
- `feat(d-focus-tasks): add preserve-history clause` (this release)
- `chore: release v0.9.0` (this release)

---

## [0.8.0] — 2026-05-09

### Added — `claude-rules/post-significant-push-audit.md`

A new CLAUDE.md instruction rule that fires **immediately after** a significant remote push. Composes with rule 4 (`github-push-warning.md`, the pre-push P9 gate): pre-push gates the push itself; post-push gates the next step.

**Significance gate fires if any of:** (a) multi-file refactor / subsystem rewrite / architectural change; (b) the push closed out a written plan (`tasks/todo.md`, `04-development/*-implementation-plan.md`, design or brainstorm spec); (c) push ships a kill-switch flip, default-on flip, or bake closure; (d) push adds or substantively changes a skill, rule, or shipped feature. **Does not fire** on single-file < 20 LOC hotfixes, typo / copy edits, version bumps, single-paragraph doc edits, or mechanical chores. Borderline → run anyway.

When the gate triggers, Claude runs both steps in the same response that confirms the push:

- **Step 1 — Doc-debt y/n gate.** Claude asks verbatim whether to ratify project docs/plans against what was just shipped. `y` → propose specific files + sections, wait for confirmation. `n` → proceed to Step 2 — declining Step 1 does **not** skip Step 2.
- **Step 2 — Improvement-opportunity sweep (F-CHECK-EFF style).** Claude reviews the just-pushed change set and surfaces alternatives that could improve any project failure metric (efficiency / cost / throughput / miss-rate / security / gap-fill) by an estimated ≥ 10 %. One-line-per-item template: `- [one-liner] — F-METRIC, ~N% gain — bundle | defer (reason)`. Found items → offer as **next todo**. None → say so explicitly in one line. **Silence is itself the failure.**

Modeled on the user's `F-CHECK-EFF` discipline floor in `success-failure-metrics.md`: silently passing on a ≥ 10 % gain is the failure, not the bundle-vs-defer judgement call.

### Commits
- `feat: post-significant-push-audit rule`
- `chore: release v0.8.0`

---

## [0.7.0] — 2026-04-24

### Added — `wp-compliance` Rule 26 + Rule 20 false-positive additions

Driven by a real-world Plugin Check audit of a WordPress plugin that exports scan history as a ZIP download. The primary-path code uses `fopen('php://memory')` + `fputcsv` + `ZipArchive::addFromString` + `readfile($tmp)` + `@unlink($tmp)` — all semantically correct and necessary, but each flagged by Plugin Check against `WordPress.WP.AlternativeFunctions.*`. Triage surfaced two distinct patterns:

- **New Rule 26** — `Prefer wp_delete_file() over bare or @-suppressed unlink() for file cleanup.` `wp_delete_file()` is a core WP wrapper around `@unlink()` that runs the value through the `wp_delete_file` filter; it's a drop-in replacement that passes the `unlink_unlink` sniff without any suppression. Includes a caveat for the rare case where you need `@unlink()`'s return value for debug-only error_log on cleanup failure.
- **Rule 20 additions** — two new false-positive entries for `file_system_operations_*` sniffs when the target is a PHP stream wrapper (`php://memory`, `php://output`, `php://temp`, `php://input`) or when `readfile()` streams a server-generated temp file directly to the HTTP response body as binary pass-through. `WP_Filesystem` has no equivalent for either pattern; loading via `file_get_contents()` would blow memory on large archives.

### Commits
- `b5dcc0a` — `feat(wp-compliance): Rule 26 wp_delete_file + Rule 20 stream-wrapper false positives`

---

## [0.6.1] — 2026-04-24

### Changed — `wp-compliance` Rule 20 SUPPRESSION PLAYBOOK

- Documented the stacked-`phpcs:ignore` footgun: two consecutive `phpcs:ignore` lines above the same statement don't chain — the second consumes the first's one-line scope before the target statement, so only the second annotation's sniffs are suppressed. Surfaced during a real Plugin Check audit where the bug passed `php -l` + visual review but still failed the next Plugin Check run (first annotation's sniffs fired on the query line despite the visible directive). Fix: combine all sniffs into a comma-separated list on one annotation, or use `phpcs:disable`/`enable` brackets when you want independent justifications per sniff cluster.
- Placement: inserted between SUPPRESSION PLAYBOOK items 2 (Critical scope rule) and 3 (Name every sniff) as a bolded sub-block with wrong/right examples. No renumbering — future citations of items 3–8 continue to resolve.

### Commits
- `8deb7a5` — `feat(wp-compliance): document stacked phpcs:ignore footgun`

---

## [0.6.0] — 2026-04-23

### Added — `wp-compliance` v2

Driven by a real-world Plugin Check audit + 3-iteration `phpcs:ignore` iteration cycle.

- **Rules 21–25:**
  - **21** — ABSPATH guard required on every plugin PHP file (`defined( 'ABSPATH' ) || exit;`)
  - **22** — LIKE wildcards parameterized via `$wpdb->esc_like() . '%'` as `%s`; never hardcode `LIKE 'prefix.%'` in prepared SQL
  - **23** — `$_SERVER` (HTTP_*/REDIRECT_*/REMOTE_*) treated as untrusted input alongside `$_GET`/`$_POST`
  - **24** — Sanitizer placement must be recognizable to the static sniff — flat + outermost a recognized WP function (no bare `(int)` casts, no nested `trim()`/`wp_unslash` wrappers outside the sanitizer)
  - **25** — JSON input: `wp_unslash` → `json_decode` → sanitize per-value; do NOT `sanitize_text_field` before decode
- **"When Reviewing a Plugin Check / PHPCS Report" workflow section** — 7-step process: triage → fix → meta-check against skill → bullet-list status → never-auto-apply → local-commit-default → sanitize-examples-before-publishing
- **Rule 20 expansion: PHPCS suppression playbook** — placement mechanics learned the hard way:
  - Fix-first principle (suppression is last resort)
  - Directive-to-statement-shape table (`phpcs:ignore` vs `phpcs:disable`/`enable` vs collapse-to-single-line)
  - Critical scope rule: `phpcs:ignore` covers the FIRST line of the next statement only — multi-line SQL strings with interpolated table names need `phpcs:disable`/`enable` blocks
  - Common sniff-cluster reference (custom-table ops, DDL, spread-args, nonce variants)
  - No-blank-line rule, 3+-sniffs-signal-refactor rule, verify-per-batch requirement

### Added
- `LICENSE` — MIT license file at repo root (previously only the "MIT" line in README). *(carried from prior Unreleased)*
- `.gitignore` — baseline entries for secrets (`.env*`, `*.pem`, `*.key`, `id_rsa*`, `secrets.*`, `credentials.*`), OS cruft (`.DS_Store`, `Thumbs.db`), editor folders (`.idea/`, `.vscode/`), and local `tasks/`. Self-consistent with the `d-security` rule that says `.env` must not enter git history.

### Release tracking
- First tagged release. Annotated git tags backfilled for all historical versions (`v0.1.0`…`v0.5.0`) based on CHANGELOG commit references; `v0.6.0` tagged at this commit.

---

## [0.5.0] — 2026-04-21

### Added
- **`skills/d-security`** — generic web-app security checklist skill (authentication, API, database, infrastructure, code hygiene) with OWASP Top 10 coverage for IDOR, XSS, deserialization / supply chain, SSRF, and file upload (~55 checks total).
- **`CHANGELOG.md`** — this file. History before 0.5.0 back-filled from commit log.

### Changed
- **`README.md`** — added `d-security` to the tools table and a new section 3 with install instructions; renumbered downstream sections (GitHub Push Warning → 4, Deploy Reminder → 5, Local-Only Default → 6); corrected the tool count (Four → Six).

---

## [0.4.0] — 2026-04-21

### Added
- **`skills/d-review`** — staff-engineer spec-review skill. Reviews specs that are part of a larger project, flags gaps, inconsistencies, ambiguity, errors, improvements, testability issues, risks, and missing acceptance criteria, and ends with a `ready-to-plan | needs-revision | blocked-on-context` verdict. Writes a severity-grouped review file next to the spec and prints a compact inline summary.

### Changed
- **`README.md`** — added `d-review` to the tools table and a new section 2 with install instructions.

Commit: `2c72931`

---

## [0.3.0] — 2026-04-16

### Added
- **`claude-rules/local-only-default.md`** — makes local-only work the default; requires explicit user authorization in the current session before any remote write.

### Changed
- **`claude-rules/deploy-reminder.md`** — clarified behavior for local-only artifacts: the deploy section is omitted entirely when a change has no server target (no more `n/a` / `none` placeholders).

Commits: `f2e5928`, `c799e3f`

---

## [0.2.0] — 2026-04-10

### Added
- **`claude-rules/deploy-reminder.md`** — forces Claude to list every file requiring manual server deployment at the end of any response that changes deployable code.
- **`skills/wp-compliance`** rule 19 — additional WordPress security rule.

Commit: `9eb4902`

---

## [0.1.0] — 2026-04-10

Initial public release.

### Added
- **`skills/wp-compliance`** — rigid WordPress-plugin security skill (initial 18 rules across input validation / output escaping, capability + nonce pairing, safe SQL via `$wpdb->prepare()`, file upload, SSRF, remote requests, secrets, debug exposure, uninstall cleanup, Plugin Check / PHPCS expectations). Auto-invokes before any WordPress PHP is written, edited, or reviewed.
- **`claude-rules/github-push-warning.md`** — forces explicit `YES` confirmation before any `git push`, force-push, or `gh pr create` that writes to a private backup repo.
- **`README.md`** — tool index, install instructions, update workflow, license.

Commit: `5baa4f9`
