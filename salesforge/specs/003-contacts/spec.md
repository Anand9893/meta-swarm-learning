# Feature Specification: Contact Management

**Feature Branch**: `003-contacts`

**Created**: 2026-06-16

**Status**: Draft

**Input**: Sales CRM — Contacts module derived from application spec

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and View a Contact (Priority: P1)

A sales rep receives a business card at a conference. They manually add the person as a Contact in the CRM, linking them to an existing Company. The contact is immediately searchable and visible to the team.

**Why this priority**: Contacts are the central entity that Deals and Activities revolve around; every other relationship depends on contacts existing.

**Independent Test**: Create a contact with a name, email, and company link; verify the record appears in the Contacts list and can be opened to see all fields.

**Acceptance Scenarios**:

1. **Given** a logged-in rep, **When** they submit the Contact form with first and last name, **Then** the contact is saved and appears in the Contacts list.
2. **Given** an existing Company record, **When** the rep selects it during contact creation, **Then** the contact is linked to that company and appears in the company's detail view.
3. **Given** a contact without a company, **When** it is saved, **Then** `company_id` is null and the contact appears in the list without a company link.
4. **Given** a contact's detail page, **When** the rep opens it, **Then** they see all contact fields plus a linked Deals list and an Activities timeline.

---

### User Story 2 - Edit and Update Contact Details (Priority: P1)

Over time a contact changes roles or companies. A rep updates the contact's job title, company link, and phone number to keep the record current.

**Why this priority**: Stale contact data leads to missed connections; updates must be straightforward and immediately reflected everywhere the contact is referenced.

**Independent Test**: Edit an existing contact's title and company link, save, and verify the updated values appear on the list and detail pages and in the parent company's contacts tab.

**Acceptance Scenarios**:

1. **Given** a contact owned by the current rep, **When** they update the job title and save, **Then** the updated title is shown in the list and detail views.
2. **Given** a contact linked to Company A, **When** the rep changes the company link to Company B, **Then** the contact no longer appears under Company A and now appears under Company B.
3. **Given** a Rep attempting to edit a contact owned by another Rep, **When** the save is submitted, **Then** a permission error is returned and no changes are made.

---

### User Story 3 - Search and Filter Contacts (Priority: P2)

A manager wants to find all contacts belonging to a specific company. They use the company filter and search bar to narrow the list quickly.

**Why this priority**: With hundreds of contacts, unfiltered browsing is impractical; company-scoped search is the most common navigation pattern in a CRM.

**Independent Test**: Create contacts linked to two different companies; filter by one company, and confirm only that company's contacts appear.

**Acceptance Scenarios**:

1. **Given** contacts linked to multiple companies, **When** the rep filters by a specific company, **Then** only contacts with that `company_id` are shown.
2. **Given** a search term, **When** entered in the search bar, **Then** contacts matching the name or email are returned within 1 second.
3. **Given** more than 20 contacts match the current filter, **When** the list loads, **Then** results are paginated at 20 per page with visible navigation controls.

---

### User Story 4 - View Contact Activity Timeline (Priority: P2)

A rep prepares for a call with a contact. They open the contact's detail page and review the full history of activities (calls, emails, meetings) linked to that contact to understand the relationship context.

**Why this priority**: The activity timeline turns a contact from a static record into a relationship history — critical for informed sales conversations.

**Independent Test**: Log three activities against a contact (one call, one email, one task), open the contact detail page, and verify all three appear in the timeline in reverse-chronological order.

**Acceptance Scenarios**:

1. **Given** multiple activities linked to a contact, **When** the rep opens the Activities tab on the contact detail page, **Then** all linked activities are shown in reverse-chronological order.
2. **Given** a contact with no activities, **When** the Activities tab is opened, **Then** an empty-state message is shown with a prompt to log the first activity.
3. **Given** the contact detail page, **When** the rep clicks "Log Activity", **Then** the Activity form modal opens pre-filled with the contact's ID.

---

### Edge Cases

- What happens when a contact's company is deleted? The contact's `company_id` is set to null; the contact record is retained.
- What if a contact has the same email as another contact? No uniqueness constraint on contact email in v1; duplicates are allowed (no deduplication logic).
- What happens when a contact is deleted? The contact record is hard-deleted; linked Activities have their `contact_id` set to null, and linked Deals have their `contact_id` set to null.
- What if a contact has no email and no phone? Both fields are optional; the contact is still valid with just a name.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any authenticated user to create a contact with first name, last name, and optional email, phone, job title, and company link.
- **FR-002**: System MUST set `owner_id` to the creating user's ID on every new contact.
- **FR-003**: System MUST display a paginated, searchable list of contacts; Reps see only their own contacts, Managers and Admins see all.
- **FR-004**: System MUST support filtering contacts by company and searching by name or email.
- **FR-005**: System MUST allow the contact owner (or Manager/Admin) to update any contact field.
- **FR-006**: System MUST display a contact's detail view with all fields, linked Deals list, and Activities timeline.
- **FR-007**: System MUST allow linking a contact to a Company (nullable; one company per contact).
- **FR-008**: System MUST update the parent Company's contacts list immediately when a contact's company link changes.
- **FR-009**: System MUST allow deletion of a contact; linked Activities and Deals must not be deleted (their contact_id is set to null).
- **FR-010**: System MUST allow any authenticated user to log an activity against a contact they can read.

### Key Entities

- **Contact**: An individual person in the CRM; attributes: id, first_name, last_name, email, phone, title (job title), company_id (nullable FK to Companies), owner_id (FK to Users), created_at, updated_at.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A rep can create a contact and link it to a company in under 60 seconds.
- **SC-002**: Contact list with up to 1,000 records loads and renders in under 2 seconds.
- **SC-003**: Search results for name or email appear within 1 second.
- **SC-004**: Contact detail page including activity timeline loads in under 2 seconds even with 50 linked activities.
- **SC-005**: Company link update is reflected in both the contact and company views within a single page refresh.

---

## Assumptions

- A contact belongs to at most one company at a time (no many-to-many company associations in v1).
- Contact deduplication (merge duplicates) is out of scope for v1.
- Contacts created via Lead Conversion are owned by the rep who performed the conversion.
- No contact-level permissions beyond the standard owner/manager/admin model.
- Profile photos or social links for contacts are out of scope for v1.
- All authenticated users can read any contact they have permission to see, and log activities against it, regardless of ownership.
