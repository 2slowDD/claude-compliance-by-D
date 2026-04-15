# Local-Only Default Rule

A CLAUDE.md instruction that makes local-only work the default and prevents remote writes unless the user explicitly asks for them in the current session.

## What it does

When this rule is installed, Claude defaults to local implementation and verification work.

Before executing any action that writes to a remote system, Claude must stop and wait for explicit approval in the current session. This includes pushes, force-pushes, pull request creation, deploys, publishes, and any similar remote write action.

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist).

```markdown
## Local-Only Default

When working on any project for this user:

- Default to local-only work.
- Do not push, publish, deploy, open PRs, or otherwise write to any remote system unless the user explicitly instructs you to do so in the current session.
- If remote action might help, ask first and wait for explicit approval before doing it.
- Treat local implementation, local verification, and local file changes as the standard default path.
```

## Notes

- This is a CLAUDE.md instruction rule, not a Claude Code skill - it lives in your global config, not in `~/.claude/skills/`.
- The rule applies in every project directory where the global CLAUDE.md is loaded.
- This rule complements, but does not replace, more specific push-confirmation rules.
