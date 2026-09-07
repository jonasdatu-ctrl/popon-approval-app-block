## Why

Doctors currently get no feedback when an order has no smile photos yet — the block just renders nothing, which looks broken rather than informative. Separately, rejecting an order captures no reason beyond "Rejected by X on \<date\>", leaving no record of *why* an order was turned down, which the doctor or a later reviewer may need.

## What Changes

- When an order has no smile photos, show an info banner ("Smile Photos are required before a Dr. can Approve/Reject") instead of rendering nothing. The Approve/Reject buttons stay hidden in this state, same as today.
- Clicking **Reject** no longer submits immediately. It swaps the Approve/Reject buttons for a single-line "Reject Reason" text input plus **Back** and **Reject** (confirm) buttons.
  - **Back** discards the reason and returns to the Approve/Reject buttons screen; nothing is submitted.
  - **Reject** (confirm) is disabled until the reason is non-empty. On confirm, it submits the decision.
- **Approve** keeps its existing one-click, immediate-submit behavior — unchanged.
- The stored decision sentence for a rejection appends the reason after the existing sentence: `Rejected by {name} on {date}. Reason: {reason}`. Approved sentences are unchanged.

## Capabilities

### Modified Capabilities
- `dr-approval-order-block`: adds a no-smile-photo info banner (replacing the current silent no-render), and adds a reject-reason confirmation step that changes the stored rejection sentence format.

## Impact

- `extensions/dr-approval-order-block/src/BlockExtension.jsx`: new render branch for the no-smile-photo banner; new local state for the reject-reason step; Reject button no longer calls `recordDecision` directly.
- `extensions/dr-approval-order-block/src/decision.js`: `buildDecisionSentence` (or a new helper) needs to accept and append an optional reject reason.
- `extensions/dr-approval-order-block/locales/en.default.json`: new i18n strings for the banner copy, the Reject Reason input label, and the Back/Reject (confirm) buttons.
- No GraphQL/schema changes — the reason is folded into the existing single-line `custom.dr_approval_decision` metafield, not a new field.
