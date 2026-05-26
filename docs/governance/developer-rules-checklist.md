# Developer Rules Checklist

**Status:** Canonical governance.
**Source:** Phil Gizzie, 2026-05-26.

## Purpose

Define the review and implementation rules that keep HOTMESS governance enforceable.

## Core rule

**If it cannot be enforced, it is not a rule yet.**

This checklist applies to all PRs, docs, and governance-bearing changes.

## 1. Source of truth

- Check against the canonical governance stack first.
- Canonical stack outranks drafts, duplicates, and implementation convenience.
- If a change conflicts with governance, governance wins.

## 2. Safety first

- Safety overrides all other concerns.
- No change may increase user risk, abuse surface, harassment exposure, stalking risk, or moderation burden without explicit review.
- If uncertain, block or downgrade the change.

## 3. Truth before trust

- Do not let trust scores, reputation, or popularity override verified reality.
- Stale, false, or contradictory content must not appear authoritative.
- Claims must be checked against source quality and freshness.

## 4. Readability is a product requirement

- A technically correct change is still wrong if it makes the system harder to read, scan, or govern.
- If a rule adds clutter, ambiguity, or duplicate logic, it is suspect.

## 5. Bounded amplification

- Boosts, prominence, and paid visibility must remain bounded.
- No feature may create runaway amplification or crowd out organic relevance.
- If a change increases surface area without utility, reject it.

## 6. Freshness and decay

- Newness is not truth.
- Expired or stale content must decay and lose influence.
- Quiet states are valid and must not be treated as failure.

## 7. No hidden policy

- Governance rules must be explicit.
- No implicit exceptions, hidden overrides, or undocumented rank hacks.
- If product or engineering wants an exception, it must be written down.

## 8. Enforcement alignment

Every rule must have:

- an owner
- an observable signal
- a threshold or trigger
- an action on breach

If a rule cannot be monitored, it cannot be operationalized.

## 9. Change discipline

- Avoid duplicate rules across docs.
- Prefer one canonical location per rule.
- If a new doc repeats an existing rule, it should reference the canonical version instead of redefining it.

## 10. Conflict handling

If two docs disagree, use the hierarchy:

1. Sacred invariants
2. Governance canonical docs
3. Related product briefs and doctrine
4. Drafts and implementation docs

Never silently merge conflicting rules.

## 11. Implementation review

Check whether the proposed change:

- weakens moderation
- weakens truth verification
- weakens trust decay or recovery
- weakens freshness decay
- increases clutter
- increases saturation
- creates ambiguous ownership

If any are true, flag it.

## 12. Required checks for every review

- Is this safe?
- Is this true?
- Is this readable?
- Is it bounded?
- Is it measurable?
- Is it enforceable?
- Is it duplicative?
- Does it preserve quiet-state validity?

## 13. Prohibited patterns

- "Looks alive" metrics without utility
- Popularity treated as truth
- Boosts treated as default rank
- Stale content preserved for appearance
- Duplicate rules in multiple folders
- Undocumented exceptions
- Unowned thresholds
- Unmeasured enforcement

## 14. Approval standard

A change should only pass if it improves, or at minimum does not degrade:

- safety
- truth
- trust
- freshness
- readability
- saturation control
- moderation clarity

## 15. Final reviewer rule

If the reviewer cannot explain the rule in one sentence and point to its owner and trigger, the rule is incomplete.

This doc should be kept short, strict, and enforceable.
