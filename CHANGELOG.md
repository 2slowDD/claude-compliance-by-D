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
