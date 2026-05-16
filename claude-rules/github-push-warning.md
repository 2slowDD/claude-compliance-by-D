# GitHub Push Warning Rule

A CLAUDE.md rule that forces Claude to **first verify the remote default branch**, then stop and ask for explicit confirmation, before pushing, force-pushing, or creating a PR to any of your private GitHub repositories.

## What it does

Before executing any `git push`, `git push --force`, `git push --force-with-lease`, or `gh pr create` targeting the configured remote, Claude must:

1. **Verify the remote default branch first.** Run `git ls-remote --heads <remote>` to confirm which branch the repo actually publishes to (`main` vs `master` vs a feature branch) — never assume from the repo name or muscle memory. Misrouting a push to a non-existent or wrong branch silently creates a stale ref or overwrites the wrong line of history.

2. **Stop and display a warning** that includes the verified branch on its own line:

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

- **Step 2 — Stop and display this warning in the chat** (include the verified branch on its own line):

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
