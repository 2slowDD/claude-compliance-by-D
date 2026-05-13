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

## Pre-flight: no-ledger flag check (gates Steps 3, 4, 5, 10)

Before running the Execution Sequence, inspect this skill's invocation arg string — the text immediately after `d-handover` / `D-handover` / `/d-handover` on the invocation line. Do NOT search the broader user message, file contents, or earlier conversation.

Match the case-insensitive regex `(?:^|\s)--?no[-\s]ledger(?:$|\s)` against the arg string. Recognized forms: `-no-ledger`, `-no ledger`, `--no-ledger`, `--no ledger`.

**If matched:** set internal flag `no_ledger=true` for this invocation. **Ledger is entirely out of scope** — no read, no update, no surfacing in the fresh-agent prompt.

- **Skip Step 3** (locate ledger). No candidate discovery, no path resolution.
- **Skip Step 4** (ledger ↔ session topic mismatch). Mismatch check has no purpose when no update is intended; without this skip, an unrelated handover would trigger an unwanted halt-and-ask on the very mismatch condition that justifies using `-no ledger`.
- **Skip Step 5** (d-focus-tasks pre-flight). No `d-focus-tasks` invocation; no pre-flight P11 confirmation line.
- **Skip Step 10** (final ledger touch). No post-emit P11 line either.
- **In Step 7.4** (must-read sequence intake): the ledger-row auto-pre-fill is **omitted**. The operator supplies all must-read entries manually (the prompt still requires ≥1 entry from intake Q4 as before).
- **In Step 9.1** (`{{READ_FIRST_NUMBERED_LIST}}` placeholder): omit the ledger-row-first prefix; the list contains only the operator's Q4 entries.
- **In Step 11 audit footer:**
  - `ledger pre-flight P11 line` → `skipped (no-ledger flag)`
  - `ledger post-emit P11 line` → `skipped (no-ledger flag)`
  - `ledger path` → `skipped (no-ledger flag)`
- All other Execution Sequence steps (1, 2, 6, 7, 8, 9, 11) run normally; the handover prompt is still emitted in its single fenced code block followed by the audit footer.

**If not matched**, proceed normally. `d-focus-tasks` handles the session-state decision per its own rules (it may itself decide to skip if the operator's session is in `off` state).

This clause exists because the operator may need to produce a handover prompt for work that is entirely unrelated to any project ledger. The flag does NOT change `d-focus-tasks` session state — it suppresses one invocation only. See `skills/d-focus-tasks/SKILL.md` "No-ledger flag grammar" section for the canonical matching rule.

## Execution Sequence

No step is skippable. If any step halts (operator-required answer, hard error), do NOT emit the prompt until the halt is resolved.

```
1.  Verify global CLAUDE.md exists               (Step 1 below)
2.  Locate project root + select profile         (Step 2)
3.  Locate ledger                                (Step 3)
4.  Detect ledger ↔ session topic mismatch       (Step 4)
5.  Invoke d-focus-tasks                         (P11 pre-flight; Step 5)
6.  Auto-detect F-* priority                     (Step 6)
7.  Structured intake                            (Step 7)
8.  Classify complexity                          (Step 8 — single post-intake pass)
9.  Render templates                             (Step 9)
10. Final ledger touch                           (post-emit, if a new handoff doc was written; Step 10)
11. Print audit footer                           (Step 11)
```

## Step 1 — Verify global CLAUDE.md exists

Read `C:\Users\dalib\.claude\CLAUDE.md`. If missing or unreadable, halt with this exact error:

> Global CLAUDE.md not found at <path>; rules are load-bearing for hard-constraint defaults. Resolve path or supply rules explicitly before re-running.

Do NOT emit the prompt or print the audit footer.

## Step 2 — Locate project root + select profile

Resolve `project_root` and `profile_key` together. Both feed Step 3 (ledger location) and Step 7.5 (constraint defaults).

### 2.1 Supported roots + resolution table

| `profile_key` | Path-pattern trigger (any one matches) | `project_root` | Notes |
|---|---|---|---|
| `CU` | cwd is `D:\AI\CU` exactly, or any path under it that is NOT under one of the subroots below | `D:\AI\CU` | Default for the scanner project. |
| `wpservice-saas` | cwd contains `wpservice-saas` as a path segment | `D:\AI\CU\AI Assets Scanner\wpservice-saas` (closest ancestor matching the segment) | WP plugin; ledger may be at the CU master location or the subroot. Step 3 multi-ledger scan handles both. |
| `AI-Assets-Scanner` | cwd contains `AI-Assets-Scanner` as a path segment AND NOT `wpservice-saas` | `D:\AI\CU\AI Assets Scanner\AI-Assets-Scanner` (closest ancestor matching the segment) | WP plugin; same ledger note. |
| `claude-skill-dev` | cwd is under `C:\Users\dalib\.claude` or `C:\Users\dalib\claude-compliance-by-D` (skill development sessions) | `<the matching root>` | Step 3 still runs; scan typically finds zero ledgers under this root, so it falls through to "0 ledgers found" → `d-focus-tasks` asks scan-or-blank per its default protocol. |
| `other` | none of the above | operator-supplied | Prompt: "I couldn't identify a known project root from cwd `<cwd>`. Paste the project root path or accept the default `D:\AI\CU`." |

### 2.2 Resolution flow

1. **Operator-supplied path in the invocation** → match against the table; if path falls under a known subroot, use that profile; if not, treat as `other`.
2. **cwd-based match** → walk cwd ancestors against the table top-to-bottom; first match wins.
3. **Session-activity fallback** → if cwd is at `D:\AI\CU` exactly but recent conversation activity (last ~30 turns) shows edits or file references under one of the subroots, ask: "cwd is at CU root but recent activity references `<subroot>`. Pick profile: (a) CU, (b) `<subroot>`."
4. **Print resolved root + profile** before continuing. Operator can override with a single follow-up.

## Step 3 — Locate ledger

The agent's session may surface multiple working directories, each with its own `master-tasks.md`. Pick the correct one before invoking `d-focus-tasks`.

**Scan paths (in order):**
1. `<project_root>\docs\product-docs\master-tasks.md` (default; usually the only one).
2. The cwd reported by the runtime, plus its ancestors up to depth 2.
3. Each path in the "Additional working directories" block of the agent's startup environment (this comes from the agent's system-prompt environment block — there is no shell/env-var equivalent). If the runtime does not expose this block as data, fall back to paths (1) + (2) only and log `additional-working-dirs: unavailable` in the audit footer.
4. Depth-limited glob (max depth 2) under each path above.

**Resolution logic:**

| Ledgers found | Action |
|---|---|
| 0 | Ask: "no `master-tasks.md` found under `<root>`. Should I scan and create a populated ledger, or start blank?" — pass through to `d-focus-tasks`. |
| 1 | Use it. Print path. |
| ≥2 | Try in order: (a) cwd-ancestor match (the ledger whose folder contains cwd), (b) keyword-overlap match (see Step 3.1), (c) most recently modified. Score each candidate; if one wins decisively (≥2 of the 3 heuristics), use it and print why. Otherwise show the operator a numbered list with `path`, `last-modified`, and the first 200 chars of the top active row, and ask them to pick. |

Never silently pick among multiple ledgers without showing reasoning.

### Step 3.1 — Keyword-overlap match definition

Used by Step 3 (multi-ledger disambiguation) and Step 4 (ledger ↔ session mismatch).

- Tokenize the ledger top active row: lowercase, split on whitespace + punctuation, drop standard English stop-words (`the, a, an, of, for, to, and, or, but, in, on, at, by, with, from, is, are, was, were, be, been, being, has, have, had, do, does, did, will, would, should, could, can, may, might, this, that, these, those, it, its, as, if, then, than, so`), drop tokens shorter than 3 characters.
- Tokenize the last ~30 conversation turns the same way.
- Compute the count of shared content-words.
- **Match threshold for Step 3 winner:** ≥3 shared content-words.
- **Mismatch threshold for Step 4 halt:** <2 shared content-words triggers the halt-and-ask.
- **Boundary at exactly 2 shared content-words:** ambiguous zone. Step 3 treats this as "no decisive winner" → fall through to numbered-list-pick (operator chooses). Step 4 treats this as "no halt" → continue without asking. The two steps use the same overlap value but different thresholds intentionally: Step 3 wants a strong winner before silent-selecting; Step 4 only halts on near-zero overlap.

## Step 4 — Ledger ↔ session topic mismatch

Before invoking `d-focus-tasks`, run the keyword-overlap check from Step 3.1 between:
- The ledger top active row (full text)
- The last ~30 conversation turns (collapsed to the same content-word set)

If shared content-words <2 (the mismatch threshold), halt and ask the operator using this exact prompt text (only the two slots vary):

> The ledger's top active row reads: "<row>". The current session has been working on "<inferred-topic>". Is this current work a sub-thread of the active row, or does the ledger need updating before I write the handover prompt?

Resume after their answer.

## Step 5 — Invoke d-focus-tasks (hard sub-step, P11 pre-flight)

Call `d-focus-tasks` with the current commit/plan/handover state to update `master-tasks.md`.

**Inputs passed:**
- Ledger path resolved in Step 3.
- Current topic + status (active / paused / blocked / handover-prep).
- Current commit SHA — resolved by running `git -C <project_root> log -1 --format=%h` if the project root is a git working tree. If no git tree (e.g. `claude-skill-dev` profile), or `git` fails, ask the operator once: "Pre-flight ledger row needs a commit SHA. Paste short SHA, or answer `none yet` if no commit exists for this work." **Inferred-from-conversation SHA is explicitly rejected** — `d-focus-tasks` deduplicates by SHA; a guessed SHA risks logging the wrong commit.
- Operator-supplied next-action summary.

**Behaviour:**
- If `d-focus-tasks` halts (missing ledger → scan-or-blank question), surface the question to the operator and resume after their answer.
- After success, print this P11 confirmation line on its own line in the same response:

  ```
  [focus-tasks-ledger updated — handover prep — <ledger-path>]
  ```

- If `d-focus-tasks` errors hard (permission, malformed ledger), halt and surface the error. Do not emit the handover prompt.

## Step 6 — Auto-detect F-* priority

Sources scanned, in order, until one returns a usable F-* priority list:

1. **Memory** — grep `~/.claude/projects/<active-project>/memory/MEMORY.md` and individual memory files for filenames or content matching `*failure_priority*`, `F-SEC`, `F-DEG`, `F-MISS`, `F-COST$`, `F-THRU`, `F-CHECK-EFF`, `F-OVERFIT`, `F-IMPOSSIBLE`. **`<active-project>` derivation:** this slug is the agent runtime's project namespace (the directory name under `~/.claude/projects/`, e.g. `d--AI-ChatGPT` for this operator's primary working directory). It is NOT derived from `project_root` — when `profile_key=wpservice-saas` resolves `project_root` to `D:\AI\CU\AI Assets Scanner\wpservice-saas`, the memory still lives under the agent's startup slug (`d--AI-ChatGPT`), not under a per-subroot namespace. Read the slug from the runtime, not from `project_root`.
2. **Project CLAUDE.md** — read `<project_root>\CLAUDE.md` if it exists; grep for the same patterns.
3. **Recent specs** — scan `<project_root>\docs\product-docs\04-development\` for the 5 most recently modified files; grep for F-* patterns.

**Staleness check:** if the detected anchor memory file has a date older than **14 days** from today (parsed from filename or content), tag the result `stale` in the audit footer; do not block emit. (14d picked because the project's memory cadence is ~daily; 14d gives one re-anchor cycle before flagging.)

**Fallback:** if no source returns a list, ask:

> I couldn't auto-detect the F-* priority for this project. Paste the priority order (e.g. `F-SEC > F-DEG > F-MISS > F-COST$ > F-THRU > F-CHECK-EFF > F-OVERFIT > F-IMPOSSIBLE`) or skip to omit F-* from the handover.

## Step 7 — Structured intake

Ask one at a time. Multiple-choice where possible. Operator can answer "skip" on any non-mandatory question.

1. **Topic slug** (mandatory) — kebab-case, used in filename + headings.
   - Auto-suggestion: derived from ledger top active row leading phrase.
   - **Collision check:** if `<date>-<slug>-handoff.md` already exists in `<project_root>\docs\product-docs\04-development\`, ask: overwrite / use `-r2` suffix / update in place / pick new slug. Default = `-r2`.
2. **One-paragraph current-state summary** (mandatory) — 1-3 sentences. Do NOT infer; the operator writes this.
3. **First action** (mandatory) — multi-choice, expanded enum + free-text fallback:
   - **Process skills:** `superpowers:brainstorming` / `d-review` / `superpowers:writing-plans` / `superpowers:executing-plans` / `superpowers:systematic-debugging` / `superpowers:verification-before-completion` / `superpowers:requesting-code-review` / `superpowers:subagent-driven-development` / `superpowers:using-git-worktrees`
   - **Project process:** `d-focus-tasks` (when fresh agent's job is to read+confirm ledger first), `d-handover` (chained handover)
   - **Domain skills:** `wp-compliance` (any WP plugin work), `seo-*` (any SEO skill family)
   - **Other (free text):** operator types the next-skill identifier and the action verb separately.

   **Free-text rendering rule:** for "other", ask two follow-ups: (a) what `{{NEXT_SKILL}}` invocation string to put after "Invoke" in the inline prompt (e.g. `myplugin:custom-skill` or literal text `the operator's named playbook X`); (b) what `{{FIRST_ACTION_VERB}}` phrase to put after "and" (e.g. `run the Phase B coverage relaxation review`). Both are required for "other"; do not render the prompt otherwise.
4. **Must-read sequence** (mandatory, ≥1 entry beyond the auto-pre-filled ledger row) — operator lists files in strict order. Top entry auto-pre-filled with the ledger row reference. Suggest candidates from:
   - **Session-referenced spec** — the design doc with the highest mention-count across the last ~30 conversation turns. Fallback if nothing matches: most recently modified file in `<project_root>\docs\product-docs\04-development\`.
   - **Session-referenced plan** — same logic against `tasks/` or `<project>\CU Scanner Railway\...\tasks\` folders.
   - **Recent evidence** — newest folder under `<project_root>\debug-evidence\` and its largest log/memo file.
   - **Project CLAUDE.md** — at the project root if present.

   Validate each path exists; warn next to misses, do NOT block.
5. **Hard constraints to carry** (multi-select, project-aware defaults — see Step 7.5).
6. **Do-NOT list** (multi-line free-form) — gotchas, dead-ends, premature shortcuts.

## Step 7.5 — Project-aware hard-constraint defaults

Keyed off `profile_key` from Step 2 (not on raw path matching). Each profile pre-checks a default set; operator can add/remove from the full menu.

| `profile_key` | Default-checked constraints |
|---|---|
| `CU` | P9; P11; no-Railway-state-changes; HOLD-before-code-execution (chain below the table) |
| `wpservice-saas` | P10 wp-compliance; SFTP-not-Railway deploy (manual); P9; P11 |
| `AI-Assets-Scanner` | P10 wp-compliance; P9; P11; cache-bust on JS/CSS enqueue change |
| `claude-skill-dev` | P11 if a project ledger applies; no auto-install of skill without operator YES |
| `other` | No defaults pre-checked; operator picks from full menu |

> **HOLD-before-code-execution chain:** brainstorm → spec → d-review → approval → writing-plans → operator approval → executing-plans → HOLD before push → P9 → push.

**Full menu** (operator picks beyond defaults): P9 push gate, P10 wp-compliance, P11 ledger, no-Railway-state-changes, HOLD-before-code-execution, HOLD-before-push, P5 elegance, P6 autonomous bug fixing, P8 simplicity-first, cache-bust on JS/CSS enqueue change.

**Preferences (NOT hard constraints — surface via free-text intake Q6 if relevant)**: env-var additions require justification per CLAUDE.md (preference; not a ban). New env vars ARE allowed if justified; "no new env vars" is NOT a hard rule. (Removed from defaults + full menu 2026-05-13 PM per operator clarification.)

## Step 8 — Classify complexity (load-bearing vs inline-only)

Single post-intake pass — runs after Step 7 completes, so every flag has a fillable input.

A handover is **load-bearing** (writes a `.md` doc in addition to inline prompt) when ≥2 of these flags fire:

| # | Flag | Detection signal | Input source |
|---|---|---|---|
| 1 | F-* trade-off table needed | Operator intake Q2 (state summary) or Q6 (do-NOT list) mentions ≥2 quantified F-* deltas | Intake answers |
| 2 | ≥2 architectural options carried | Operator intake Q2 mentions "Option 2", "Approach A vs B", etc. | Intake answers |
| 3 | Plan paused mid-task | Ledger top row contains "paused", "BLOCKED on", "Tasks X-Y paused" | Ledger (read in Step 3) |
| 4 | Active spec is in needs-revision / blocked-on-context | Intake Q4 includes a path matching `*-design.md`; if a sibling `*-review*.md` exists in the same folder and its `**Verdict:**` line reads `needs-revision` or `blocked-on-context`, fire the flag. If no design path in must-read, skip (flag does not fire). | Intake Q4 + filesystem |
| 5 | Next action is `brainstorming` | Operator picks brainstorming as first-action skill in Q3 | Intake answers |
| 6 | Sanity-retest / evidence file is load-bearing | Operator's must-read list (Q4) includes a `debug-evidence/*.json` or `*-retest*.md` or `*-handoff*.md` file | Intake Q4 |

Print the classifier result + which flags fired, so the operator can override (`force load-bearing` / `force inline-only`).

## Step 9 — Render templates

Load `templates/inline-prompt.md` and (if Step 8 classified load-bearing) `templates/handoff-doc.md`. Fill placeholders. Write outputs.

### 9.1 Placeholder semantics (inline-prompt.md)

- `{{LEAD_PARAGRAPH}}`: 1-3 sentences from intake Q2.
- `{{NEXT_SKILL}}`: e.g. `superpowers:brainstorming`, `superpowers:executing-plans`, `d-review`. From intake Q3.
- `{{FIRST_ACTION_VERB}}`: "start the Option 2 brainstorm", "execute Task 11", "review the spec", etc. Built from intake Q3.
- `{{READ_FIRST_NUMBERED_LIST}}`: numbered list, ledger row first (auto-pre-filled), then operator's entries from Q4. Each entry is path + 1-line purpose.
- `{{CARRY_OVER_FRAMING_OR_EMPTY}}`: for load-bearing handovers, a short bullet list summarising the framing (Options carried, F-* trade-offs noted) with a pointer to the `.md` doc for full text. Empty string for inline-only.
- `{{HARD_CONSTRAINTS_BULLETS}}`: bullets from intake Q5.
- `{{F_STAR_PRIORITY_INLINE}}`: the priority list itself, e.g. `F-SEC > F-DEG > F-MISS > F-COST$ > F-THRU > F-CHECK-EFF > F-OVERFIT > F-IMPOSSIBLE (source: memory/feedback_cu_scanner_failure_priority_anchor.md)`. If Step 6 returned nothing AND operator skipped, omit the entire `- F-priority: …` bullet line (strip that single line, not the whole hard-constraints section).
- `{{HANDOFF_DOC_REF_PARENTHETICAL_OR_EMPTY}}`: ` (see handoff §5 for full list)` for load-bearing, empty string for inline-only.
- `{{DO_NOT_LIST}}`: bullets from intake Q6.
- `{{KICKOFF_INSTRUCTION}}`: 1-2 sentence kick-off, including which read-first item to start with and whether the first clarifying question is the fresh agent's to pick.

### 9.2 Output writing

- Inline prompt: emit in a single fenced code block in the chat. No narrative interruptions inside the block.
- Handoff doc (load-bearing only): write to `<project_root>\docs\product-docs\04-development\<YYYY-MM-DD>-<slug>-handoff.md`. Use the native Write tool. Do NOT commit; operator commits.

## Step 10 — Final ledger touch

If Step 9 wrote a load-bearing `.md`, re-invoke `d-focus-tasks` to log the doc path under the current top active row (as `handover: <path>`). Print a second P11 confirmation line:

```
[focus-tasks-ledger updated — handover doc written — <ledger-path>]
```

Inline-only handovers skip this step; the Step 5 pre-flight update already captured the handover-prep event.

## Step 11 — Audit footer (printed outside the fenced copy/paste block)

Exact shape — every field is always present even if value is `none`; order is fixed; one line per field for `grep`-ability:

```
wrote: <doc path or "none">
ledger pre-flight P11 line: [focus-tasks-ledger updated — handover prep — <ledger-path>]
ledger post-emit P11 line: [focus-tasks-ledger updated — handover doc written — <ledger-path>] OR "skipped (inline-only handover)"
complexity: <load-bearing | inline-only> (flags fired: <comma-list or "none">) (operator override: <yes/no>)
F-priority source: <path or "operator-supplied" or "none">
F-priority freshness: <fresh | stale | n/a>
must-read paths missing: <comma-list or "none">
project root: <path>
profile_key: <CU | wpservice-saas | AI-Assets-Scanner | claude-skill-dev | other>
ledger path: <path>
additional-working-dirs: <available | unavailable>
```

The `ledger pre-flight P11 line` and `ledger post-emit P11 line` fields re-print the literal P11 confirmation lines (not paths only, not references). This means operator and any auditing reader can `grep "focus-tasks-ledger updated"` against either the live chat or the audit footer and find the same string twice for load-bearing handovers, once for inline-only.

The fenced copy/paste block (the inline prompt) stays clean so the operator can copy-paste without trimming.

## Failure Modes + Escape Valves

| Failure | Behaviour |
|---|---|
| `d-focus-tasks` errors hard | Halt before emit; surface error verbatim; do not write prompt or doc. |
| Project root ambiguous | Ask once with detected candidates; respect operator choice. |
| Multiple ledgers found, no decisive heuristic winner | Show numbered list (path + last-modified + top-row preview); operator picks. |
| Ledger row ↔ session topic mismatch | Halt; ask whether ledger needs updating or work is sub-thread; resume after answer. |
| F-* auto-detection finds nothing | Ask operator to paste or skip. |
| F-* anchor memory >14 days old | Continue; flag `stale` in audit footer. |
| Must-read paths don't exist | Inline warning next to each missing path; do not block emit. |
| Topic-slug collision (existing file) | Ask: overwrite / -r2 / update-in-place / new slug; default `-r2`. |
| Global CLAUDE.md not found at `C:\Users\dalib\.claude\CLAUDE.md` | Halt — rules are load-bearing; ask operator for path or to fix. |
| MEMORY.md not found at expected project path | Continue; log in audit footer; F-* falls back to project CLAUDE.md or operator input. |
| Empty conversation context (no current work topic) | Halt; ask operator to paste state summary; no fabrication. |
| Complexity classifier disagrees with operator intent | Print classifier verdict + flags; honour operator override (`force load-bearing` / `force inline-only`). |

## What d-handover does NOT do

- Does not push to remote (P9 stands).
- Does not commit the handoff `.md` (operator commits, keeps human-in-loop).
- Does not invent project state — only carries what the operator types in intake + what auto-detection surfaces from canonical sources (ledger, CLAUDE.md, memory).
- Does not skip `d-focus-tasks`.
- Does not auto-clear the previous session's todo list.
- Does not install the skill itself into `~/.claude/skills/` — that is a separate implementation step gated by operator approval.
- Does not modify `CLAUDE.md` or memory files.
- Does not invoke the next-skill (brainstorming / writing-plans / etc.) on behalf of the fresh agent. That is the fresh agent's first action.

## Acceptance Criteria (self-check before emit)

A successful run produces:

1. An updated ledger with a handover-prep row at the top active task, printed via P11 confirmation line.
2. (Load-bearing only) A `.md` handoff doc at `<root>\docs\product-docs\04-development\<date>-<slug>-handoff.md` matching the `templates/handoff-doc.md` skeleton.
3. An inline copy/paste prompt in a single fenced code block, structured per `templates/inline-prompt.md`, with:
   - Read-first sequence containing ledger row + ≥1 operator-supplied path
   - Hard constraints bullets including F-* priority line (if detected or supplied)
   - Do-NOT list with ≥1 entry
   - Specific kickoff instruction naming the next-skill invocation
4. An audit footer outside the fenced block per Step 11, with all 11 fields populated.
5. No silent decisions: every classifier verdict, ledger pick, and staleness flag is visible to the operator.

**Conditional ACs** (must hold when their precondition fires):

6. **Multi-ledger disambiguation** — if Step 3 finds ≥2 ledgers and no decisive heuristic winner, print a numbered list (path + last-modified + first-200-chars of top active row) and halt pending operator pick.
7. **Step 4 mismatch halt format** — when keyword-overlap is <2, print the exact phrasing: `The ledger's top active row reads: "<row>". The current session has been working on "<inferred-topic>". Is this current work a sub-thread of the active row, or does the ledger need updating before I write the handover prompt?` (Verbatim text; only the two `<...>` slots vary.)
8. **Operator override of classifier** — when operator passes `force load-bearing` or `force inline-only` after the classifier verdict prints, respect the override and log `operator override: yes` in the audit footer field. Without override, the field reads `no`.
9. **First-action "other (free text)"** — collect both `{{NEXT_SKILL}}` and `{{FIRST_ACTION_VERB}}` before rendering; if either is missing, halt and re-ask rather than rendering with placeholders.
10. **Global CLAUDE.md missing** — Step 1 halts with the exact error string; audit footer is NOT printed (no emit).
11. **`additional-working-dirs: unavailable`** — when runtime does not expose the additional-working-directories block, still produce a valid prompt using paths (1) + (2) of Step 3 and log the unavailability in the audit footer.
