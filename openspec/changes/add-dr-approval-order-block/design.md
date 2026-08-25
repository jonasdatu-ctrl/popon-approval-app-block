## Context

See proposal.md - Why. Two platform constraints shape this design directly:

- **There is no public Shopify API (REST or GraphQL) to create order timeline comments.** `CommentEvent` is read-only; no mutation exists to write one. This is a long-standing, confirmed gap, not an oversight in this design — so the "comment" from the original ask is implemented as a metafield, not a native timeline entry.
- **Admin block extensions (`admin.order-details.block.render`) only get resource IDs from `data`** (`data.selected[0].id`), not field values. The current extension runtime (Preact + native `s-*` web components, `api_version = "2026-04"`) has no declarative metafield-preload mechanism for this target - values are fetched with `fetch("shopify:admin/api/graphql.json", ...)` at runtime, the same mechanism used for the `metafieldsSet` write. No app backend/proxy is required for this feature - both reads and the write happen client-side from the extension.

## Goals / Non-Goals

**Goals:**
- Surface the approval prompt only when it's actionable (photos present, no existing decision).
- Make the recorded decision attributable (who) and time-stamped (when), without a backend.
- Keep the decision → banner-style mapping open-ended, so more actions can be added later without restructuring render logic.

**Non-Goals:**
- No audit trail / history of prior decisions - `custom.dr_approval_decision` is a single line, overwritten on every action. Only the latest decision is ever recoverable from it.
- No enforcement side effects - Reject does not block fulfillment, cancel, tag, or hold the order; Approve does not unlock anything downstream. This change is the review/record step only.
- No customer-facing notification (email/SMS) on either action.
- No role/permission restriction on who can click Approve/Reject - any admin with access to the order details page can act.
- No write to the order's native `note` field or timeline - deliberately out of scope given the API gap above; not a fallback used by this design.

## Decisions

**Single free-form-sentence metafield as the only state, instead of a status field + separate log.**
The stored value doubles as both the render-state signal (has a decision been made?) and the human-readable record (what was decided, by whom, when), in one `single_line_text_field` metafield (`custom.dr_approval_decision`). Considered a structured/delimited value (e.g. `approved|Sarah Cruz|2026-08-25T15:14:00Z`) for more robust parsing, but the app fully controls what it writes - the sentence is generated from a fixed per-action template, not merchant-typed - so parsing it back is deterministic. Chosen for readability if a merchant inspects the raw metafield value.

**Decision detection via a leading-verb lookup, not hardcoded if/else.**
Each action template starts with a fixed, distinct verb ("Approved by...", "Rejected by..."). The banner renderer looks up style/label by that leading verb in a small table (`{ Approved: green, Rejected: red }`), with a neutral default for anything unrecognized. Adding a third action later means adding one table entry and one action template - not touching the render branch structure.

**Single overwrite via `metafieldsSet`, no read-modify-write.**
Because the metafield holds only the latest decision (by design - see Non-Goals), writing it is a single mutation call with no prior read needed. This sidesteps the race condition that would exist if decisions were appended to a growing note/log (two concurrent clicks racing to read-then-write the same field).

**Metafield values fetched via one combined GraphQL query on load, not per-field calls.**
`custom.smile_photo` (checked via `references(first: 1)` presence, not the raw JSON value) and `custom.dr_approval_decision` are read together in a single `order(id: ...)` query when the block mounts, keeping the visibility check and the render-state check to one round trip instead of two.

**Acting staff identity via `currentStaffMember` GraphQL query, not a decoded auth token.**
The extension's `idToken()` produces a signed JWT meant for server-side verification and would require a backend to decode - which this design deliberately avoids. `currentStaffMember { firstName lastName }` is queried directly from the extension via the same GraphQL fetch helper and returns the acting admin's name with no extra infrastructure.

## Risks / Trade-offs

- **[Risk] No history means a disputed or accidental decision can't be traced back.** → Mitigation: accepted for this iteration per explicit product direction (single-line field, "make room for additional actions" later - not a full log now). If this becomes a problem, a separate structured log metafield can be added later without touching this spec's contract.
- **[Risk] Double-click / two admins racing to decide the same order.** → Mitigation: last write wins cleanly (single overwrite, no merge/append), so the outcome is always a valid, readable sentence - never a corrupted partial state. The UI should still disable both buttons immediately on click to make double-submission from the same admin unlikely.
- **[Risk] Sentence-based detection breaks if a future action template's wording doesn't start with a stable, unique verb.** → Mitigation: keep action templates centralized in one lookup table so this constraint is enforced in one place, not scattered across the render code.
- **[Risk] No way to reopen/change a decision from this UI once recorded.** → Mitigation: acceptable for now (confirmed as current behavior); merchants needing to correct a mistake would edit the metafield directly in Admin. Revisit if this becomes a common support request.
- **[Risk] `currentStaffMember` requires the `read_users` access scope, which is not self-serve.** Confirmed live against this store (2026-08-25): the query fails with `ACCESS_DENIED` unless `read_users` is granted, and granting it requires contacting Shopify (Plus) Support directly - there's no Partner Dashboard self-service toggle for it (unlike the protected-customer-data step needed for `read_orders`/`Order`, which is self-service). → Mitigation: `popon-checkout-app` is confirmed Plus/Advanced, so the scope is at least requestable. Contact Shopify (Plus) Support, referencing app `popon-order-admin-approval` (client_id `64309a97c61cab0c1798892fcd68ff3d`), to request `read_users`. Until granted, clicking Approve/Reject will fail at the `fetchCurrentStaffMemberName()` step - this is the current blocking status, not a bug in this codebase. Some reports suggest the merchant may also need to re-consent/reinstall after Shopify grants it, since scope changes require a fresh authorization.

## Open Questions

- Should Approve/Reject be restricted to a specific staff permission or role, or remain open to any admin with order access (current behavior)? Doesn't change this spec's contract either way - can be layered on later as an authorization check around the existing action.
- Should Reject eventually carry an enforcement action (block fulfillment, tag the order, notify the customer)? Explicitly out of scope for this change; would likely be its own follow-up change with its own capability.
