# claude-compliance-by-D

Personal Codex / Claude Code compliance rules and skills for WordPress plugin development, local-first workflows, and safe AI-assisted coding.

Thirteen tools are included:

| Item | Type | Purpose |
|------|------|---------|
| `skills/wp-compliance` | Claude Code skill | Enforces 27 WordPress security rules + Plugin Check review workflow + PHPCS suppression playbook before any WP coding task |
| `skills/d-review` | Claude Code skill | Staff-engineer review of a spec or design doc — flags gaps, inconsistencies, ambiguity, errors, risks, testability issues, and missing acceptance criteria, ending with a go/no-go verdict |
| `skills/d-security` | Claude Code skill | Generic web-app security checklist — auth, API, DB, infra, code hygiene, plus OWASP Top 10 coverage for XSS, SSRF, IDOR, deserialization, and file upload |
| `skills/d-focus-tasks` | Codex / Claude Code skill | Keeps a lightweight project task ledger current across commits, handovers, plans, specs, and followups |
| `skills/d-handover` | Claude Code skill | Builds a copy/paste-ready handover prompt for a fresh agent — read-first sequence, F-* metrics, hard constraints, do-NOT list, specific next action — and updates the project ledger via `d-focus-tasks` before emitting |
| `skills/d-test-assumptions` | Claude Code skill | Drives assumption-based reasoning to a tested 🟢 CONFIRMED / 🔴 REFUTED verdict before an approach locks in, and quick-tests easily-verifiable code segments against spec after implementation |
| `claude-rules/d-focus-tasks.md` | AGENTS.md / CLAUDE.md rule | Makes task-ledger updates mandatory without manual skill invocation |
| `claude-rules/github-push-warning.md` | CLAUDE.md rule | Forces explicit confirmation before any push to your private GitHub repos |
| `claude-rules/deploy-reminder.md` | CLAUDE.md rule | Forces Claude to list deployable files after code changes that need manual server deployment |
| `claude-rules/local-only-default.md` | CLAUDE.md rule | Makes local-only work the default unless remote action is explicitly requested |
| `claude-rules/post-significant-push-audit.md` | CLAUDE.md rule | After a significant remote push: forces a y/n doc-debt ratification gate, then a F-CHECK-EFF style improvement-opportunity sweep |
| `claude-rules/f-check-eff.md` | CLAUDE.md rule | Forces Claude to surface any alternative approach that could improve a project failure metric by ≥ 20 % during bigger changes — silent passing is the failure |
| `claude-rules/d-assumption.md` | CLAUDE.md rule | Forces Claude to tag every item in a plan or recommendation as ⚠️ Assumption or 🟢 CONFIRMED, each with a short basis note |
| `claude-rules/d-test-assumptions.md` | CLAUDE.md rule | Makes the `d-test-assumptions` skill auto-fire before locking a non-trivial approach and after implementing a verifiable code segment |
| `claude-rules/d-master-ledger-trim.md` | CLAUDE.md rule | Keeps the master task-ledger (`master-tasks.md`) lean at the top — relocates aged `Last updated` history + superseded top-active-rows into a linked archive via a verified, conservation-checked scripted move (reorganize, never delete) |

---

## 1 — WordPress Compliance Skill

A rigid Claude Code skill based on official WordPress security guidance and Plugin Check requirements. Claude invokes it automatically before writing, editing, or reviewing any WordPress plugin or theme PHP code.

**What it covers:**
- Input validation and context-specific output escaping
- Capability checks + nonce pairing (never one without the other)
- Safe SQL with `$wpdb->prepare()` — including the fragment anti-pattern
- File upload, SSRF, and remote request controls
- Secrets, debug exposure, and uninstall cleanup
- Plugin Check / PHPCS compliance expectations

Each time the skill is applied, Claude outputs a visible confirmation line:
> `[WP Code Compliance applied — 27 rules active]`

The skill is designed to grow: when you find a new issue, ask Claude to append it and it will slot into the right category automatically.

### Install

**Step 1 — Copy the skill file**

```bash
mkdir -p ~/.claude/skills/wp-compliance
cp skills/wp-compliance/SKILL.md ~/.claude/skills/wp-compliance/SKILL.md
```

On Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\wp-compliance"
Copy-Item "skills\wp-compliance\SKILL.md" "$env:USERPROFILE\.claude\skills\wp-compliance\SKILL.md"
```

**Step 2 — Add the trigger rule to your global CLAUDE.md**

Open `~/.claude/CLAUDE.md` (create it if it doesn't exist) and add:

```markdown
## WordPress Code Compliance
Before writing, editing, or reviewing any WordPress plugin or theme code (`.php` files in plugin/theme directories, `functions.php`, REST handlers, AJAX handlers, shortcodes), invoke the `wp-compliance` skill.
- This applies in every project directory, not just WP-specific ones
- When the user flags a new security concern during a WP task, append it to `~/.claude/skills/wp-compliance/SKILL.md` under the correct category
```

**Step 3 — Verify**

Start a new Claude Code session and ask it to write any WordPress PHP snippet. You should see the `[WP Code Compliance applied]` banner appear before any code is written.

---

## 2 — D-review Skill

A Claude Code skill that reviews a spec or design doc as a **staff engineer** — pragmatic, rigorous, and honest about what it cannot know. Designed for the common case where the spec under review is one piece of a larger project and Claude has limited context.

**What it covers:**
- **Gaps** — missing requirements, unspecified behaviors, undefined edge cases
- **Inconsistencies** — sections that contradict each other or drift from the architecture
- **Ambiguity** — anything two competent readers would implement differently
- **Errors** — factually wrong, logically impossible, or technically broken claims
- **Improvements / Simplifications** — YAGNI cuts and cleaner alternatives
- **Testability** — requirements that can't be objectively verified
- **Risks / Unknowns** — external deps, perf cliffs, failure modes, security gaps
- **Missing Acceptance Criteria** — "done" not defined for the deliverable

Every run ends with a single verdict: `ready-to-plan`, `needs-revision`, or `blocked-on-context`. The skill writes a full review markdown file next to the spec and prints a compact severity-grouped summary inline.

It does **not** judge scope/decomposition (that is a human call) and it does **not** rewrite the spec — it flags; the author fixes.

### Install

**Step 1 — Copy the skill file**

```bash
mkdir -p ~/.claude/skills/d-review
cp skills/d-review/SKILL.md ~/.claude/skills/d-review/SKILL.md
```

On Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\d-review"
Copy-Item "skills\d-review\SKILL.md" "$env:USERPROFILE\.claude\skills\d-review\SKILL.md"
```

**Step 2 — Verify**

Start a new Claude Code session and say *"D-review this spec"* with a file path or pasted spec text. Claude should auto-detect the input, write the review file, and print the severity summary + verdict.

No CLAUDE.md edit required — the skill auto-triggers on phrases like *"review this spec"*, *"check my spec"*, or *"D-review"*.

---

## 3 — D-security Skill

A Claude Code skill that acts as a **generic web-application security checklist** — the non-WordPress counterpart to `wp-compliance`. Auto-triggers when Claude is building, reviewing, or auditing any web app for security.

**What it covers (~55 checks across 6 categories):**
- **Authentication** — bcrypt/argon2 hashing, httpOnly cookies, JWT hygiene, token expiry/rotation, rate limits, lockout, server-side logout, email verification
- **API Security** — auth on every route, authorization checks, schema-validated input, safe response bodies & error messages, rate limiting, CORS, HTTPS
- **Database** — parameterized queries, least-privilege DB user, private network, tested backups, encryption at rest
- **Infrastructure** — env-var secrets, `.env` not in git history, SSL, non-root server, port hygiene
- **Code** — no production `console.log`, `npm audit` clean, no hardcoded credentials
- **OWASP Top 10 common gaps** — IDOR (broken access control), XSS (context-aware escaping + CSP), deserialization/supply-chain (unsafe deserializers, lockfile integrity), SSRF (private-range blocking, DNS rebinding, scheme allowlist), and File Upload (magic-byte type check, sanitized filenames, re-encoded images)

### Install

**Step 1 — Copy the skill file**

```bash
mkdir -p ~/.claude/skills/d-security
cp skills/d-security/SKILL.md ~/.claude/skills/d-security/SKILL.md
```

On Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\d-security"
Copy-Item "skills\d-security\SKILL.md" "$env:USERPROFILE\.claude\skills\d-security\SKILL.md"
```

**Step 2 — Verify**

Start a new Claude Code session and ask Claude to build or review any web-app feature that touches auth, an API route, file uploads, or outbound HTTP. The skill should auto-trigger from its `description:` field.

No CLAUDE.md edit required (but you can add one if you want a hard trigger like `wp-compliance` has).

---

## 4 — Focus Tasks Ledger Skill

A portable Codex / Claude Code skill for maintaining `docs/product-docs/master-tasks.md` as the current project ledger across commits, handovers, plans, specs, architecture changes, and followups.

Use it when fresh agents need project bearings, after successful local commits, during remote-only commit reconciliation, after approved plans/specs/architecture changes, and before handovers.

**Session gating (v0.11.0):** the first qualifying trigger in any agent session emits a 3-option prompt (select a different ledger / create new / no ledger this session). The operator's choice is anchored in chat for the rest of the session; subsequent triggers update silently. Multiple parallel projects coexist because each session locks to one ledger choice. Mid-session overrides: `/d-focus-tasks -no-ledger` (deactivate), `/d-focus-tasks` (re-prompt), `/d-focus-tasks <path>` (switch). Participating skills (e.g., `d-handover`) can suppress one invocation via a `-no-ledger` flag on their own command line. The flag is CLI-arg-only matched (regex `(?:^|\s)--?no[-\s]ledger(?:$|\s)` against the invocation arg string), so file paths like `tests/no-ledger-helpers.test.js` cannot accidentally trigger suppression.

### Install

Copy the skill into each agent you use:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.codex\skills\d-focus-tasks"
Copy-Item "skills\d-focus-tasks\SKILL.md" "$env:USERPROFILE\.codex\skills\d-focus-tasks\SKILL.md"

New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\d-focus-tasks"
Copy-Item "skills\d-focus-tasks\SKILL.md" "$env:USERPROFILE\.claude\skills\d-focus-tasks\SKILL.md"
```

Then add the rule block from [`claude-rules/d-focus-tasks.md`](claude-rules/d-focus-tasks.md) to project/global instructions so agents update the ledger automatically after commits and before handovers.

---

## 5 — D-handover Skill

A Claude Code skill that packages a saturated-context session into a copy/paste-ready prompt for a fresh agent. The skill walks an 11-step execution sequence: verify global CLAUDE.md → resolve project root and constraint profile → locate the project ledger (handles multi-ledger disambiguation) → detect ledger/session topic mismatch → invoke `d-focus-tasks` to update the ledger BEFORE emitting → auto-detect F-* priority from memory/CLAUDE.md/specs → structured intake → classify complexity (load-bearing doc vs inline-only) → render templates → final ledger touch → print a greppable audit footer.

**What it produces:**
- An inline copy/paste prompt in a single fenced code block (read-first sequence, hard constraints, F-* priority line, do-NOT list, specific kickoff instruction with the next-skill invocation).
- For load-bearing handovers (architectural pivots, paused plans, F-* trade-off tables), also writes a `<date>-<slug>-handoff.md` document under `docs/product-docs/04-development/` that the inline prompt points at.
- A two-line P11 confirmation strip (`[focus-tasks-ledger updated — handover prep — <path>]`) so the operator can verify the ledger update fired without grepping diffs.

**What it does NOT do:** push to remote (P9 stands), commit the handoff doc (operator commits), invent project state, skip `d-focus-tasks` (unless the `-no-ledger` flag is set — see below), or invoke the next-skill on the fresh agent's behalf.

Composes with `d-focus-tasks` (hard sub-step) and the `github-push-warning` rule (P9 gate applies if the fresh agent's next action will eventually push).

### Suppressing the ledger for one handover — `-no-ledger` flag

Invoke as `/d-handover -no-ledger ...` (or `/d-handover -no ledger ...`, `--no-ledger`, `--no ledger` — all case-insensitive). The flag suppresses the **entire ledger interaction** for that single invocation:

- Steps 3 (locate ledger), 4 (ledger/session mismatch check), 5 (`d-focus-tasks` pre-flight), and 10 (final ledger touch) all skip.
- The ledger top row is omitted from the auto-pre-filled must-read list (Step 7.4 / placeholder `{{READ_FIRST_NUMBERED_LIST}}`).
- The Step 11 audit footer reads `skipped (no-ledger flag)` for both ledger P11 line fields and the `ledger path` field.
- The handover prompt is still emitted normally in its single fenced code block.

Use this when the work being handed off is unrelated to any project ledger — e.g. a global-skill design session that touches files only under `~/.claude/skills/`, when the active project ledger lives in a different project tree. The flag is matched against the d-handover invocation arg string ONLY (CLI-arg-only matching per the `d-focus-tasks` no-ledger grammar — it will NOT trigger on file paths like `tests/no-ledger-helpers.test.js` in the conversation). The flag suppresses one invocation only — it does NOT change `d-focus-tasks` session state.

### Install

**Step 1 — Copy the skill files**

```bash
mkdir -p ~/.claude/skills/d-handover/templates
cp skills/d-handover/SKILL.md ~/.claude/skills/d-handover/SKILL.md
cp skills/d-handover/templates/inline-prompt.md ~/.claude/skills/d-handover/templates/inline-prompt.md
cp skills/d-handover/templates/handoff-doc.md ~/.claude/skills/d-handover/templates/handoff-doc.md
```

On Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\d-handover\templates"
Copy-Item "skills\d-handover\SKILL.md" "$env:USERPROFILE\.claude\skills\d-handover\SKILL.md"
Copy-Item "skills\d-handover\templates\inline-prompt.md" "$env:USERPROFILE\.claude\skills\d-handover\templates\inline-prompt.md"
Copy-Item "skills\d-handover\templates\handoff-doc.md" "$env:USERPROFILE\.claude\skills\d-handover\templates\handoff-doc.md"
```

**Step 2 — Verify**

Start a new Claude Code session inside a project with a `docs/product-docs/master-tasks.md` ledger and say *"D-handover"* (or *"hand this off to a fresh agent"*). Claude should walk the 11-step sequence, invoke `d-focus-tasks` to update the ledger (with a visible `[focus-tasks-ledger updated — handover prep — <path>]` line), ask the structured-intake questions, classify complexity, and emit the inline copy/paste prompt in a single fenced code block followed by an audit footer outside the block.

No CLAUDE.md edit required — the skill auto-triggers from its `description:` field. The skill REQUIRES `d-focus-tasks` to be installed and invocable (Step 5 of the execution sequence is a hard sub-step).

---

## 6 — GitHub Push Warning Rule

A CLAUDE.md instruction that stops Claude before any push to your private GitHub repository in three steps: (1) verifies the remote default branch via `git ls-remote --heads`, (2) **closes doc-debt by proposing README/CHANGELOG/plan/spec edits and committing them so they ship in the same push as the work** (significant pushes only — trivial pushes skip with one line; operator can `skip doc-debt: <reason>` to bypass), then (3) requires explicit "YES" confirmation. Composes with the Post-Significant-Push Audit (§9): rule 9 Step 1 carries a "Skipped-debt sweep first." backward-link that closes any debt that was bypassed via the skip override.

See [`claude-rules/github-push-warning.md`](claude-rules/github-push-warning.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/github-push-warning.md`, replacing `YOURNAME` with your GitHub username.

---

## 7 — Deploy Reminder Rule

A CLAUDE.md instruction that forces Claude to list every file needing manual server deployment at the end of any response that changes deployable code. It omits the deploy section entirely for local-only artifacts with no server target.

See [`claude-rules/deploy-reminder.md`](claude-rules/deploy-reminder.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/deploy-reminder.md`, adjusting the server name and plugin path to match your setup.

---

## 8 — Local-Only Default Rule

A CLAUDE.md instruction that makes local work the default and blocks remote writes unless the user explicitly requests them in the current session.

See [`claude-rules/local-only-default.md`](claude-rules/local-only-default.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/local-only-default.md`.

---

## 9 — Post-Significant-Push Audit Rule

A CLAUDE.md instruction that fires **after** any successful remote push of a significant change. Two gates: (1) y/n on whether to ratify project docs/plans against what was just shipped (close doc debt), then (2) a `F-CHECK-EFF`-style sweep for improvement opportunities (efficiency / security / gap-fill) of estimated ≥ 20 % gain that the work surfaced but did not act on. Found items are offered as next-todo follow-ups. As of 2026-05-18 (v0.12.0 unreleased), Step 1 carries a "Skipped-debt sweep first." lead sentence: before asking the y/n question, Claude scans the current session for any `[doc-debt: skipped — ...]` line emitted by P9 Step 2; if found, the y/n is forced to `y` with the named skipped debt as the close-now set. This makes the skipped-debt mitigation enforced rather than operator-memory-dependent.

Composes with rule 6 (pre-push warning): pre-push gates the push itself, post-push audit forces the doc-debt + improvement check immediately after. Shares its threshold with rule 10 (`f-check-eff`).

See [`claude-rules/post-significant-push-audit.md`](claude-rules/post-significant-push-audit.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/post-significant-push-audit.md`.

---

## 10 — F-CHECK-EFF — Improvement Opportunity Surfacing

A CLAUDE.md instruction that applies to **every project**. When Claude is executing a **bigger change** — new phases, sub-specs, multi-file refactors / subsystem rewrites, planned tasks, or reviews of those — it must surface any alternative approach that could improve a project failure metric (efficiency / cost / throughput / miss-rate / security / gap-fill) by an estimated **≥ 20 %**. Shipping the original without flagging the alternative is the failure, regardless of whether the alternative ends up bundled or deferred.

Two shapes: **in-scope detour** (≥ 20 % on the current task's primary metric → pause, surface, ask whether to bundle) and **out-of-scope flag** (≥ 20 % on a different metric → append to the plan's "Follow-ups discovered during this task" or defer to a future spec). Does not fire on single-line fixes, version bumps, single-file isolated patches, single-paragraph doc edits, or mechanical chores. Borderline → run anyway.

Composes with rule 9 (post-significant-push audit): both use the same ≥ 20 % threshold. Rule 10 fires *during* a bigger change; rule 9 fires *after* the push.

See [`claude-rules/f-check-eff.md`](claude-rules/f-check-eff.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/f-check-eff.md`.

### How rules 9 and 10 compose

The two rules are temporally complementary — different attachment points in the workflow, same threshold and same metric. Install both for full coverage; installing only one leaves a gap.

| | **Rule 10 — F-CHECK-EFF** | **Rule 9 — Post-Significant-Push Audit** |
|---|---|---|
| **When it fires** | *During* a bigger change — at plan / design / recommendation / PR-review time, **before** shipping | *After* a significant remote push completes (the `git push` is on the wire) |
| **Trigger surface** | Authoring a plan, brainstorm spec, design doc, multi-file refactor; reviews of bigger changes | `git push`, `git push --force`, `gh pr create` returning success |
| **What it does** | Surfaces ≥ 20 % alternative approaches as you build. Two shapes: in-scope detour (ask: bundle?) or out-of-scope flag (file as follow-up) | Two-step audit: (1) **y/n doc-debt gate** — ratify project docs against what was just shipped; (2) **≥ 20 % improvement-opportunity sweep** on the just-pushed change set |
| **Role** | Forward-looking discipline — catch the better alternative early, before sunk-cost makes the switch harder | Backwards-looking review — backstop if rule 10 missed something, plus the only mechanism that closes documentation debt after a push |
| **Threshold** | ≥ 20 % gain | ≥ 20 % gain (synced) |
| **P9 ↔ Rule 9 doc-debt composition** (new 2026-05-18) | — | **P9 Step 2 closes doc-debt pre-push** for `2slowDD/*`-style remotes (significant pushes only). **Rule 9 Step 1 carries the "Skipped-debt sweep first." backward-link**: scans this session for `[doc-debt: skipped — ...]` lines from P9 Step 2 and forces the y/n to `y` with the skipped debt as the close-now set. For non-`2slowDD`-style remotes (where P9 doesn't apply), rule 9 Step 1 is the primary closure path. See spec at `docs/superpowers/specs/2026-05-18-p9-doc-debt-closure-design.md` §4.6. |

When both are installed, rule 10 should catch most ≥ 20 % alternatives upstream, leaving rule 9's Step 2 to almost always say "none — silence is the failure" in one line. **Step 1 (doc-debt y/n) is the part that does unique work on every significant-push case** — rule 10 does not close doc debt; the new P9 Step 2 (2026-05-18) closes it pre-push for `2slowDD/*`-style remotes, and the backward-link sweep in rule 9 Step 1 enforces closure of any skipped debt.

---

## 11 — Assumption / Confirmation Tagging Rule

A CLAUDE.md instruction that forces Claude to label every item in a plan, recommendation, proposal, design spec, or multi-item answer by the strength of its basis: **⚠️ Assumption** for anything resting on inference or unverified information (including unverified subagent summaries), **🟢 CONFIRMED** for anything backed by verifiable hard data. Every tag carries a short basis note, so the operator can see at a glance which parts of a plan are solid and which still need verification. Tags are inline per item — no separate summary block. Always-on; there is no `/d-assumption` invocation.

See [`claude-rules/d-assumption.md`](claude-rules/d-assumption.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/d-assumption.md`.

---

## 12 — Assumption Testing & Verification Discipline

A Claude Code skill + CLAUDE.md rule pairing that is the **active counterpart** to rule 11 (`d-assumption`). Where `d-assumption` *labels* claims ⚠️ Assumption / 🟢 CONFIRMED, `d-test-assumptions` *acts* on the ⚠️ labels — it drives them to a tested verdict instead of letting them ride as guesses.

**Two phases:**
- **Phase 1 — pre-lock-in assumption audit.** Before any non-trivial approach (architectural weight, or 3+ steps) is presented as "the plan", the skill inventories the load-bearing claims, quantifies the assumption load ("N of M claims are assumptions"), triages each ⚠️ Assumption, tests the testable ones (N≥2; N≥3 on divergence; F-OVERFIT and the usual F-* metrics constrain test design), and emits a per-claim 🟢 CONFIRMED / 🔴 REFUTED / 🟡 INCONCLUSIVE verdict. A refuted load-bearing assumption repositions to the next-best approach — reposition once, then checkpoint with the operator.
- **Phase 2 — post-implementation verification reflex.** After implementing an easily-verifiable code segment, the skill quick-tests it against spec. In line → proceed. Not in line → **PAUSE**, do not patch-and-continue, alert the operator with the mismatch and whether it warrants an architectural rethink.

On by default, with a session-level off switch (`/d-test-assumptions off` / `on`). Output is inline only — no register file.

See [`skills/d-test-assumptions/SKILL.md`](skills/d-test-assumptions/SKILL.md) for the full procedure and [`claude-rules/d-test-assumptions.md`](claude-rules/d-test-assumptions.md) for the rule text.

### Install

**Step 1 — Copy the skill file**

```bash
mkdir -p ~/.claude/skills/d-test-assumptions
cp skills/d-test-assumptions/SKILL.md ~/.claude/skills/d-test-assumptions/SKILL.md
```

On Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\d-test-assumptions"
Copy-Item "skills\d-test-assumptions\SKILL.md" "$env:USERPROFILE\.claude\skills\d-test-assumptions\SKILL.md"
```

**Step 2 — Add the trigger rule to your global CLAUDE.md**

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/d-test-assumptions.md`.

**Step 3 — Verify**

Start a new Claude Code session and ask Claude to recommend an approach for any non-trivial task. Before it locks the approach in, you should see the Phase 1 assumption-load summary and the assumption→test→verdict table. Pairs best with rule 11 (`d-assumption`) installed.

---

## 13 — D-Master-Ledger-Trim Rule

A CLAUDE.md instruction that keeps a project's master task-ledger (`master-tasks.md`, the file maintained by rule 4 / `d-focus-tasks`) **lean at the top** as it accretes history over weeks. The ledger is the first read for every fresh agent and is loaded into context, so an overgrown opening is a recurring context tax. The rule moves aged/superseded **opening** blocks — the chained `Last updated` history (keeping only the newest entry live), the stacked `Previous top active row` entries, and the `Archived milestone progression` section — into a companion `master-tasks-archive.md`, newest-first, **verbatim**. Reorganize, never delete; the working body (How-To-Read, Current Work Queue, registers, commit ledger) stays in the live file.

The load-bearing detail is the **mechanism**: bloated entries are often single physical lines too large to load for the Edit/Write tools (e.g., a `Last updated` line grown to tens of thousands of characters). The only reliable move is a **verified scripted transform**, done safely — operator OK first (it may override a no-script-write tooling policy + mutates a load-bearing file), a `.bak` backup as the first write, and **abort-before-write conservation asserts** (index-coverage so no line is dropped, exact split-concat for any intra-line split, each moved block verbatim-in-archive + absent-from-live, body preserved verbatim) — then a before/after size report. Composes with rule 4 (`d-focus-tasks` appends + status-marks in place; this rule is the periodic hygiene pass that relocates the accumulated history).

See [`claude-rules/d-master-ledger-trim.md`](claude-rules/d-master-ledger-trim.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/d-master-ledger-trim.md`.

---

## Updating the WP compliance skill

When you encounter a new WordPress security issue during a coding session, tell Claude:

> "Add this to the compliance skill: [describe the issue]"

Claude will append a new numbered rule under the correct category, update the checklists if needed, and note the date it was added.

The skill file at `~/.claude/skills/wp-compliance/SKILL.md` is your local source of truth. Pull this repo and re-copy the skill file whenever you want to sync updates.

---

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md) for a version history.

---

## License

MIT
