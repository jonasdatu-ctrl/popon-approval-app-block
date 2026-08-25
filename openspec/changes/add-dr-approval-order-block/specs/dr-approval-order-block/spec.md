## Purpose

Gives staff a way to visually clear or reject a customer's submitted smile photo directly from the order details page, and leaves an attributable, timestamped record of that decision on the order.

## ADDED Requirements

### Requirement: Conditional block visibility
The block SHALL render only when the order's `custom.smile_photo` metafield contains at least one image.

#### Scenario: No photos uploaded
- **WHEN** an admin opens the order details page for an order whose `custom.smile_photo` metafield is empty or unset
- **THEN** the block renders no content

#### Scenario: Photos uploaded
- **WHEN** an admin opens the order details page for an order whose `custom.smile_photo` metafield contains one or more images
- **THEN** the block renders the Dr Approval card

### Requirement: Approve/Reject prompt for undecided orders
WHEN the Dr Approval card renders and no value exists yet for `custom.dr_approval_decision`, the card SHALL display an Approve button and a Reject button, and SHALL NOT display a decision banner.

#### Scenario: Undecided order shows both actions
- **WHEN** the Dr Approval card renders for an order with photos and no recorded decision
- **THEN** an Approve button and a Reject button are both displayed and no banner is shown

### Requirement: Recording a decision
WHEN a staff member clicks Approve or Reject on an undecided order, the system SHALL determine the acting staff member's name via `currentStaffMember`, SHALL capture the current timestamp, and SHALL overwrite the `custom.dr_approval_decision` metafield with a single-line sentence stating the action, the staff member's name, and the timestamp.

#### Scenario: Approve is recorded
- **WHEN** a staff member clicks Approve
- **THEN** `custom.dr_approval_decision` is set to a sentence identifying an approval, the acting staff member's name, and the time of the action

#### Scenario: Reject is recorded
- **WHEN** a staff member clicks Reject
- **THEN** `custom.dr_approval_decision` is set to a sentence identifying a rejection, the acting staff member's name, and the time of the action

#### Scenario: Recording a decision replaces any prior value
- **WHEN** a decision is recorded on an order that already has a value in `custom.dr_approval_decision`
- **THEN** the previous value is fully overwritten and no record of the prior decision remains in the metafield

### Requirement: Decision banner for decided orders
WHEN the Dr Approval card renders and `custom.dr_approval_decision` already has a value, the card SHALL display a status banner using the recorded sentence as its text, and SHALL NOT display the Approve/Reject buttons.

#### Scenario: Approved banner styling
- **WHEN** the recorded decision represents an approval
- **THEN** the banner renders with a green/success visual style and shows the recorded sentence

#### Scenario: Rejected banner styling
- **WHEN** the recorded decision represents a rejection
- **THEN** the banner renders with a red/error visual style and shows the recorded sentence

### Requirement: Extensible decision styling
The system SHALL resolve the banner's visual style from the recorded decision text without being limited to exactly the Approve/Reject pair, so that a future decision type can be introduced with its own style without changing this contract.

#### Scenario: Unrecognized decision falls back to a neutral style
- **WHEN** `custom.dr_approval_decision` holds a value whose action is not one of the currently defined styles
- **THEN** the banner still renders the recorded sentence, using a default neutral style rather than failing to render
