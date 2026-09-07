## 1. Locales

- [x] 1.1 Add new i18n keys to `extensions/dr-approval-order-block/locales/en.default.json`: `no-smile-photo-banner` ("Smile Photos are required before a Dr. can Approve/Reject"), `reject-reason-label`, `back-button`, `reject-confirm-button` and verify the JSON file is still valid (parses without error).

## 2. Decision sentence composition

- [x] 2.1 Add a reason-appending helper to `extensions/dr-approval-order-block/src/decision.js` (e.g. `appendReason(sentence, reason)`) that returns `` `${sentence}. Reason: ${reason}` `` when `reason` is non-empty, otherwise returns `sentence` unchanged, and verify with a quick manual call (or unit test if a test setup exists) that an Approved sentence passed through unchanged and a Rejected sentence gets the suffix.
- [x] 2.2 Verify `resolveDecisionTone` still resolves the correct tone for a reason-suffixed rejection sentence (it only reads the leading verb, so this should need no change - confirm by tracing the function, no edit expected).

## 3. No-smile-photo banner

- [x] 3.1 In `BlockExtension.jsx`, replace the `if (!hasSmilePhoto) return null;` branch with a render returning `<s-admin-block>` containing `<s-banner tone="info">{i18n.translate("no-smile-photo-banner")}</s-banner>` and no buttons, and verify by viewing an order with an empty `custom.smile_photo` metafield in the dev store - banner appears, no Approve/Reject buttons render.

## 4. Reject-reason step state

- [x] 4.1 Add `const [step, setStep] = useState("buttons")` and `const [rejectReason, setRejectReason] = useState("")` to the `Extension()` component.
- [x] 4.2 Change the Reject button's `onClick` from `() => recordDecision("Rejected")` to `() => setStep("reject-reason")` and verify clicking Reject no longer writes the metafield (check via Shopify admin or a network inspector that no `metafieldsSet` call fires on click).
- [x] 4.3 Add a new render branch for `step === "reject-reason"`: a single-line text input bound to `rejectReason` (labelled via `reject-reason-label`), a Back button, and a Reject (confirm) button; verify the Approve/Reject buttons are no longer visible while this branch is showing.
- [x] 4.4 Wire the Back button to reset `rejectReason` to `""` and `step` to `"buttons"`, and verify clicking Back returns to the Approve/Reject buttons with no metafield write.
- [x] 4.5 Disable the Reject (confirm) button when `rejectReason.trim().length === 0`, and verify by leaving the field empty/whitespace-only that the button stays disabled.

## 5. Reject-reason submission

- [x] 5.1 Extend `recordDecision` (in `BlockExtension.jsx`) to accept an optional `reason` second argument - reusing its existing try/submitting/error shape rather than duplicating it per design.md - so it builds the Rejected sentence via `buildDecisionSentence`, appends the reason via `appendReason` only when `actionKey === "Rejected"`, and calls `setApprovalDecision(orderId, sentence)`, then sets `decision` to the final sentence on success.
- [x] 5.2 Wire the reason step's Reject (confirm) button to call `recordDecision("Rejected", rejectReason.trim())`. Verified via the `decision.js` composition check in 2.1 that the sentence format is `Rejected by {name} on {date}. Reason: {reason}`; end-to-end confirmation against a live order is covered by 6.1.
- [x] 5.3 Verify a submit failure shows `error-submitting`. Confirmed the block falls back to the pre-existing top-level critical-banner branch (same as an Approve failure) rather than staying on the reason step - accepted as intentional, matching existing behavior everywhere else in this block; see design.md Risks.

## 6. Manual verification

- [ ] 6.1 Walk all scenarios from `specs/dr-approval-order-block/spec.md` against the dev store: no-photo banner, Approve one-click (unchanged), Reject → reason step → Back → buttons again, Reject → reason step → confirm → decision banner with appended reason, and confirm-disabled-when-empty.
