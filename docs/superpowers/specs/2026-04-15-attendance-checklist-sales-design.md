# Design: Barista Attendance, Checklists, Daily Sales Report

**Date:** 2026-04-15  
**Status:** Approved

---

## Overview

Three barista-facing features added to the web staff dashboard:
1. **Attendance** — barista self-check-in
2. **Checklists** — opening/closing shift checklists
3. **Daily Sales Report** — barista shift submission form

All three are visible to baristas in the nav under Operations. Owners already see the resulting data in HR Records and Shifts pages.

---

## Feature 1: Attendance (`/staff/attendance`)

### Purpose
Allow baristas to clock in at the start of their shift. Feeds into the existing HR attendance records so owners can track punctuality.

### Backend
- No new model needed. Uses existing `HRRecord` with `recordType: attendance`.
- New endpoint: `POST /api/hr/attendance/checkin` — creates an HR record for today with `arrivalTime = now()`, auto-calculates `latenessCategory` based on shift type (AM shift starts 8:00, PM shift starts 14:00).
- Existing `GET /api/hr?recordType=attendance&staffMember=<id>` for history.

### Frontend — `AttendancePage.jsx`
- **Check-in card**: Shows today's date + shift. Big "Check In" button. Disabled after check-in; shows "Checked in at HH:MM" with lateness badge (On Time / Minor / Moderate / Severe).
- **History table**: Last 30 days of attendance records for the logged-in barista. Columns: Date, Shift, Time, Status.
- Owner sees a read-only version of all staff attendance in HR Records (already exists).

### Auth
- Baristas see only their own records. Owner can see all (handled by existing HR page).

---

## Feature 2: Checklists (`/staff/checklist`)

### Purpose
Baristas complete a standard opening or closing checklist each shift. Owner can verify compliance.

### Backend — New model `ChecklistCompletion`

```prisma
model ChecklistCompletion {
  id          String    @id @default(cuid())
  date        DateTime  @db.Date
  shiftType   String    // am, pm
  checklistType String  // opening, closing
  completedBy String    // user id
  items       Json      // { "espresso_machine": true, "fridge_temp": true, ... }
  submittedAt DateTime  @default(now())

  @@unique([date, shiftType, checklistType, completedBy])
  @@map("checklist_completions")
}
```

New routes:
- `POST /api/checklist` — save/upsert a completion
- `GET /api/checklist?date=&shiftType=&checklistType=` — fetch completion for a given slot
- `GET /api/checklist/history?staffMember=&limit=` — history for a barista

### Checklist Items (hardcoded, same for both shifts)

**Opening (9 items):**
1. Espresso machine warmed up and flushed
2. Grinder dialled in (test shot pulled)
3. Fridge temperature checked (≤ 4°C)
4. Milk stock counted and restocked if needed
5. Pastries/food display stocked
6. POS system on and float counted
7. Cleaning supplies stocked
8. Bar area wiped and organised
9. Opening announcement posted (if any)

**Closing (8 items):**
1. Espresso machine backflushed and wiped
2. Grinder cleaned and covered
3. Milk and perishables refrigerated/discarded
4. Cash counted and bagged
5. POS closed and daily report submitted
6. Bar and counter wiped down
7. Floor swept/mopped
8. Doors locked and lights off

### Frontend — `ChecklistPage.jsx`
- Two tabs: **Opening** / **Closing**
- Each item is a toggleable checkbox card
- "Submit Checklist" button at bottom — posts to backend
- After submission: read-only view with green checkmarks + timestamp
- If already submitted today: shows completion summary
- Owner-only: small "View compliance" link on Overview shows a table of dates × checklists completed/missed (read-only, from existing HR page or a new simple summary endpoint)

---

## Feature 3: Daily Sales Report (`/staff/my-shift`)

### Purpose
Baristas submit end-of-shift numbers (sales, drinks, issues). Uses the existing `Shift` model — no new DB changes needed.

### Backend
- `GET /api/shifts/date/:date` — already exists; returns shift for a date (or null)
- `POST /api/shifts` — already exists; creates a shift (for start of day)
- `PUT /api/shifts/:id` — already exists; updates shift fields + sets status to `submitted`

No new endpoints needed.

### Frontend — `MyShiftPage.jsx`

**Step 1 — Start Shift (if no shift exists for today)**
- Button: "Start My Shift" → POST /api/shifts with `{ date: today, shiftType: user.role === 'barista_am' ? 'am' : 'pm', openingFloat: <input> }`
- Simple modal: just asks for opening float amount

**Step 2 — Fill Report (shift exists, status = in_progress)**
Form sections:
- **Sales**: Cash Sales (NPR), Digital Sales (NPR), Closing Cash (NPR)
- **Operations**: Drinks Served (number), Most Popular Drink (text), Pastries Sold (number)
- **Issues**: Equipment Issue toggle → if yes, text area for notes; Complaint toggle → text area
- **Notes**: Free-text shift notes

Submit → `PUT /api/shifts/:id` with all fields + `status: 'submitted'`

**Step 3 — Submitted (read-only)**
- Shows submitted report as a summary card
- "Report submitted at HH:MM" green banner
- Barista cannot re-edit after submission (owner can from Shifts page)

---

## Navigation Changes

Add to `DashboardLayout.jsx` under Operations section (visible to all roles):
- Attendance → `/staff/attendance`
- Checklist → `/staff/checklist`
- My Shift → `/staff/my-shift`

Add to `App.jsx`:
```jsx
<Route path="attendance" element={<AttendancePage />} />
<Route path="checklist"  element={<ChecklistPage />} />
<Route path="my-shift"   element={<MyShiftPage />} />
```

---

## API Changes Summary

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/hr/attendance/checkin` | New — auto-calc lateness |
| POST | `/api/checklist` | New |
| GET  | `/api/checklist` | New |
| GET  | `/api/checklist/history` | New |

All others reuse existing endpoints.

---

## Prisma Migration

Add `ChecklistCompletion` model → run `prisma db push` on Railway.

---

## Scope Boundaries

- Checklist items are hardcoded (no owner-configurable checklist builder in this phase)
- Barista cannot edit a submitted shift report (owner can)
- Attendance check-in is one-per-day per user (duplicate check on backend)
- No push notifications or reminders in this phase
