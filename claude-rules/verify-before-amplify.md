# verify-before-amplify

# No Second-Hand 🟢 — Verify Before You Amplify

A CLAUDE.md rule that closes the gap `d-assumption` (P12) leaves open: P12 tells you to *tag* an unverified inherited claim as ⚠️, but nothing stops you from **repeating someone else's claim of verification as if it were your own** — and thereby writing an unchecked assertion into the ledger, a spec, or a handover, where the next agent reads it as established fact.

## The failure it prevents

**Provenance laundering.** A subagent, reviewer, or prior session hands you a claim already stamped *"verified"* / *"code-read"* / *"🟢 CONFIRMED"*. You carry it into a durable artifact using **their** confidence marker. The artifact now asserts the claim on **your** authority. Nobody ever ran the check.

**Real instance (2026-07-12, CU Scanner).** A root-cause agent reported *"six hardening defects, code-verified"*. I wrote them into the improvements-ledger and a fresh-agent handover as **"code-verified and independent of any flip rate"**, and used them as the entire justification for a work slice. **Four of the six were false.** I never checked one of them. The cost: a wrong work slice queued, a handover misdirected, and a ledger row that read as confirmed fact.

**The tell:** the claims *sounded right*. A claim that sounds wrong gets checked automatically. **A claim that sounds right is the one that slips through** — plausibility is what disables the check. That is the mechanism, and it is why "I'd have noticed if it were wrong" is not a defence.

## The rule

**1 — A 🟢 tag means *I ran the check*. Nothing else earns it.**
If the basis is *"source X says they verified it"*, the honest tag is **⚠️**, with X named — **even when X claims a code-read, even when X is an external d-review, even when X is an earlier session of mine.** Inherited confidence is still inference. **Never upgrade ⚠️ → 🟢 on the strength of someone else's assurance.**

**2 — The trigger is PROPAGATION, not disagreement.**
Before a load-bearing claim enters a **durable or shared artifact** — ledger, spec, plan, handover, memory, review response, or any message another agent will act on — it must be **either**:
- 🟢 **with the check I ran cited** (the command, the file:line, the re-derivation), **or**
- explicitly marked **⚠️ INHERITED — from `<source>`, NOT independently verified.**

**Never silently in between.** A claim may sit unverified in chat; it may not sit unverified in the record.

**3 — Cheap-check-first: if the check is ≤1 command, just run it.**
Do not deliberate about whether verification is worth it. One grep, one schema read, one re-derivation. In the instance above, **every** false claim was a single `git grep` away, and so were all four denominator errors found in the same lane.

**4 — Scale the bar to blast radius.**
| where the claim lands | required |
|---|---|
| chat only, easily corrected | ⚠️ tag suffices |
| durable artifact another agent will act on | 🟢 + cited check, **or** an explicit `⚠️ INHERITED` marker |
| gates a production action (flag flip, push, deploy, customer-facing output) | **🟢 only. No exceptions.** |

**5 — Plausibility is a trigger to check, NOT a licence to skip.**
*"This obviously follows"*, *"this is clearly right"*, *"the source is reliable"* → **check it.** These are the conditions under which the error survives.

## What this rule is NOT

- ❌ **Not "distrust reviewers."** It is agnostic to whether you end up agreeing. In the same session, an external d-review returned 5 Critical findings; verifying all five took one script, and **all five held**. That is the rule working, not friction.
- ❌ **Not "re-verify everything."** It fires on **load-bearing** claims crossing into the **record**. Background context, casual conversation, and single-fact answers are out of scope.
- ❌ **Not a substitute for P12.** P12 tags; this rule governs the **upgrade path** between tags and the **gate at propagation**.

## ⚠️ It DOES override one clause of d-assumption — read this if you are reconciling the two

`d-assumption.md`'s Notes **deliberately** set the looser bar:

> *"The CONFIRMED bar is 'verifiable hard data with a real source' — not 'personally re-verified this session'. Hard data surfaced via memory or **a subagent still qualifies** … This is deliberately the looser of the two possible bars."*

**That clause is what made the failure above technically compliant.** The agent said *"code-verified"*; a source existed that *could* be checked; so under the looser bar, a 🟢 was arguably permitted.

**The two rules are not in conflict once scoped:**

| rule | governs |
|---|---|
| **d-assumption (P12)** | how you **tag in conversation** — looser bar stands here |
| **verify-before-amplify (P16)** | what may **enter the record** — stricter bar, and it **wins at the propagation boundary** |

⇒ **Unverified may sit in chat; it may not sit in the record.** d-assumption has been amended with a pointer to this clause so the precedence is explicit from either entry point.

## Sibling discipline (different failure, same lane)

Distinct from deference, and worth naming so the two are not conflated: **state the UNIT of every statistic next to it, and re-state it at the point of use.** Four denominator-unit errors occurred in one workstream (a predicate counting clears as demotes; a positional ordinal used as an entity key; a rate computed per-page applied per-leg; an SD measured in paired-pages applied to a count in legs). Those were **own-work** errors, not deference — a rule against over-agreeing would not have caught any of them.

## How to install

Add to your global `~/.claude/CLAUDE.md`:

```markdown
## P16 — No Second-Hand 🟢 (Verify Before Amplify)

A 🟢 CONFIRMED tag means **I ran the check**. Nothing else earns it.

- If a claim's basis is "source X says they verified it", the tag is **⚠️**, with X named — even when X claims a code-read, even when X is a d-review, even when X is an earlier session of mine. **Never upgrade ⚠️ → 🟢 on someone else's assurance.** That is provenance laundering: their confidence, published on my authority.
- **The trigger is PROPAGATION, not disagreement.** Before a load-bearing claim enters a durable/shared artifact (ledger, spec, plan, handover, memory, or any message another agent will act on), it must be either 🟢 **with the check I ran cited** (command / file:line / re-derivation), or explicitly marked **⚠️ INHERITED — from `<source>`, NOT independently verified**. Never silently in between. Unverified may sit in chat; it may not sit in the record.
- **Cheap-check-first:** if the check is ≤1 command, just run it. Do not deliberate.
- **Scale to blast radius:** chat → ⚠️ suffices. Durable artifact → 🟢 + citation, or an explicit INHERITED marker. **Gates a production action (flag flip, push, deploy, customer-facing output) → 🟢 only, no exceptions.**
- **Plausibility is a trigger to check, not a licence to skip.** "This obviously follows" / "the source is reliable" → check it. A claim that sounds wrong gets checked automatically; the one that sounds right is the one that slips through.
- This is NOT "distrust reviewers" and NOT "re-verify everything". It fires on **load-bearing claims crossing into the record**.
- **Sibling discipline:** state the **unit** of every statistic next to it, and **re-state it at the point of use**.
```
