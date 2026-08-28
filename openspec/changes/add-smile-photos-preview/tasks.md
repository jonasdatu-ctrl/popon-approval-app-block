## 1. Access scopes

- [x] 1.1 Add `read_customers` to the `scopes` list in [shopify.app.toml](shopify.app.toml) and [shopify.app.popon-order-admin-approval.toml](shopify.app.popon-order-admin-approval.toml), and verify both files list `read_orders,write_orders,read_customers`
- [x] 1.2 Deploy the scope change (`shopify app deploy`) and verify the merchant re-consent/authorization prompt appears on next app access in the target store

## 2. Read customer smile photos

- [x] 2.1 Replace the order-level `smile_photo` presence read in `fetchOrderApprovalState` ([extensions/dr-approval-order-block/src/graphql.js](extensions/dr-approval-order-block/src/graphql.js)) with `order.customer.metafield(namespace: "custom", key: "smile_photos") { references(first: 10) { edges { node { ... on MediaImage { image { url altText } } } } } }`, and verify the old `smilePhoto` field/query is fully removed (no remaining callers)
- [x] 2.2 Map the raw response into a plain array of `{ url, alt }` (capped at 10) returned from `fetchOrderApprovalState`, and verify a missing customer, missing metafield, or empty list all resolve to an empty array without throwing

## 3. Render the customer's photos

- [x] 3.1 Add a `customerSmilePhotos` state value to `BlockExtension.jsx`, populated from the extended fetch alongside the existing `decision` state (the old `hasSmilePhoto` state is removed), and verify it updates after the load effect runs
- [x] 3.2 Render the resolved images as `s-thumbnail` tiles in a wrapping inline `s-stack` under a "Smile photos" heading, and verify a translated fallback alt-text string (via `i18n.translate`) is used when an image's `altText` is null

## 4. Always-visible block with empty state and persistent gallery

- [x] 4.1 Remove the `customerSmilePhotos.length === 0` early-return (`return null`) so the block always renders an `s-admin-block`, regardless of whether the customer has smile photos
- [x] 4.2 In the "Smile photos" section, render an `info`-tone banner ("This customer hasn't submitted their smile photos yet.") in place of the thumbnail gallery when `customerSmilePhotos.length === 0`
- [x] 4.3 Gate the "Decision" section (heading + Approve/Reject buttons or decision banner) on `hasPhotos`, so it doesn't render at all when there are no photos to review, and verify neither buttons nor a decision banner ever show without photos
- [x] 4.4 Move the photo gallery out of the undecided-only branch so it renders whenever `hasPhotos` is true, independent of `decision` - verify the gallery stays visible after a decision is recorded, with only the decision area's contents (buttons → banner) swapping
- [x] 4.5 Add section headings ("Smile photos", "Decision") and a short instructional paragraph above the Approve/Reject buttons, and add the corresponding strings to [locales/en.default.json](extensions/dr-approval-order-block/locales/en.default.json)

## 5. Verification

- [ ] 5.1 In a dev/test store, open an order whose linked customer has `custom.smile_photos` images and no recorded decision, and verify the images render under "Smile photos" with the Approve/Reject buttons under "Decision" below them
- [ ] 5.2 Open an order whose linked customer has an empty/unset `custom.smile_photos` (or the order has no linked customer), and verify the block still renders with the "not submitted yet" banner, and no Decision section (no buttons, no decision banner)
- [ ] 5.3 Open an already-decided order whose customer still has smile photos, and verify the photos still display, with the decision banner shown instead of the buttons
- [ ] 5.4 Click Approve or Reject and verify the decision now records successfully (the `read_users` scope block is confirmed resolved) and the console no longer logs a `recordDecision failed` error
