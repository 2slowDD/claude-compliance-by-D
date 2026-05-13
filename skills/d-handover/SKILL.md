---
name: d-handover
description: Use when context is saturated and work must be handed off to a fresh agent. Builds a copy/paste-ready handover prompt with read-first sequence, F-* metrics, hard constraints, do-NOT list, and a specific next action. Updates the project ledger (master-tasks.md) via d-focus-tasks BEFORE emitting the prompt. Triggers on "handover", "hand off", "hand this off", "fresh agent", "fresh session", "context saturated", "context window full", "D-handover", "/d-handover", "create a handover prompt", "package this for a fresh session".
---

# d-handover — Fresh-Agent Handover Prompt Builder

Build a copy/paste-ready prompt that boots a fresh agent into saturated-context work without losing F-* framing, hard constraints, must-read sequence, or the specific next action. The skill updates the project ledger (`master-tasks.md`) via a hard sub-step invocation of `d-focus-tasks` BEFORE emitting the prompt, so the fresh agent's first read target reflects the handover.

## Triggers

The skill fires on operator phrasing including:
- "handover", "hand off", "hand this off"
- "fresh agent", "fresh session"
- "context saturated", "context window full"
- "D-handover", "/d-handover"
- "create a handover prompt", "package this for a fresh session"

If the operator pastes a current-state summary and says "package this for a fresh session", use that summary directly instead of asking intake Q2.
