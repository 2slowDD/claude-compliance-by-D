# Deploy Reminder Rule

A CLAUDE.md instruction that forces Claude to list every file that needs manual server deployment at the end of any response that modifies code.

## What it does

After every response that changes a file in a project with a manually-deployed server component, Claude appends a deploy section in this format:

```
**Deploy these files to [server]:**
- `relative/path/file.php` → `wp-content/plugins/plugin-name/relative/path/file.php`
```

This applies even for single-file or trivial changes.

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist).

Adjust the server name and plugin path to match your setup.

```markdown
## Deploy Reminder

At the end of every response that modifies a file in any of the project subsystems, always list the files that need to be manually deployed to the server, in this format:

**Deploy these files to [server]:**
- `relative/path/file.php` → `wp-content/plugins/plugin-name/relative/path/file.php`

Include this even for small single-file changes.
```

## Notes

- This is a CLAUDE.md instruction rule, not a Claude Code skill — it lives in your global config, not in `~/.claude/skills/`.
- The rule applies in every project directory where the global CLAUDE.md is loaded.
- Useful for any project where deployments are done manually by copying files to a server.
