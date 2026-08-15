# {{TITLE}}

**Date authored:** {{DATE}}
**Author session:** {{AUTHOR_NOTE}}
**Status:** {{STATUS_LINE}}
**State verification:** {{STATE_VERIFICATION_LINE}} <!-- Step 8.7.1: the commands run + date; every load-bearing fact above carries 🟢+check or ⚠️ INHERITED -->

---

## 0. Environment preconditions + read first (strict order, before any action)

**Working tree — verify BEFORE your first read or edit:**
<!-- Step 8.7.0: path AND branch AND HEAD AND divergence-vs-target AND the content probe that proves it. Name the decoy trees too. -->
{{TREE_IDENTITY_VERIFIED}}

> A path here is a claim, not a fact. Confirm the tree carries the code you think it does — by CONTENT, not by folder name:
> `git -C "<path>" rev-list --left-right --count <target-ref>...HEAD` (`0  0` == identical), `git -C "<path>" worktree list`,
> and `grep -c "<symbol that MUST exist>" "<path>/<file you will touch>"`.
> Branch, HEAD, push state and a clean tree all come back TRUE against the wrong checkout — only the content probe catches it.
> If the probe disagrees with this doc, STOP and re-resolve the tree before anything else.

**Environment (start/verify these first):**
{{ENV_PRECONDITIONS}}

{{READ_FIRST_NUMBERED_LIST_LONG}}

---

## 1. What you're picking up — one paragraph

{{PICKING_UP_PARAGRAPH}}

---

## 2. Your first action

{{FIRST_ACTION_PARAGRAPH}}

---

## 3. Framing (carry into the next skill)

{{FRAMING_BODY}}

{{F_STAR_TRADEOFF_TABLE_OR_EMPTY}}

---

## 4. Hard constraints

{{HARD_CONSTRAINTS_DETAILED}}

---

## 5. What NOT to do

{{DO_NOT_LIST_DETAILED}}

### 5.1 Closed — do NOT re-litigate (accumulates across handovers; carry forward + append)

{{CLOSED_ITEMS_LIST}}

### 5.2 Deferred / parked — with pickup moments

<!-- Every item names WHEN it gets picked up: at task N / at final review / at flip time / housekeeping -->
{{DEFERRED_WITH_PICKUP_MOMENTS}}

---

## 6. Start

{{KICKOFF_INSTRUCTION_DETAILED}}
