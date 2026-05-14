# d-assumption

# Assumption / Confirmation Tagging Rule

A CLAUDE.md instruction that forces Claude to label every item in a plan, recommendation, or multi-item answer by the strength of its basis: **⚠️ Assumption** for anything resting on inference or unverified information, **🟢 CONFIRMED** for anything backed by verifiable hard data. The goal is that an operator scanning a plan can see at a glance which parts are solid and which still need verification.

## What it does

Whenever Claude produces a plan, recommendation, proposal, design spec, or any multi-item answer where some items rest on assumptions, it tags each item inline:

- **⚠️ Assumption** — the item rests on inference, guesswork, an unverified subagent summary, or information not directly backed by verifiable data. Format: `⚠️ **Assumption** — <short basis note>`.
- **🟢 CONFIRMED** — the item is backed by verifiable hard data: a command output, a file read, a test result, or a documented source (including from memory or a subagent, as long as a real source exists). Format: `🟢 **CONFIRMED** — <short basis note / source>`.

Each tag carries a **short basis note** — why it is an assumption, or what the confirming source is — so the tag is auditable rather than decorative. Tags are applied **inline per item**; there is no separate summary block or table. Claude tags liberally so the assumption/confirmation split is dense and visible, not sparse.

The rule does **not** fire on casual conversation or simple single-fact answers.

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist). If your CLAUDE.md uses numbered rules, give it a number that fits your scheme (e.g. `## P12 — Assumption / Confirmation Tagging (d-assumption)`).

```markdown
## Assumption / Confirmation Tagging (d-assumption)
In plans, recommendations, proposals, design specs, and any multi-item answer, tag each item by the strength of its basis:

- **⚠️ Assumption** — anything resting on inference, guesswork, an unverified subagent summary, or information not directly backed by verifiable data. Format: `⚠️ **Assumption** — <short basis note>`.
- **🟢 CONFIRMED** — anything backed by verifiable hard data: a command output, a file read, a test result, or a documented source (including from memory or a subagent, as long as a real source exists). Format: `🟢 **CONFIRMED** — <short basis note / source>`.

- Tag liberally — populate plans and recommendations densely so the operator sees at a glance what is solid vs what needs verification.
- Each tag MUST carry a short basis note explaining why it's an assumption or what the confirming source is.
- Inline tags only — no separate summary block or table.
- Skip for: casual conversation and simple single-fact answers.
```

## Notes

- This is a CLAUDE.md instruction rule, not a Claude Code skill — it lives in your global config, not in `~/.claude/skills/`. There is no `/d-assumption` invocation; the behaviour is always-on.
- Applies in every project directory where the global CLAUDE.md is loaded.
- **Information from another agent is an ⚠️ Assumption by default.** A subagent's summary describes what it intended to do, not necessarily what it did. It only earns 🟢 CONFIRMED when it points at a real, checkable source.
- **The CONFIRMED bar is "verifiable hard data with a real source"** — not "personally re-verified this session". Hard data surfaced via memory or a subagent still qualifies, as long as a source exists that could be checked. This is deliberately the looser of the two possible bars; the basis note is what keeps it honest.
- The basis note is the load-bearing part. A bare `🟢 **CONFIRMED**` with no source is worse than an honest `⚠️ **Assumption**` — the rule exists to make the basis visible, not to let everything be relabelled as confirmed.
- Composes with planning rules (`tasks/todo.md` plans): the tags belong inside the plan items, so a written plan carries its own assumption/confirmation map.
