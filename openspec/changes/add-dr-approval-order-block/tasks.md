## 1. Project & Extension Scaffolding

- [ ] 1.1 Initialize or confirm the Shopify app project (`shopify app init`) and verify `shopify.app.toml` declares `write_orders` in `access_scopes`
- [x] 1.2 Generate an Admin UI Extension targeting `admin.order-details.block.render` (`shopify app generate extension`) and verify the extension's `shopify.extension.toml` declares that target
- [x] 1.3 Implement a shared GraphQL fetch helper (`fetch("shopify:admin/api/graphql.json", ...)`) and a combined query reading `custom.smile_photo` and `custom.dr_approval_decision` off the order, and verify the query is well-formed (matches the Admin GraphQL schema for `Order.metafield`)
- [ ] 1.4 Create the `custom.dr_approval_decision` metafield definition (type: single line text, Order resource) alongside the existing `custom.smile_photo` (image list) definition, and verify it appears under Settings → Custom data → Orders in the dev store

## 2. Visibility & Render State

- [ ] 2.1 Use the query from 1.3 to check `custom.smile_photo` on mount and verify the block renders no content for an order with an empty/unset value (spec: Conditional block visibility - No photos uploaded)
- [ ] 2.2 Verify the block renders the Dr Approval card for an order whose `custom.smile_photo` has at least one image (spec: Conditional block visibility - Photos uploaded)
- [ ] 2.3 Branch render state (buttons vs banner) on whether `custom.dr_approval_decision` has a value; verify an order with photos and no decision shows both Approve and Reject buttons with no banner (spec: Approve/Reject prompt for undecided orders)

## 3. Decision Recording

- [ ] 3.1 Implement a `currentStaffMember { firstName lastName }` call via `shopify.query()` and verify it returns the logged-in admin's name in a dev-store session
- [x] 3.2 Implement the per-action sentence templates ("Approved by {name} on {timestamp}" / "Rejected by {name} on {timestamp}") in one central lookup/table and verify each produces the expected string for a sample name and timestamp
- [ ] 3.3 Implement the `metafieldsSet` call that overwrites `custom.dr_approval_decision` on click and disables both buttons immediately on click; verify clicking Approve on a dev-store order sets the metafield to the expected sentence (spec: Recording a decision - Approve is recorded)
- [ ] 3.4 Verify clicking Reject sets the metafield to the expected rejection sentence (spec: Recording a decision - Reject is recorded)
- [ ] 3.5 Verify recording a second decision on an order that already has one fully replaces the stored value, with no trace of the prior one remaining (spec: Recording a decision replaces any prior value)

## 4. Decision Banner

- [x] 4.1 Implement the leading-verb → style lookup table (`Approved` → green/success, `Rejected` → red/error, default → neutral) and verify all three branches
- [ ] 4.2 Wire the banner to render the recorded sentence with the resolved style in place of the buttons; verify a decided order shows the banner and not the buttons (spec: Decision banner for decided orders, including approved/rejected styling scenarios)
- [ ] 4.3 Manually seed an order's `custom.dr_approval_decision` with an unrecognized sentence and verify the block still renders a banner (neutral style) rather than failing (spec: Extensible decision styling)

## 5. End-to-End Verification

- [ ] 5.1 In a development store: seed an order with `custom.smile_photo` images, open the order page, click Approve, reload the page, and confirm the green banner persists across the reload
- [ ] 5.2 Repeat with a second seeded order using Reject and confirm the red banner persists across the reload
- [ ] 5.3 Confirm an order without `custom.smile_photo` images shows no block content anywhere on the order page
