## REMOVED Requirements

### Requirement: Conditional block visibility
**Reason**: Product direction changed mid-implementation. The block now always renders on every order details page, rather than being hidden entirely for orders whose linked customer has no submitted smile photos, so staff always see review status (including "not yet submitted") without wondering whether the block failed to load.
**Migration**: No merchant action needed; this is a display-only behavior change. Orders that previously showed nothing now show the Dr Approval card with an informational empty-state banner in place of the photo gallery.

## MODIFIED Requirements

### Requirement: Approve/Reject prompt for undecided orders
WHEN the Dr Approval card renders, the linked customer has at least one image in `custom.smile_photos`, and no value exists yet for `custom.dr_approval_decision`, the card SHALL display an Approve button and a Reject button, and SHALL NOT display a decision banner.

#### Scenario: Undecided order with photos shows both actions
- **WHEN** the Dr Approval card renders for an order whose linked customer has submitted smile photos and no decision is recorded
- **THEN** an Approve button and a Reject button are both displayed and no banner is shown

#### Scenario: No photos submitted yet shows neither actions nor a decision banner
- **WHEN** the Dr Approval card renders for an order whose linked customer has not submitted any smile photos
- **THEN** neither the Approve/Reject buttons nor a decision banner are displayed

### Requirement: Decision banner for decided orders
WHEN the Dr Approval card renders, the linked customer has at least one image in `custom.smile_photos`, and `custom.dr_approval_decision` already has a value, the card SHALL display a status banner using the recorded sentence as its text, and SHALL NOT display the Approve/Reject buttons.

#### Scenario: Approved banner styling
- **WHEN** the recorded decision represents an approval and the linked customer has submitted smile photos
- **THEN** the banner renders with a green/success visual style and shows the recorded sentence

#### Scenario: Rejected banner styling
- **WHEN** the recorded decision represents a rejection and the linked customer has submitted smile photos
- **THEN** the banner renders with a red/error visual style and shows the recorded sentence

## ADDED Requirements

### Requirement: Block always renders, with an empty state when no photos are submitted
The block SHALL render on every order details page regardless of whether the linked customer has submitted smile photos. WHEN the order's linked customer's `custom.smile_photos` metafield is empty, unset, or the order has no linked customer, the block SHALL display an informational banner stating the customer hasn't submitted their smile photos yet, in place of the photo gallery, and SHALL NOT display the Approve/Reject buttons or a decision banner regardless of whether `custom.dr_approval_decision` has a value.

#### Scenario: Customer has not submitted smile photos
- **WHEN** an admin opens the order details page for an order whose linked customer has no images in `custom.smile_photos` (or the order has no linked customer)
- **THEN** the block renders with an informational banner indicating no smile photos have been submitted yet, and no Approve/Reject buttons or decision banner are shown

#### Scenario: Customer has submitted smile photos
- **WHEN** an admin opens the order details page for an order whose linked customer has one or more images in `custom.smile_photos`
- **THEN** the block renders those images, plus either the Approve/Reject buttons (undecided) or the decision banner (decided)

### Requirement: Customer smile photo preview shown regardless of decision state
WHEN the Dr Approval card has one or more customer smile photos, the card SHALL display those images above the decision area regardless of whether a decision has been recorded, replacing only the decision area's contents (Approve/Reject buttons vs. decision banner) based on decision state.

#### Scenario: Undecided order shows the photo preview
- **WHEN** the block has customer smile photos and no decision is recorded
- **THEN** the customer's smile photos display, with the Approve/Reject buttons shown below them

#### Scenario: Decided order still shows the photo preview
- **WHEN** the block has customer smile photos and a decision has already been recorded
- **THEN** the customer's smile photos still display, with the decision banner shown below them instead of the Approve/Reject buttons
