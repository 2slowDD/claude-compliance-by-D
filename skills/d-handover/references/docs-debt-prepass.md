# Docs-debt closure pre-pass — full procedure

Reference for `d-handover` **Step 8.5**. Read this when the step fires; the SKILL.md
carries the goal, the fire/skip predicate and the operator overrides.

---

## 8.5.1 When this step fires

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
| `complete`, `COMPLETE`, `all complete`, `Tasks N–M complete` (completion context — a work phase finishing IS a closure event) | "Tasks 0–8 ALL COMPLETE" |

If NONE match → step is a no-op; audit footer reads `docs-closure: skipped (no closure signals in Q2 summary)`.

**Operator overrides** (CLI-style args on d-handover invocation, parsed per the no-ledger flag grammar pattern):
- `--skip-docs-closure` or `-skip-docs-closure` → skip this step regardless of detection
- `--force-docs-closure` or `-force-docs-closure` → run this step even when no signals match

## 8.5.2 Candidate-doc discovery

When the step fires:

1. **Touched-files this session** — start with files the agent has read, edited, written, or staged in the current turn AND prior turns of the current agent session. Per the d-focus-tasks "touched paths" definition.
2. **Walk the work-track artifact graph** outward from each touched file:
   - Specs in `<project_root>/docs/product-docs/04-development/` matching topic keywords from intake Q1 (topic slug) or intake Q2 (state summary)
   - Sibling d-reviews matching `<spec-name>-review*.md` patterns in the same folder
   - Memory files in `~/.claude/projects/<slug>/memory/` indexed in `MEMORY.md`, matching topic keywords
   - Evidence memos and verdict files in `<project_root>/debug-evidence/<date>/` referenced by any in-scope spec
   - Task plans in `<project_root>/CU Scanner Railway/.../tasks/` matching topic keywords
2.5. **The immediately-prior handoff doc is ALWAYS a candidate when writing a successor.** If this handover writes `<slug>-handoff-rN` (or a dated successor to an existing handoff), the rN-1 doc enters the candidates list automatically, default classification HISTORICAL with a proposed "superseded by rN, do not act on its queue" annotation. The operator still approves via the 8.5.4 gate. Every link in a revision chain needs this annotation, so it is automatic rather than left to agent judgment.
3. **De-duplicate** by absolute path.
4. **Cap at ~20 candidates max** — beyond that, operator-time-cost outweighs benefit; surface a `>20 candidates detected — focus operator review on top N by relevance` warning and present only the top 20.

## 8.5.3 Staleness classification

For each candidate doc, classify into ONE of four states:

| State | Detection signal | Action |
|---|---|---|
| **STALE** | Top-of-file `Status:` header (or `**Status:**` line) predates the closure event AND its wording contradicts the new state. Example: spec says "SHIPPED" when work-track has now rolled back. | Propose status-header annotation. |
| **NEEDS-CROSS-REF** | Doc references an upstream artifact (by path) whose state has changed in this session; downstream's reference is stale or missing. Example: parking memo references mobile-determinism work which has now closed; cross-ref to closure spec missing. | Propose adding cross-reference. |
| **HISTORICAL** | Doc is intentionally pre-closure (kickoff handoffs, intermediate d-reviews, in-progress brainstorm artifacts). Should NOT be edited to claim current-state; should gain a "(HISTORICAL — superseded by …)" header annotation that redirects future readers. | Propose historical annotation. |
| **UP-TO-DATE** | Doc's status header / cross-refs already reflect the closure. (This catches docs operator may have already annotated manually mid-session.) | No edit; report as up-to-date. |

## 8.5.4 Operator-review gate

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

## 8.5.5 Apply approved annotations

For each approved candidate:
1. Read the file (required by Edit tool).
2. Identify insertion point — usually the top-of-file `Status:` line or a "## N. Disposition update" subsection.
3. Apply annotation, preserving historical content (per d-focus-tasks "preserve historical entries" discipline). Don't delete pre-closure text; add the post-closure annotation.
4. For each successfully applied annotation, log: `docs-closure: annotated <path>`.
5. If an Edit fails (file not found, conflict, etc.), log the failure + skip; do NOT halt the d-handover flow.

## 8.5.6 Verification pass

After applying, print summary:

```
docs-closure pre-pass complete:
- annotated: <count> (paths listed above)
- skipped (operator declined): <count>
- up-to-date (no edit needed): <count>
- failed (errors): <count, with error reasons>
- candidates total: <count>
```

## 8.5.7 Audit footer addition

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

## 8.5.8 Failure modes + escape valves

| Failure | Behaviour |
|---|---|
| No closure signals AND no operator force | Skip step; audit footer reflects no-op. Do NOT prompt. |
| >20 candidates detected | Cap at 20 by relevance score (recency of edit, keyword-overlap with Q2); surface warning. |
| Operator declines all (`none`) | Skip step; flag in audit footer. Continue to Step 9 render. |
| Edit fails on one candidate | Log failure + skip; continue with remaining candidates; report in summary. |
| Operator asks to halt mid-review | Honor; abort Step 8.5; continue to Step 9 with partial annotations applied. |
| Stale-doc would require operator-only judgement (e.g., AI uncertain whether HISTORICAL or STALE) | Classify as `AMBIGUOUS` with both options; operator picks. |
| Candidate is being written by LIVE background work (Step 8.5 runs before Step 8.7.2's live-work check, so this ordering interaction is reachable) | Classify `AMBIGUOUS — mid-write`; propose `skip N` now; after the 8.7.2 halt resolves (wait/close/document), re-run the pre-pass on that candidate alone. Never annotate a file another process is writing. |

## 8.5.9 What this step does NOT do

- Does not rename files (filename changes are operator-judgement; flag in summary if observed but don't act).
- Does not rewrite spec content — only adds annotations / status updates / cross-references at the top of files or in dedicated subsections.
- Does not commit annotations to git. Product-docs is non-git; memory files are non-git. Operator commits any tracked-file annotations (task plans, repo specs) separately if desired.
- Does not modify `master-tasks.md` (the ledger; that's d-focus-tasks's responsibility per Step 5).
