# GitHub Push Warning Rule

A CLAUDE.md rule that forces Claude to stop and ask for explicit confirmation before pushing, force-pushing, or creating a PR to any of your private GitHub repositories.

## What it does

Before executing any `git push`, `git push --force`, `git push --force-with-lease`, or `gh pr create` targeting the configured remote, Claude will stop and display a warning like this:

```
⚠️  PUSHING TO [REPO] GITHUB  ⚠️
Repository : github.com/yourname/repo
Command    : git push origin main
────────────────────────────────────
This will make changes to your online repo.
Confirm? (type YES to proceed)
```

Claude will not execute the push until you explicitly confirm with "YES".

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist).

Adjust the repo owner name (`2slowDD` in the example below) and remote name (`private`) to match your setup.

```markdown
## GitHub Push Warning

Before executing ANY push, force-push, or PR to `YOURNAME/*` (your private backup repo at `github.com/YOURNAME`):

- **Stop and display this warning in the chat:**

\```
⚠️  PUSHING TO YOURNAME GITHUB  ⚠️
Repository : github.com/YOURNAME/...
Command    : <exact git command>
────────────────────────────────────
This will make changes to your online backup repo.
Confirm? (type YES to proceed)
\```

- Do NOT execute the push until the user explicitly confirms with "YES" or equivalent.
- This applies to: `git push`, `git push --force`, `git push --force-with-lease`, `gh pr create`, and any other command that writes to these remotes.
- If the remote is named `private` and points to `YOURNAME`, treat it the same way.
```

Replace `YOURNAME` with your GitHub username throughout.

## Notes

- This is a CLAUDE.md instruction rule, not a Claude Code skill — it lives in your global config, not in `~/.claude/skills/`.
- The rule applies in every project directory where the global CLAUDE.md is loaded.
- One-time authorizations ("push this now") do not grant standing permission for future pushes.
