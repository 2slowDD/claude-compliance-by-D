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
- **Skip Step 5.5** (session-discovered FU sweep). No ledger to sweep into; the spawned-FU list is still carried inline in the prompt as a "Parallel open FUs" block (operator's responsibility to home them later).
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
1.   Verify global CLAUDE.md exists               (Step 1 below)
2.   Locate project root + select profile         (Step 2)
3.   Locate ledger                                (Step 3)
4.   Detect ledger ↔ session topic mismatch       (Step 4)
5.   Invoke d-focus-tasks                         (P11 pre-flight; Step 5)
5.5. Session-discovered follow-up sweep           (Step 5.5 — sweep spawned FUs into ledger register)
6.   Auto-detect F-* priority                     (Step 6)
7.   Structured intake                            (Step 7; check Step 7.0 delegated-intake predicate FIRST)
8.   Classify complexity                          (Step 8 — single post-intake pass)
8.5. Docs-debt closure pre-pass                   (Step 8.5 — fires on closure-signal detection; operator-reviewable)
8.7. Pre-emit state verification + live-work check (Step 8.7 — state facts from tool output only; halt on stranded background work)
9.   Render templates                             (Step 9)
10.  Final ledger touch                           (post-emit, if a new handoff doc was written; Step 10)
11.  Print audit footer                           (Step 11)
```

## Step 1 — Verify global CLAUDE.md exists

Read `C:\Users\Korisnik\.claude\CLAUDE.md`. If missing or unreadable, halt with this exact error:

> Global CLAUDE.md not found at <path>; rules are load-bearing for hard-constraint defaults. Resolve path or supply rules explicitly before re-running.

Do NOT emit the prompt or print the audit footer.

## Step 2 — Locate project root + select profile

Resolve `project_root` and `profile_key` together. Both feed Step 3 (ledger location) and Step 7.5 (constraint defaults).

### 2.1 Supported roots + resolution table

| `profile_key` | Path-pattern trigger (any one matches) | `project_root` | Notes |
|---|---|---|---|
| `CU` | cwd is `C:\AI\CU` exactly, or any path under it that is NOT under one of the subroots below | `C:\AI\CU` | Default for the scanner project. |
| `wpservice-saas` | cwd contains `wpservice-saas` as a path segment | `C:\AI\CU\AI Assets Scanner\wpservice-saas` (closest ancestor matching the segment) | WP plugin; ledger may be at the CU master location or the subroot. Step 3 multi-ledger scan handles both. |
| `AI-Assets-Scanner` | cwd contains `AI-Assets-Scanner` as a path segment AND NOT `wpservice-saas` | `C:\AI\CU\AI Assets Scanner\AI-Assets-Scanner` (closest ancestor matching the segment) | WP plugin; same ledger note. |
| `claude-skill-dev` | cwd is under `C:\Users\Korisnik\.claude` or `C:\Users\Korisnik\claude-compliance-by-D` (skill development sessions) | `<the matching root>` | Step 3 still runs; scan typically finds zero ledgers under this root, so it falls through to "0 ledgers found" → `d-focus-tasks` asks scan-or-blank per its default protocol. |
| `other` | none of the above | operator-supplied | Prompt: "I couldn't identify a known project root from cwd `<cwd>`. Paste the project root path or accept the default `C:\AI\CU`." |

### 2.2 Resolution flow

1. **Operator-supplied path in the invocation** → match against the table; if path falls under a known subroot, use that profile; if not, treat as `other`.
2. **cwd-based match** → walk cwd ancestors against the table top-to-bottom; first match wins.
3. **Session-activity fallback** → if cwd is at `C:\AI\CU` exactly but recent conversation activity (last ~30 turns) shows edits or file references under one of the subroots, ask: "cwd is at CU root but recent activity references `<subroot>`. Pick profile: (a) CU, (b) `<subroot>`."
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

## Step 5.5 — Task-FU census + session-discovered follow-up sweep (skip when `no_ledger=true`)

The outgoing agent is the only one who knows the follow-ups it spawned this session. If they live only in a spec's "Follow-ups discovered" section, a memory file, or chat, the fresh agent (and every later agent) won't see them in the ledger register — the canonical "what's open" surface. Sweep them into the ledger **register body** (NOT the opening top-row prose) before emitting the prompt.

**This is a CENSUS, not a memory dump.** "The FUs I remember spawning" under-collects — FUs related to the handed-over task live in MANY homes. Enumerate each source explicitly (grep, don't recall) and record which sources you swept:

| FU source | How to sweep it |
|---|---|
| Ledger register rows for this workstream | Grep the register for the task's FU ids / topic keywords |
| Spec follow-up sections (§10-style bundles, "Follow-ups discovered during this task") | Grep the active spec + plan |
| Task/fix-round reports' follow-up + concerns sections | Grep the task workspace's `*-report.md` files |
| In-code markers added this workstream (⚠️/TODO/tripwire comments naming a future decision) | Grep the branch diff for marker idioms |
| Predecessor handoffs' parked / deferred / flip-time lists | The rN-1 doc (already a Step 8.5 candidate) |
| The current conversation (operator "later/parallel" flags, deferred minors, "fix before X" notes) | Session review |

1. **Collect** from every source above. An FU related to the task at hand that appears in NONE of {ledger register, the handover's carried list} after this step is the failure this census exists to prevent.
2. **Dedupe** against the existing register rows by FU id / one-line intent (per the d-focus-tasks dedup discipline). Already-present → leave as-is (do not duplicate).
3. **Write the missing ones** into the register section (the `## *Follow-up Register*` table, or the project's equivalent open-FU section — NOT the `> TOP ACTIVE ROW` opening, NOT `Last updated`). Each new row: id, `⏳ OPEN` + one-line state, priority, trigger/blocks. If the project has no dedicated FU/register section, create one **separate sub-section** (`### Session-discovered follow-ups`) under the active-work area rather than appending to the top-row prose.
4. **This runs through `d-focus-tasks`** (Step 5 already invoked it; this sweep is additional rows under the same ledger write) — preserve history, never delete existing rows.
5. **Carry the same list inline** into the handover (it becomes the §8.5 "Parallel open FUs" block of the handoff doc, or a `Parallel open FUs (resume after this task)` bullet group in an inline-only prompt) so the fresh agent sees them **without** needing to read the full ledger.
5.6. **Order the carried list the best way FOR THE TASK — the receiving agent's consumption order, never discovery order.** The ordering scheme: (1) items the FIRST ACTION depends on or that gate it; (2) items grouped by pickup moment, in the order the next agent's execution path reaches them (task-queue order → final-review items → flip-time items → housekeeping/parallel); (3) within a group, blocking before cosmetic. Name the scheme used in one line so the fresh agent knows the order is load-bearing, not arbitrary. A flat or chronological FU list forces the fresh agent to re-derive relevance — which is exactly the context the outgoing agent was supposed to transfer.
6. Print one line: `[focus-tasks — FU census: sources swept <list>; swept N into register: <comma id list>; M already present; carried K ordered by <scheme>]` (or `[focus-tasks — FU census: no open FUs]`).

**❌ Do NOT append swept FUs to the `> TOP ACTIVE ROW` / `Last updated` opening prose.** That bloats the opening (the recurring D-Master-Ledger-Trim context tax) AND buries the FUs where the register-reader won't find them. Swept FUs go in the register body table or a dedicated `### Session-discovered follow-ups` sub-section under the active-work area — never the opening.

This step exists because a spec-only follow-up (`FU-…` filed in a spec §9 but never propagated to the ledger) is invisible at the register — caught 2026-05-29 by operator double-check.

## Step 6 — Auto-detect F-* priority

Sources scanned, in order, until one returns a usable F-* priority list:

1. **Memory** — grep `~/.claude/projects/<active-project>/memory/MEMORY.md` and individual memory files for filenames or content matching `*failure_priority*`, `F-SEC`, `F-DEG`, `F-MISS`, `F-COST$`, `F-THRU`, `F-CHECK-EFF`, `F-OVERFIT`, `F-IMPOSSIBLE`. **`<active-project>` derivation:** this slug is the agent runtime's project namespace (the directory name under `~/.claude/projects/`, e.g. `d--AI-ChatGPT` for this operator's primary working directory). It is NOT derived from `project_root` — when `profile_key=wpservice-saas` resolves `project_root` to `C:\AI\CU\AI Assets Scanner\wpservice-saas`, the memory still lives under the agent's startup slug (`d--AI-ChatGPT`), not under a per-subroot namespace. Read the slug from the runtime, not from `project_root`.
2. **Project CLAUDE.md** — read `<project_root>\CLAUDE.md` if it exists; grep for the same patterns.
3. **Recent specs** — scan `<project_root>\docs\product-docs\04-development\` for the 5 most recently modified files; grep for F-* patterns.

**Staleness check:** if the detected anchor memory file has a date older than **14 days** from today (parsed from filename or content), tag the result `stale` in the audit footer; do not block emit. (14d picked because the project's memory cadence is ~daily; 14d gives one re-anchor cycle before flagging.)

**Fallback:** if no source returns a list, ask:

> I couldn't auto-detect the F-* priority for this project. Paste the priority order (e.g. `F-SEC > F-DEG > F-MISS > F-COST$ > F-THRU > F-CHECK-EFF > F-OVERFIT > F-IMPOSSIBLE`) or skip to omit F-* from the handover.

## Step 7 — Structured intake

### Step 7.0 — Delegated-intake path (check this predicate FIRST)

**Observable predicate:** the operator's handover request delegates the content — phrasing like "ensure the next agent has all the needed details", "you fill in the details", "package everything it needs", or a standing directive given earlier in the session ("do a d-handover after task N"). A pasted state summary (the existing Triggers-section rule) is also delegation for Q2 specifically.

**When the predicate fires:** do NOT ask Q1–Q6 one at a time. Instead:
1. Fill every intake slot from session state — ledger lines, git output, and this session's recorded decisions. Facts still come from canonical sources (Step 8.7 verifies them); delegation changes WHO fills the slots, not where facts come from.
2. Present ONE batched confirmation (AskUserQuestion-style) covering ONLY the genuinely open decisions — typically: complexity-classifier override, first-action choice if ambiguous, and Step 8.5 annotation approvals. Pre-filled slots the operator did not ask about are printed in the emitted prompt itself, which is their review surface.
3. Everything the skill fills must still be VISIBLE and overridable — printed, never silent.

**When it does not fire:** proceed with the sequential intake below unchanged. *(This path exists because a real handover request "do a /d-handover after task 8; ensure the following agent has all the needed details" collided with six sequential questions whose answers were already in session state — 2026-07-27.)*

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
| `CU` | P9; P11; P12 d-assumption; P13 d-test-assumptions; no-Railway-state-changes; HOLD-before-code-execution (chain below the table) |
| `wpservice-saas` | P10 wp-compliance; SFTP-not-Railway deploy (manual); P9; P11; P12 d-assumption; P13 d-test-assumptions |
| `AI-Assets-Scanner` | P10 wp-compliance; P9; P11; P12 d-assumption; P13 d-test-assumptions; cache-bust on JS/CSS enqueue change |
| `claude-skill-dev` | P11 if a project ledger applies; P13 d-test-assumptions (non-trivial skill design); no auto-install of skill without operator YES |
| `other` | No defaults pre-checked; operator picks from full menu |

> **HOLD-before-code-execution chain:** brainstorm → spec → d-review → approval → writing-plans → operator approval → executing-plans → HOLD before push → P9 → push.

> **P12 d-assumption + P13 d-test-assumptions + P16 verify-before-amplify (carry into the fresh-agent prompt by default for any project with code work).** The fresh agent MUST apply all three, on by default per global CLAUDE.md:
> - **P12 d-assumption** — tag every item in plans / recommendations / multi-item answers `⚠️ Assumption` or `🟢 CONFIRMED` with a short basis note (inline, no summary block).
> - **P16 verify-before-amplify — a 🟢 means *you* ran the check.** A claim inherited from a subagent, a d-review, or a prior session is **⚠️ INHERITED — from `<source>`, NOT independently verified** — never 🟢, no matter what the source calls it. Before any load-bearing claim enters a durable artifact it must be 🟢 **with the check cited**, or explicitly marked INHERITED. **This binds hardest on handovers specifically: the brief you are reading is a durable artifact, and so is the one you write.** *(The rule exists because an agent's "six code-verified defects" were republished into a ledger and a handover under a 🟢; four of six were false and none had been checked.)*
> - **P13 d-test-assumptions — TWO trigger points:** (1) **Phase 1 — before locking in any non-trivial approach** (architectural weight, or 3+ steps): inventory load-bearing claims, state the assumption load, test the testables (N≥2), emit per-claim 🟢 CONFIRMED / 🔴 REFUTED / 🟡 INCONCLUSIVE; a refuted load-bearing assumption repositions once then checkpoints with the operator. (2) **Phase 2 — after implementing an easily-verifiable code segment**: quick-test against spec; in line → proceed; not in line → PAUSE, do not patch-and-continue, alert the operator. Session off-switch: `/d-test-assumptions off`.
> These are on-by-default. Authoritative runtime reference for both is `~/.claude/CLAUDE.md` — **P12** (rule block "Assumption / Confirmation Tagging (d-assumption)") + **P13** (rule block "Assumption Testing & Verification Discipline (d-test-assumptions)"); P13 also has the skill `~/.claude/skills/d-test-assumptions/SKILL.md` (P12 is rule-only — no separate skill; rule source lives at `claude-compliance-by-D/claude-rules/d-assumption.md`). The handover prompt should name both so the fresh agent does not silently skip the assumption discipline on the work it inherits — it is inheriting an approach it did not author, which is exactly the Phase-1 trigger condition.

**Full menu** (operator picks beyond defaults): P9 push gate, P10 wp-compliance, P11 ledger, P12 d-assumption tagging, P13 d-test-assumptions (Phase 1 pre-lock-in + Phase 2 post-implementation), no-Railway-state-changes, HOLD-before-code-execution, HOLD-before-push, P5 elegance, P6 autonomous bug fixing, P8 simplicity-first, cache-bust on JS/CSS enqueue change.

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

## Step 8.5 — Docs-debt closure pre-pass (added 2026-05-13 PM)

**Goal**: detect and remediate stale-doc state for any just-closed-or-superseded work-track BEFORE emitting the handover prompt. Fresh agents picking up the new work-track shouldn't be misled by upstream docs (specs / memos / plans / kickoff handoffs) that still reflect a pre-closure state.

This step exists because closure events (work-track parking, supersession, rollback, ratification, refutation) leave a trail of related artifacts that need annotation: a spec marked "shipped" when it was just rolled back, a parking memo that still says "parked" when the work has unparked, a kickoff handoff that doesn't yet point at the closure spec. Without this pass, every closure-handover requires manual operator follow-up to fix the doc graph — exactly the friction the operator surfaced 2026-05-13 PM ("I'd like the handover skill also triggers the proper doc debt closure, so I don't have to do this again").

### 8.5.1 When this step fires

Trigger detection — keyword scan over intake Q2 (state-summary) for closure signals:

| Signal pattern | Example |
|---|---|
| `closed`, `CLOSED`, `work-track closed`, `work-track closure` | "wrapper-redesign work-track CLOSED" |
| `superseded`, `SUPERSEDED`, `supersede` | "rev 2.1 SUPERSEDED by …" |
| `rolled back`, `rollback`, `revert` | "rollback shipped at `2a1b59d`" |
| `parked`, `PARKED`, `unparked`, `UNPARKED` | "Phase 2 UNPARKED" |
| `obsolete`, `OBSOLETE`, `deprecated`, `DEPRECATED` | "Tasks 11-18 obsolete" |
| `ratified`, `approved` (when in completion context) | "spec ratified by d-review r2" |
| `dropped`, `DROPPED`, `refuted`, `REFUTED`, `vindicated`, `VINDICATED` | "hypothesis REFUTED" |
| `Step N of Bundle X` (bundle-progression closure) | "Step 1 of B1 shipped" |
| `complete`, `COMPLETE`, `all complete`, `Tasks N–M complete` (completion context — a work phase finishing IS a closure event) | "Tasks 0–8 ALL COMPLETE" *(added 2026-07-27: this phrasing matched no pattern and the step only fired by agent judgment)* |

If NONE match → step is a no-op; audit footer reads `docs-closure: skipped (no closure signals in Q2 summary)`.

**Operator overrides** (CLI-style args on d-handover invocation, parsed per the no-ledger flag grammar pattern):
- `--skip-docs-closure` or `-skip-docs-closure` → skip this step regardless of detection
- `--force-docs-closure` or `-force-docs-closure` → run this step even when no signals match

### 8.5.2 Candidate-doc discovery

When the step fires:

1. **Touched-files this session** — start with files the agent has read, edited, written, or staged in the current turn AND prior turns of the current agent session. Per the d-focus-tasks "touched paths" definition.
2. **Walk the work-track artifact graph** outward from each touched file:
   - Specs in `<project_root>/docs/product-docs/04-development/` matching topic keywords from intake Q1 (topic slug) or intake Q2 (state summary)
   - Sibling d-reviews matching `<spec-name>-review*.md` patterns in the same folder
   - Memory files in `~/.claude/projects/<slug>/memory/` indexed in `MEMORY.md`, matching topic keywords
   - Evidence memos and verdict files in `<project_root>/debug-evidence/<date>/` referenced by any in-scope spec
   - Task plans in `<project_root>/CU Scanner Railway/.../tasks/` matching topic keywords
2.5. **The immediately-prior handoff doc is ALWAYS a candidate when writing a successor.** If this handover writes `<slug>-handoff-rN` (or a dated successor to an existing handoff), the rN-1 doc enters the candidates list automatically, default classification HISTORICAL with a proposed "superseded by rN, do not act on its queue" annotation. The operator still approves via the 8.5.4 gate. *(Added 2026-07-27: the r1→r2→r3 chain each needed this annotation and it only happened by agent judgment.)*
3. **De-duplicate** by absolute path.
4. **Cap at ~20 candidates max** — beyond that, operator-time-cost outweighs benefit; surface a `>20 candidates detected — focus operator review on top N by relevance` warning and present only the top 20.

### 8.5.3 Staleness classification

For each candidate doc, classify into ONE of four states:

| State | Detection signal | Action |
|---|---|---|
| **STALE** | Top-of-file `Status:` header (or `**Status:**` line) predates the closure event AND its wording contradicts the new state. Example: spec says "SHIPPED" when work-track has now rolled back. | Propose status-header annotation. |
| **NEEDS-CROSS-REF** | Doc references an upstream artifact (by path) whose state has changed in this session; downstream's reference is stale or missing. Example: parking memo references mobile-determinism work which has now closed; cross-ref to closure spec missing. | Propose adding cross-reference. |
| **HISTORICAL** | Doc is intentionally pre-closure (kickoff handoffs, intermediate d-reviews, in-progress brainstorm artifacts). Should NOT be edited to claim current-state; should gain a "(HISTORICAL — superseded by …)" header annotation that redirects future readers. | Propose historical annotation. |
| **UP-TO-DATE** | Doc's status header / cross-refs already reflect the closure. (This catches docs operator may have already annotated manually mid-session.) | No edit; report as up-to-date. |

### 8.5.4 Operator-review gate

Print a numbered candidates list with classification + proposed annotation summary:

```
Docs-debt closure pre-pass — N candidates detected:

1. <relative-path> — STALE
   Reason: <one-line reason>
   Proposed annotation (top of file):
   <2-line preview of proposed status header text>

2. <relative-path> — NEEDS-CROSS-REF
   Reason: missing pointer to <upstream-path>'s current state
   Proposed annotation: <one-line insert preview>

3. <relative-path> — HISTORICAL
   Reason: kickoff handoff for now-closed work-track
   Proposed annotation: add (HISTORICAL — superseded by <closure-spec>) note

4. <relative-path> — UP-TO-DATE
   (no edit; manually annotated already)

How to respond:
- "all" → apply all proposed annotations
- "1,3" or "1-3" → apply only these
- "none" → skip docs-closure for this handover; flag in audit footer
- "edit N: <text>" → operator pastes desired annotation for candidate N
- "skip N" → mark candidate N as deliberately-unannotated for this pass
```

Wait for operator response. Honor exactly. Do not silently expand scope.

### 8.5.5 Apply approved annotations

For each approved candidate:
1. Read the file (required by Edit tool).
2. Identify insertion point — usually the top-of-file `Status:` line or a "## N. Disposition update" subsection.
3. Apply annotation, preserving historical content (per d-focus-tasks "preserve historical entries" discipline). Don't delete pre-closure text; add the post-closure annotation.
4. For each successfully applied annotation, log: `docs-closure: annotated <path>`.
5. If an Edit fails (file not found, conflict, etc.), log the failure + skip; do NOT halt the d-handover flow.

### 8.5.6 Verification pass

After applying, print summary:

```
docs-closure pre-pass complete:
- annotated: <count> (paths listed above)
- skipped (operator declined): <count>
- up-to-date (no edit needed): <count>
- failed (errors): <count, with error reasons>
- candidates total: <count>
```

### 8.5.7 Audit footer addition

In Step 11 audit footer, ADD a new field:

```
docs-closure: <annotated>/<total-candidates> (skipped: <count>; up-to-date: <count>; failed: <count>)
```

OR when step is a no-op:
```
docs-closure: skipped (signals not detected in Q2 summary)
```

OR when explicitly bypassed:
```
docs-closure: skipped (operator --skip-docs-closure flag)
```

### 8.5.8 Failure modes + escape valves

| Failure | Behaviour |
|---|---|
| No closure signals AND no operator force | Skip step; audit footer reflects no-op. Do NOT prompt. |
| >20 candidates detected | Cap at 20 by relevance score (recency of edit, keyword-overlap with Q2); surface warning. |
| Operator declines all (`none`) | Skip step; flag in audit footer. Continue to Step 9 render. |
| Edit fails on one candidate | Log failure + skip; continue with remaining candidates; report in summary. |
| Operator asks to halt mid-review | Honor; abort Step 8.5; continue to Step 9 with partial annotations applied. |
| Stale-doc would require operator-only judgement (e.g., AI uncertain whether HISTORICAL or STALE) | Classify as `AMBIGUOUS` with both options; operator picks. |
| Candidate is being written by LIVE background work (Step 8.5 runs before Step 8.7.2's live-work check, so this ordering interaction is reachable) | Classify `AMBIGUOUS — mid-write`; propose `skip N` now; after the 8.7.2 halt resolves (wait/close/document), re-run the pre-pass on that candidate alone. Never annotate a file another process is writing. |

### 8.5.9 What this step does NOT do

- Does not rename files (filename changes are operator-judgement; flag in summary if observed but don't act).
- Does not rewrite spec content — only adds annotations / status updates / cross-references at the top of files or in dedicated subsections.
- Does not commit annotations to git. Product-docs is non-git; memory files are non-git. Operator commits any tracked-file annotations (task plans, repo specs) separately if desired.
- Does not modify `master-tasks.md` (the ledger; that's d-focus-tasks's responsibility per Step 5).

## Step 8.7 — Pre-emit state verification + live-work check

Runs after intake/classification, immediately before rendering. Two halves, both mandatory (skipping either is the failure mode this step exists to close).

### 8.7.1 State facts come from tool output, not recollection

Every load-bearing state fact that will appear in the prompt or doc is re-verified NOW, by running the command, even if it was verified earlier in the session (P16 — the handover is a durable artifact another agent acts on):

| Fact | Command (git tree; adapt per project) |
|---|---|
| HEAD SHA | `git log -1 --format=%h` |
| Commit count vs base | `git rev-list --count <base>..HEAD` |
| Push state | `git ls-remote --heads <remote>` (compare against the base SHA — proves "nothing pushed" rather than asserting it) |
| Tree cleanliness | `git status --short` (name the expected untracked files) |
| Test-gate state | The gate file's current cardinality (e.g. "8 inherited failures") re-read from the gate file itself |

Cite the check beside the fact in the rendered output (the `🟢 re-verified <date>` idiom). **Any fact the outgoing agent did NOT verify first-hand is written `⚠️ INHERITED — from <source>`, never bare.** A handover with a stale HEAD or a wrong "nothing pushed" claim corrupts every downstream decision the fresh agent makes.

### 8.7.2 Live background work check

Enumerate in-flight work the fresh agent cannot see: background shell tasks, running subagents/monitors, suites mid-run (check for live worker processes). Then:

- **Something is running →** halt and ask the operator: (a) wait for completion and fold the result into the handover, (b) close it out now, or (c) document it as **state-on-disk** — file paths, expected completion signal, and how to verify/resume — because agent handles and monitors DIE across sessions; an agent ID in a handover is a dangling pointer. Never emit silently over live work.
- **Nothing running →** record `background-work: none` for the audit footer.

*(Added 2026-07-27: a session with four interruptions showed every interruption killed live subagent monitors; work survived only because state was progressively written to disk. A handover emitted mid-flight would have stranded a running implementer invisibly.)*

### 8.7.3 Progressive-ledger corollary (one line, load-bearing)

If a handover-critical fact exists ONLY in conversation — not in the ledger, a report file, or git — that is a session-discipline gap to fix by writing it down NOW (Step 5/5.5 already ran; append), not something to reconstruct from memory into the prompt. The handover doc should assemble from durable lines, not from recollection.

## Step 9 — Render templates

Load `templates/inline-prompt.md` and (if Step 8 classified load-bearing) `templates/handoff-doc.md`. Fill placeholders. Write outputs.

### 9.1 Placeholder semantics (inline-prompt.md)

- `{{LEAD_PARAGRAPH}}`: 1-3 sentences from intake Q2.
- `{{NEXT_SKILL}}`: e.g. `superpowers:brainstorming`, `superpowers:executing-plans`, `d-review`. From intake Q3.
- `{{FIRST_ACTION_VERB}}`: "start the Option 2 brainstorm", "execute Task 11", "review the spec", etc. Built from intake Q3.
- `{{READ_FIRST_NUMBERED_LIST}}`: numbered list, ledger row first (auto-pre-filled), then operator's entries from Q4. Each entry is path + 1-line purpose. **The ledger row (item #1) MUST carry a d-focus-tasks session pre-direction** so the fresh agent does not have to re-decide the ledger on its first trigger: append to that row the literal text `— this is the project ledger; when d-focus-tasks first prompts this session (first commit/plan trigger), select THIS path (session-start Option 1). Read the top active row now.` Rationale: a fresh agent booted from a pasted prompt is a new d-focus-tasks session (`ledger_session_state = unset`) — the parent's locked session state and the subagent `ledger=<path>` inheritance token do NOT flow into a copy-paste prompt, so without this directive the fresh agent re-runs the 3-option session-start prompt blind. **Omit this pre-direction when `no_ledger=true`** (the no-ledger flag path has no ledger row at all).
  - **Ledger-access mechanics (append to the same item #1 row).** Mature ledgers exceed the Read token cap (a full-file Read fails). Tell the fresh agent how to read it AND where its task lives, so it doesn't bounce off the truncation or miss the open-FU register. At render time the outgoing agent: (a) measures the ledger (`wc -l` / byte size) and the line range of the open-FU register / the rows relevant to THIS handover's task (grep the register heading + the task's FU ids); (b) appends the literal text `— ledger is <size>; if a full Read truncates, use Grep or offset/limit Read. Your task's rows: <section name> ~L<start>-<end>; open follow-up register ~L<a>-<b>. Read those ranges.` Fill the real numbers from (a); if the ledger is small enough to Read whole (< ~1.5k lines and no token-cap warning), append instead `— ledger reads whole; read the register section directly.` **Omit when `no_ledger=true`.**
- `{{CARRY_OVER_FRAMING_OR_EMPTY}}`: for load-bearing handovers, a short bullet list summarising the framing (Options carried, F-* trade-offs noted) with a pointer to the `.md` doc for full text. Empty string for inline-only.
- `{{HARD_CONSTRAINTS_BULLETS}}`: bullets from intake Q5.
- `{{F_STAR_PRIORITY_INLINE}}`: the priority list itself, e.g. `F-SEC > F-DEG > F-MISS > F-COST$ > F-THRU > F-CHECK-EFF > F-OVERFIT > F-IMPOSSIBLE (source: memory/feedback_cu_scanner_failure_priority_anchor.md)`. If Step 6 returned nothing AND operator skipped, omit the entire `- F-priority: …` bullet line (strip that single line, not the whole hard-constraints section).
- `{{HANDOFF_DOC_REF_PARENTHETICAL_OR_EMPTY}}`: ` (see handoff §5 for full list)` for load-bearing, empty string for inline-only.
- `{{DO_NOT_LIST}}`: bullets from intake Q6.
- `{{KICKOFF_INSTRUCTION}}`: 1-2 sentence kick-off, including which read-first item to start with and whether the first clarifying question is the fresh agent's to pick.
- `{{ENV_PRECONDITIONS}}` **(REQUIRED — may be `- none` only when genuinely none):** the services/containers/tools that must be up before the fresh agent's first substantive command, each as: what to start · the verification command · the expected output · the measured cost of forgetting (e.g. `docker exec cu-redis-sdd redis-cli PING → PONG; Redis down = 20 suites / 153 tests fail spuriously`). Environment failures masquerade as code regressions; the cost line is what makes a fresh agent actually run the check.
- `{{CLOSED_ITEMS_LIST}}` **(REQUIRED — may be `- none` only when the session closed nothing):** every operator ruling, ratification, adjudicated finding, and superseded disposition closed during or before the outgoing session, listed BY NAME as "do NOT re-litigate" entries. This is the highest-leverage context-loss guard the template has: a fresh agent that cannot see a decision was made will re-open it, and re-litigating a closed question costs more than any other handover failure. Pull candidates from the ledger's ruling lines; when a prior handover carried a closed-items list, carry it forward and APPEND this session's closures — closures accumulate, they do not expire.

**Cross-cutting placeholder rules (apply to every slot above):**
- **Provenance marking (P16, from Step 8.7.1):** every load-bearing state fact carries either `🟢` + the check that was run, or `⚠️ INHERITED — from <source>`. Never bare.
- **Pickup-moment tagging:** every deferred, parked, or follow-up item carried in the prompt or doc names WHEN it gets picked up (`at task N` / `at final review` / `at flip time` / `housekeeping`). An untagged deferred item is invisible exactly when it becomes relevant — the r2 handoff's "§4 with pickup moments" structure is the reference implementation.
- **Access mechanics, generalized (extends the ledger-only rule above):** at render time, measure EVERY must-read file (`wc -l` / byte size). Any file that would truncate a full Read gets a "read it like this" note on its entry (Grep / offset-limit ranges / N passes, with the relevant line ranges). Any file with pathological structure (huge single lines, BOM, binary sections) gets that named too. A fresh agent bouncing off a truncated read either misses content silently or burns context re-reading — both are handover failures.
- **Line-number citations:** any `file:line` cite in the prompt or doc carries its anchor quote or a "re-anchor by quoted code" note when the target file is still being modified. Line numbers drift; quotes do not.

**Handoff-doc-only placeholders (templates/handoff-doc.md):** `{{STATE_VERIFICATION_LINE}}` = the Step 8.7.1 commands run + date, one line under the Status header. `{{DEFERRED_WITH_PICKUP_MOMENTS}}` = the deferred/parked/FU inventory from the Step 5.5 census, every item tagged with its pickup moment per the cross-cutting rule and **ordered per Step 5.5.6 — the receiving agent's consumption order** (may point at the task ledger for the full list, but the pickup-moment STRUCTURE must be visible in the doc — grouped by moment in execution order, not a flat list).

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
docs-closure: <annotated>/<total-candidates> (skipped: <count>; up-to-date: <count>; failed: <count>) OR "skipped (no closure signals)" OR "skipped (operator --skip-docs-closure flag)" OR "force-run (operator --force-docs-closure flag)"
session-FU-sweep: sources swept <list>; swept <N> (<comma id list>); <M> already present; carried <K> ordered by <scheme> OR "none to sweep" OR "skipped (no-ledger flag)"
F-priority source: <path or "operator-supplied" or "none">
F-priority freshness: <fresh | stale | n/a>
must-read paths missing: <comma-list or "none">
project root: <path>
profile_key: <CU | wpservice-saas | AI-Assets-Scanner | claude-skill-dev | other>
ledger path: <path>
additional-working-dirs: <available | unavailable>
state-verification: <comma-list of commands run in Step 8.7.1, or "FAILED: <fact> unverifiable">
background-work: <none | documented as state-on-disk: <paths> | waited for <task> | closed out <task>>
intake-mode: <sequential | delegated (predicate: "<matched phrasing>")>
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
| Global CLAUDE.md not found at `C:\Users\Korisnik\.claude\CLAUDE.md` | Halt — rules are load-bearing; ask operator for path or to fix. |
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
   - **`{{ENV_PRECONDITIONS}}` and `{{CLOSED_ITEMS_LIST}}` slots rendered** (each may read `- none` only when genuinely empty — an omitted slot is a render failure, not a judgment call)
   - **Provenance marks on load-bearing state facts** (🟢 + check, or ⚠️ INHERITED) and **pickup-moment tags on every deferred item** per Step 9.1's cross-cutting rules
4. An audit footer outside the fenced block per Step 11, with every field in Step 11's fixed list populated (including `state-verification`, `background-work`, `intake-mode`).
4.5. Step 8.7 ran: state facts in the emitted output trace to commands run in THIS step (not earlier recollection), and no live background work was silently stranded (halt-and-ask fired if anything was running).
5. No silent decisions: every classifier verdict, ledger pick, and staleness flag is visible to the operator.

6. Step 5.5 census complete: every FU **related to the handed-over task** — from ALL enumerated sources (ledger register, spec FU sections, task reports, in-code markers, predecessor handoffs, chat), not just session-spawned — is either present in the ledger register OR carried in the handover with its pickup moment; **no FU orphans in any source** left invisible to the register-reader. The carried list is **ordered per Step 5.5.6** (the receiving agent's consumption order, scheme named). Verified via the `session-FU-sweep:` audit-footer line, which names the sources swept and the ordering scheme.

**Conditional ACs** (must hold when their precondition fires):

6. **Multi-ledger disambiguation** — if Step 3 finds ≥2 ledgers and no decisive heuristic winner, print a numbered list (path + last-modified + first-200-chars of top active row) and halt pending operator pick.
7. **Step 4 mismatch halt format** — when keyword-overlap is <2, print the exact phrasing: `The ledger's top active row reads: "<row>". The current session has been working on "<inferred-topic>". Is this current work a sub-thread of the active row, or does the ledger need updating before I write the handover prompt?` (Verbatim text; only the two `<...>` slots vary.)
8. **Operator override of classifier** — when operator passes `force load-bearing` or `force inline-only` after the classifier verdict prints, respect the override and log `operator override: yes` in the audit footer field. Without override, the field reads `no`.
9. **First-action "other (free text)"** — collect both `{{NEXT_SKILL}}` and `{{FIRST_ACTION_VERB}}` before rendering; if either is missing, halt and re-ask rather than rendering with placeholders.
10. **Global CLAUDE.md missing** — Step 1 halts with the exact error string; audit footer is NOT printed (no emit).
11. **`additional-working-dirs: unavailable`** — when runtime does not expose the additional-working-directories block, still produce a valid prompt using paths (1) + (2) of Step 3 and log the unavailability in the audit footer.
