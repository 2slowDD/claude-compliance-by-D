# claude-compliance-by-D

Personal Codex / Claude Code compliance rules and skills for WordPress plugin development, local-first workflows, and safe AI-assisted coding.

Nine tools are included:

| Item | Type | Purpose |
|------|------|---------|
| `skills/wp-compliance` | Claude Code skill | Enforces 25 WordPress security rules + Plugin Check review workflow + PHPCS suppression playbook before any WP coding task |
| `skills/d-review` | Claude Code skill | Staff-engineer review of a spec or design doc — flags gaps, inconsistencies, ambiguity, errors, risks, testability issues, and missing acceptance criteria, ending with a go/no-go verdict |
| `skills/d-security` | Claude Code skill | Generic web-app security checklist — auth, API, DB, infra, code hygiene, plus OWASP Top 10 coverage for XSS, SSRF, IDOR, deserialization, and file upload |
| `skills/d-focus-tasks` | Codex / Claude Code skill | Keeps a lightweight project task ledger current across commits, handovers, plans, specs, and followups |
| `skills/d-handover` | Claude Code skill | Builds a copy/paste-ready handover prompt for a fresh agent — read-first sequence, F-* metrics, hard constraints, do-NOT list, specific next action — and updates the project ledger via `d-focus-tasks` before emitting |
| `claude-rules/d-focus-tasks.md` | AGENTS.md / CLAUDE.md rule | Makes task-ledger updates mandatory without manual skill invocation |
| `claude-rules/github-push-warning.md` | CLAUDE.md rule | Forces explicit confirmation before any push to your private GitHub repos |
| `claude-rules/deploy-reminder.md` | CLAUDE.md rule | Forces Claude to list deployable files after code changes that need manual server deployment |
| `claude-rules/local-only-default.md` | CLAUDE.md rule | Makes local-only work the default unless remote action is explicitly requested |
| `claude-rules/post-significant-push-audit.md` | CLAUDE.md rule | After a significant remote push: forces a y/n doc-debt ratification gate, then a F-CHECK-EFF style improvement-opportunity sweep |

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
> `[WP Code Compliance applied — 19 rules active]`

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

A CLAUDE.md instruction that stops Claude before any push to your private GitHub repository and requires explicit "YES" confirmation.

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

A CLAUDE.md instruction that fires **after** any successful remote push of a significant change. Two gates: (1) y/n on whether to ratify project docs/plans against what was just shipped (close doc debt), then (2) a `F-CHECK-EFF`-style sweep for improvement opportunities (efficiency / security / gap-fill) of estimated ≥ 10 % gain that the work surfaced but did not act on. Found items are offered as next-todo follow-ups.

Composes with rule 4 (pre-push warning): pre-push gates the push itself, post-push audit forces the doc-debt + improvement check immediately after.

See [`claude-rules/post-significant-push-audit.md`](claude-rules/post-significant-push-audit.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/post-significant-push-audit.md`.

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
