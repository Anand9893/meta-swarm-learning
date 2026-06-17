# Feature Specification: Activity Tracking

**Feature Branch**: `006-activities`

**Created**: 2026-06-16

**Status**: Draft

**Input**: Sales CRM — Activities module derived from application spec

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log an Activity Against a Record (Priority: P1)

After a phone call with a prospect, a sales rep logs a "Call" activity against the linked Deal, recording what was discussed and when a follow-up is due. The activity appears immediately in the deal's timeline and the global Activities feed.

**Why this priority**: Activity logging is the core mechanism for capturing relationship history; without it the CRM is just a contact directory with no context.

**Independent Test**: From a Deal detail page, log a Call activity with a title, description, and due date; verify the activity appears in the deal's Activities tab and in the global Activities list.

**Acceptance Scenarios**:

1. **Given** a logged-in rep on any detail page (Lead, Contact, or Deal), **When** they click "Log Activity" and submit the form with a type, title, and due date, **Then** the activity is saved and the timeline on the detail page refreshes to show it.
2. **Given** an activity is logged against a Deal, **When** the rep opens the global Activities page, **Then** the new activity appears there as well.
3. **Given** the Activity form submitted without a title, **When** save is attempted, **Then** a validation error is shown and no record is created.
4. **Given** the Activity form opened from a Deal detail page, **When** the modal appears, **Then** the `deal_id` is pre-filled; the rep does not need to select the parent record manually.

---

### User Story 2 - Mark an Activity as Completed (Priority: P1)

A rep has sent the proposal email they had planned. They open the activity and mark it "Completed". The activity's status updates and it is no longer counted as overdue.

**Why this priority**: Completion tracking distinguishes done work from pending work; overdue activities on the Dashboard depend on this status being accurate.

**Independent Test**: Create an activity with a past due date, mark it completed, and verify it is no longer counted in the Dashboard's "Overdue Activities" metric.

**Acceptance Scenarios**:

1. **Given** an incomplete activity, **When** the rep toggles it to "Completed", **Then** `completed = true` is persisted and the activity is visually distinguished from open activities.
2. **Given** a completed activity, **When** it is re-opened (toggled back), **Then** `completed` is set to false and it re-enters the open activities count.
3. **Given** an activity with a past due date and `completed = false`, **When** the Dashboard loads, **Then** this activity is counted in the "Overdue Activities" metric.
4. **Given** an activity is marked completed, **When** the Dashboard loads next, **Then** it is no longer included in the overdue count.

---

### User Story 3 - Filter and Search the Global Activities List (Priority: P2)

A manager reviews all upcoming tasks across the team. They filter the Activities list by type (Task) and completion status (Incomplete) to see what still needs to be done.

**Why this priority**: The global Activities feed becomes noisy quickly; targeted filtering is necessary for team oversight and individual daily planning.

**Independent Test**: Create activities of different types and completion states; filter by type "Task" and status "Incomplete", and confirm only matching activities are shown.

**Acceptance Scenarios**:

1. **Given** activities of mixed types and statuses, **When** the rep filters by type "Call" and status "Incomplete", **Then** only incomplete Call activities are shown.
2. **Given** activities linked to different parent records (deals, contacts, leads), **When** the rep filters by `deal_id`, **Then** only activities linked to that deal appear.
3. **Given** more than 20 activities match the filter, **When** the list loads, **Then** results are paginated at 20 per page.

---

### User Story 4 - View Linked Activities on a Parent Record (Priority: P2)

A rep is preparing for a meeting with a contact they haven't spoken to in two months. They open the Contact detail page and browse the Activities tab to recall past conversations and identify any open tasks.

**Why this priority**: Contextual activity history on parent records is the main value of logging activities; browsing a flat global list is a secondary use case.

**Independent Test**: Log two activities against a Contact and one against a different Contact; open the first Contact's detail page and verify only the two relevant activities appear in the Activities tab.

**Acceptance Scenarios**:

1. **Given** activities linked to Contact A and Contact B, **When** the rep opens Contact A's Activities tab, **Then** only activities with `contact_id = A` are shown.
2. **Given** activities in the Activities tab, **When** they are sorted, **Then** incomplete activities with the nearest due date appear at the top; completed activities appear below.
3. **Given** the Activities tab is open, **When** the rep clicks an activity's "Complete" toggle, **Then** the toggle updates immediately without a full page reload.

---

### Edge Cases

- What happens when an activity's parent record (Deal, Contact, or Lead) is deleted? The activity's corresponding FK (`deal_id`, `contact_id`, `lead_id`) is set to null; the activity itself is retained.
- What if a due date is not provided? Due date is optional; activities without a due date are never counted as overdue.
- Can an activity be linked to more than one parent simultaneously? Yes — an activity may have `deal_id`, `contact_id`, and `lead_id` set at the same time (all are nullable FKs, not mutually exclusive).
- What happens when an activity is deleted? The activity is hard-deleted; no cascade effects on parent records.
- Can activities be logged against records the rep does not own? Yes — any authenticated user can log an activity against any record they can read, regardless of ownership.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any authenticated user to create an activity with type (call/email/meeting/task), title (required), optional description, optional due date, and optional links to a deal, contact, and/or lead.
- **FR-002**: System MUST set `owner_id` to the creating user's ID on every new activity.
- **FR-003**: System MUST default new activities to `completed = false`.
- **FR-004**: System MUST allow any authenticated user to toggle `completed` on any activity they can read.
- **FR-005**: System MUST display a paginated, filterable global Activities list; Reps see only their own activities, Managers and Admins see all.
- **FR-006**: System MUST support filtering activities by type, completion status, deal_id, contact_id, and lead_id.
- **FR-007**: System MUST display a contextual Activities timeline on Lead, Contact, and Deal detail pages showing only activities linked to that record.
- **FR-008**: System MUST pre-fill the parent record's ID when the Activity form is opened from a detail page.
- **FR-009**: System MUST allow the activity owner (or Manager/Admin) to update or delete any activity.
- **FR-010**: System MUST set the relevant FK to null (not delete the activity) when a parent record is deleted.
- **FR-011**: System MUST count activities as overdue when `completed = false` and `due_date` is in the past; expose this count for the Dashboard.

### Key Entities

- **Activity**: A logged sales interaction or task; attributes: id, type (call/email/meeting/task), title, description (nullable), due_date (nullable), completed (boolean, default false), deal_id (nullable FK), contact_id (nullable FK), lead_id (nullable FK), owner_id (FK to Users), created_at, updated_at.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A rep can log an activity from any detail page in under 30 seconds.
- **SC-002**: Activity completion toggle updates and persists in under 500 milliseconds with immediate visual feedback.
- **SC-003**: Global Activities list with up to 500 records loads in under 2 seconds.
- **SC-004**: Overdue activity count on the Dashboard is accurate within one page refresh after a completion toggle.
- **SC-005**: Activity timeline on a detail page loads in under 1 second for records with up to 50 linked activities.
- **SC-006**: 95% of reps can log and complete an activity without consulting documentation on first use.

---

## Assumptions

- Activities are single-occurrence; recurring or scheduled activity series are out of scope for v1.
- Email or calendar integration (syncing activities from Gmail/Outlook) is out of scope for v1.
- There is no activity-level reminder or notification system in v1.
- Overdue is defined solely as: `completed = false` AND `due_date < current timestamp`.
- The activity type pick-list (call, email, meeting, task) is fixed in v1; custom types are a future enhancement.
- Activities are never automatically created by the system; all entries are manually logged by users.
