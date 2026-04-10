# claude-compliance-by-D

Personal Claude Code compliance rules and skills for WordPress plugin development and safe AI-assisted coding workflows.

Three tools are included:

| Item | Type | Purpose |
|------|------|---------|
| `skills/wp-compliance` | Claude Code skill | Enforces 19 WordPress security rules before any WP coding task |
| `claude-rules/github-push-warning.md` | CLAUDE.md rule | Forces explicit confirmation before any push to your private GitHub repos |
| `claude-rules/deploy-reminder.md` | CLAUDE.md rule | Forces Claude to list files to manually deploy after every code change |

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

## 2 — GitHub Push Warning Rule

A CLAUDE.md instruction that stops Claude before any push to your private GitHub repository and requires explicit "YES" confirmation.

See [`claude-rules/github-push-warning.md`](claude-rules/github-push-warning.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/github-push-warning.md`, replacing `YOURNAME` with your GitHub username.

---

## 3 — Deploy Reminder Rule

A CLAUDE.md instruction that forces Claude to list every file needing manual server deployment at the end of any response that changes code.

See [`claude-rules/deploy-reminder.md`](claude-rules/deploy-reminder.md) for the full rule text and install instructions.

### Quick install

Open `~/.claude/CLAUDE.md` and add the block from `claude-rules/deploy-reminder.md`, adjusting the server name and plugin path to match your setup.

---

## Updating the WP compliance skill

When you encounter a new WordPress security issue during a coding session, tell Claude:

> "Add this to the compliance skill: [describe the issue]"

Claude will append a new numbered rule under the correct category, update the checklists if needed, and note the date it was added.

The skill file at `~/.claude/skills/wp-compliance/SKILL.md` is your local source of truth. Pull this repo and re-copy the skill file whenever you want to sync updates.

---

## License

MIT
