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
- **Preserve historical entries.** Split or update rows in place; never delete completed milestones from the ledger. Old / finished entries stay archived (status-marked) in the same file. If the operator sees red/green during a ledger Edit, that is the Edit tool's normal diff visualization for a row being updated or split — historical sections (completed milestones, plan registers, MVP / sub-spec ledgers, roadmaps) must not lose rows.
- **Output a visible confirmation line each time the ledger is updated.** Format: `[focus-tasks-ledger updated — <trigger> — <ledger path>]` where `<trigger>` is one of: `commit <short-sha>`, `plan approved`, `spec approved`, `architectural change`, `handover prep`, or `material followup`. Print this in the same response as the update, on its own line, ideally near the top of the response so the operator sees it before scrolling. Silent ledger updates create the same context-loss problem this rule was designed to prevent.
```

## Notes

- This rule only updates local project documentation.
- It does not authorize pushes, deploys, PR creation, or any other remote write.
- Git hooks can help with commits later, but they cannot catch handovers, so this instruction rule remains required.
- The preserve-history clause exists because the Edit tool's diff visualization (old text in red, new text in green) on a row update can look alarming if the operator interprets red as deletion. The clause both prevents accidental deletions during row splits/updates AND documents the red/green visualization so future agents can reassure the operator without re-deriving the reasoning.
- The visible-confirmation clause exists because a rule that fires silently is operationally indistinguishable from a rule that never fired. The operator must be able to verify the rule is active from the chat transcript alone, without grepping git diffs or opening the ledger file. Format matches the existing `[WP Code Compliance applied — N rules active]` precedent.
