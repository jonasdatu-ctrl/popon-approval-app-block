## Why

Some orders require a doctor to visually clear a customer-submitted smile photo before the order can proceed with confidence. Today there is no visibility into this review step inside the Shopify admin order page, and no record of who cleared or rejected an order or when. This change adds an order-page admin block that surfaces the review action exactly where staff already work, and leaves a durable, attributable record of the decision.

## What Changes

- New Shopify admin UI extension (`admin.order-details.block.render` target) rendered on the order details page.
- On load, the block reads the order metafield `custom.smile_photo` (image list). If it has no items, the block renders nothing.
- If `custom.smile_photo` has items and no decision has been recorded yet, the block renders a "Dr Approval" card with **Approve** and **Reject** buttons.
- Clicking either button:
  - Looks up the acting admin via `currentStaffMember`.
  - Writes a free-form sentence (e.g. "Approved by {name} on {timestamp}") to a new single-line-text order metafield, `custom.dr_approval_decision`, via `metafieldsSet` (single overwrite, no read-modify-write).
  - Re-renders the block immediately in the decided state.
- If `custom.dr_approval_decision` already has a value, the block renders a status banner (green for an approved decision, red for a rejected decision) in place of the Approve/Reject buttons, using the recorded sentence as the banner text.
- Decision detection and banner styling are driven by a small action→style lookup (keyed off the sentence's leading verb) rather than hardcoded to exactly two cases, so a future action (e.g. "Escalated") can be added without restructuring the render logic.
- Once a decision is recorded, the buttons do not reappear from this UI; there is no history of prior decisions, only the latest one (the metafield is a single line of text, overwritten on each action).

## Capabilities

### New Capabilities
- `dr-approval-order-block`: Admin order-details block that conditionally renders a doctor approval prompt based on an image-list metafield, and records the resulting Approve/Reject decision as an attributable, timestamped sentence on the order.

### Modified Capabilities
(none — no pre-existing specs in this repo)

## Impact

- **New Shopify app / extension code**: an Admin UI Extension (React or vanilla, TypeScript) targeting `admin.order-details.block.render`, plus its `shopify.extension.toml` configuration (metafield declarations, target).
- **Access scopes**: app must request both `read_orders` (to read the order and its `custom.smile_photo` / `custom.dr_approval_decision` metafields - `write_orders` alone does not grant read access on Orders) and `write_orders` (to write the decision metafield via `metafieldsSet`).
- **Metafield definitions**: requires a metafield definition for `custom.dr_approval_decision` (type: single line text) alongside the existing `custom.smile_photo` (image list) definition.
- **No backend/server component**: all reads/writes happen client-side from the extension via `shopify.query()` against the GraphQL Admin API; no app backend proxy is introduced by this change.
- **No native Shopify order-timeline writes**: the GraphQL/REST Admin APIs do not expose a way to create order timeline comments, so the decision record lives entirely in the new metafield rather than the order's native "Timeline".
