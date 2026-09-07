## MODIFIED Requirements

### Requirement: Conditional block visibility
The block SHALL render for every order that reaches it. WHEN the order's `custom.smile_photo` metafield is empty or unset, the block SHALL display an info banner stating that smile photos are required, and SHALL NOT display the Approve/Reject buttons or a decision banner.

#### Scenario: No photos uploaded
- **WHEN** an admin opens the order details page for an order whose `custom.smile_photo` metafield is empty or unset
- **THEN** the block displays an info banner ("Smile Photos are required before a Dr. can Approve/Reject") and no Approve/Reject buttons or decision banner are shown

#### Scenario: Photos uploaded
- **WHEN** an admin opens the order details page for an order whose `custom.smile_photo` metafield contains one or more images
- **THEN** the block renders the Dr Approval card (Approve/Reject buttons, or the decision banner if already decided)

### Requirement: Recording a decision
WHEN a staff member clicks Approve on an undecided order, or confirms Reject with a non-empty reason on an undecided order, the system SHALL determine the acting staff member's name via `currentStaffMember`, SHALL capture the current timestamp, and SHALL overwrite the `custom.dr_approval_decision` metafield with a single-line sentence stating the action, the staff member's name, and the timestamp. For a rejection, the sentence SHALL additionally append the entered reason after the timestamp.

#### Scenario: Approve is recorded
- **WHEN** a staff member clicks Approve
- **THEN** `custom.dr_approval_decision` is set to a sentence identifying an approval, the acting staff member's name, and the time of the action

#### Scenario: Reject is recorded with a reason
- **WHEN** a staff member confirms Reject after entering a reject reason
- **THEN** `custom.dr_approval_decision` is set to a sentence identifying a rejection, the acting staff member's name, and the time of the action, followed by `. Reason: {reason}`

#### Scenario: Recording a decision replaces any prior value
- **WHEN** a decision is recorded on an order that already has a value in `custom.dr_approval_decision`
- **THEN** the previous value is fully overwritten and no record of the prior decision remains in the metafield

## ADDED Requirements

### Requirement: Reject reason confirmation step
WHEN a staff member clicks Reject on an undecided order, the system SHALL NOT immediately record a decision. Instead it SHALL hide the Approve/Reject buttons and display a single-line "Reject Reason" text input, alongside a Back button and a Reject (confirm) button. The Reject (confirm) button SHALL be disabled while the entered reason is empty.

#### Scenario: Clicking Reject opens the reason step
- **WHEN** a staff member clicks Reject on an undecided order
- **THEN** the Approve/Reject buttons are replaced by a Reject Reason text input, a Back button, and a Reject (confirm) button, and no metafield write occurs yet

#### Scenario: Reject confirm is blocked without a reason
- **WHEN** the Reject Reason input is empty
- **THEN** the Reject (confirm) button is disabled

#### Scenario: Confirming Reject with a reason submits the decision
- **WHEN** a staff member enters a non-empty reason and clicks the Reject (confirm) button
- **THEN** the rejection is recorded per the "Recording a decision" requirement and the decision banner is shown

#### Scenario: Back cancels the reject flow
- **WHEN** a staff member clicks Back while on the reject reason step
- **THEN** the entered reason is discarded, no metafield write occurs, and the Approve/Reject buttons screen is shown again
