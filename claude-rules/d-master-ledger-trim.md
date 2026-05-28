# D-Master-Ledger-Trim Rule

A CLAUDE.md instruction for keeping a project's master task-ledger (`master-tasks.md`, the file maintained by the `d-focus-tasks` skill) **lean at the top** as it accretes history over weeks. The live ledger is the first read for every fresh agent and is loaded into context, so an overgrown opening is a recurring context tax. This rule trims it by **moving aged/superseded content into a linked archive file** — preserving everything, reorganizing rather than deleting.

## What it does

When the live `master-tasks.md` opening has bloated, relocate the historical/superseded opening blocks into a companion `master-tasks-archive.md` (created if absent), leaving the live file with current state only + a forward-pointer to the archive. Nothing is deleted; every character is preserved across the two files.

**Moves to the archive** (newest-first, verbatim, under labeled sections):
- The accreting **"Last updated" history** — keep ONLY the newest entry in the live file; move the chained `Earlier… / Prior…` tail to the archive.
- The stacked **"Previous top active row"** entries (the superseded top-active-row chain) + any `HISTORICAL` work-track notes wedged in the opening.
- The **"Archived milestone progression"** section and any other already-historical opening blocks.

**Stays in the live file:** the title, the `TOP ACTIVE ROW` banner, the lean (newest-only) `Last updated` line, orientation lines (project root / ledger path / fresh-agent-start), the **current** top active row, and the entire working body (How-To-Read decoder, Current Work Queue, registers, Recent Commit Ledger). The rule trims the **opening**, not the working body.

## When it fires

- **On operator request** — "trim / reduce / lean the (master) ledger / its opening", "the ledger has grown too big", or an explicit `d-master-ledger-trim` invocation.
- **Proactively** — when the agent observes the live ledger has materially bloated: live file roughly `> 50 KB` or `> ~1000 lines`; the `Last updated` header has become a single accreted multi-entry paragraph; or the `Previous top active row` stack exceeds ~5 superseded entries. Surface the observation + offer to trim; do not trim silently.

## The procedure (the load-bearing part)

The bloated entries are frequently **single physical lines too large to load** for the Edit/Write tools (e.g., a `Last updated` line that has grown to tens of thousands of characters — one line). Editing in place is then impossible (no loadable `old_string`), and a full Write can't reconstruct unloadable content. The only reliable mechanism is a **verified scripted text transform**, and it MUST be done safely:

1. **Get operator OK first.** A scripted file-write may override a "never write files via script" tooling policy, and it mutates a load-bearing file — so confirm before running. (This is a hard-to-reverse, high-blast-radius action.)
2. **Back up before writing.** Copy `master-tasks.md` → `master-tasks.md.bak` as the first write the script makes. Leave the `.bak` until the operator confirms the result.
3. **Abort-before-write conservation asserts.** The script computes the new live + archive content, then runs ALL of these and writes ONLY if every check passes (otherwise it prints the failures and writes nothing):
   - **Index coverage** — every original line lands in exactly one of {live-kept, archived}; none dropped.
   - **Exact split-concat** — for any line split intra-line (e.g., newest `Last updated` entry vs the rest), assert `kept + moved === original line`.
   - **Verbatim relocation** — each moved block appears verbatim in the archive AND is absent from the live file.
   - **Body preserved** — the working body (from the first body section header to EOF) appears verbatim in the live file.
   - Watch for the empty-string trap: `someString.includes('')` is always `true`, so guard "absent-from-live" asserts against blank lines.
4. **Report** before/after byte sizes, line counts, and exactly what moved (per-block char counts).
5. **Wire the pointers.** Live file gets a `📁 Archive:` forward-pointer near the lean `Last updated` line; the archive gets a back-pointer to the live file + a one-line "created by trim on <date>, preserved verbatim, read on-demand" header.

## How to install

Add the following block to your global `~/.claude/CLAUDE.md` (create the file if it doesn't exist). Adjust the ledger filename if your project uses a different one.

```markdown
## D-Master-Ledger-Trim

Keep the live master ledger (`master-tasks.md`) lean at the top. The ledger is the first read for every fresh agent + is loaded into context, so an overgrown opening is a recurring context tax.

**Fires:** on operator request to trim/reduce/lean the ledger opening (or `d-master-ledger-trim`); OR proactively when the live ledger has materially bloated (≈ >50 KB / >1000 lines; the `Last updated` header has become one accreted multi-entry paragraph; the `Previous top active row` stack exceeds ~5 superseded entries) — surface + offer, never trim silently.

**Action — reorganize, NEVER delete.** Move aged/superseded OPENING blocks into a companion `master-tasks-archive.md` (created if absent), newest-first, verbatim, under labeled sections:
- `Last updated` history — keep ONLY the newest entry in the live file; move the chained `Earlier…/Prior…` tail.
- The stacked `Previous top active row` entries + `HISTORICAL` notes in the opening.
- The `Archived milestone progression` section + other already-historical opening blocks.
Live file keeps: title, `TOP ACTIVE ROW` banner, lean (newest-only) `Last updated`, orientation lines, the CURRENT top active row, and the entire working body (How-To-Read, Current Work Queue, registers, Recent Commit Ledger). Trim the opening, not the body.

**Mechanism:** bloated entries are often single physical lines too large to load for Edit/Write. Use a VERIFIED scripted transform — only after operator OK (it may override a no-script-write policy + mutates a load-bearing file), and ALWAYS with: (1) a `.bak` backup as the first write; (2) abort-before-write conservation asserts — index-coverage (no line dropped), exact split-concat for any intra-line split, each moved block verbatim-in-archive + absent-from-live (guard the empty-string `includes('')` trap), body preserved verbatim; (3) report before/after sizes + what moved. Wire a `📁 Archive:` forward-pointer in the live file + a back-pointer in the archive.

**Do NOT:** delete any content; reorder the working body (trim only the opening / already-historical sections); run the script without the backup + the conservation asserts; treat this as a push event if the ledger is in an untracked product-docs tree (it is local hygiene — no commit/push unless the ledger lives in a tracked repo).
```

## Notes

- This is a CLAUDE.md instruction rule, not a Claude Code skill — it lives in your global config, not in `~/.claude/skills/`.
- Companion to the **`d-focus-tasks`** skill/rule: `d-focus-tasks` appends new ledger entries and status-marks aged ones in place; `d-master-ledger-trim` is the periodic hygiene pass that relocates the accumulated history out of the opening. Normal `d-focus-tasks` operation still targets the live `master-tasks.md`; it does not need to read the archive.
- The trim is a point-in-time cleanup — the live `Last updated` line and top-active-row stack will re-accrete over time, so the rule is meant to be re-run when the opening bloats again.
- Most projects keep their ledger in an untracked product-docs tree, so the trim is a local-only restructure (no push). If the ledger is in a git-tracked repo, the normal push gate (`github-push-warning`) still applies.
- Origin: distilled 2026-05-28 from a live trim of a `master-tasks.md` that had grown to ~315 KB / ~95 K tokens (a single 75 K-char `Last updated` line); the verified scripted split reduced the live file ~43 % with zero content loss.
