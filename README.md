# claude-compliance-by-D

Personal Claude Code compliance rules and skills for WordPress plugin development, local-first workflows, and safe AI-assisted coding.

Four tools are included:

| Item | Type | Purpose |
|------|------|---------|
| `skills/wp-compliance` | Claude Code skill | Enforces 19 WordPress security rules before any WP coding task |
| `skills/d-review` | Claude Code skill | Staff-engineer review of a spec or design doc — flags gaps, inconsistencies, ambiguity, errors, risks, testability issues, and missing acceptance criteria, ending with a go/no-go verdict |
| `claude-rules/github-push-warning.md` | CLAUDE.md rule | Forces explicit confirmation before any push to your private GitHub repos |
| `claude-rules/deploy-reminder.md` | CLAUDE.md rule | Forces Claude to list deployable files after code changes that need manual server deployment |
| `claude-rules/local-only-default.md` | CLAUDE.md rule | Makes local-only work the default unless remote action is explicitly requested |

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

## 3 — GitHub Push Warning Rule

A CLAUDE.md instruction that stops Claude before any push to your private GitHub repository and requires explicit "YES" confirmation.

See [`claude-rules/github-push-warning.md`](claude-rules/github-push-warning.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/github-push-warning.md`, replacing `YOURNAME` with your GitHub username.

---

## 4 — Deploy Reminder Rule

A CLAUDE.md instruction that forces Claude to list every file needing manual server deployment at the end of any response that changes deployable code. It omits the deploy section entirely for local-only artifacts with no server target.

See [`claude-rules/deploy-reminder.md`](claude-rules/deploy-reminder.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/deploy-reminder.md`, adjusting the server name and plugin path to match your setup.

---

## 5 — Local-Only Default Rule

A CLAUDE.md instruction that makes local work the default and blocks remote writes unless the user explicitly requests them in the current session.

See [`claude-rules/local-only-default.md`](claude-rules/local-only-default.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/local-only-default.md`.

---

## Updating the WP compliance skill

When you encounter a new WordPress security issue during a coding session, tell Claude:

> "Add this to the compliance skill: [describe the issue]"

Claude will append a new numbered rule under the correct category, update the checklists if needed, and note the date it was added.

The skill file at `~/.claude/skills/wp-compliance/SKILL.md` is your local source of truth. Pull this repo and re-copy the skill file whenever you want to sync updates.

---

## License

MIT
