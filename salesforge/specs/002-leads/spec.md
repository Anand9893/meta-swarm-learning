# Feature Specification: Lead Management

**Feature Branch**: `002-leads`

**Created**: 2026-06-16

**Status**: Draft

**Input**: Sales CRM — Leads module derived from application spec

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture a New Lead (Priority: P1)

A sales rep receives an inbound enquiry. They open the CRM and create a new lead record with the prospect's name, email, phone, company, and how the lead was sourced. The lead is saved and immediately visible in the Leads list.

**Why this priority**: Lead capture is the entry point of the entire sales funnel. Without it, no downstream pipeline activity is possible.

**Independent Test**: Create a new lead via the "New Lead" form, submit it, and confirm the lead appears in the Leads list with status "New" assigned to the current rep.

**Acceptance Scenarios**:

1. **Given** a logged-in rep, **When** they submit the New Lead form with first name, last name, and at least one contact field, **Then** the lead is saved with status `new` and owner set to the current user.
2. **Given** the lead form is submitted with first name or last name missing, **When** the user tries to save, **Then** a validation error is shown and no record is created.
3. **Given** a saved lead, **When** the rep returns to the Leads list, **Then** the new lead appears at the top (sorted by created date descending) with correct name, status badge, and source.

---

### User Story 2 - Manage and Update Lead Status (Priority: P1)

A rep follows up with a lead. They update the lead's status through the lifecycle (New → Contacted → Qualified) and add notes from the conversation. A manager can see all reps' leads filtered by status.

**Why this priority**: Status tracking is how the team distinguishes hot prospects from cold ones and measures pipeline health.

**Independent Test**: Open an existing lead, change status from "New" to "Contacted", add notes, save, and confirm the status badge and notes reflect the change on the list and detail pages.

**Acceptance Scenarios**:

1. **Given** a lead in `new` status, **When** the rep changes status to `contacted` and saves, **Then** the lead shows the updated status in the list and detail view.
2. **Given** a manager logged in, **When** they filter the Leads list by `status=qualified`, **Then** they see leads from all reps that match, not just their own.
3. **Given** a rep logged in, **When** they attempt to edit a lead owned by another rep, **Then** the edit is rejected with a permission error.
4. **Given** a lead with notes, **When** the rep updates the notes field, **Then** the updated content is persisted and the old content is replaced.

---

### User Story 3 - Convert a Qualified Lead (Priority: P1)

A rep has qualified a lead and wants to move them into the active pipeline. They trigger the Convert Lead action, which atomically creates a Contact (and optionally a Company and Deal), marks the lead as `converted`, and redirects the rep to the new Contact's page.

**Why this priority**: Lead conversion is the bridge between lead capture and pipeline management — the core CRM workflow.

**Independent Test**: Open a qualified lead, click Convert, confirm Contact, Company, and Deal creation checkboxes, submit, and verify all three records are created and the lead status is `converted`.

**Acceptance Scenarios**:

1. **Given** a lead in any status, **When** the rep clicks Convert and confirms, **Then** a Contact is always created from the lead's name, email, and phone.
2. **Given** the "Create Company" toggle is on in the convert modal, **When** the conversion is submitted, **Then** a Company record is created using the lead's `company_name` and linked to the new Contact.
3. **Given** the "Create Deal" toggle is on with a title and value provided, **When** the conversion is submitted, **Then** a Deal is created in `prospect` stage and linked to the new Contact (and Company if created).
4. **Given** conversion succeeds, **When** the rep is redirected, **Then** they land on the new Contact detail page and the original lead record still exists with `status = converted`.
5. **Given** a partial failure during conversion (e.g., company creation fails), **When** the error occurs, **Then** none of the records are created (atomic rollback) and the lead status remains unchanged.

---

### User Story 4 - Search and Filter the Leads List (Priority: P2)

A sales manager wants to review all uncontacted leads in the pipeline. They filter by status and search by company name to quickly focus on the relevant subset.

**Why this priority**: With dozens or hundreds of leads, a flat unfiltered list is unusable; search and filter are required for day-to-day navigation.

**Independent Test**: Create leads with different statuses, apply a status filter, and confirm only matching leads are shown. Run a search by partial company name and confirm matching results.

**Acceptance Scenarios**:

1. **Given** multiple leads with different statuses, **When** the rep selects "Qualified" in the status filter, **Then** only leads with `status = qualified` are shown.
2. **Given** a search term entered in the search bar, **When** the query is submitted, **Then** leads whose name or email contains the search term are returned.
3. **Given** a filtered list, **When** the rep clears the filter, **Then** all leads (within their ownership scope) are shown again.
4. **Given** more than 20 leads match a filter, **When** the list loads, **Then** results are paginated with 20 per page and navigation controls are visible.

---

### Edge Cases

- What happens when Convert Lead is clicked on a lead already in `converted` status? The Convert button is hidden or disabled for converted leads; conversion cannot be repeated.
- What if the email field is left blank on a lead? Email is optional; the lead is saved without it.
- What if a lead's `company_name` is blank when Convert is triggered with "Create Company" checked? The Company creation is skipped and the user is warned; the Contact and Deal are still created.
- What happens when a lead is deleted? The lead record is hard-deleted; any Activities linked to it have their `lead_id` set to null (nullable FK).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any authenticated user to create a lead with first name, last name, and optional email, phone, company name, source, and notes.
- **FR-002**: System MUST set `owner_id` to the creating user's ID and `status = new` on every new lead.
- **FR-003**: System MUST display a paginated, filterable list of leads; Reps see only their own leads, Managers and Admins see all.
- **FR-004**: System MUST support filtering leads by status and searching by name or email.
- **FR-005**: System MUST allow the lead owner (or Manager/Admin) to update any lead field including status.
- **FR-006**: System MUST support lead status transitions: new → contacted → qualified → converted / lost.
- **FR-007**: System MUST provide a Convert Lead action that atomically creates a Contact and optionally a Company and Deal.
- **FR-008**: System MUST mark the lead `status = converted` only after all selected conversion records are successfully created.
- **FR-009**: System MUST retain the original lead record after conversion (soft outcome, not deleted).
- **FR-010**: System MUST prevent a converted lead from being converted again.
- **FR-011**: System MUST display a lead's full detail view including all fields, status history badge, and linked Activities timeline.
- **FR-012**: System MUST allow deletion of a lead; linked activities must not be deleted (their lead_id is set to null).

### Key Entities

- **Lead**: A raw, unqualified prospect; attributes: id, first_name, last_name, email, phone, company_name, status (new/contacted/qualified/converted/lost), source, notes, owner_id, created_at, updated_at.
- **Lead Conversion Result**: The output of a Convert action; references newly created Contact, Company (nullable), Deal (nullable).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A rep can capture a new lead in under 60 seconds from clicking "New Lead" to the record appearing in the list.
- **SC-002**: Lead list with up to 500 records loads and renders in under 2 seconds.
- **SC-003**: Convert Lead action (creating Contact + Company + Deal) completes in under 3 seconds.
- **SC-004**: Search results for a name or email term appear within 1 second of submitting the query.
- **SC-005**: Zero data-loss incidents during lead conversion: either all selected records are created or none are (atomic guarantee).
- **SC-006**: 90% of reps can complete the Convert Lead flow without assistance on first use.

---

## Assumptions

- Lead source values (web, referral, cold-call, etc.) are free-text strings in v1; a managed pick-list is a future enhancement.
- Bulk lead import (CSV upload) is out of scope for v1.
- There is no duplicate-detection logic on lead email in v1; two leads with the same email can coexist.
- The lead status field is the only workflow state; no configurable pipeline stages exist for leads.
- Activities linked to a converted lead remain associated with that lead record (they are not migrated to the new Contact or Deal automatically).
- All authenticated users can log activities against any lead they can read, regardless of ownership.
