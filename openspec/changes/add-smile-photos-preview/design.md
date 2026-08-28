## Context

See proposal.md - Why. This builds directly on the existing `dr-approval-order-block` extension (see `openspec/changes/add-dr-approval-order-block/design.md` for the prior decisions this inherits): Preact + native `s-*` components, `api_version = "2026-04"`, no app backend - all reads/writes happen client-side via `fetch("shopify:admin/api/graphql.json", ...)`.

Two fields with easily-confused names are involved:
- `custom.smile_photo` (singular) - **Order**-level metafield, previously used to presence-gate whether the block renders at all. Removed by this change - no longer read, since the gate moves to the customer field below.
- `custom.smile_photos` (plural) - **Customer**-level metafield, now the sole source for both block visibility and the preview images. Confirmed as type "List of files/images" (file/media references, not raw URL strings).

This design went through two mid-implementation pivots, both by explicit product direction once live testing was underway:
1. Initially additive (keep the order-level gate, add a customer-level preview) → switched to a full gating handoff (customer-level field replaces the order-level gate).
2. Conditional visibility (hide the block entirely without customer photos) → **removed entirely**. The block now always renders, showing an empty-state banner when the customer has no smile photos, and the photo gallery persists after a decision is recorded instead of disappearing (only the decision area - buttons vs. banner - swaps).

Reaching `order.customer` requires the `read_customers` access scope, which the app does not currently have (`read_orders,write_orders` only). This is a standard, self-service scope - unlike the `read_users` scope blocking the decision-attribution write path (see memory `dr-approval-read-users-blocker`), it needs no Shopify Support ticket, just a scope-list change and a merchant re-consent.

## Goals / Non-Goals

**Goals:**
- Verify the extension can read a customer-linked list-of-images metafield and render the actual images (not just presence, which is all the previous order-level read did).
- Keep the photo gallery visible above the decision area at all times the customer has photos, whether the order is undecided or already decided.
- Make the block self-explanatory with headings and short copy so an admin sees at a glance what "Smile photos" and "Decision" sections mean, even in an empty/no-photos state.
- The block is now unconditionally visible on every order, using an informational banner as the empty state rather than hiding.

**Non-Goals:**
- No click-to-enlarge / lightbox / full-resolution view - thumbnails only for this spike.
- No pagination beyond a fixed cap - if a customer has more images than the cap, only the first N are shown (no "load more").
- No caching or optimistic prefetching across order-page navigations - read happens fresh on each block mount, same as the existing state read.
- No change to the decision-recording mutation.
- No re-review / undo affordance once a decision is recorded - the banner still fully replaces the buttons, per the original design's Non-Goals (see `add-dr-approval-order-block/design.md`); only the photo gallery's visibility changed, not the decision-immutability behavior.

## Decisions

**Replace the order-level presence query with the customer-level image query in the same combined load, don't add a second round trip.**
`fetchOrderApprovalState` fetches `order.decision` and (now) `order.customer.metafield(namespace: "custom", key: "smile_photos") { references(first: 10) { edges { node { ... on MediaImage { image { url, altText } } } } } }` in one query when the block mounts. The old `order.smilePhoto` presence field is removed - it has no remaining caller now that the customer field drives both gating and preview. Alternative considered: a separate query fired only when the block is about to show the undecided state - rejected because it would add a second network round trip and a second loading-state edge case for marginal benefit (the block already fetches on every mount regardless of end state).

**Cap at first 10 images.**
A doctor review flow realistically deals with a handful of angles per submission, not dozens. 10 is a generous ceiling that avoids an unbounded query while not needing pagination UI for this spike. If real data regularly exceeds this, revisit with actual usage numbers rather than guessing further now.

**Render with `s-thumbnail` in a wrapping inline stack, not `s-grid`.**
Admin UI extensions expose both `s-image` and `s-thumbnail` (admin surface). `s-thumbnail` is purpose-built for exactly this - small, fixed-size preview tiles with built-in sizing - so it needs no manual aspect-ratio/sizing work the way raw `s-image` would. `s-stack` (already used elsewhere in this file) with `direction="inline"` and wrap behavior is sufficient for a handful of thumbnails; `s-grid` is more machinery than a single row/wrap of thumbnails needs.

**Missing customer, missing metafield, and empty list all resolve to an informational empty-state banner, not a hidden block.**
The block always renders (`s-admin-block` is never skipped). Inside it, a `hasPhotos` flag derived from `customerSmilePhotos.length > 0` decides between rendering the thumbnail gallery or an `info`-tone banner ("customer hasn't submitted their smile photos yet") in the "Smile photos" section, and between rendering the "Decision" section (buttons/banner) at all or omitting it entirely. This is a normal, expected state, not a failure - it's distinct from `errorMessage`, which still uses a `critical`-tone banner for actual load/submit failures.

**The photo gallery and the decision area are two independent sections, not one conditional block.**
Previously, showing photos and showing the decision controls were the same `if` branch (both gated on "undecided"). Now `hasPhotos` gates a "Smile photos" section (gallery vs. empty banner) and, separately, whether a "Decision" section renders at all; inside that second section, `decision` (truthy/falsy) picks banner vs. buttons. This means the gallery persists across a decision being recorded - only the decision area's *contents* swap, not the gallery.

**Alt text falls back to a generic string when the metafield's image has none.**
`MediaImage.image.altText` is read directly when present; when it's null, use a translated fallback string (e.g. "Smile photo") rather than leaving `alt` empty, for accessibility.

**Section headings and a short instructional paragraph, not just controls.**
`s-heading` labels each section ("Smile photos", "Decision"); a one-line `s-paragraph` above the Approve/Reject buttons explains the action ("Review the smile photos above and record a decision."). This is a lightweight fix for the block reading as a bare row of controls with no framing, raised directly by product during live testing rather than left to visual judgment alone.

## Risks / Trade-offs

- **[Risk] Adding `read_customers` requires a scope-change re-consent, same class of friction as any new scope, even though it's self-service (no support ticket).** → Mitigation: deploy the scope change and communicate to the merchant that re-authorization will be prompted on next app open/update, same as documented in the prior change's design for the (still-pending) `read_users` grant.
- **[Risk] The block now appears on every order in the store, including orders that never involve a smile-photo review at all** (no product/service tied to Dr Approval). → Mitigation: accepted as the intended behavior per explicit product direction - staff see a consistent, low-noise empty-state banner rather than the block disappearing unpredictably. Revisit if this proves noisy in practice (e.g. by scoping to specific order types) - not attempted here.
- **[Risk] If `custom.smile_photos` turns out not to be a file-reference type after all (despite confirmation), the `references` query returns nothing and every order shows the empty-state banner, masking a config problem as "no photos yet."** → Mitigation: this is a read-only spike explicitly meant to surface exactly this kind of mismatch quickly; if every order unexpectedly shows the empty state, that's the signal to re-check the metafield's actual type in Admin before trusting the feature further.
- **[Risk] A customer with a large `custom.smile_photos` list only shows the first 10, with no indication more exist.** → Mitigation: accepted for this spike; revisit with a count/"+N more" affordance if real customer data exceeds the cap.
- **[Risk] A decision recorded while photos existed remains visible even if the customer's photos are later removed - but per this design, the decision banner requires `hasPhotos` to render, so it would disappear too (only the empty-state banner would show), silently hiding a previously-made decision.** → Mitigation: accepted as an edge case outside this spike's scope (photos aren't expected to be removed after review in normal usage); flagged here rather than silently shipped in case it surprises someone debugging a "missing" decision later.
