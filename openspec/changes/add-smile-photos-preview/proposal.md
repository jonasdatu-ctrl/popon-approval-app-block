## Why

When a doctor reviews an order in the Dr Approval block, they see Approve/Reject buttons but not the actual smile photo(s) they're being asked to judge - those live on the customer's profile, a separate page. This change surfaces the customer's submitted smile photos directly on the order-details block during the undecided review stage, so a doctor can see the evidence and act without leaving the page. It also serves as a verification spike: confirming the extension can read a customer-linked, list-of-images metafield (`custom.smile_photos`) and render the images before this becomes a load-bearing part of the review flow.

## What Changes

- On block load, read the order's linked customer's `custom.smile_photos` metafield (a list of images) instead of the order-level `custom.smile_photo` presence check, alongside the existing `custom.dr_approval_decision` read.
- **BREAKING (internal gating change)**: the block no longer conditionally hides itself. It now renders on every order details page. When the linked customer has no `custom.smile_photos`, the block shows an informational "not submitted yet" banner instead of the photo gallery, and no Approve/Reject buttons or decision banner. The order-level `custom.smile_photo` read is removed entirely (superseded by the customer-level field, then that field's use as a visibility gate was itself dropped in favor of always-visible + empty state).
- The customer's smile photos are displayed above the decision area (buttons or banner) whenever the customer has submitted at least one - **regardless of whether a decision has already been recorded**, so the photos stay visible after Approve/Reject instead of disappearing.
- The block gained section headings ("Smile photos", "Decision") and a short instructional line above the buttons, so an undecided/no-photos block isn't a bare row of controls.
- **BREAKING**: add `read_customers` to the app's access scopes. `order.customer` (and anything under it, including customer metafields) is not reachable under the currently-granted `read_orders`/`write_orders` scopes alone. This requires a scope-change re-consent on next install/update in the target store, same class of change as adding any new access scope (not the same as the `read_users` blocker in memory - `read_customers` is fully self-service, no Shopify Support ticket needed).
- No changes to the decision-recording mutation.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `dr-approval-order-block`: removes conditional block visibility entirely (block always renders, with an empty-state banner when the customer has no smile photos); the photo gallery now persists across decision state instead of only showing while undecided.

## Impact

- **Extension code**: [extensions/dr-approval-order-block/src/graphql.js](extensions/dr-approval-order-block/src/graphql.js) (combined load query reaches `order.customer.metafield`), [extensions/dr-approval-order-block/src/BlockExtension.jsx](extensions/dr-approval-order-block/src/BlockExtension.jsx) (always renders; empty-state banner; photo gallery shown independent of decision state; added headings/copy), [extensions/dr-approval-order-block/locales/en.default.json](extensions/dr-approval-order-block/locales/en.default.json) (new heading/empty-state/prompt strings).
- **Access scopes**: `read_customers` added to `access_scopes.scopes` in [shopify.app.toml](shopify.app.toml) and [shopify.app.popon-order-admin-approval.toml](shopify.app.popon-order-admin-approval.toml). Requires the merchant to re-consent to the new scope on next app update/install.
- **No new metafield definitions or writes** - this change only reads an existing customer metafield (`custom.smile_photos`, assumed already defined in Admin per the source ask); it does not create or modify metafield definitions, and does not touch the write path (`metafieldsSet`) used for decisions.
- **Baseline note**: the prior change (`add-dr-approval-order-block`) has not yet been archived/synced into `openspec/specs/`, so this change's delta spec for `dr-approval-order-block` is authored without an existing main spec file to diff against. It should be read alongside that change's own spec at `openspec/changes/add-dr-approval-order-block/specs/dr-approval-order-block/spec.md` for full context until both are synced.
