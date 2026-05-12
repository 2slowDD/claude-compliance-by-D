# Focus Tasks Ledger Rule

A project/global instruction rule for keeping `docs/product-docs/master-tasks.md` current without requiring the operator to manually invoke `d-focus-tasks`.

Use this in project instructions (`AGENTS.md`, `CLAUDE.md`) and global agent instructions for both Codex and Claude Code.

## Rule Block

```markdown
## Focus Tasks Ledger

After every successful local commit, remote-only commit reconciliation, approved plan/spec/architecture change, and before every handover, run the `d-focus-tasks` skill and update `docs/product-docs/master-tasks.md`.

- Do not wait for the operator to invoke `d-focus-tasks`.
- If `master-tasks.md` is missing, ask whether to scan the current project and create a populated ledger or start with a blank ledger.
- For local commits, record the short SHA, date, task/source, purpose, status, and next action.
- For remote-only commits, check for the SHA first; add it only if it is not already logged.
- For handovers without a commit, record uncommitted followups with `commit: none yet`, then update that same row when a commit lands.
- Every handover prompt must point the fresh agent to `docs/product-docs/master-tasks.md` and name the current top active row.
```

## Notes

- This rule only updates local project documentation.
- It does not authorize pushes, deploys, PR creation, or any other remote write.
- Git hooks can help with commits later, but they cannot catch handovers, so this instruction rule remains required.
