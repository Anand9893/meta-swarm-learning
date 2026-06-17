# Feature Specification: Company Management

**Feature Branch**: `004-companies`

**Created**: 2026-06-16

**Status**: Draft

**Input**: Sales CRM — Companies module derived from application spec

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Profile a Company (Priority: P1)

A sales rep is working on a new account. They create a Company record with the organisation's name, website, industry, and address. The record becomes the central hub linking all contacts and deals at that organisation.

**Why this priority**: Companies are the account-level anchor in the CRM; contacts and deals that lack a company link lose organisational context.

**Independent Test**: Create a company with name, website, and industry; open its detail page and confirm all fields are displayed correctly.

**Acceptance Scenarios**:

1. **Given** a logged-in rep, **When** they submit the Company form with at least a company name, **Then** the company is saved and appears in the Companies list.
2. **Given** a company's detail page, **When** the rep opens it, **Then** they see all company fields plus a Contacts tab listing linked contacts and a Deals tab listing linked deals.
3. **Given** the Company form is submitted without a name, **When** the save is attempted, **Then** a validation error is shown and no record is created.

---

### User Story 2 - View All Contacts and Deals for a Company (Priority: P1)

A sales manager is preparing for a key account review. They open the company record and immediately see every contact they know at that organisation and every deal in progress.

**Why this priority**: The company detail page is the "account 360" view — the primary way managers and reps understand the full relationship with an organisation.

**Independent Test**: Link two contacts and one deal to a company, open the company detail page, and verify both contacts appear in the Contacts tab and the deal appears in the Deals tab.

**Acceptance Scenarios**:

1. **Given** contacts linked to a company, **When** the rep opens the Contacts tab on the company detail page, **Then** all linked contacts are listed with name, email, and job title.
2. **Given** deals linked to a company, **When** the rep opens the Deals tab, **Then** all linked deals are listed with title, stage, value, and expected close date.
3. **Given** a company with no contacts or deals yet, **When** the tabs are opened, **Then** an empty-state message is shown in each tab with a prompt to add the first record.

---

### User Story 3 - Search and Filter Companies (Priority: P2)

A rep is looking for all technology companies in their pipeline. They filter the Companies list by industry to surface the relevant accounts.

**Why this priority**: Industry-based segmentation is a common account management pattern; without filtering, finding target accounts in a growing list is inefficient.

**Independent Test**: Create companies in different industries, filter by one industry, and confirm only matching companies are returned.

**Acceptance Scenarios**:

1. **Given** companies with different industries, **When** the rep filters by industry, **Then** only companies with that industry value are shown.
2. **Given** a search term, **When** entered in the search bar, **Then** companies whose name contains the term are returned.
3. **Given** more than 20 companies match, **When** the list loads, **Then** results are paginated at 20 per page.

---

### User Story 4 - Update Company Information (Priority: P2)

A company the team is pursuing is acquired and rebranded. A rep updates the company name, website, and industry to reflect the new entity.

**Why this priority**: Account information changes over time; keeping company records accurate ensures reps aren't working with stale data.

**Independent Test**: Update a company's name and website, save, and verify the new values appear on the list and detail pages and on linked contact/deal records that display the company name.

**Acceptance Scenarios**:

1. **Given** a company owned by the current rep, **When** they update the name and save, **Then** the updated name appears everywhere the company is referenced (list, detail page, linked contact records).
2. **Given** a Rep attempting to edit a company owned by another Rep, **When** the save is submitted, **Then** a permission error is returned and no changes are made.

---

### Edge Cases

- What happens when a company is deleted? Before deletion the system checks for linked contacts and deals; hard deletion is allowed and linked contacts/deals have their `company_id` set to null.
- What if two companies share the same name? No uniqueness constraint on company name in v1; duplicates are allowed.
- What if the website field contains an invalid URL format? The field accepts free text in v1; URL validation is a future enhancement.
- What happens to deals linked to a company when the company is deleted? The deal's `company_id` is set to null; the deal record is retained.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any authenticated user to create a company with a name (required) and optional website, industry, phone, address, and notes.
- **FR-002**: System MUST set `owner_id` to the creating user's ID on every new company record.
- **FR-003**: System MUST display a paginated, searchable list of companies; Reps see only their own, Managers and Admins see all.
- **FR-004**: System MUST support filtering companies by industry and searching by name.
- **FR-005**: System MUST allow the company owner (or Manager/Admin) to update any company field.
- **FR-006**: System MUST display a company detail view with all fields, a Contacts tab, and a Deals tab.
- **FR-007**: System MUST list all contacts with `company_id` matching the company on the Contacts tab.
- **FR-008**: System MUST list all deals with `company_id` matching the company on the Deals tab.
- **FR-009**: System MUST allow deletion of a company; linked contacts and deals must not be deleted (their company_id is set to null).

### Key Entities

- **Company**: An organisation (account) in the CRM; attributes: id, name, website, industry, phone, address, notes, owner_id (FK to Users), created_at, updated_at.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A rep can create a company record in under 60 seconds.
- **SC-002**: Company list with up to 500 records loads in under 2 seconds.
- **SC-003**: Company detail page including contacts and deals tabs loads in under 2 seconds.
- **SC-004**: Search results for a company name term appear within 1 second.
- **SC-005**: Deleting a company does not result in any data loss on linked contacts or deals (FK nullification confirmed by verifying those records still exist after deletion).

---

## Assumptions

- Industry values are free-text in v1; a standardised industry pick-list is a future enhancement.
- A company can have many contacts and many deals (one-to-many in both directions).
- Companies created during Lead Conversion are owned by the rep who performed the conversion.
- There is no parent/subsidiary company hierarchy in v1.
- Company-level revenue, employee count, or firmographic data fields are out of scope for v1.
- All authenticated users can log activities against any deal linked to a company they can read.
