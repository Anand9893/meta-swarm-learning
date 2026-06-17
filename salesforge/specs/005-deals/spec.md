# Feature Specification: Deal & Pipeline Management

**Feature Branch**: `005-deals`

**Created**: 2026-06-16

**Status**: Draft

**Input**: Sales CRM — Deals module derived from application spec

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Deal and Assign It to the Pipeline (Priority: P1)

A rep has had a qualifying call with a prospect. They create a Deal record with a title, estimated value, linked contact and company, and expected close date. The deal immediately appears in the Deals list and on the Kanban pipeline board in the "Prospect" stage.

**Why this priority**: Deals represent direct revenue; creating them is the act of entering an opportunity into the pipeline and is the most critical single action in the CRM.

**Independent Test**: Create a deal with a title, value, and contact link; confirm it appears in the Deals list with stage "Prospect" and in the Prospect column of the Kanban board.

**Acceptance Scenarios**:

1. **Given** a logged-in rep, **When** they submit the Deal form with a title, **Then** the deal is saved in `prospect` stage with default probability of 10% and `owner_id` set to the current user.
2. **Given** a deal is created, **When** the rep opens the Pipeline board, **Then** the new deal card appears in the "Prospect" column showing the title, value, and linked company.
3. **Given** the Deal form submitted without a title, **When** save is attempted, **Then** a validation error is shown and no record is created.
4. **Given** an optional expected close date provided, **When** the deal is saved, **Then** the date is visible on the deal card and detail page.

---

### User Story 2 - Move a Deal Through the Pipeline (Priority: P1)

A rep's proposal is accepted. They drag the deal card on the Kanban board from "Proposal" to "Negotiation". The deal's stage and probability update automatically, and the pipeline value totals update accordingly.

**Why this priority**: Stage progression is the primary daily interaction with the pipeline; it must be immediate, accurate, and visually clear.

**Independent Test**: Drag a deal from one stage column to another on the Kanban board, confirm the stage badge and probability update, and verify the column totals recalculate.

**Acceptance Scenarios**:

1. **Given** a deal in "Proposal" stage, **When** the rep drags the card to "Negotiation", **Then** the deal's `stage` changes to `negotiation` and `probability` auto-updates to 60%.
2. **Given** a drag-and-drop stage change, **When** the card is dropped, **Then** the board updates optimistically (card moves immediately) before the server confirms the change.
3. **Given** a server error during stage update, **When** the response returns an error, **Then** the card rolls back to its original column and the user is shown an error notification.
4. **Given** a deal moved to "Won" stage, **When** the change is saved, **Then** `probability` is set to 100% and the deal no longer contributes to the active pipeline value (or is shown separately as won).
5. **Given** a deal moved to "Lost" stage, **When** the change is saved, **Then** `probability` is set to 0% and the deal is visually distinguished from active deals.

---

### User Story 3 - Override Probability Manually (Priority: P2)

A rep's deal is in "Proposal" stage (default 30%) but the rep knows from context that it's a near-certain close. They override the probability to 85%.

**Why this priority**: Default probabilities are estimates; reps with relationship context should be able to adjust without being forced into a stage change.

**Independent Test**: Edit a deal in "Proposal" stage, set probability to 85%, save, and verify the deal still shows stage "Proposal" but probability shows 85% (not 30%).

**Acceptance Scenarios**:

1. **Given** a deal in "Proposal" stage, **When** the rep sets probability to 85% and saves, **Then** the deal shows 85% probability while remaining in "Proposal" stage.
2. **Given** a deal with a manually overridden probability, **When** the stage is subsequently changed via drag-and-drop, **Then** the probability resets to the new stage's default value.

---

### User Story 4 - View Pipeline Summary by Stage (Priority: P2)

A sales manager opens the Pipeline page to assess the team's pipeline health. They see total deal count and total value per stage at a glance, and can filter by owner to review individual rep pipelines.

**Why this priority**: Pipeline visibility is the manager's primary tool for forecasting and coaching; without aggregated stage data, individual deal cards alone are insufficient.

**Independent Test**: Create deals in multiple stages with different values, open the Pipeline board, and verify each column header shows the correct deal count and total value.

**Acceptance Scenarios**:

1. **Given** deals in multiple stages, **When** the Pipeline page loads, **Then** each stage column header shows the count and total value of deals in that stage.
2. **Given** a manager filtering by a specific rep's `owner_id`, **When** the filter is applied, **Then** only that rep's deals appear on the board and column totals recalculate accordingly.
3. **Given** an empty stage (no deals), **When** the Pipeline page loads, **Then** the empty stage column is still visible with a count of 0 and value of $0.

---

### Edge Cases

- What happens when a deal is deleted? The deal record is hard-deleted; linked Activities have their `deal_id` set to null.
- What if a deal's value is left blank? Value is optional; deals without a value contribute $0 to pipeline totals.
- What if multiple reps move cards simultaneously on the same deal? Last-write-wins on the server; no concurrent-edit conflict resolution in v1.
- What happens when a Won or Lost deal is edited back to an active stage? The stage change is allowed; the deal re-enters the active pipeline with the default probability of the new stage.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any authenticated user to create a deal with a title (required) and optional value, currency, stage, probability, expected close date, contact link, and company link.
- **FR-002**: System MUST default new deals to `prospect` stage and 10% probability.
- **FR-003**: System MUST auto-set probability to the stage default when stage changes, unless probability is explicitly provided in the same update.
- **FR-004**: System MUST display a paginated, filterable Deals list; Reps see only their own deals, Managers and Admins see all.
- **FR-005**: System MUST provide a Kanban pipeline view with one column per stage, showing deal count and total value per column.
- **FR-006**: System MUST support drag-and-drop stage changes on the Kanban board with optimistic UI updates and rollback on error.
- **FR-007**: System MUST allow filtering deals by stage, owner, and search by title.
- **FR-008**: System MUST allow the deal owner (or Manager/Admin) to update any deal field.
- **FR-009**: System MUST prevent a Rep from editing or deleting a deal owned by another Rep.
- **FR-010**: System MUST display a deal detail view with all fields and a linked Activities timeline.
- **FR-011**: System MUST allow deletion of a deal; linked Activities must not be deleted (their deal_id is set to null).
- **FR-012**: System MUST provide a pipeline summary endpoint returning stage-level count and total value aggregates.

### Key Entities

- **Deal**: A revenue opportunity; attributes: id, title, value (nullable), currency (default USD), stage (prospect/proposal/negotiation/won/lost), probability (0–100), expected_close_date (nullable), contact_id (nullable FK), company_id (nullable FK), owner_id (FK to Users), created_at, updated_at.
- **Pipeline Stage**: One of five fixed stages with default probabilities: Prospect (10%), Proposal (30%), Negotiation (60%), Won (100%), Lost (0%).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A rep can create a deal and have it appear on the Pipeline board in under 60 seconds.
- **SC-002**: Pipeline board with up to 100 active deals across all stages loads and renders in under 2 seconds.
- **SC-003**: Drag-and-drop stage change is confirmed (card settled in new column, server updated) in under 1 second on a normal connection.
- **SC-004**: Column totals are always accurate within one page refresh; stale totals never persist longer than 5 seconds after a stage change.
- **SC-005**: Probability auto-update on stage change is correct 100% of the time across all stage transitions.
- **SC-006**: Deals list with filtering and search returns results in under 1 second for datasets up to 1,000 deals.

---

## Assumptions

- Currency support in v1 is display-only (default USD); multi-currency conversion is out of scope.
- The five pipeline stages are fixed; custom stages are a future enhancement.
- Deal probability is an integer percentage (0–100); fractional probabilities are not supported.
- Automated deal scoring or AI-assisted probability suggestions are out of scope for v1.
- No deal-level approval workflow; any authorised user can move a deal to Won or Lost.
- Deals created via Lead Conversion default to `prospect` stage and are owned by the rep who performed the conversion.
