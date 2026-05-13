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
| `CU` | P9; P11; no-Railway-state-changes; no-new-env-vars; HOLD-before-code-execution (chain below the table) |
| `wpservice-saas` | P10 wp-compliance; SFTP-not-Railway deploy (manual); P9; P11 |
| `AI-Assets-Scanner` | P10 wp-compliance; P9; P11; cache-bust on JS/CSS enqueue change |
| `claude-skill-dev` | P11 if a project ledger applies; no auto-install of skill without operator YES |
| `other` | No defaults pre-checked; operator picks from full menu |

> **HOLD-before-code-execution chain:** brainstorm → spec → d-review → approval → writing-plans → operator approval → executing-plans → HOLD before push → P9 → push.

**Full menu** (operator picks beyond defaults): P9 push gate, P10 wp-compliance, P11 ledger, no-Railway-state-changes, no-new-env-vars, HOLD-before-code-execution, HOLD-before-push, P5 elegance, P6 autonomous bug fixing, P8 simplicity-first, cache-bust on JS/CSS enqueue change.

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
