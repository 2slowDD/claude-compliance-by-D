# Focus Tasks Ledger Rule

A project/global instruction rule for keeping a project ledger (`master-tasks.md`) current without requiring the operator to manually invoke `d-focus-tasks`. As of v0.11.0, the skill is **session-gated** — the operator picks the active ledger (or opts out) ONCE per agent session, then subsequent triggers update silently.

Use this rule in project instructions (`AGENTS.md`, `CLAUDE.md`) and global agent instructions for both Codex and Claude Code.

## Rule Block

```markdown
## Focus Tasks Ledger

Several events can require updating a project's ledger:
- Successful local commit
- Remote-only commit reconciliation
- Approved plan / spec / architectural change / material followup — for a spec or plan, "approved" = **the revision that CLEARS external d-review** (`ready-to-plan` / operator go). **Intermediate fold rounds (rN `needs-revision` → Rev N+1 → re-review) do NOT write the ledger** — not the folding agent, not the d-review agent; the chain lives in the spec header's chain line + the `…-review-rN.md` files (operator ruling 2026-08-26). A handover mid-chain records the current Rev once (handover trigger); a fold that surfaces a material followup files that followup's row, not the revision.
- Handover prep (before writing a handover prompt)

**"Material followup"** = a followup item that introduces a new spec/plan, materially shifts the project's task graph, or changes its risk profile. Routine cleanup (typo fixes, lint, comment-only changes, single-line obvious fixes that introduce no new test surface) is NOT material.

When any of these fire, invoke the `d-focus-tasks` skill. The skill manages a session-level decision about which ledger (if any) applies, and writes the update. It will:

- On the first qualifying trigger of the session: prompt for the active ledger (default proposal, alternatives, or "no ledger for this session"). The operator's choice is anchored in chat via `[focus-tasks-session — …]` lines for the rest of the session.
- On subsequent triggers: write to the chosen ledger and emit `[focus-tasks-ledger updated — <trigger> — <path>]`, OR stay silent if the operator opted out.
- Honour mid-session overrides via `/d-focus-tasks -no-ledger` (deactivate), `/d-focus-tasks` (re-prompt), or `/d-focus-tasks <path>` (switch).
- **Preserve historical entries on every ledger edit — never delete completed milestones or finished phases.** Old entries remain archived (status-marked) in the same file. The Edit tool's red/green diff visualization on a row being updated or split is normal; the rule is that no row vanishes from the file as a result of an edit.
- **Missing-ledger handling**: if the trigger fires and no `master-tasks.md` exists anywhere on the candidate list, the session-start prompt's default proposal is Option 2 (create new). The operator confirms or picks Option 3. This replaces the old "ask once if missing" prompt — it is now folded into the session-start prompt.

Skills that participate in this system (e.g., `d-handover`, future skills) must check their invocation arg string for the no-ledger flag (`-no-ledger`, `-no ledger`, `--no-ledger`, `--no ledger`, case-insensitive). When the flag is present, they MUST NOT invoke `d-focus-tasks` for that invocation. The flag does not change session state — it suppresses one invocation only. See the d-focus-tasks skill's "No-ledger flag grammar" section for the canonical CLI-arg-only matching rule.

Do not wait for the operator to invoke `d-focus-tasks` manually after each triggering event. The triggers are automatic; only the first-time-in-session 3-option prompt is interactive.
```

## Notes

- This rule only updates local project documentation. It does not authorize pushes, deploys, PR creation, or any other remote write.
- Git hooks can help with commits later, but they cannot catch handovers, so this instruction rule remains required.
- **Session-gating model (v0.11.0+):** before this version, the rule mandated writes to a single hardcoded ledger path on every trigger, which polluted unrelated project ledgers when the agent worked across multiple project trees in one session (e.g., a project work-track + a global skill design work-track using the project's docs folder as a writing surface). The workaround was per-session operator directives like "do NOT invoke d-focus-tasks for this skill design work" — tedious and error-prone. The session-gating model makes the choice explicit and durable across the session.
- **The preserve-history clause** exists because the Edit tool's diff visualization (old text in red, new text in green) on a row update can look alarming if the operator interprets red as deletion. The clause both prevents accidental deletions during row splits/updates AND documents the red/green visualization so future agents can reassure the operator without re-deriving the reasoning.
- **The visible-confirmation clause is now structured around session-state anchor lines.** Anchor lines (`[focus-tasks-session — ledger active: <path>]`, `[focus-tasks-session — ledger off]`, `[focus-tasks-session — ledger deactivated]`) are load-bearing across compaction: agents preparing compaction summaries MUST preserve the most recent session-state line verbatim. Per-update success lines (`[focus-tasks-ledger updated — <trigger> — <path>]`) remain emit-on-every-write, mirroring the existing `[WP Code Compliance applied — N rules active]` precedent.
- **No-ledger flag false-positive guard:** the flag is matched on invocation arg strings ONLY, never on broader text. A file path like `tests/no-ledger-helpers.test.js` in a staged commit's file list does NOT match. A doc that contains the literal string "no ledger" being read by the agent does NOT match. The regex `(?:^|\s)--?no[-\s]ledger(?:$|\s)` is applied case-insensitively against the arg string of the participating skill's invocation.
