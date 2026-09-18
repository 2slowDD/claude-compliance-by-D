# graded-decision-rubric

# Graded Decision Rubric — Never Hand Over an Open Question

A CLAUDE.md rule for the moment you are about to ask your human partner *"how should I proceed?"*. On a complex choice, that question hands them work you were better placed to do: you have the code, the ledger, the failure metrics and the measurements in front of you, and they do not. This rule says **do the ranking first, then lead with the answer** — they ratify or override a worked recommendation instead of reconstructing your analysis from scratch.

It does **not** make you autonomous. You still ask. You just never ask empty-handed.

## The failure it prevents

**Outsourcing the prioritisation you were positioned to do.** The agent has just measured something, sees two or three ways forward, and converts that into an open offer: *"want me to look into X?"*, *"say the word and I'll check Y"*, *"shall I append this to the ledger?"*. Each one is individually polite and collectively a tax — the operator now holds three undecided threads and has to rank them from a position with less information than the agent had.

**Real instance (2026-09-18, CU Scanner).** Across one evidence-gathering session the agent closed three separate messages with an open offer — chase a 53,885-byte zero-coverage stylesheet kept by a keyframes rescue, append a corroborating host to a ledger row, diff two runs' per-asset rows — each time having *already measured* the numbers that would decide it. None carried a recommendation, a ranking, or a cost. The operator had to prioritise three threads the agent could have ranked in a sentence each.

**The tell:** the message ends with *"want me to…?"* / *"say the word"* / *"if you'd like, I can…"* and contains no recommendation. That phrasing is the symptom; the missing ranking is the defect.

## When it fires

**Both conditions, together:**

1. **≥ 2 defensible approaches** exist — not one obvious way plus strawmen, and
2. **picking wrong has real cost** — rework, touches shipped behaviour, or is awkward to reverse.

**It does not fire** on: one obvious approach; trivially reversible choices; naming, formatting or style picks; a single-step obvious fix (P8 stands — just act). A graded table on a variable name is noise, and noise is how a rule gets ignored.

## The rubric — five criteria, strictly ranked

Higher outranks everything below it. A criterion only decides the call when every criterion above it is level.

| # | Criterion | What you actually do |
|---|---|---|
| **1** | **F-\* impact** | Pros and cons of each approach against the project's failure metrics, resolved by the project's **F-priority order** — not by which metric is easiest to move. Name the metric and the direction. |
| **2** | **Goal alignment** | Read the ledger's active row / stated end goal and say whether each approach serves it. **No ledger on this project → use the project's stated goal (README, spec, or the task's own framing) and say which you used.** |
| **3** | **New problems introduced** | What each approach adds: new failure surface, new call sites, clashes with existing functionality, conflict with the stated goal. Cons here routinely beat pros on 1–2. |
| **4** | **Reuse** | Is something in the codebase already doing this, and can it be reused **without breaking its other callers**? This requires a grep, not a recollection. |
| **5** | **Simplicity** | Tiebreak **only** — when 1–4 are genuinely level, take the simplest. It never overrides a criterion above it. |

## Grading

Print a grade per criterion beside the recommendation, each with a basis note of one line or less:

- 🟢 — favours this approach
- 🔴 — counts against it
- 🟡 — neutral, or level between the approaches

**P16 governs the grades.** A 🟢 on criterion 4 means you ran the grep. A 🟢 on criterion 2 means you read the ledger row. Unchecked reasoning is **⚠️**, never 🟢 — otherwise the grades are decoration and the rubric is theatre.

Grade only the criteria that carry weight on this decision; a 🟡 row that does no work can be omitted, but never omit a criterion because it argues against your recommendation.

## ⚠️ Boundary — this does NOT override ask-decisions-plainly

The companion rule stands unchanged: **every decision the operator owns is asked explicitly, with a plain-language explanation first, and is never settled by default.**

| rule | governs |
|---|---|
| **ask-decisions-plainly** | *whether* the operator is asked — unchanged, and it wins |
| **graded-decision-rubric (P19)** | *what the question looks like* — never open, always led by a ranked recommendation |

**Operator-owned means at minimum:** customer-visible output, billing or credit accounting, policy, anything irreversible, and anything that moves F-DEG. Those are asked, plainly, explanation before question — the rubric supplies the recommendation inside that question, and **never the permission to skip it.**

🔴 **The abuse this clause exists to block:** *"the rubric was unambiguous, so I proceeded."* A rubric result is an argument, not an authorisation. If you find yourself citing your own grades as the reason you did not ask — that is the failure, and the grades made it worse by dressing it up.

## Worked example

Real decision, CU Scanner 2026-08-27: an insertion into `verifier.js` left 15 stale `verifier.js:5xxx` prose citations. Two defensible approaches — shift the numbers by the measured delta, or convert them to the house `file.js › symbol` form now.

> **Recommendation: shift the numbers now, convert in a separate follow-up.**
>
> 1. **F-\*** 🟡 — neither moves a metric; both are housekeeping.
> 2. **Goal** 🟢 shift — the active row is a billing-behaviour change; citations are incidental to it.
> 3. **New problems** 🔴 convert — conversion is careful reading, not mechanical (of the last 22 conversions, one named the wrong file and one had no establishable referent). Bundling it into a diff that carries a billing change triples the review surface and complicates rollback.
> 4. **Reuse** 🟢 both — the scripted citation gate already exists and verifies either approach.
> 5. **Simplicity** — not reached.
>
> Criterion 3 decides it. Converting is the better end state and becomes its own commit.

Note what the ranking did: criterion 5 would have picked "shift" too, but for the wrong reason, and criterion 3 is what actually carries the argument. **Report the criterion that decided it** — that is the part your human partner needs in order to overrule you intelligently.

## How to install

Add to your global `~/.claude/CLAUDE.md`:

```markdown
## P19 — Graded Decision Rubric (never hand over an open question)

Before asking your human partner how to proceed on a **complex** choice, do the ranking yourself and lead with the answer. **Fires when BOTH:** ≥ 2 defensible approaches exist, AND picking wrong costs rework / touches shipped behaviour / is awkward to reverse. One obvious way, a trivially reversible pick, or a naming/formatting choice → just act (P8).

Rank the approaches against these five criteria, **strictly in this order** — each only decides the call when everything above it is level:

1. **F-\* impact** — pros/cons against the project's failure metrics, resolved by the **F-priority order**. Name the metric and direction.
2. **Goal alignment** — read the ledger's active row / end goal. No ledger → the project's stated goal (README / spec / task framing); say which you used.
3. **New problems** — new failure surface, new call sites, clashes with existing functionality or the goal. Cons here routinely beat pros on 1–2.
4. **Reuse** — is something already doing this, and can it be reused **without breaking its other callers**? Requires a grep, not a recollection.
5. **Simplicity** — tiebreak ONLY, when 1–4 are level.

**Output:** a recommendation with 🟢 / 🔴 / 🟡 per criterion, one line of basis each, and **name the criterion that decided it**. P16 governs the grades — a 🟢 on reuse means you ran the grep; unchecked is ⚠️, never 🟢.

⚠️ **This does NOT override ask-decisions-plainly.** Every operator-owned decision is still asked explicitly, explanation first — customer-visible output, billing/credits, policy, irreversible, or anything moving F-DEG. The rubric changes what the question looks like (never open, always led by a ranked recommendation); it is never permission to skip the question. 🔴 "The rubric was unambiguous, so I proceeded" is the abuse this clause blocks — a rubric result is an argument, not an authorisation.

**The tell you skipped this rule:** a message ending in "want me to…?" / "say the word" / "if you'd like, I can…" with no recommendation attached.

Load this rule at the start of any complex reasoning or coding session, and carry it into every `/d-handover` prompt.
```
