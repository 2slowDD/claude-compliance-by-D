{{LEAD_PARAGRAPH}}

Do NOT begin coding. Do the environment preconditions and the read-first
sequence first, then invoke {{NEXT_SKILL}} and {{FIRST_ACTION_VERB}}.

## Working tree — verify BEFORE your first read or edit (do not skip)

{{TREE_IDENTITY_VERIFIED}}

A path in a handover is a claim, not a fact. Before you edit, cite a line number
from, or run tests in any tree above, confirm it actually carries the code you
think it does — by CONTENT, not by folder name or "primary"/"main" convention:

    git -C "<path>" branch --show-current && git -C "<path>" rev-parse --short HEAD
    git -C "<path>" rev-list --left-right --count <target-ref>...HEAD   # "0  0" == identical
    git -C "<path>" worktree list                                       # are there others?
    grep -c "<symbol that MUST exist>" "<path>/<file you will touch>"   # the load-bearing check

If the content probe disagrees with this handover, STOP and re-resolve the tree
before anything else. Every other state fact — branch, HEAD, push state, clean
tree — comes back TRUE against the wrong checkout, so they cannot catch this for
you; only the content probe can.

## Environment preconditions (before anything else)

{{ENV_PRECONDITIONS}}

## Read first (strict order)

{{READ_FIRST_NUMBERED_LIST}}

## After read-first

Invoke {{NEXT_SKILL}}. Announce the skill at start.

{{CARRY_OVER_FRAMING_OR_EMPTY}}

## Hard constraints (read CLAUDE.md for full text)

{{HARD_CONSTRAINTS_BULLETS}}
- F-priority: {{F_STAR_PRIORITY_INLINE}}

## What NOT to do{{HANDOFF_DOC_REF_PARENTHETICAL_OR_EMPTY}}

{{DO_NOT_LIST}}

### Closed — do NOT re-litigate

{{CLOSED_ITEMS_LIST}}

## Start

{{KICKOFF_INSTRUCTION}}
