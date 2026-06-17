# Feature Specification: Authentication & User Management

**Feature Branch**: `001-auth`

**Created**: 2026-06-16

**Status**: Draft

**Input**: Sales CRM — Authentication module derived from application spec

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Log In (Priority: P1)

A new team member is added to the CRM. They register with their email and password, then log in to access the application. On subsequent visits their session is maintained without re-entering credentials until their token expires.

**Why this priority**: Without authentication no part of the CRM is accessible. This is the foundational gate for the entire application.

**Independent Test**: Register a new user, log in with those credentials, confirm the dashboard loads, then verify the session token is present and valid.

**Acceptance Scenarios**:

1. **Given** a valid email and password, **When** the user registers, **Then** an account is created and the user is taken to the login screen.
2. **Given** an already-registered email, **When** the user attempts to register again, **Then** a "email already in use" error is shown and no duplicate account is created.
3. **Given** valid credentials, **When** the user logs in, **Then** an access token and refresh token are issued and the user lands on the Dashboard.
4. **Given** incorrect credentials, **When** the user attempts to log in, **Then** a generic "invalid email or password" message is shown; no details about which field is wrong are revealed.

---

### User Story 2 - Stay Logged In Across Browser Sessions (Priority: P2)

A sales rep closes their browser and reopens the CRM the next day. They expect to be taken directly to the Dashboard without logging in again, provided their session has not expired.

**Why this priority**: Forcing re-login on every browser open degrades daily usability for sales teams who work across multiple sessions.

**Independent Test**: Log in, close and reopen the browser, confirm the user lands on the Dashboard rather than the login page within the 7-day refresh token window.

**Acceptance Scenarios**:

1. **Given** a valid refresh token stored from a previous session, **When** the access token expires and the user makes a request, **Then** the system automatically issues a new access token without interrupting the user.
2. **Given** a refresh token older than 7 days, **When** the user opens the CRM, **Then** they are redirected to the login page and must re-authenticate.
3. **Given** a logged-in user who clicks Logout, **When** logout is confirmed, **Then** the refresh token is revoked on the server and the user cannot use it to obtain a new access token.

---

### User Story 3 - Reset a Forgotten Password (Priority: P3)

A sales rep cannot remember their password. They use the "Forgot password?" flow to receive a reset link, set a new password, and regain access.

**Why this priority**: Recoverable accounts reduce admin burden and avoid locked-out reps during critical sales moments.

**Independent Test**: Trigger the forgot-password flow, copy the reset URL from the server log, set a new password, log in with the new password, and confirm login with the old password fails.

**Acceptance Scenarios**:

1. **Given** a registered email address, **When** the user submits the forgot-password form, **Then** a reset link is logged to the server console and a neutral confirmation message is shown (regardless of whether the email is registered).
2. **Given** a valid, unused reset token, **When** the user sets a new password, **Then** the password is updated and the user is redirected to the login page with a success message.
3. **Given** an already-used or expired reset token, **When** the user submits the reset form, **Then** a "link invalid or expired" error is shown and the password is not changed.
4. **Given** a reset token that is more than 1 hour old, **When** the user attempts to use it, **Then** the system rejects it as expired.

---

### User Story 4 - Role-Based Access Control (Priority: P2)

An Admin user manages the team by assigning roles (Admin, Manager, Rep). Each role sees only the data and actions appropriate to their level.

**Why this priority**: Data ownership and permission boundaries are core CRM requirements; without them reps can accidentally modify other reps' records.

**Independent Test**: Log in as a Rep, attempt to access another rep's record directly by URL, and confirm a 403 is returned.

**Acceptance Scenarios**:

1. **Given** a Sales Rep user, **When** they access the CRM, **Then** they can create, read, update, and delete only their own records.
2. **Given** a Sales Manager user, **When** they browse the CRM, **Then** they can view and edit records owned by any rep on the team.
3. **Given** an Admin user, **When** they access user management, **Then** they can create new users, deactivate accounts, and change role assignments.
4. **Given** a deactivated user account, **When** that user's token is used in a request, **Then** the system returns a 401 and the session is invalidated.

---

### Edge Cases

- What happens when a user registers with a password shorter than the minimum length? The form shows a validation error before submission; no request is sent to the server.
- What if the reset link is opened on a different device or browser? The token is device-agnostic; it works from any browser within the 1-hour window.
- What happens if two password reset requests are submitted for the same email in quick succession? The first token remains valid; a second token is created and the older one can still be used until it expires or is used.
- What if the access token is present but the user has been deactivated mid-session? The next authenticated request returns 401 and the client clears the session and redirects to login.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow new users to register with a full name, email address, and password.
- **FR-002**: System MUST reject registration attempts where the email is already associated with an existing account.
- **FR-003**: System MUST issue a short-lived access token (30-minute expiry) and a long-lived refresh token (7-day expiry) on successful login.
- **FR-004**: System MUST store refresh tokens in a revocable store so that logout immediately invalidates the session server-side.
- **FR-005**: System MUST automatically renew the access token using the refresh token without user intervention, until the refresh token expires.
- **FR-006**: System MUST enforce role-based access: Admin sees everything; Manager sees all records; Rep sees only owned records.
- **FR-007**: System MUST return a 403 when a Rep attempts to modify a record owned by another user.
- **FR-008**: System MUST provide a password-reset flow: user submits email → system generates a single-use, 1-hour token → token is delivered (logged to console in dev) → user sets new password.
- **FR-009**: System MUST invalidate a password-reset token immediately after it is used successfully.
- **FR-010**: System MUST return a 401 for any request made with an access token belonging to a deactivated user.
- **FR-011**: System MUST never reveal whether a given email is registered when responding to the forgot-password request.
- **FR-012**: System MUST support Admin users deactivating other accounts without deleting them.

### Key Entities

- **User**: An authenticated team member; attributes: id, email, full name, hashed password, role (admin/manager/rep), is_active, created_at.
- **Refresh Token**: A long-lived credential stored server-side; attributes: id, user_id, token hash (SHA-256), expires_at, revoked.
- **Password Reset Token**: A single-use credential; attributes: id, user_id, token hash, expires_at, used.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Login flow completes and lands the user on the Dashboard in under 2 seconds under normal load.
- **SC-002**: Token refresh happens transparently — users experience zero interruption during an active session within the 7-day window.
- **SC-003**: 100% of requests from deactivated users are rejected within one request cycle (no grace period).
- **SC-004**: Password reset flow is completable end-to-end in under 3 minutes by a first-time user.
- **SC-005**: Role enforcement catches unauthorised record access in 100% of tested scenarios (Rep cannot access other Reps' records).
- **SC-006**: No registration or login response reveals information that can be used to enumerate valid email addresses.

---

## Assumptions

- Email delivery infrastructure is out of scope for v1; reset links are logged to the server console.
- All users belong to a single organisation (no multi-tenancy).
- Password minimum length is 6 characters; complexity rules (uppercase, special chars) are out of scope for v1.
- Role assignment at registration defaults to "rep"; only an Admin can change roles after registration.
- Sessions are not device-limited; a user may be logged in on multiple devices simultaneously.
- The Admin role is seeded or created by a direct database operation for the very first user; no self-service Admin sign-up exists.
