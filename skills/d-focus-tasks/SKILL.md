---
name: d-focus-tasks
description: Session-gated ledger tracking for project task graphs. Invoked by commit/plan/spec/handover triggers and other participating skills. Prompts the operator once per session to choose an active ledger (or opt out), then auto-updates that ledger on subsequent triggers.
---

# d-focus-tasks

Keeps a lightweight project ledger (`master-tasks.md`) so fresh agents can recover current tasks, commits, plans, followups, and handover state without reading the whole repo.

The skill manages a session-level decision — the operator is prompted ONCE per agent session to choose the active ledger or opt out, then subsequent triggers update silently. Multiple parallel workstreams (CU Scanner Railway, global-skill design, etc.) can coexist because each session locks to a single ledger choice and re-prompts only on explicit operator command.

## Triggers

Run this skill after:
- A successful local commit.
- A remote-only commit/push if its SHA is not already logged.
- Every handover, before writing the handover prompt.
- Approval of any plan, spec, architectural change, or material followup (see definition in the Focus Tasks Ledger Rule).
- Fresh-agent start when the user points to this skill or ledger.
- Invocation from another participating skill (e.g., `d-handover` without a no-ledger flag).

This skill updates local files only. It does not push, publish, deploy, or open PRs.

## Session-state model

The skill maintains an in-context variable `ledger_session_state`:

- `unset` — initial; no qualifying trigger has fired yet.
- `active(<path>)` — ledger writes go to `<path>` for the rest of the session.
- `off` — ledger writes suppressed for the rest of the session.

### Transitions

| From | Event | To |
|---|---|---|
| `unset` | First qualifying trigger | (prompt — see Session-start prompt) → `active(<path>)` or `off` |
| `active(<path>)` | Qualifying trigger | `active(<path>)` (write update) |
| `off` | Qualifying trigger | `off` (silent, no re-prompt) |
| any | `/d-focus-tasks -no-ledger` (or variants) | `off` |
| any | `/d-focus-tasks` (no args) | (prompt) → `active(<path>)` or `off` |
| any | `/d-focus-tasks <path>` | `active(<path>)` (no prompt) |

### State recovery after compaction or context loss

On every qualifying trigger, BEFORE acting:

1. Read in-context `ledger_session_state`.
2. Scan the conversation backward for the most recent `[focus-tasks-session — …]` anchor line.
3. Reconcile:
   - Both agree → proceed.
   - Anchor present, variable lost (compaction) → re-derive state from anchor.
   - Variable present, anchor lost → **anchor-wins-by-absence**: treat as `unset` and re-prompt.
   - Both absent → state is genuinely `unset`. Prompt.
   - Disagree → anchor wins; update variable.
4. `[focus-tasks-session — ledger deactivated]` counts as `off` for recovery.
5. Most recent anchor wins if multiple exist.

The anchor lines are the load-bearing source of truth; the variable is a cache.

## Session-start prompt

When state is `unset` (per recovery) and a qualifying trigger fires, emit this prompt verbatim:

```
Warning, ledger changes are active!

I'll use this ledger file as default in this session:
<default-path-or-"(none found)">

Options:
1. Select a different ledger file
2. Create a new ledger file
3. Do NOT use ledger file in this session

Other candidates found this session:
- <path-1> (last modified <date>)
- <path-2> (last modified <date>)
[...or "(none)"]
```

The operator may respond with `1`, `2`, `3`, a free-text path (treated as Option 1 with that path), or a bare no-ledger phrase like `no ledger` / `no-ledger` (treated as Option 3 — context disambiguates because the operator is answering this prompt).

### Option 2 follow-up

```
Where should the new ledger live? Suggested:
- <project-root-derived-from-touched-paths>\docs\product-docs\master-tasks.md

Reply with the full path, or a directory (master-tasks.md will be appended).
```

Path resolution:
- **Absolute path**: used as-is.
- **Relative path**: resolved against agent's cwd.
- **Path is a directory**: append `master-tasks.md`.
- **Parent directory missing**: ask `Parent directory <X> does not exist. Create it? (Y/N)`. If N, re-prompt for path.
- **File already exists**: ask `File already exists at <X>. Use existing (1) or pick a different path (2)?`. Option 1 transitions to `active(<X>)` without overwriting.

After confirmation, create the file (if new) and transition to `active(<path>)`.

## Candidate discovery

When proposing a default ledger:

### What counts as a "touched path" this turn

- Files the agent has read, edited, written, or staged in the current turn.
- The work-product artifact path — the SKILL.md being designed, the source file being implemented, the spec being approved. NOT the handover prompt; NOT docs transiently read for context.
- Commit target file paths if the trigger is a commit.

### Walk-up rules

1. For each unique touched path, walk up parent directories until a `master-tasks.md` is found. Record each unique result.
2. Walk up from agent's cwd. Add if not already present.
3. Order unique candidates by last-modified time, newest first. Newest = default.

If the candidate list is empty, default proposal is Option 2 (create new) with no path pre-filled.

NO hardcoded project table inside this skill. Add a new project = drop `master-tasks.md` at its root, confirm at next prompt.

## No-ledger flag grammar

The no-ledger flag is detected ONLY when it appears as a CLI-style argument on a skill/command invocation. This prevents false matches in file paths, doc text, commit messages, or this skill's text itself.

### Recognized forms (invocation args only)

- `-no-ledger`
- `-no ledger`
- `--no-ledger`
- `--no ledger`

### Matching rule

A participating skill inspects ONLY its **invocation arg string** — the text immediately following the skill/command name on the invocation line.

Examples (arg string in brackets):
- `/d-handover -no-ledger prep for fresh agent` → `[-no-ledger prep for fresh agent]` → MATCH
- `/d-handover prep tests/no-ledger-suppression.test.js` → `[prep tests/no-ledger-suppression.test.js]` → NO MATCH
- `D-handover, please skip ledger this time` → free-text invocation → NO MATCH

Regex equivalent (case-insensitive): `(?:^|\s)--?no[-\s]ledger(?:$|\s)` against the arg string ONLY. The skill MUST NOT search the broader user message body, surrounding instructions, file contents, or earlier conversation.

If matched, the participating skill MUST NOT invoke `d-focus-tasks` for that invocation. The flag does NOT change session state — it suppresses one invocation only.

### Operator free-text responses

When the operator is responding to the session-start prompt, bare phrases (`no ledger`, `no-ledger`) ARE interpreted as Option 3. Context disambiguates.

## Anchor lines (chat-visible, load-bearing)

Emit these on transitions:

| Trigger | Anchor line |
|---|---|
| Operator picks Option 1 / accepts the default | `[focus-tasks-session — ledger active: <path>]` |
| Operator picks Option 2 (new file) | `[focus-tasks-ledger created — <path>]` then `[focus-tasks-session — ledger active: <path>]` |
| Operator picks Option 3 / no-ledger phrase | `[focus-tasks-session — ledger off]` |
| `/d-focus-tasks -no-ledger` mid-session | `[focus-tasks-session — ledger deactivated]` |
| `/d-focus-tasks <path>` mid-session | `[focus-tasks-session — ledger active: <path>]` |
| Per-update success | `[focus-tasks-ledger updated — <trigger> — <path>]` |
| Per-update on `off` | (silent) |

Emit on their own line, near the top of the response performing the transition. Preserve verbatim in compaction summaries.

## Override-command grammar

| Command | Effect |
|---|---|
| `/d-focus-tasks` | Re-prompt (works from any state) |
| `/d-focus-tasks <path>` | `active(<path>)` no prompt; validates path |
| `/d-focus-tasks -no-ledger` | `off` |
| `/d-focus-tasks -no ledger` | `off` |
| `/d-focus-tasks --no-ledger` | `off` |
| `/d-focus-tasks --no ledger` | `off` |

### Validation-failure for `/d-focus-tasks <path>`

If the path is invalid, unwritable, or parent uncreatable:
- Emit `[focus-tasks — path rejected: <path> — <reason>]`.
- Do NOT change state. Prior state stands.
- Operator can retry.

### Free-text interpretation

Free-text variants are interpreted as override commands ONLY when intent is unambiguous in context:

- "stop using the ledger" (ledger currently active) → unambiguous → `/d-focus-tasks -no-ledger`.
- "deactivate ledger for this task" → unambiguous → same.
- "skip ledger this time" → AMBIGUOUS (one update vs whole session) → ask: `Did you mean (a) skip this one update only, or (b) deactivate the ledger for the rest of the session?`.
- "use the other ledger" → AMBIGUOUS (which?) → trigger session-start re-prompt.

When ambiguous, ask before changing state.

## Subagent inheritance

Each subagent gets its own `ledger_session_state` initialized to `unset`. The parent can pre-set state via tokens in the subagent prompt:

### Token grammar

- **`ledger=<path>`** (equals sign — NOT colon, to avoid collision with Windows `D:\…` paths) → subagent starts in `active(<path>)`, no prompt.
- **Any dashed no-ledger flag** (per Matching rule above) → subagent starts in `off`, no prompt.

`ledger=<path>` uses split-on-first-equals: everything after the first `=` (trimmed) is the path.

Examples:
- `ledger=D:\AI\CU\docs\product-docs\master-tasks.md` → path: `D:\AI\CU\docs\product-docs\master-tasks.md`
- `ledger=/home/user/project/master-tasks.md` → path: `/home/user/project/master-tasks.md`
- `-no-ledger` → state `off`

### Precedence

If the subagent prompt contains BOTH `ledger=<path>` AND a no-ledger token, **no-ledger wins**. State becomes `off`. Rationale: safer default; a stale `ledger=` token in a copy-pasted template should not silently activate a ledger.

### Absence

If neither token is present, the subagent runs the session-start prompt on its first qualifying trigger.

## Update rules

When state is `active(<path>)` and a trigger fires:

- Deduplicate by full commit SHA first, then linked plan/spec path.
- Local commit: add/update the matching task with date, short SHA, purpose, status, next action.
- Remote-only commit: check the ledger first; add only if no matching SHA exists.
- Handover with no commit: record `commit: none yet`, status `active` / `followup` / `pending decision`; update same row when committed.
- Do not paste long specs. Link paths, summarize in one short purpose sentence.
- **Preserve historical entries — never delete completed milestones or finished phases.** Old entries remain archived (status-marked) in the same file. The Edit tool's red/green diff visualization on a row being updated or split is normal; no row vanishes from the file as a result of an edit.
- Emit `[focus-tasks-ledger updated — <trigger> — <path>]` on success.

## Locate or Create

Used when bootstrapping a ledger via Option 2 of the session-start prompt. Use the operator-confirmed path. Create the file if it does not exist with a minimal scaffold matching the Ledger Shape below.

## Scope Calibration

Do not undershoot large projects. If the project has multiple repos/plugins, subagents, sub-specs, phase numbers, handover chains, or more than ~20 dated plans/specs, create a fuller ledger rather than a short todo list.

For large projects, include:
- Phase/sub-spec decoder near the top when names overlap.
- Current-work queue with the top active row first.
- Major milestone spine, newest first, bolding foundational stepstones.
- Dedicated section for major subagents/sub-specs/MVP lanes.
- Roadmap section for the current phase family.
- Compact plan/spec register, newest first.
- Dirty/uncommitted state when it affects handover.

Keep lightweight: summarize each row in one sentence, link details. A large-project ledger may be 100-250 lines if that prevents context loss.

## Ledger Shape

Base sections, expanded via Scope Calibration:

1. Fresh-agent start: project root, how to use the file, current next step.
2. Active / next tasks.
3. Approved plans/specs awaiting implementation.
4. Followups and pending decisions.
5. Completed / committed progression.
6. Deferred / canceled.
7. Commit ledger.
8. Handover notes.

Compact rows:

```markdown
| Status | Date | Task | Source | Commit | Purpose | Next |
|---|---:|---|---|---|---|---|
| active | 2026-05-12 | Example | `docs/...plan.md` | none yet | One sentence. | Next action. |
```

## Handover Rule

Every handover must point the fresh agent to the ledger path and mention the current top active row. If you discover uncommitted followups during handover, update the ledger before handing off.

## Participating skills convention

Any skill that wants to invoke `d-focus-tasks` MUST:

1. Inspect its own invocation arg string (NOT broader text) for the no-ledger flag per the Matching rule above.
2. If the flag is present → do NOT invoke `d-focus-tasks` for that invocation.
3. If the flag is absent → invoke `d-focus-tasks` with an appropriate trigger label.

Currently participating skills:
- `d-handover` — see its SKILL.md "Pre-flight: no-ledger flag check" section.

This list will grow. New skills must follow the same convention.
