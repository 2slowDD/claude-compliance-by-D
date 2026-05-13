# d-focus-tasks — Session Gating + Project Routing Design

**Date:** 2026-05-13
**Revision:** R1 (d-review feedback applied 2026-05-13)
**Status:** spec draft, awaiting operator review
**Spec for:** `C:\Users\dalib\.claude\skills\d-focus-tasks\SKILL.md` (rewrite) + `C:\Users\dalib\.claude\CLAUDE.md` P11 (rewrite) + `C:\Users\dalib\.claude\skills\d-handover\SKILL.md` (conditional edit on apply).
**Ledger update for this design work:** none — small-skill workstream; defaults to Option 3 (no ledger).

**R1 changelog:** §6 flag grammar tightened to CLI-arg-only matching; §4.1 state-recovery contract added; §8.2 Option 2 row added; §10 subagent token changed to `ledger=<path>` with precedence rule; §11 dropped-P11-clauses migrated; §7/§8.1/§9/§13/§14 ambiguities resolved.

---

## 1. Problem

`d-focus-tasks` currently has no awareness of which project the in-flight work belongs to. P11 in `CLAUDE.md` mandates ledger updates on every commit / plan / spec / handover regardless of context. With multiple parallel workstreams (CU Scanner Railway, global skill design, future skills) the current behaviour either pollutes the CU ledger with unrelated rows or forces the operator to inject one-off "do not invoke d-focus-tasks" directives. The current memory `feedback_no_cu_ledger_for_global_skill_design.md` is a workaround for exactly this gap.

Additional pain: future skills (`d-handover` being the next one) will also want to participate in the ledger system. Without a uniform model, each skill will reinvent its own opt-out semantics.

## 2. Goals

1. One uniform entrypoint for all ledger-mutating work: `d-focus-tasks`.
2. Operator consent gate per agent session — never silently write to a ledger the operator did not confirm.
3. Cheap mid-session escape hatch when work pivots to an unrelated task.
4. Consistent no-ledger flag grammar across all participating skills, with no false-positive matches on file paths, doc text, or commit messages.
5. Zero hardcoded project list inside the skill — adding a new project means dropping a `master-tasks.md` at its root and confirming when prompted.
6. Backwards-compatible with the existing CU ledger at `D:\AI\CU\docs\product-docs\master-tasks.md`.
7. Preserve the two currently-load-bearing P11 behaviours: history preservation (no row deletion) and missing-ledger handling.

## 3. Non-goals

- Cross-session persistence (state lives in agent context only; new session = new prompt).
- Automatic ledger schema migration (rows already in `master-tasks.md` keep their existing shape).
- Network sync or remote ledgers.
- Programmatic enforcement of the no-ledger flag convention across skills (relies on skill-author discipline; document the convention prominently).

---

## 4. Session-state machine

The skill maintains an in-context session variable: **`ledger_session_state`**.

States:

| State | Meaning |
|---|---|
| `unset` | Initial. No qualifying trigger has fired yet this session. |
| `active(<path>)` | Ledger writes go to `<path>` for the rest of the session unless overridden. |
| `off` | Ledger writes suppressed for the rest of the session unless reactivated by explicit `/d-focus-tasks`. |

Transitions:

| From | Event | To |
|---|---|---|
| `unset` | First qualifying trigger fires | (prompt) → `active(<path>)` or `off` |
| `active(<path>)` | Qualifying trigger fires | `active(<path>)` (write update) |
| `off` | Qualifying trigger fires | `off` (silent no-op, no re-prompt) |
| any | `/d-focus-tasks -no-ledger` (or §9 variants) | `off` |
| any | `/d-focus-tasks` (no args) | (prompt) → `active(<path>)` or `off` |
| any | `/d-focus-tasks <path>` | `active(<path>)` (no prompt) |

The state lives in the agent's working memory. The skill anchors it in chat history via the lines in §8.2 so the choice survives normal conversation and compaction summaries.

### 4.1 State recovery after compaction or context loss

On every qualifying trigger, the skill MUST execute this resolution algorithm BEFORE acting:

1. Read in-context `ledger_session_state`.
2. Scan the conversation backward for the most recent `[focus-tasks-session — …]` anchor line.
3. **Reconcile**:
   - Both present and agree → proceed.
   - Anchor present but variable unset/missing (variable lost in compaction) → re-derive state from anchor. Proceed.
   - Variable present but anchor missing (anchor lost in compaction summary) → **anchor wins by absence**: treat state as `unset` and re-prompt. The chat history is the more durable source.
   - Both absent → state is genuinely `unset`. Prompt per §8.1.
   - They disagree (e.g., variable says `active(X)` but anchor says `active(Y)` or `off`) → anchor wins. Update variable to match.
4. Anchor lines from `[focus-tasks-session — ledger deactivated]` count as `off` for recovery purposes.
5. If multiple anchor lines exist, the most recent one wins.

This makes the anchor line the load-bearing source of truth and the variable a cache.

---

## 5. Trigger avenue catalogue

A **qualifying trigger** is any of:

1. **Direct invocation**: operator runs `d-focus-tasks` (via Skill tool, slash command, or natural-language reference).
2. **`d-handover` skill invoked WITHOUT a no-ledger flag** (see §6 for flag grammar).
3. **P11 events** that the skill receives via the `CLAUDE.md` rule:
   - Successful local commit.
   - Remote-only commit reconciliation.
   - Approved plan / spec / architectural change / material followup (defined in §11).
   - Handover prep (before writing a handover prompt).
4. **Future opt-in skills**: any skill whose SKILL.md declares "invokes `d-focus-tasks` per the Focus Tasks Ledger Rule." Such skills MUST honour the no-ledger flag grammar in §6.

Triggers fire `d-focus-tasks`. The skill consults `ledger_session_state` per §4.1 and reacts per §4.

---

## 6. No-ledger flag grammar (TIGHTENED — R1)

The no-ledger flag is detected ONLY when it appears as a **CLI-style argument on a skill/command invocation**, not in surrounding text. This prevents accidental matches in file paths (`tests/no-ledger-suppression.test.js`), quoted documentation, commit messages, or the spec text itself.

### 6.1 Recognized forms (in invocation args only)

- `-no-ledger`
- `-no ledger`
- `--no-ledger`
- `--no ledger`

### 6.2 Matching rule

A participating skill MUST inspect ONLY its **invocation arg string** — defined as the text immediately following the skill/command name on the invocation line.

**Examples** (arg string in brackets):
- `/d-handover -no-ledger prep for fresh agent` → arg string: `[-no-ledger prep for fresh agent]` → MATCH
- `/d-handover prep tests/no-ledger-suppression.test.js` → arg string: `[prep tests/no-ledger-suppression.test.js]` → NO MATCH (no leading dash)
- `D-handover, please skip ledger this time` → free-text invocation; arg string: `[, please skip ledger this time]` → NO MATCH (not the dashed flag form)

**Regex equivalent (case-insensitive):** `(?:^|\s)--?no[-\s]ledger(?:$|\s)` applied to the arg string ONLY. The skill MUST NOT search the broader user message body, surrounding instruction text, file contents, or earlier conversation.

If matched, the participating skill MUST NOT invoke `d-focus-tasks` for that invocation. The flag does NOT change `ledger_session_state` — it only suppresses this single invocation.

### 6.3 Operator free-text responses (different context)

When the operator is responding to the §8.1 prompt, bare phrases like `no ledger` or `no-ledger` (without the dash prefix) ARE interpreted as Option 3. Context disambiguates: the operator is answering a specific question.

### 6.4 Mid-session override commands

§9 override commands MUST use the dashed form (`-no-ledger` etc.) to disambiguate from normal text.

---

## 7. Candidate discovery algorithm

When the skill needs to propose a default ledger (first prompt, or re-prompt), it builds an ordered candidate list:

### 7.1 What counts as a "touched path" this turn

- Files the agent has read, edited, written, or staged in the current turn.
- The work-product artifact path — the SKILL.md being designed, the source file being implemented, the spec file being approved. NOT the handover prompt itself; NOT the docs the agent transiently read for context.
- Commit target file paths if the trigger is a commit.

### 7.2 Walk-up rules

1. **From touched paths**: for each unique touched path, walk up parent directories until a `master-tasks.md` is found. Record each unique result.
2. **From cwd**: walk up from the agent's current working directory looking for `master-tasks.md`. Add to candidate list if not already present.
3. **Recency rank**: order unique candidates by last-modified time, most recent first. The most recent becomes the "default" in the prompt.

If the candidate list is empty, the prompt's default proposal is "Option 2: create a new ledger" with no specific path pre-filled.

The skill does NOT carry a hardcoded project table. Adding a new project = drop `master-tasks.md` at its root and confirm at the next prompt.

---

## 8. Prompt + anchor-line formats (exact strings)

### 8.1 Session-start prompt

When `ledger_session_state == unset` (per §4.1 resolution) and a qualifying trigger fires, the skill emits this exact prompt:

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

Operator can respond with `1`, `2`, `3`, a free-text path (treated as Option 1 with that path), or a no-ledger phrase from §6.3 (treated as Option 3).

**Option 2 follow-up:**

```
Where should the new ledger live? Suggested:
- <project-root-derived-from-touched-paths>\docs\product-docs\master-tasks.md

Reply with the full path, or a directory (master-tasks.md will be appended).
```

Path-resolution rules:
- **Absolute path**: used as-is.
- **Relative path**: resolved against the agent's cwd.
- **Path is a directory** (ends with `\` or `/`, or resolves to an existing dir): append `master-tasks.md`.
- **Parent directory missing**: ask `Parent directory <X> does not exist. Create it? (Y/N)`. If N, re-prompt for path.
- **File already exists at chosen path**: ask `File already exists at <X>. Use existing (1) or pick a different path (2)?`. Option 1 transitions to `active(<X>)` without overwriting; Option 2 re-prompts.

After the new path is confirmed and created (or chosen-as-existing), the skill transitions to `active(<path>)` per §4 and emits the active anchor per §8.2.

### 8.2 Anchor lines (chat-visible, load-bearing)

On state transitions:

| Trigger | Anchor line |
|---|---|
| Operator picks Option 1 (or operator picks the default) | `[focus-tasks-session — ledger active: <path>]` |
| Operator picks Option 2 and confirms new path | `[focus-tasks-ledger created — <path>]` then `[focus-tasks-session — ledger active: <path>]` |
| Operator picks Option 3 (or replies with no-ledger phrase per §6.3) | `[focus-tasks-session — ledger off]` |
| `/d-focus-tasks -no-ledger` mid-session | `[focus-tasks-session — ledger deactivated]` |
| `/d-focus-tasks <path>` mid-session | `[focus-tasks-session — ledger active: <path>]` |
| Per-update success | `[focus-tasks-ledger updated — <trigger> — <path>]` |
| Per-update on `off` state | (silent) |

These lines are the only durable record of the choice (per §4.1 they are the load-bearing source of truth). The skill MUST emit them on their own line, near the top of the response that performs the transition. Agents preparing compaction summaries MUST preserve the most recent session-state line verbatim.

---

## 9. Override-command grammar

Operator-issued commands the skill recognizes:

| Command form | Effect |
|---|---|
| `/d-focus-tasks` | Re-prompt with the §8.1 block (works from any state). |
| `/d-focus-tasks <path>` | Set state to `active(<path>)` without prompting. Validates that `<path>` exists or is creatable. |
| `/d-focus-tasks -no-ledger` | Set state to `off`. |
| `/d-focus-tasks -no ledger` | Same as above. |
| `/d-focus-tasks --no-ledger` | Same as above. |
| `/d-focus-tasks --no ledger` | Same as above. |

### 9.1 Validation-failure behaviour for `/d-focus-tasks <path>`

If the path is invalid, unwritable, or refers to a location whose parent cannot be created (permission denied, etc.):
- Emit `[focus-tasks — path rejected: <path> — <reason>]`.
- **Do NOT change `ledger_session_state`.** The prior state stands.
- Operator can retry with a corrected path.

### 9.2 Free-text interpretation threshold

Free-text variants are interpreted as override commands ONLY when the operator's intent is unambiguous in context. Examples:

- "stop using the ledger" → unambiguous when ledger is currently active → interpret as `/d-focus-tasks -no-ledger`.
- "deactivate ledger for this task" → unambiguous → same.
- "skip ledger this time" → AMBIGUOUS (could mean this one update only vs whole session) → ask: `Did you mean (a) skip this one update only, or (b) deactivate the ledger for the rest of the session?`.
- "use the other ledger" → AMBIGUOUS (which one?) → trigger §8.1 re-prompt.

When ambiguous, the skill MUST ask before changing state. When clear, the skill MUST emit the corresponding anchor line per §8.2.

---

## 10. Subagent inheritance rules

Each subagent gets its own independent `ledger_session_state`, initialized to `unset`. Parent can pre-set the subagent's state by including either of these tokens in the subagent prompt:

### 10.1 Token grammar (R1: fixed Windows path collision)

- **`ledger=<path>`** (equals sign — NOT colon, to avoid collision with Windows `D:\…` paths) → subagent starts in `active(<path>)`, no prompt.
- **Any §6 dashed no-ledger flag** (`-no-ledger`, `--no-ledger`, etc.) → subagent starts in `off`, no prompt.

The `ledger=<path>` token uses split-on-first-equals: everything after the first `=` (trimmed) is the path. Paths may contain `=` only after the first one (rare; documented edge case).

**Examples:**
- `ledger=D:\AI\CU\docs\product-docs\master-tasks.md` → path: `D:\AI\CU\docs\product-docs\master-tasks.md` ✓
- `ledger=/home/user/project/master-tasks.md` → path: `/home/user/project/master-tasks.md` ✓
- `-no-ledger` → state `off` ✓

### 10.2 Precedence (R1: new)

If the subagent prompt contains BOTH `ledger=<path>` AND a no-ledger token, **no-ledger wins**. State becomes `off`. Rationale: no-ledger is the safer default; a stale `ledger=` token in a copy-pasted template should not silently activate a ledger the operator may no longer want.

### 10.3 Absence

If neither token is present, the subagent runs the §8.1 prompt on its first qualifying trigger as normal.

### 10.4 Rationale

Subagents operate in isolated contexts; inheriting parent state silently is unsafe. Explicit handoff via prompt tokens preserves operator consent.

---

## 11. CLAUDE.md P11 replacement text

P11 is rewritten end-to-end. New version (this exact text lands in `~/.claude/CLAUDE.md`):

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
- **Missing-ledger handling**: if the trigger fires and no `master-tasks.md` exists anywhere on the candidate list (§7 of the skill spec), the §8.1 prompt's default proposal is Option 2 (create new). Operator confirms or picks Option 3. This replaces the old "ask once if missing" prompt — it is now folded into the session-start prompt.

Skills that participate in this system (e.g., `d-handover`, future skills) must check their invocation context for the no-ledger flag (`-no-ledger`, `-no ledger`, `--no-ledger`, `--no ledger`, case-insensitive, matched ONLY on invocation arg strings — see the skill's §6 for full grammar). When the flag is present, they MUST NOT invoke `d-focus-tasks` for that invocation. The flag does not change session state — it suppresses one invocation only.

Do not wait for the operator to invoke `d-focus-tasks` manually after each triggering event. The triggers are automatic; only the first-time-in-session 3-option prompt is interactive.
```

P9 (push gate) is unaffected.

---

## 12. d-handover skill conditional edit

`d-handover` does not yet exist on disk (verified via Glob 2026-05-13). When the skill IS created, its SKILL.md must include this clause:

```markdown
## Ledger interaction

Before executing the handover prep, check the invocation arg string for any of the no-ledger flag forms: `-no-ledger`, `-no ledger`, `--no-ledger`, `--no ledger` (case-insensitive, applied per the d-focus-tasks §6 matching rule — invocation arg string only, NOT surrounding text or file contents).

- If matched → do NOT invoke `d-focus-tasks`. Proceed with the handover without touching any ledger.
- If not matched → invoke `d-focus-tasks` with trigger `handover prep`. The skill handles session-state resolution per its own rules. After the skill returns, continue with the handover.
```

If `d-handover` is being authored concurrently with this spec's implementation, this clause is added at the same time. If `d-handover` is authored later, the spec author flags the requirement in the d-handover design doc when it's created.

**Tracking note**: §14 done-definition AC-INT-1 verifies that the d-handover clause is in place at the time of d-handover's first commit.

---

## 13. Memory disposition

### 13.1 `feedback_no_cu_ledger_for_global_skill_design.md` annotation

Annotate the file with a `## SUPERSEDED 2026-05-13` block. Body text:

> Rule generalized into d-focus-tasks session gating per `~/.claude/skills/d-focus-tasks/specs/2026-05-13-session-gating-design.md`. The new model handles this case via Option 3 (operator picks "no ledger" at the session-start prompt) or the `-no-ledger` flag on participating skills. Keeping for historical context.

Do not delete; this is the canonical pointer from MEMORY.md.

### 13.2 MEMORY.md index update

Update the corresponding line in `C:\Users\dalib\.claude\projects\d--AI-ChatGPT\memory\MEMORY.md` to add `— SUPERSEDED 2026-05-13` at the end of the description. Do not delete the index entry.

### 13.3 New memory after implementation lands

Add `feedback_d_focus_tasks_session_gating.md` summarizing:
- The 3-option prompt (Option 1/2/3).
- The §8.2 anchor-line catalogue.
- The §9 override commands and the §6 flag grammar.
- The §10 subagent token (`ledger=<path>` + dashed no-ledger flag).

This becomes the reference for future participating skills.

---

## 14. Done definition

This spec is "done enough to plan" when:

1. Operator reviews this R1 spec and approves.
2. d-review verdict reaches `ready-to-plan`.

The implementation plan is "done" when the following ACs verify:

### Functional ACs

- **AC-STATE-1**: starting from `unset`, first qualifying trigger emits the §8.1 prompt; operator picking Option 1 transitions to `active(<chosen>)` and emits the §8.2 active anchor line.
- **AC-STATE-2**: Option 2 (create new) emits both the `created` and `active` anchor lines, and creates the file at the chosen path.
- **AC-STATE-3**: Option 3 transitions to `off` and emits the off anchor line.
- **AC-STATE-4**: in `active(X)`, second qualifying trigger writes to `X` and emits the update line.
- **AC-STATE-5**: in `off`, qualifying trigger stays silent (no re-prompt, no update line).
- **AC-OVERRIDE-1**: `/d-focus-tasks -no-ledger` in any state transitions to `off` and emits deactivation line.
- **AC-OVERRIDE-2**: `/d-focus-tasks` (no args) re-prompts from any state.
- **AC-OVERRIDE-3**: `/d-focus-tasks <valid-path>` transitions to `active(<path>)` without prompt.
- **AC-OVERRIDE-4**: `/d-focus-tasks <invalid-path>` emits rejection line, does NOT change state.

### Recovery ACs

- **AC-REC-1**: variable lost but anchor present → state recovered from anchor.
- **AC-REC-2**: anchor lost but variable present → re-prompt (anchor-wins-by-absence).
- **AC-REC-3**: both lost → re-prompt.
- **AC-REC-4**: variable and anchor disagree → anchor wins, variable updated.

### Flag-grammar ACs (no false positives)

- **AC-FLAG-1**: `/d-handover -no-ledger prep` → flag matched, `d-focus-tasks` NOT invoked.
- **AC-FLAG-2**: `/d-handover prep tests/no-ledger-helpers.test.js` → flag NOT matched, `d-focus-tasks` IS invoked.
- **AC-FLAG-3**: a file being read by the agent contains the literal string `"no ledger"` → flag NOT matched (file content is not invocation arg string).
- **AC-FLAG-4**: the spec text being committed contains "no-ledger" → flag NOT matched on the commit trigger.

### Subagent ACs (R1: new)

- **AC-SUB-1**: subagent prompt with `ledger=D:\AI\CU\docs\product-docs\master-tasks.md` starts in `active(D:\AI\CU\docs\product-docs\master-tasks.md)` — Windows path preserved intact.
- **AC-SUB-2**: subagent prompt with `-no-ledger` starts in `off`.
- **AC-SUB-3**: subagent prompt with BOTH `ledger=<path>` AND `-no-ledger` starts in `off` (no-ledger precedence).
- **AC-SUB-4**: subagent prompt with neither token runs §8.1 prompt on first qualifying trigger.

### Integration ACs

- **AC-INT-1**: when `d-handover` SKILL.md is created (concurrent or later), it contains the §12 ledger-interaction clause.
- **AC-INT-2**: `~/.claude/CLAUDE.md` P11 contains the §11 replacement text (history-preservation clause + missing-ledger clause both present).
- **AC-INT-3**: `feedback_no_cu_ledger_for_global_skill_design.md` is annotated with the SUPERSEDED block; MEMORY.md index line is updated.

---

## 15. Open items / known limitations

- **Cross-session memory**: not persisted. If operator wants the same ledger to be the default in every CU session without re-prompting, that's a future enhancement (e.g., a project-root `.focus-tasks-config.yaml` that pre-fills the prompt's default). Not blocking.
- **`d-handover` skill timing**: skill not yet authored. §12 clause carries forward via §14 AC-INT-1 until that skill exists.
- **Compaction safety**: relies on agents preserving the `[focus-tasks-session — …]` anchor line in compaction summaries. §4.1 recovery algorithm makes this safe-by-design — if the anchor is lost, the skill re-prompts rather than writing to a stale ledger.
- **No programmatic flag enforcement**: relies on skill-author discipline. The §6 grammar is documented prominently in SKILL.md and the new feedback memory (§13.3) to maximize adoption.

---

**End of spec (R1).**
