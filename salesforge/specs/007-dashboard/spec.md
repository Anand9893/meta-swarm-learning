# Feature Specification: Dashboard & Analytics

**Feature Branch**: `007-dashboard`

**Created**: 2026-06-16

**Status**: Draft

**Input**: Sales CRM — Dashboard module derived from application spec

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a Pipeline Health Snapshot on Login (Priority: P1)

A sales rep logs in each morning. The Dashboard loads immediately and shows their current pipeline value, leads created this week, deals won this month, and any overdue activities requiring attention — giving them a complete picture of the day ahead without navigating anywhere.

**Why this priority**: The Dashboard is the first screen users see after login; it sets the context for the day and drives daily action. A blank or loading dashboard undermines user trust in the entire product.

**Independent Test**: Seed known data (specific deals, leads, won deals, overdue activities), log in as a rep, and verify each KPI tile shows the exact expected number.

**Acceptance Scenarios**:

1. **Given** a logged-in rep with active deals and leads, **When** the Dashboard loads, **Then** four KPI tiles are visible: "Leads This Week", "Pipeline Value", "Deals Won This Month", and "Overdue Activities".
2. **Given** a rep with 3 leads created in the last 7 days, **When** the Dashboard loads, **Then** the "Leads This Week" tile shows exactly 3.
3. **Given** a rep with $120,000 in active open deals (all stages except Won and Lost), **When** the Dashboard loads, **Then** the "Pipeline Value" tile shows $120,000.
4. **Given** a rep with 2 deals moved to Won this calendar month, **When** the Dashboard loads, **Then** "Deals Won This Month" shows count 2 and their combined value.
5. **Given** a rep with 4 activities that are incomplete and past their due date, **When** the Dashboard loads, **Then** "Overdue Activities" shows exactly 4.

---

### User Story 2 - Understand Pipeline Distribution via Stage Chart (Priority: P1)

A sales manager reviews the team's pipeline. They look at the "Pipeline by Stage" bar chart and immediately see which stages are healthy and which are starved, so they can coach reps accordingly.

**Why this priority**: A flat KPI number for total pipeline value hides stage distribution; the chart makes structural pipeline issues visible at a glance.

**Independent Test**: Create deals in at least three different stages with known values, load the Dashboard, and verify the bar chart shows the correct count and total value for each populated stage.

**Acceptance Scenarios**:

1. **Given** deals across multiple stages, **When** the Dashboard loads, **Then** the bar chart renders a bar for each stage showing both deal count and total value.
2. **Given** a stage with no deals, **When** the chart renders, **Then** that stage bar is shown at zero height (not omitted), so the user can see the gap.
3. **Given** a manager who can see all reps' data, **When** the Dashboard loads, **Then** the chart aggregates deals from all reps on the team.
4. **Given** a rep who can see only their own data, **When** the Dashboard loads, **Then** the chart shows only their deals.

---

### User Story 3 - Review Recent Activity Feed (Priority: P2)

A rep wants to see a quick log of what has been happening across their accounts. The "Recent Activities" section on the Dashboard shows the last 10 activities, providing a rolling history without navigating to the Activities page.

**Why this priority**: The activity feed gives reps situational awareness at a glance; it supplements the KPIs with qualitative context about what actions have been taken recently.

**Independent Test**: Log 12 activities in known order, load the Dashboard, and verify exactly 10 appear in reverse-chronological order.

**Acceptance Scenarios**:

1. **Given** 12 activities logged by the current rep, **When** the Dashboard loads, **Then** the Recent Activities section shows exactly 10, in reverse-chronological order (newest first).
2. **Given** activities of different types (call, email, task), **When** they appear in the feed, **Then** each entry shows the activity type, title, linked record name, and logged timestamp.
3. **Given** a rep with zero activities, **When** the Dashboard loads, **Then** the Recent Activities section shows an empty state message.

---

### User Story 4 - KPIs Refresh After Completing Actions (Priority: P2)

A rep marks a deal as Won and then navigates back to the Dashboard. The "Deals Won This Month" count has updated to reflect the change without a manual refresh.

**Why this priority**: Stale KPIs erode trust; reps need confidence that the numbers they see are current, especially after recording a significant win.

**Independent Test**: Record the initial "Deals Won" count, move a deal to Won stage, navigate to the Dashboard, and verify the count has incremented by 1.

**Acceptance Scenarios**:

1. **Given** a deal moved to Won stage, **When** the rep navigates to the Dashboard, **Then** "Deals Won This Month" reflects the updated count.
2. **Given** a new lead created today, **When** the rep navigates to the Dashboard in the same session, **Then** "Leads This Week" reflects the new count.
3. **Given** an overdue activity that is marked completed, **When** the rep navigates to the Dashboard, **Then** the "Overdue Activities" count decreases by 1.

---

### Edge Cases

- What does "Pipeline Value" include? It includes the `value` sum of all deals NOT in `won` or `lost` stage for the current user's scope.
- What does "Deals Won This Month" measure? Count and value of deals moved to `won` stage where `updated_at` falls within the current calendar month.
- What if a deal has no value set? It contributes 0 to all value aggregations; it is still counted in deal counts.
- What timezone is used for "this week" and "this month"? All timestamps are stored in UTC; "this week" and "this month" are calculated in the server's UTC clock for v1. User-local timezone support is a future enhancement.
- What happens if there are no records of any kind? All KPI tiles show 0 and the chart is empty; no error state is shown.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display four KPI tiles on the Dashboard: Leads This Week, Pipeline Value, Deals Won This Month (count and value), and Overdue Activities count.
- **FR-002**: System MUST calculate "Leads This Week" as the count of leads with `created_at` in the last 7 days, scoped to the current user's visibility.
- **FR-003**: System MUST calculate "Pipeline Value" as the sum of `value` for all deals not in `won` or `lost` stage, scoped to the current user's visibility.
- **FR-004**: System MUST calculate "Deals Won This Month" as the count and sum of `value` for deals in `won` stage where `updated_at` is within the current calendar month.
- **FR-005**: System MUST calculate "Overdue Activities" as the count of activities where `completed = false` and `due_date` is before the current timestamp.
- **FR-006**: System MUST display a "Pipeline by Stage" bar chart showing deal count and total value per stage.
- **FR-007**: System MUST display a "Recent Activities" feed showing the last 10 activities in reverse-chronological order.
- **FR-008**: System MUST scope all Dashboard data to the current user's visibility: Reps see only their own data; Managers and Admins see all team data.
- **FR-009**: System MUST serve all Dashboard data from dedicated aggregation endpoints (not computed client-side from paginated list fetches).
- **FR-010**: Dashboard data MUST be fresh as of the last page navigation (React Query cache invalidation or refetch on mount).

### Key Entities

- **Dashboard Stats**: Aggregated KPIs; attributes: leads_this_week, deals_won_this_month (count), deals_won_value_this_month, pipeline_value, overdue_activities.
- **Pipeline Stage Summary**: Per-stage aggregate; attributes: stage, count, total_value.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard loads and all four KPI tiles are populated in under 2 seconds after login.
- **SC-002**: Pipeline by Stage chart renders within the same 2-second page load budget.
- **SC-003**: KPI values are accurate to within one page navigation; stale data older than one navigation event never appears.
- **SC-004**: All KPI calculations are correct 100% of the time against seeded test data sets (zero calculation errors in QA).
- **SC-005**: The Dashboard remains responsive and usable with up to 1,000 deals and 5,000 activities in the database.
- **SC-006**: 95% of new users can interpret the Dashboard and take an action (navigate to an overdue activity or a pipeline stage) within 60 seconds of first login.

---

## Assumptions

- Dashboard KPIs are read-only; no actions are taken directly from KPI tiles in v1 (clicking a tile does not navigate anywhere).
- "Recent Activities" shows the current user's own activities only (scoped same as activity list).
- The bar chart library (Recharts) is already included in the frontend dependency set.
- Trend indicators (e.g., "up 10% vs last week") are out of scope for v1; only absolute values are shown.
- There is no date range selector on the Dashboard in v1; all time windows are fixed (last 7 days, current calendar month).
- Export or PDF reporting of Dashboard data is out of scope for v1.
- Real-time push updates (WebSocket) are out of scope for v1; data refreshes on page navigation only.
