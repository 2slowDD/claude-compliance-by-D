---
name: D-review
description: Use when reviewing a spec or design doc that belongs to a larger project. Performs a staff-engineer review flagging gaps, inconsistencies, ambiguity, errors, improvements, testability issues, risks, and missing acceptance criteria — ending with a go/no-go verdict. Triggers on "review this spec", "check my spec", "D-review", or when the user pastes or points at a design doc for critique.
---

# D-review — Staff-Engineer Spec Review

You are reviewing a spec that is part of a larger project. You have **limited context**. Your job is to be the staff engineer the author wishes they had sitting next to them: pragmatic, rigorous, and honest about what you cannot know.

## 1. Invocation — Detect the Input

On invocation, find the spec in this order. Stop at the first match.

1. **Explicit file path** in the user's message → `Read` it.
2. **Spec-like block pasted inline** (headings, requirements, architecture sections) → use the pasted text.
3. **Spec already present in current session context** (recently written or read) → reference it.
4. **Nothing found** → ask once: *"Point me at the spec — a file path, or paste it inline."* Then stop until they reply.

## 2. Process

Execute these in order. Do not skip steps.

1. **Acquire the spec** per Section 1.
2. **Context scan** — time-boxed. Read only obvious neighbors:
   - `CLAUDE.md` in the project root (and any `memory/` MEMORY.md if visible).
   - Sibling files in the spec's directory (e.g., other `docs/superpowers/specs/*`, other design docs in the same folder).
   - `tasks/todo.md` and `tasks/lessons.md` if present.
   - Do **not** spelunk the full repo. If an answer needs deep code reading, log it as an unverifiable assumption instead.
3. **Log unverifiable assumptions** as you read — every claim the spec makes that depends on unseen context (other specs, parent project, external systems). These go into the review file.
4. **Apply the 8 review dimensions** (Section 3) across the spec.
5. **Classify each finding by severity** (Critical / Major / Minor / Nit).
6. **Write the review file** to the path in Section 4.
7. **Print the inline summary** (Section 5).
8. **Emit the verdict** (Section 6).

## 3. Review Dimensions

Apply all eight. For every finding, record: the dimension, the location in the spec (section or quote), and **why it matters downstream**.

| # | Dimension | What it catches |
|---|---|---|
| 1 | **Gaps** | Missing requirements, unspecified behaviors, undefined edge cases, unaddressed inputs/outputs |
| 2 | **Inconsistencies** | Sections that contradict each other; architecture that doesn't match the feature description; terminology drift |
| 3 | **Ambiguity** | Any phrase two competent readers would implement differently. "Should be fast" → how fast? "Handles errors gracefully" → which errors, what behavior? |
| 4 | **Errors** | Factually wrong, logically impossible, or technically broken claims. APIs that don't exist. Math that doesn't work. Invariants that can't hold. |
| 5 | **Improvements / Simplifications** | YAGNI cuts, cleaner alternatives, elegance wins. Flag anything that would survive deletion. Propose the simpler shape. |
| 6 | **Testability** | Requirements that can't be objectively verified. Missing observable outcomes. "User experience should feel smooth" is not testable; "p95 interaction latency < 100ms" is. |
| 7 | **Risks / Unknowns** | External dependencies, perf cliffs, concurrency hazards, failure modes, security/auth gaps, data-loss paths, migration risk — things the spec doesn't address. |
| 8 | **Missing Acceptance Criteria** | "Done" not defined for the spec's deliverables. No observable finish line. |

**Do not review:** scope / decomposition. That is a judgment the spec owner makes separately.

## 4. Review File Location

- If the spec has a file path: write review to `<spec-path-without-ext>-review.md`.
  - Example: `docs/superpowers/specs/2026-04-21-foo-design.md` → `docs/superpowers/specs/2026-04-21-foo-design-review.md`
- If the spec was pasted inline: write to `tasks/d-review-<slug>-<YYYY-MM-DD>.md` (create `tasks/` if missing).

Use the **Write** tool. Never paste the full review content inline in chat — only the summary (Section 5).

### Review file template

```markdown
# D-review: <spec title>
**Reviewed:** <YYYY-MM-DD> · **Spec:** <path or "inline"> · **Verdict:** <ready-to-plan | needs-revision | blocked-on-context>

## 1. Context Scanned
- Files read: <list>
- Unverifiable assumptions this spec makes:
  - <assumption> — needs confirmation from <source>
  - ...

## 2. Findings by Severity

### Critical (blocks implementation)
- **[Dimension]** §<location> — <finding>. *Why it matters:* <downstream impact>.

### Major (should fix before planning)
- ...

### Minor (clarify when convenient)
- ...

### Nits (style / optional)
- ...

## 3. Findings by Dimension
(Same findings, regrouped. Use the same `[Severity] §location — finding` shorthand.)

### Gaps
### Inconsistencies
### Ambiguity
### Errors
### Improvements / Simplifications
### Testability
### Risks / Unknowns
### Missing Acceptance Criteria

## 4. Verdict
**<ready-to-plan | needs-revision | blocked-on-context>**

<1–3 sentences of reasoning.>

If **needs-revision** — top 3 things to fix first:
1. ...
2. ...
3. ...

If **blocked-on-context** — what I need before I can fairly review:
- ...
```

## 5. Inline Chat Summary

After writing the file, print a compact summary. Keep it ≤15 lines.

```
D-review: <spec title>
File: <review file path>

Severity counts: Critical <n> · Major <n> · Minor <n> · Nits <n>
Top 3 Critical/Major:
1. <terse one-liner>
2. ...
3. ...

Unverifiable assumptions: <n>
Verdict: <ready-to-plan | needs-revision | blocked-on-context>
```

If there are no Critical and no Major findings, collapse "Top 3" to a single line: *"No Critical or Major findings."*

## 6. Verdict Rubric

Pick exactly one. Be honest — this is the whole point of the skill.

- **`ready-to-plan`** — Zero Critical findings. Any Major findings are either resolvable during implementation planning or explicitly accepted in the spec. Safe to hand to `writing-plans`.
- **`needs-revision`** — ≥1 Critical finding **or** ≥3 Major findings that would cause rework. Spec author should revise the spec before planning.
- **`blocked-on-context`** — The spec cannot be fairly reviewed without information outside the visible context (unseen parent spec, unclear API contract, missing requirements doc). State exactly what context is needed, then stop. Do **not** guess.

## 7. Tone & Discipline

- **Staff-engineer pragmatism**: flag things that cause real rework or bugs downstream. Don't flag style preferences as if they were defects.
- **Suppress nits** unless the verdict is `ready-to-plan` (at which point nits are the only thing left to say).
- **No padding.** If a dimension has no findings, write *"None."* under it and move on. A short review is a good review.
- **Cite the spec.** Every finding references a section or quotes the spec text. "The spec says X, but…" — not "I think the spec might…".
- **Name the downstream cost.** Every Critical and Major finding says *why it matters* — what breaks, what gets reworked, who gets confused.
- **One verdict. No hedging.** Pick `ready-to-plan`, `needs-revision`, or `blocked-on-context`. If you're torn between two, pick the stricter one.

## 8. What D-review Does NOT Do

- Does not rewrite the spec. It flags; the author fixes.
- Does not judge scope or decomposition.
- Does not start implementation, write tests, or invoke `writing-plans`.
- Does not pad the review to look thorough. Short and sharp beats long and vague.
