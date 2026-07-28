# d-focus-tasks Session Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `d-focus-tasks` skill + global P11 rule so ledger updates are session-gated with explicit operator consent, immune to false no-ledger matches, and safe across compaction.

**Architecture:** Single-skill rewrite + one-section CLAUDE.md replacement + memory disposition. All edits land in `~/.claude/`. No code (this is skill-instruction prose); verification is read-through + scenario simulation. No commits until operator approves, no push until operator approves (per `feedback_git_local_default.md`).

**Tech Stack:** Markdown skill instructions; no runtime code.

**Spec source:** [2026-05-13-session-gating-design.md (R1)](C:\Users\Korisnik\.claude\skills\d-focus-tasks\specs\2026-05-13-session-gating-design.md) — d-review verdict `ready-to-plan`.

**Ledger update for THIS plan's work:** none (small-skill workstream — per the spec being implemented, this is Option 3 path).

---

## File Structure

Files this plan creates or modifies:

| Action | Path | Responsibility |
|---|---|---|
| Modify | `C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md` | Full rewrite — new session-gated behaviour, flag grammar, anchor lines, subagent rules, recovery algorithm |
| Modify | `C:\Users\Korisnik\.claude\CLAUDE.md` | Replace P11 section with spec §11 text |
| Modify | `C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_no_cu_ledger_for_global_skill_design.md` | Append SUPERSEDED block |
| Modify | `C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md` | Update index line for the superseded memory + add line for the new memory |
| Create | `C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_d_focus_tasks_session_gating.md` | New reference memory documenting the gating model |

Notes:
- Plan deliberately leaves the d-handover SKILL.md edit for when that skill is authored (per spec §12 + AC-INT-1). No file action here.
- Verification is read-through, not a runnable test suite.

---

## Task 1: Rewrite d-focus-tasks/SKILL.md

**Files:**
- Modify: `C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md` (full rewrite)

This task replaces the entire current SKILL.md content. The new content is given verbatim in Step 2 below.

- [ ] **Step 1: Read current SKILL.md to confirm it matches the version recorded in the spec's §1 context-scan**

Run:
```
Read C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md
```

Expected: file exists, contains the "## Mandatory Project / Global Rule" section that the rewrite replaces.

- [ ] **Step 2: Write the new SKILL.md content (full file replacement)**

Use the Write tool against `C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md` with this exact content:

````markdown
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
- Approval of any plan, spec, architectural change, or material followup (see definition in CLAUDE.md P11).
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
- `ledger=C:\AI\CU\docs\product-docs\master-tasks.md` → path: `C:\AI\CU\docs\product-docs\master-tasks.md`
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
- `d-handover` (when created).

This list will grow. New skills must follow the same convention.
````

- [ ] **Step 3: Verify the new SKILL.md is in place by reading back key anchors**

Run:
```
Grep pattern="Session-state model" path="C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md"
Grep pattern="ledger=<path>" path="C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md"
Grep pattern="anchor-wins-by-absence" path="C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md"
Grep pattern="Preserve historical entries" path="C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md"
```

Expected: all four greps return one match each. If any miss, redo Step 2.

- [ ] **Step 4: Hold for commit**

Do NOT commit yet — Tasks 2 onwards land changes that are paired with this one. Commit gate at Task 8.

---

## Task 2: Replace P11 in CLAUDE.md

**Files:**
- Modify: `C:\Users\Korisnik\.claude\CLAUDE.md` (replace one section)

- [ ] **Step 1: Read current P11 section to capture its exact opening + closing boundaries**

Run:
```
Read C:\Users\Korisnik\.claude\CLAUDE.md
```

Find the section starting with `## P11 — Focus Tasks Ledger` and ending immediately before the next `##` heading (currently `## P8 — Core Principles` — note the ordering preserves the existing numbering quirk).

Expected: P11 currently spans roughly 15-25 lines and includes the lines "After every successful local commit…" through "…then follow the operator's answer."

- [ ] **Step 2: Use Edit tool to replace the entire P11 block**

Use the Edit tool with:
- `old_string`: the exact current P11 section text (from `## P11 — Focus Tasks Ledger` through the last line before the next heading)
- `new_string`: the replacement text below

Replacement text (paste verbatim):

```markdown
## P11 — Focus Tasks Ledger

Several events can require updating a project's ledger:
- Successful local commit
- Remote-only commit reconciliation
- Approved plan / spec / architectural change / material followup
- Handover prep (before writing a handover prompt)

**"Material followup"** = a followup item that introduces a new spec/plan, materially shifts the project's task graph, or changes its risk profile. Routine cleanup (typo fixes, lint, comment-only changes, single-line obvious fixes that introduce no new test surface) is NOT material.

When any of these fire, invoke the `d-focus-tasks` skill. The skill manages a session-level decision about which ledger (if any) applies, and writes the update. It will:

- On the first qualifying trigger of the session: prompt for the active ledger (default proposal, alternatives, or "no ledger for this session"). The operator's choice is anchored in chat via `[focus-tasks-session — …]` lines for the rest of the session.
- On subsequent triggers: write to the chosen ledger and emit `[focus-tasks-ledger updated — <trigger> — <path>]`, OR stay silent if the operator opted out.
- Honour mid-session overrides via `/d-focus-tasks -no-ledger` (deactivate), `/d-focus-tasks` (re-prompt), or `/d-focus-tasks <path>` (switch).
- **Preserve historical entries on every ledger edit — never delete completed milestones or finished phases.** Old entries remain archived (status-marked) in the same file. The Edit tool's red/green diff visualization on a row being updated or split is normal; the rule is that no row vanishes from the file as a result of an edit.
- **Missing-ledger handling**: if the trigger fires and no `master-tasks.md` exists anywhere on the candidate list, the session-start prompt's default proposal is Option 2 (create new). The operator confirms or picks Option 3. This replaces the old "ask once if missing" prompt — it is now folded into the session-start prompt.

Skills that participate in this system (e.g., `d-handover`, future skills) must check their invocation context for the no-ledger flag (`-no-ledger`, `-no ledger`, `--no-ledger`, `--no ledger`, case-insensitive, matched ONLY on invocation arg strings — see the d-focus-tasks skill's no-ledger flag grammar section for full details). When the flag is present, they MUST NOT invoke `d-focus-tasks` for that invocation. The flag does not change session state — it suppresses one invocation only.

Do not wait for the operator to invoke `d-focus-tasks` manually after each triggering event. The triggers are automatic; only the first-time-in-session 3-option prompt is interactive.
```

- [ ] **Step 3: Verify replacement**

Run:
```
Grep pattern="Material followup" path="C:\Users\Korisnik\.claude\CLAUDE.md"
Grep pattern="anchored in chat via" path="C:\Users\Korisnik\.claude\CLAUDE.md"
Grep pattern="Preserve historical entries on every ledger edit" path="C:\Users\Korisnik\.claude\CLAUDE.md"
```

Expected: each grep returns exactly one match in the P11 section. If any miss, redo Step 2.

- [ ] **Step 4: Hold for commit**

---

## Task 3: Annotate the superseded feedback memory

**Files:**
- Modify: `C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_no_cu_ledger_for_global_skill_design.md`

- [ ] **Step 1: Read the current memory file**

Run:
```
Read C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_no_cu_ledger_for_global_skill_design.md
```

Expected: file has frontmatter + body explaining the rule. Body currently ends with the "How to apply" paragraph.

- [ ] **Step 2: Append SUPERSEDED block to the end of the file**

Use the Edit tool with:
- `old_string`: the LAST line of the existing body (the line ending with `[[project_d_handover_skill_design]] (the active example).`)
- `new_string`: the same line PLUS two newlines PLUS this SUPERSEDED block:

```markdown

## SUPERSEDED 2026-05-13

Rule generalized into d-focus-tasks session gating per `~/.claude/skills/d-focus-tasks/specs/2026-05-13-session-gating-design.md`. The new model handles this case via Option 3 (operator picks "no ledger" at the session-start prompt) or the `-no-ledger` flag on participating skills. Keeping for historical context.
```

- [ ] **Step 3: Verify**

Run:
```
Grep pattern="SUPERSEDED 2026-05-13" path="C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_no_cu_ledger_for_global_skill_design.md"
```

Expected: one match.

- [ ] **Step 4: Hold for commit**

---

## Task 4: Update MEMORY.md index line for the superseded memory

**Files:**
- Modify: `C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md`

- [ ] **Step 1: Locate the current index line**

The line is:
```
- [No CU ledger for global-skill design](feedback_no_cu_ledger_for_global_skill_design.md) — Skills under ~/.claude/skills/* don't trigger d-focus-tasks or CU master-tasks.md updates, even when specs live in C:\AI\CU\docs\product-docs\. Op 2026-05-13.
```

- [ ] **Step 2: Replace with the superseded-marked version**

Use the Edit tool with:
- `old_string`: the line above (exactly as quoted)
- `new_string`:
```
- [No CU ledger for global-skill design](feedback_no_cu_ledger_for_global_skill_design.md) — Skills under ~/.claude/skills/* don't trigger d-focus-tasks or CU master-tasks.md updates, even when specs live in C:\AI\CU\docs\product-docs\. Op 2026-05-13. — SUPERSEDED 2026-05-13 by d-focus-tasks session gating.
```

- [ ] **Step 3: Verify**

Run:
```
Grep pattern="SUPERSEDED 2026-05-13 by d-focus-tasks session gating" path="C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md"
```

Expected: one match.

- [ ] **Step 4: Hold for commit**

---

## Task 5: Create the new reference memory

**Files:**
- Create: `C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_d_focus_tasks_session_gating.md`

- [ ] **Step 1: Write the new memory file**

Use the Write tool against `C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_d_focus_tasks_session_gating.md` with this exact content:

```markdown
---
name: d-focus-tasks-session-gating
description: "d-focus-tasks runs per-session with explicit operator consent; prompts once on first qualifying trigger, then auto-updates the chosen ledger silently. No-ledger flag uses CLI-arg matching only, never substring."
metadata:
  type: feedback
---

The `d-focus-tasks` skill is now session-gated. The first qualifying trigger (commit / plan approval / spec ratification / material followup / handover prep / direct invocation / call from a participating skill like `d-handover`) emits a 3-option prompt:

```
1. Select a different ledger file
2. Create a new ledger file
3. Do NOT use ledger file in this session
```

The operator's choice is recorded as a chat anchor line `[focus-tasks-session — ledger active: <path>]` or `[focus-tasks-session — ledger off]`. Subsequent triggers reuse that choice silently. Per-update success emits `[focus-tasks-ledger updated — <trigger> — <path>]`.

**Why:** before this change, P11 mandated updates to a single hardcoded ledger regardless of which project's files were touched, which polluted the CU Scanner ledger with unrelated skill-design rows. The workaround memory `[[no-cu-ledger-for-global-skill-design]]` is now superseded.

**How to apply:**

- **No-ledger flag grammar** for participating skills: match `(?:^|\s)--?no[-\s]ledger(?:$|\s)` against the **invocation arg string ONLY** (the text immediately after the skill/command name on the invocation line). NEVER substring-match against the broader user message, file contents, or earlier conversation — that would false-positive on file paths like `tests/no-ledger-helpers.test.js`.
- **Mid-session override commands**: `/d-focus-tasks -no-ledger` (deactivate), `/d-focus-tasks` (re-prompt), `/d-focus-tasks <path>` (switch).
- **Subagent inheritance tokens**: `ledger=<path>` (equals sign, NOT colon — avoids collision with Windows `D:\…` paths) and any §No-ledger-flag dashed form. If both present, no-ledger wins.
- **State recovery after compaction**: the anchor line is load-bearing; the in-context variable is a cache. If the variable is lost but the anchor remains, recover state from the anchor. If the anchor is lost, re-prompt regardless of variable.
- **History preservation on edits**: never delete completed milestones or finished phases when updating a ledger row. Edit-tool red/green diff on a row update is normal; rows must never vanish from the file.
- New participating skills must check the no-ledger flag using the same grammar before invoking `d-focus-tasks`. Document `d-handover` as the first user of this convention.

Spec: `~/.claude/skills/d-focus-tasks/specs/2026-05-13-session-gating-design.md`. Source: operator directive 2026-05-13, ratified after d-review R1 reached `ready-to-plan`.
```

- [ ] **Step 2: Verify**

Run:
```
Read C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_d_focus_tasks_session_gating.md
```

Expected: file exists with frontmatter `name: d-focus-tasks-session-gating` and `type: feedback`.

- [ ] **Step 3: Hold for commit**

---

## Task 6: Add new memory's index line to MEMORY.md

**Files:**
- Modify: `C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md`

- [ ] **Step 1: Insert the new index line ABOVE the superseded memory's line**

The new line goes right above the line modified in Task 4. Use the Edit tool with:

- `old_string`:
```
- [No CU ledger for global-skill design](feedback_no_cu_ledger_for_global_skill_design.md) — Skills under ~/.claude/skills/* don't trigger d-focus-tasks or CU master-tasks.md updates, even when specs live in C:\AI\CU\docs\product-docs\. Op 2026-05-13. — SUPERSEDED 2026-05-13 by d-focus-tasks session gating.
```

- `new_string`:
```
- [d-focus-tasks session gating](feedback_d_focus_tasks_session_gating.md) — Session-gated ledger tracking; 3-option prompt + anchor lines + CLI-arg no-ledger flag grammar + subagent token rules. 2026-05-13.
- [No CU ledger for global-skill design](feedback_no_cu_ledger_for_global_skill_design.md) — Skills under ~/.claude/skills/* don't trigger d-focus-tasks or CU master-tasks.md updates, even when specs live in C:\AI\CU\docs\product-docs\. Op 2026-05-13. — SUPERSEDED 2026-05-13 by d-focus-tasks session gating.
```

- [ ] **Step 2: Verify**

Run:
```
Grep pattern="d-focus-tasks session gating" path="C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md"
```

Expected: two matches (one in the new index line, one in the SUPERSEDED tail of the older line).

- [ ] **Step 3: Hold for commit**

---

## Task 7: Behavioural verification walkthrough

This task is the spec §14 AC verification. No file edits — read-through + scenario reasoning only. Mark each AC pass/fail based on whether the new SKILL.md + CLAUDE.md text supports the behaviour.

- [ ] **Step 1: Re-read the new SKILL.md and the new P11 in CLAUDE.md**

Run:
```
Read C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md
Read C:\Users\Korisnik\.claude\CLAUDE.md
```

- [ ] **Step 2: Walk through each AC and mark pass/fail**

For each AC below, locate the supporting section in SKILL.md (or CLAUDE.md for AC-INT-2). Mark PASS if the relevant text unambiguously prescribes the expected behaviour; mark FAIL if absent or ambiguous.

**Functional ACs:**
- **AC-STATE-1**: unset + trigger → prompt → Option 1 → `active(<chosen>)` + active anchor line. (§Session-state model + §Session-start prompt + §Anchor lines)
- **AC-STATE-2**: Option 2 → creates file + emits both `created` and `active` anchor lines. (§Option 2 follow-up + §Anchor lines)
- **AC-STATE-3**: Option 3 → `off` + off anchor line. (§Session-start prompt + §Anchor lines)
- **AC-STATE-4**: in `active(X)`, second trigger → write to X + update line. (§Transitions + §Update rules)
- **AC-STATE-5**: in `off`, trigger → silent, no re-prompt. (§Transitions: "off + trigger → off silent")
- **AC-OVERRIDE-1**: `/d-focus-tasks -no-ledger` → `off` + deactivation line. (§Override-command grammar + §Anchor lines)
- **AC-OVERRIDE-2**: `/d-focus-tasks` (no args) → re-prompt from any state. (§Override-command grammar)
- **AC-OVERRIDE-3**: `/d-focus-tasks <valid-path>` → `active(<path>)` no prompt. (§Override-command grammar + §Anchor lines)
- **AC-OVERRIDE-4**: `/d-focus-tasks <invalid-path>` → rejection line, state unchanged. (§Validation-failure subsection)

**Recovery ACs:**
- **AC-REC-1**: variable lost, anchor present → state recovered from anchor. (§State recovery point 3 bullet 2)
- **AC-REC-2**: anchor lost, variable present → re-prompt. (§State recovery point 3 bullet 3 "anchor-wins-by-absence")
- **AC-REC-3**: both lost → re-prompt. (§State recovery point 3 bullet 4)
- **AC-REC-4**: variable and anchor disagree → anchor wins. (§State recovery point 3 bullet 5)

**Flag-grammar ACs:**
- **AC-FLAG-1**: `/d-handover -no-ledger prep` → flag matched → `d-focus-tasks` NOT invoked. (§No-ledger flag grammar examples)
- **AC-FLAG-2**: `/d-handover prep tests/no-ledger-helpers.test.js` → NO match. (§No-ledger flag grammar examples)
- **AC-FLAG-3**: file content contains `"no ledger"` → NO match. (§Matching rule: "MUST NOT search … file contents")
- **AC-FLAG-4**: spec text contains "no-ledger" → NO match on commit trigger. (§Matching rule: arg string only)

**Subagent ACs:**
- **AC-SUB-1**: `ledger=C:\AI\CU\docs\product-docs\master-tasks.md` → `active(C:\AI\CU\docs\product-docs\master-tasks.md)`. (§Subagent inheritance Token grammar example)
- **AC-SUB-2**: `-no-ledger` → `off`. (§Subagent inheritance Token grammar)
- **AC-SUB-3**: BOTH tokens → `off` (no-ledger wins). (§Subagent inheritance Precedence)
- **AC-SUB-4**: neither → prompt on first trigger. (§Subagent inheritance Absence)

**Integration ACs:**
- **AC-INT-1**: d-handover clause requirement documented. (§Participating skills convention + spec §12 — verified at d-handover creation time, NOT in this plan)
- **AC-INT-2**: P11 in CLAUDE.md contains history-preservation + missing-ledger clauses. (Read CLAUDE.md, grep)
- **AC-INT-3**: superseded memory annotated + MEMORY.md index updated. (Tasks 3, 4, 6 verifications)

- [ ] **Step 3: Record verification results**

Print a short summary to chat:
```
AC walkthrough results:
- Functional: 9/9 PASS (or list failures)
- Recovery: 4/4 PASS
- Flag-grammar: 4/4 PASS
- Subagent: 4/4 PASS
- Integration: AC-INT-2 PASS, AC-INT-3 PASS, AC-INT-1 deferred (carries forward to d-handover)

Total: 21/22 PASS, 1 deferred (carry-forward).
```

If any FAIL, return to the relevant task and fix the SKILL.md / CLAUDE.md text before proceeding.

- [ ] **Step 4: Hold for commit**

---

## Task 8: Operator commit gate

This is a HOLD step. Per `feedback_git_local_default.md`, no commits without explicit operator approval. Per P9, no push without warning + YES.

- [ ] **Step 1: Show the operator the diff summary**

Run (separately, in parallel if possible):
```
Bash: cd C:\Users\Korisnik\.claude && git status
Bash: cd C:\Users\Korisnik\.claude && git diff --stat
```

Expected files dirty: `skills/d-focus-tasks/SKILL.md`, `CLAUDE.md`, plus the three memory files (one new, two modified).

Also check whether `~/.claude/projects/d--AI-ChatGPT/memory/` is in the same git repo as `~/.claude/skills/`. Per memory `reference_compliance_repo_branch_policy.md`, `~/.claude/skills/` is a separate repo for SEO-audit. The memory folder may be in its own repo or untracked. Report the actual repo layout to the operator before proposing a commit command.

- [ ] **Step 2: Ask the operator**

Prompt the operator with this exact question:

```
All Task 1-7 edits complete and verified (21/22 ACs PASS, 1 deferred).

Files changed:
- C:\Users\Korisnik\.claude\skills\d-focus-tasks\SKILL.md
- C:\Users\Korisnik\.claude\CLAUDE.md
- C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_no_cu_ledger_for_global_skill_design.md (SUPERSEDED annotation)
- C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\feedback_d_focus_tasks_session_gating.md (new)
- C:\Users\Korisnik\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md (two index lines)

Repo layout per `git status` above: <fill in>.

Commit options:
1. Commit each repo separately with focused messages.
2. Stage all + one combined commit per repo.
3. Hold — operator will commit manually later.

No push without explicit operator YES (P9 — applies if pushing to 2slowDD).

Which option?
```

- [ ] **Step 3: Execute the operator's choice**

If Option 1 or 2: stage + commit using a heredoc-formatted message that ends with the standard `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` line. NO push.

If Option 3: leave files dirty.

- [ ] **Step 4: After commit, NO push without P9 gate**

If operator later asks to push, run the P9 warning block from CLAUDE.md verbatim and wait for explicit YES.

---

## Carry-forward (not part of this plan's tasks)

When `d-handover` is authored (separate work-track), its SKILL.md MUST include the §12 ledger-interaction clause from the spec. This is AC-INT-1. Add a TODO note in the d-handover design discussion to ensure this isn't forgotten.

---

## Self-Review (run before declaring plan complete)

### Spec coverage

- §4 state machine → Task 1 §Session-state model + §Transitions + §State recovery sections.
- §4.1 recovery → Task 1 §State recovery subsection.
- §5 trigger avenues → Task 1 §Triggers.
- §6 flag grammar → Task 1 §No-ledger flag grammar.
- §7 candidate discovery → Task 1 §Candidate discovery.
- §8.1 session-start prompt → Task 1 §Session-start prompt + §Option 2 follow-up.
- §8.2 anchor lines → Task 1 §Anchor lines.
- §9 override commands → Task 1 §Override-command grammar.
- §10 subagent inheritance → Task 1 §Subagent inheritance.
- §11 P11 rewrite → Task 2.
- §12 d-handover clause → carry-forward note (out of scope).
- §13.1 memory annotation → Task 3.
- §13.2 MEMORY.md index update for superseded memory → Task 4.
- §13.3 new memory → Task 5; index entry → Task 6.
- §14 ACs → Task 7.

No spec gaps.

### Placeholder scan

No `TBD`, `TODO`, `implement later`, or `fill in details` strings in this plan. All code/text shown verbatim. The one placeholder is the `<fill in>` for git repo layout in Task 8 Step 2, which is intentionally agent-fillable at execution time after running `git status`.

### Type consistency

- Anchor-line format strings used in Task 1 (SKILL.md), Task 2 (CLAUDE.md), and Task 7 (verification) — all match the spec §8.2 exactly: `[focus-tasks-session — ledger active: <path>]`, `[focus-tasks-session — ledger off]`, `[focus-tasks-session — ledger deactivated]`, `[focus-tasks-ledger updated — <trigger> — <path>]`, `[focus-tasks-ledger created — <path>]`, `[focus-tasks — path rejected: <path> — <reason>]`.
- State names used consistently: `unset` / `active(<path>)` / `off`.
- Subagent token: `ledger=<path>` (with `=`, never `:`) everywhere.
- Flag forms: `-no-ledger`, `-no ledger`, `--no-ledger`, `--no ledger` consistent across SKILL.md, P11 text, memory file.

No drift detected.

---

**End of plan.**
