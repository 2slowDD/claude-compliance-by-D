# Elastic Model Routing

A CLAUDE.md instruction that applies to **every project**. It routes each unit of work to the **minimum-sufficient Claude model** — a frontier model for the most demanding / irreversible work, a mid "reasoner" for judgment work, a "worker" for mechanical work — and surfaces a one-line message whenever the model or effort switches. It never uses the smallest (Haiku-class) model, and it deliberately excludes non-Claude models (GPT / Codex are governed elsewhere).

Distilled from the "picking the right models" workflow discipline: spend the frontier model on the one-way doors (data model, API contracts, core abstractions, planning, and the artifacts that govern a cheaper fleet), delegate judgment work to a strong mid model, and hand mechanical / clear-spec work to the cheapest capable worker.

## What makes it robust to model renames

Model names change over time (a frontier model could be renamed, a new one could appear). The rule therefore defines tiers as **roles** — `frontier` / `reasoner` / `worker` — not fixed names, and resolves the current name **live each session** from ground truth (the Agent tool's `model` options and the `claude-api` skill). Two mechanisms keep it current:

1. **Runtime role→name resolution (primary guarantee):** before routing, rank the Claude models actually available *now* by capability — top → frontier, strong generalist → reasoner, fast / cheap but not the smallest class → worker — and trust that over any name printed in the rule. Routing stays correct with zero edits even if the printed names are stale.
2. **Self-heal (keeps the doc fresh):** when a printed name is noticed to be stale (a rename, or a new model appeared), use the live name and update the table in place.

Honest limit: a genuinely new model must be ranked via a source (the `claude-api` skill / harness model list); a rename within a family keeps its rank automatically.

## Scope — how the switch happens

A CLAUDE.md rule can set a **subagent's** model per dispatch (the Agent tool's `model` parameter), but it **cannot** change the **main session's** model or reasoning effort — only the operator can, via `/model` and `/effort` — and there is no per-dispatch effort parameter. So:

- **Subagents auto-size** — the agent picks the tier's model at dispatch time and steers effort with a prompt cue (no effort parameter exists).
- **The main session is nudged** — when the current task's tier exceeds the model the operator is running, the agent prints a one-line nudge to `/model` / `/effort` up; when a premium main model is being spent on grunt work, it notes the option to delegate down.

## Route by task type

- **worker** — mechanical / clear-spec: coding from an agreed plan, boilerplate, tests, formatting, migrations, data munging, simple edits. Dispatch cue: *"Execute efficiently."*
- **reasoner** — judgment: complex debugging, algorithm design, architecture within an agreed design, non-trivial implementation, plan / impl reviews. Cue: *"Think thoroughly; return a concise conclusion I can act on."*
- **frontier** — one-way doors (data model, API contracts, core abstractions), planning (architecture / PRD / spec), fleet-governing artifacts (eval suites, grading rubrics, subagent system prompts), highest-stakes reviews.

## Principles

- **Defaults, not limits** — if a cheaper tier's output misses the bar, rerun one tier up without asking. Judge the output, not the price.
- For anything that ships: **intelligence > taste > cost** (cost is a tie-breaker only).
- User-facing polish (UI, copy, API design) prefers the higher-taste tiers.
- Don't over-delegate: trivial single-step work runs inline; spawn a subagent only when it fits a tier or saves main context.
- **Never the smallest / Haiku-class model. Claude-only** — GPT / Codex are out of scope for this rule.

## The switch message

The rule always surfaces when the model / effort changes:

- Every subagent dispatch emits one line: `→ [<live-model-name> · <why>] <task>`.
- A main-session tier exceedance emits: `⚠️ [tier↑ frontier] <reason> — consider /model <frontier-name> + /effort high`.
- Fallback substitutions (a tier's model unavailable → step up, never down to the smallest class; e.g. worker unavailable → reasoner at medium-high effort) are noted in the dispatch line.

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist).

````markdown
## P15 — Elastic Model Routing (minimum-sufficient model per task)

Route every unit of work to the **cheapest Claude model that does it well**, escalating when output misses the bar. Claude-only; **never the smallest / Haiku-class model**. (GPT/Codex out of scope.)

**Tiers are roles, not fixed names** — model names change (e.g. fable→"mythos"). Resolve the current name **live each session**:

| tier | handles | current name (as of 2026-07 — verify live) |
|------|---------|------|
| **frontier** | one-way doors (data model, API contracts, core abstractions), planning/PRDs/specs, fleet-governing artifacts (eval suites, rubrics, subagent prompts), highest-stakes reviews | fable-5 |
| **reasoner** | complex debugging, algorithm design, architecture within an agreed design, non-trivial impl, plan/impl reviews | opus-4.8 |
| **worker** | mechanical/clear-spec: coding from a plan, boilerplate, tests, formatting, migrations, data munging, simple edits | sonnet-5 |

**Name resolution (before routing, every session):** trust the models actually available *now* over the names above — the Agent tool's `model` options and the `claude-api` skill are ground truth. Rank available Claude models by capability: top → frontier, strong generalist → reasoner, fast/cheap-but-not-smallest-class → worker. If a name above is stale (renamed or a new model appeared), **use the live name AND update this table** so it self-heals.

**Dispatch cues:** worker → *"Execute efficiently."*  reasoner → *"Think thoroughly; return a concise conclusion I can act on."*  frontier → full-depth reasoning.

**Principles:**
- Defaults, not limits — if a cheaper tier misses the bar, **rerun one tier up without asking**; judge output, not price.
- For anything that ships: **intelligence > taste > cost**. User-facing polish (UI, copy, API design) → prefer reasoner/frontier.
- Don't over-delegate: trivial single-step work runs inline (see P2).

**Subagents auto-size; the main session gets nudged** (a rule sets a subagent's model, not the main model/effort — only I do, via `/model`, `/effort`):
- Every subagent dispatch emits `→ [<live-model-name> · <why>] <task>`.
- When a task's tier exceeds my main model: `⚠️ [tier↑ frontier] <reason> — consider /model <frontier-name> + /effort high`.
- **Fallback:** if a tier's model is unavailable, step **up** to the next available (never the smallest class) — e.g. worker unavailable → reasoner at medium-high effort — noting the substitution.
````
