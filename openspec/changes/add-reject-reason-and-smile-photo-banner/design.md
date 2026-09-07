## Context

See proposal.md - Why. This extends the single-component extension at `extensions/dr-approval-order-block/src/BlockExtension.jsx`, which today has exactly two terminal render states per order (buttons, or decision banner) plus loading/error, all driven by flat `useState` flags - no router, no store. This change introduces the first multi-step UI in that component.

## Goals / Non-Goals

**Goals:**
- Keep the same "flat local state, conditional render branches" style already used throughout the component - no new state management library or pattern.
- Keep `buildDecisionSentence`'s existing per-action templates untouched; add the reason as a separate, composable step so Approved sentences are provably unaffected.

**Non-Goals:**
- No validation/moderation of the reason text beyond non-empty - free text, merchant-typed, stored as-is.
- No character-limit enforcement in this design beyond what Shopify's `single_line_text_field` metafield already rejects at the API layer - see Risks.
- No change to how `hasSmilePhoto` is computed (`metafieldHasContent` in `graphql.js` is unchanged) - only what renders when it's false.

## Decisions

**A single `step` string state (`"buttons" | "reject-reason"`) instead of a boolean flag.**
A boolean (`isRejecting`) would work for exactly two states, but a named `step` string reads more clearly at each render branch and leaves room if a future change adds another intermediate step (e.g. a confirm-approve step), without renaming a boolean into something that no longer means what its name says. Paired with `const [rejectReason, setRejectReason] = useState("")`, reset to `""` whenever `step` returns to `"buttons"` (both on Back and after a successful submit).

**No-smile-photo banner replaces the `return null` branch, buttons stay hidden in that state.**
`if (!hasSmilePhoto) return null;` becomes a branch that renders the `<s-admin-block>` with only an `<s-banner tone="info">` and no buttons - mirroring the existing loading/error branches' shape (each is a full early return with its own `<s-admin-block>` content) rather than threading a new condition into the main return.

**Reason appended by a small helper in `decision.js`, not folded into `buildDecisionSentence`.**
Add `export function appendReason(sentence, reason) { return reason ? \`${sentence}. Reason: ${reason}\` : sentence; }` (or inline equivalent) called from `recordDecision` only when `actionKey === "Rejected"`. Considered adding a `reason` parameter directly to `buildDecisionSentence(actionKey, staffName, timestamp, reason)` - rejected because it would force every call site (including Approve's) to pass a fourth argument that's meaningless for approval, and would couple the sentence template to a concern (reason formatting) that's really about composing two strings, not building one.

**Reject button no longer calls `recordDecision` directly; a new `confirmReject` callback does.**
`onClick={() => recordDecision("Rejected")}` on the Reject button becomes `onClick={() => setStep("reject-reason")}` (pure UI transition, no network call - matches Back's symmetry). The reason-step's Reject (confirm) button calls a new callback that composes the reason-appended sentence and calls the existing `setApprovalDecision(orderId, sentence)` - reusing `recordDecision`'s existing try/submitting/error handling shape rather than duplicating it (e.g. `recordDecision` gains an optional second parameter for the pre-built sentence override, or a sibling function shares its body - exact refactor is an implementation detail for tasks.md).

**Confirm-disabled state uses a trimmed non-empty check.**
`rejectReason.trim().length === 0` disables the confirm button, so whitespace-only input doesn't count as a reason - consistent with treating the reason as a meaningful human-readable note, not just "was the field touched."

## Risks / Trade-offs

- **[Risk] Combined sentence (base sentence + reason) could exceed the `custom.dr_approval_decision` metafield's `single_line_text_field` length limit if a merchant enters a very long reason.** → Mitigation: no client-side truncation in this change; a `metafieldsSet` failure surfaces through the existing `errorMessage`/`error-submitting` path already in place for any write failure. Revisit with an input `maxlength` if this proves to be a real problem in practice.
- **[Risk] A merchant could click Reject, type a reason, then click Back, losing that text with no undo.** → Mitigation: accepted - Back is meant to be a full cancel, matching how the user described it ("returns to the original 2 button screen"); nothing has been submitted at that point, so there's nothing to lose except unsaved input.
- **[Risk] A failed Reject submission loses the typed reason and the reason step's UI, forcing a page reload to retry.** Confirmed during implementation: the component's pre-existing top-level `if (errorMessage) return <critical banner only>` branch runs before the `step`-based render, so on error the whole block swaps to a bare critical banner - `step` internally still equals `"reject-reason"`, but nothing renders it. This mirrors the existing (pre-change) behavior for a failed Approve, which also has no retry affordance short of reload. → Mitigation: accepted as-is per explicit product direction - this change does not alter submit-error handling; it stays consistent with how every other submit failure in this block already behaves. Revisit only if this becomes a real support burden.
