# Deploy Reminder Rule

A CLAUDE.md instruction that forces Claude to list every file that needs manual server deployment at the end of any response that modifies deployable code.

## What it does

After every response that changes a file in a project with a manually-deployed server component, Claude appends a deploy section only when at least one changed file actually needs manual deployment:

```
**Deploy these files to [server]:**
- `relative/path/file.php` → `wp-content/plugins/plugin-name/relative/path/file.php`
```

This applies even for single-file or trivial changes.

Do not output a deploy section when no changed files are deployable, such as local-only notes, audit packages, generated reports, screenshots, PDFs, evidence files, or other artifacts that have no server target. Do not list `n/a`, `none`, or audit-artifact placeholders.

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist).

Adjust the server name and plugin path to match your setup.

```markdown
## Deploy Reminder

At the end of every response that modifies deployable files in any of the project subsystems, list the files that need to be manually deployed to the server, in this format:

**Deploy these files to [server]:**
- `relative/path/file.php` → `wp-content/plugins/plugin-name/relative/path/file.php`

Include this even for small single-file deployable changes.

If no changed files need deployment, omit the deploy section entirely. Do not output placeholder mappings such as `n/a`, `none`, or `audit artifact only`.
```

## Notes

- This is a CLAUDE.md instruction rule, not a Claude Code skill — it lives in your global config, not in `~/.claude/skills/`.
- The rule applies in every project directory where the global CLAUDE.md is loaded.
- Useful for any project where deployments are done manually by copying files to a server.
- The rule does not apply to local-only deliverables with no server target.
