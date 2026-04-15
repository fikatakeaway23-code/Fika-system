# Barista Attendance, Checklists & Daily Sales Report — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three barista-facing pages — Attendance check-in, Opening/Closing Checklists, and My Shift daily sales report — to the Fika web staff dashboard.

**Architecture:** Backend adds two new route groups (`/api/attendance`, `/api/checklist`) plus one new Prisma model (`ChecklistCompletion`). The three existing endpoints for shifts (`POST /api/shifts`, `PUT /api/shifts/:id`, `POST /api/shifts/:id/submit`) cover the My Shift feature with no backend changes. Frontend adds three new pages wired into the existing React Router + React Query + Tailwind setup.

**Tech Stack:** Node.js/Express, Prisma 5 + PostgreSQL, React 18, React Query v5, React Router v6, Tailwind CSS 3, Zod

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `backend/prisma/schema.prisma` | Add `ChecklistCompletion` model |
| Create | `backend/src/controllers/attendance.controller.js` | `checkIn`, `getMyAttendance` |
| Create | `backend/src/routes/attendance.routes.js` | `POST /checkin`, `GET /` |
| Create | `backend/src/controllers/checklist.controller.js` | `saveChecklist`, `getChecklist`, `getChecklistHistory` |
| Create | `backend/src/routes/checklist.routes.js` | `POST /`, `GET /`, `GET /history` |
| Modify | `backend/src/app.js` | Register attendance + checklist routes |
| Modify | `web/src/lib/api.js` | Add `attendanceApi`, `checklistApi`; add `create`+`submit` to `shiftApi` |
| Create | `web/src/pages/staff/AttendancePage.jsx` | Check-in button + history table |
| Create | `web/src/pages/staff/ChecklistPage.jsx` | Opening/closing checklist tabs |
| Create | `web/src/pages/staff/MyShiftPage.jsx` | Start shift + submit daily report |
| Modify | `web/src/App.jsx` | Add 3 new routes |
| Modify | `web/src/pages/staff/DashboardLayout.jsx` | Add 3 nav items under Operations |

---

## Task 1: Add ChecklistCompletion model to Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the model**

Open `backend/prisma/schema.prisma` and append this block **after** the `ShiftSchedule` model (around line 622):

```prisma
// ─────────────────────────────────────────────
// Checklist Completions
// ─────────────────────────────────────────────

model ChecklistCompletion {
  id            String   @id @default(cuid())
  date          DateTime @db.Date
  shiftType     String   // am, pm
  checklistType String   // opening, closing
  completedBy   String   // user id
  items         Json     // { "espresso_machine": true, "fridge_temp": false, ... }
  submittedAt   DateTime @default(now())

  @@unique([date, shiftType, checklistType, completedBy])
  @@map("checklist_completions")
}
```

- [ ] **Step 2: Push schema to Railway**

```bash
cd "x:/Fika system/backend"
DATABASE_URL="postgresql://postgres:gBAzJWBhNfJvXKjCuaMIjmEZcpgOkoUF@monorail.proxy.rlwy.net:58145/railway" npx prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd "x:/Fika system/backend"
npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
cd "x:/Fika system"
git add backend/prisma/schema.prisma
git commit -m "feat: add ChecklistCompletion model to schema"
```

---

## Task 2: Attendance controller + routes

**Files:**
- Create: `backend/src/controllers/attendance.controller.js`
- Create: `backend/src/routes/attendance.routes.js`

- [ ] **Step 1: Create attendance controller**

Create `backend/src/controllers/attendance.controller.js`:

```js
import { prisma } from '../lib/prisma.js';

// Shift start times (24h hour)
const SHIFT_START = { am: 8, pm: 14 };

function calcLateness(shiftType, arrivalTime) {
  const start = SHIFT_START[shiftType] ?? 8;
  const arrivalHour = arrivalTime.getHours();
  const arrivalMin  = arrivalTime.getMinutes();
  const minutesLate = (arrivalHour - start) * 60 + arrivalMin;

  if (minutesLate <= 0)  return 'on_time';
  if (minutesLate <= 15) return 'minor';
  if (minutesLate <= 30) return 'moderate';
  return 'severe';
}

export async function checkIn(req, res, next) {
  try {
    const user = req.user;
    const now  = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Determine shift type from role
    const shiftType = user.role === 'barista_am' ? 'am'
                    : user.role === 'barista_pm' ? 'pm'
                    : null;

    // Check if already checked in today
    const existing = await prisma.hRRecord.findFirst({
      where: {
        staffMember: user.id,
        recordType:  'attendance',
        date:        today,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Already checked in today',
        record: existing,
      });
    }

    const latenessCategory = shiftType ? calcLateness(shiftType, now) : 'on_time';

    const record = await prisma.hRRecord.create({
      data: {
        staffMember:      user.id,
        shift:            shiftType,
        recordType:       'attendance',
        date:             today,
        arrivalTime:      now,
        latenessCategory,
        loggedBy:         user.id,
      },
    });

    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function getMyAttendance(req, res, next) {
  try {
    const { limit = 30 } = req.query;
    const records = await prisma.hRRecord.findMany({
      where: {
        staffMember: req.user.id,
        recordType:  'attendance',
      },
      orderBy: { date: 'desc' },
      take:    parseInt(limit),
    });
    res.json({ data: records });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Create attendance routes**

Create `backend/src/routes/attendance.routes.js`:

```js
import { Router } from 'express';
import { checkIn, getMyAttendance } from '../controllers/attendance.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/checkin', checkIn);
router.get('/',         getMyAttendance);

export default router;
```

- [ ] **Step 3: Commit**

```bash
cd "x:/Fika system"
git add backend/src/controllers/attendance.controller.js backend/src/routes/attendance.routes.js
git commit -m "feat: add attendance check-in controller and routes"
```

---

## Task 3: Checklist controller + routes

**Files:**
- Create: `backend/src/controllers/checklist.controller.js`
- Create: `backend/src/routes/checklist.routes.js`

- [ ] **Step 1: Create checklist controller**

Create `backend/src/controllers/checklist.controller.js`:

```js
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const saveSchema = z.object({
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType:     z.enum(['am', 'pm']),
  checklistType: z.enum(['opening', 'closing']),
  items:         z.record(z.boolean()),
});

export async function saveChecklist(req, res, next) {
  try {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() });
    }

    const { date, shiftType, checklistType, items } = parsed.data;
    const dateObj = new Date(date);

    const record = await prisma.checklistCompletion.upsert({
      where: {
        date_shiftType_checklistType_completedBy: {
          date:          dateObj,
          shiftType,
          checklistType,
          completedBy:   req.user.id,
        },
      },
      update:  { items, submittedAt: new Date() },
      create:  { date: dateObj, shiftType, checklistType, completedBy: req.user.id, items },
    });

    res.json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function getChecklist(req, res, next) {
  try {
    const { date, shiftType, checklistType } = req.query;

    const record = await prisma.checklistCompletion.findFirst({
      where: {
        date:          date ? new Date(date) : undefined,
        shiftType:     shiftType || undefined,
        checklistType: checklistType || undefined,
        completedBy:   req.user.id,
      },
    });

    res.json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function getChecklistHistory(req, res, next) {
  try {
    const { limit = 20 } = req.query;
    const records = await prisma.checklistCompletion.findMany({
      where:   { completedBy: req.user.id },
      orderBy: { submittedAt: 'desc' },
      take:    parseInt(limit),
    });
    res.json({ data: records });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Create checklist routes**

Create `backend/src/routes/checklist.routes.js`:

```js
import { Router } from 'express';
import { saveChecklist, getChecklist, getChecklistHistory } from '../controllers/checklist.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/',         saveChecklist);
router.get('/',          getChecklist);
router.get('/history',   getChecklistHistory);

export default router;
```

- [ ] **Step 3: Commit**

```bash
cd "x:/Fika system"
git add backend/src/controllers/checklist.controller.js backend/src/routes/checklist.routes.js
git commit -m "feat: add checklist save/get controller and routes"
```

---

## Task 4: Register new routes in app.js

**Files:**
- Modify: `backend/src/app.js`

- [ ] **Step 1: Add imports and route registrations**

In `backend/src/app.js`, add two import lines after the existing `scheduleRoutes` import (line 26):

```js
import attendanceRoutes from './routes/attendance.routes.js';
import checklistRoutes  from './routes/checklist.routes.js';
```

Then add two `app.use()` lines after `app.use('/api/schedule', scheduleRoutes);` (line 100):

```js
app.use('/api/attendance', attendanceRoutes);
app.use('/api/checklist',  checklistRoutes);
```

- [ ] **Step 2: Commit**

```bash
cd "x:/Fika system"
git add backend/src/app.js
git commit -m "feat: register attendance and checklist routes"
```

---

## Task 5: Add API client methods to web/src/lib/api.js

**Files:**
- Modify: `web/src/lib/api.js`

- [ ] **Step 1: Extend shiftApi and add two new API objects**

In `web/src/lib/api.js`, replace the existing `shiftApi` block (lines 37–42) with:

```js
export const shiftApi = {
  getAll:    (params)  => api.get('/shifts',               { params }),
  getByDate: (date)    => api.get(`/shifts/date/${date}`),
  getById:   (id)      => api.get(`/shifts/${id}`),
  create:    (data)    => api.post('/shifts', data),
  update:    (id, data)=> api.put(`/shifts/${id}`, data),
  submit:    (id)      => api.post(`/shifts/${id}/submit`),
};
```

Then append these two new blocks **at the end of the file** (after `scheduleApi`):

```js
export const attendanceApi = {
  checkIn:    ()       => api.post('/attendance/checkin'),
  getHistory: (params) => api.get('/attendance', { params }),
};

export const checklistApi = {
  save:       (data)   => api.post('/checklist', data),
  get:        (params) => api.get('/checklist',  { params }),
  getHistory: (params) => api.get('/checklist/history', { params }),
};
```

- [ ] **Step 2: Commit**

```bash
cd "x:/Fika system"
git add web/src/lib/api.js
git commit -m "feat: add attendanceApi, checklistApi; extend shiftApi with create/submit"
```

---

## Task 6: AttendancePage.jsx

**Files:**
- Create: `web/src/pages/staff/AttendancePage.jsx`

- [ ] **Step 1: Create the page**

Create `web/src/pages/staff/AttendancePage.jsx`:

```jsx
import React from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../../lib/api.js';
import { getUser } from '../../lib/auth.js';

const LATENESS_LABEL = {
  on_time:  { label: 'On Time',  cls: 'bg-green-100 text-green-800' },
  minor:    { label: '< 15 min late', cls: 'bg-yellow-100 text-yellow-800' },
  moderate: { label: '15-30 min late', cls: 'bg-orange-100 text-orange-800' },
  severe:   { label: '> 30 min late',  cls: 'bg-red-100 text-red-800' },
};

export function AttendancePage() {
  const user  = getUser();
  const today = format(new Date(), 'yyyy-MM-dd');
  const qc    = useQueryClient();

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['attendance-history'],
    queryFn:  () => attendanceApi.getHistory({ limit: 30 }).then((r) => r.data),
    staleTime: 60_000,
  });

  const records  = historyData?.data ?? [];
  const todayRec = records.find((r) => format(new Date(r.date), 'yyyy-MM-dd') === today);

  const { mutate: checkIn, isPending, error } = useMutation({
    mutationFn: () => attendanceApi.checkIn(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['attendance-history'] }),
  });

  const shiftLabel = user?.role === 'barista_am' ? 'AM Shift (8:00)' : user?.role === 'barista_pm' ? 'PM Shift (14:00)' : 'Shift';

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-extrabold text-gray-900">Attendance</h1>

      {/* Check-in card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{shiftLabel}</p>
        <p className="text-lg font-extrabold text-gray-900 mb-5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>

        {todayRec ? (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-3">
              <span className="text-2xl">✓</span>
              <div className="text-left">
                <p className="font-bold text-green-800">Checked in</p>
                <p className="text-sm text-green-700">
                  {todayRec.arrivalTime ? format(new Date(todayRec.arrivalTime), 'h:mm a') : '—'}
                </p>
              </div>
            </div>
            {todayRec.latenessCategory && (
              <div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${LATENESS_LABEL[todayRec.latenessCategory]?.cls ?? ''}`}>
                  {LATENESS_LABEL[todayRec.latenessCategory]?.label ?? todayRec.latenessCategory}
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={() => checkIn()}
              disabled={isPending}
              className="bg-secondary text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
            >
              {isPending ? 'Checking in…' : 'Check In'}
            </button>
            {error && (
              <p className="text-red-500 text-sm mt-3">
                {error.response?.data?.error ?? 'Failed to check in'}
              </p>
            )}
          </>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="font-bold text-gray-900 text-sm">Attendance History</h2>
        </div>
        {isLoading ? (
          <p className="text-muted text-sm text-center py-10">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-muted text-sm text-center py-10">No records yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider">Time</th>
                <th className="text-right px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => {
                const badge = LATENESS_LABEL[r.latenessCategory];
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {format(new Date(r.date), 'EEE d MMM')}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {r.arrivalTime ? format(new Date(r.arrivalTime), 'h:mm a') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {badge && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "x:/Fika system"
git add web/src/pages/staff/AttendancePage.jsx
git commit -m "feat: add AttendancePage with check-in and history"
```

---

## Task 7: ChecklistPage.jsx

**Files:**
- Create: `web/src/pages/staff/ChecklistPage.jsx`

- [ ] **Step 1: Create the page**

Create `web/src/pages/staff/ChecklistPage.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistApi } from '../../lib/api.js';
import { getUser } from '../../lib/auth.js';

const OPENING_ITEMS = [
  { key: 'machine_warmed',   label: 'Espresso machine warmed up and flushed' },
  { key: 'grinder_dialled',  label: 'Grinder dialled in (test shot pulled)' },
  { key: 'fridge_temp',      label: 'Fridge temperature checked (≤ 4°C)' },
  { key: 'milk_stocked',     label: 'Milk stock counted and restocked if needed' },
  { key: 'pastries_stocked', label: 'Pastries/food display stocked' },
  { key: 'pos_float',        label: 'POS on and float counted' },
  { key: 'cleaning_stocked', label: 'Cleaning supplies stocked' },
  { key: 'bar_wiped',        label: 'Bar area wiped and organised' },
  { key: 'announcement',     label: 'Opening announcement posted (if any)' },
];

const CLOSING_ITEMS = [
  { key: 'machine_backflushed', label: 'Espresso machine backflushed and wiped' },
  { key: 'grinder_cleaned',     label: 'Grinder cleaned and covered' },
  { key: 'milk_refrigerated',   label: 'Milk and perishables refrigerated/discarded' },
  { key: 'cash_counted',        label: 'Cash counted and bagged' },
  { key: 'pos_closed',          label: 'POS closed and daily report submitted' },
  { key: 'bar_wiped',           label: 'Bar and counter wiped down' },
  { key: 'floor_cleaned',       label: 'Floor swept/mopped' },
  { key: 'doors_locked',        label: 'Doors locked and lights off' },
];

function ChecklistPanel({ type, shiftType, today }) {
  const items    = type === 'opening' ? OPENING_ITEMS : CLOSING_ITEMS;
  const qc       = useQueryClient();
  const queryKey = ['checklist', today, shiftType, type];

  const { data: existingData } = useQuery({
    queryKey,
    queryFn: () => checklistApi.get({ date: today, shiftType, checklistType: type }).then((r) => r.data),
    staleTime: 30_000,
  });

  const existing = existingData?.data;

  const [checked, setChecked] = useState({});

  useEffect(() => {
    if (existing?.items) {
      setChecked(existing.items);
    }
  }, [existing]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => checklistApi.save({ date: today, shiftType, checklistType: type, items: checked }),
    onSuccess:  () => qc.invalidateQueries({ queryKey }),
  });

  const allDone = items.every((i) => checked[i.key]);
  const doneCount = items.filter((i) => checked[i.key]).length;

  if (existing) {
    // Read-only submitted view
    return (
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-green-700 font-bold">✓ Submitted</span>
          <span className="text-green-600 text-sm">
            {existing.submittedAt ? format(new Date(existing.submittedAt), 'h:mm a') : ''}
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${existing.items?.[item.key] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {existing.items?.[item.key] ? '✓' : '✗'}
              </span>
              <span className={`text-sm ${existing.items?.[item.key] ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted font-medium">{doneCount} of {items.length} done</span>
        {allDone && <span className="text-green-600 font-bold">All complete!</span>}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
        <div className="bg-secondary h-1.5 rounded-full transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {items.map((item) => (
          <label key={item.key} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface transition-colors">
            <input
              type="checkbox"
              checked={!!checked[item.key]}
              onChange={(e) => setChecked((prev) => ({ ...prev, [item.key]: e.target.checked }))}
              className="w-4 h-4 accent-secondary rounded"
            />
            <span className={`text-sm ${checked[item.key] ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={() => save()}
        disabled={isPending || doneCount === 0}
        className="w-full bg-secondary text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Submit Checklist'}
      </button>
    </div>
  );
}

export function ChecklistPage() {
  const user      = getUser();
  const today     = format(new Date(), 'yyyy-MM-dd');
  const shiftType = user?.role === 'barista_am' ? 'am' : user?.role === 'barista_pm' ? 'pm' : 'am';
  const [tab, setTab] = useState('opening');

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-extrabold text-gray-900">Checklists</h1>
      <p className="text-muted text-sm -mt-4">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>

      {/* Tabs */}
      <div className="flex gap-2">
        {['opening', 'closing'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-colors capitalize ${
              tab === t ? 'bg-primary text-white shadow-sm' : 'bg-white border border-gray-200 text-muted hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ChecklistPanel type={tab} shiftType={shiftType} today={today} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "x:/Fika system"
git add web/src/pages/staff/ChecklistPage.jsx
git commit -m "feat: add ChecklistPage with opening/closing checklists"
```

---

## Task 8: MyShiftPage.jsx

**Files:**
- Create: `web/src/pages/staff/MyShiftPage.jsx`

- [ ] **Step 1: Create the page**

Create `web/src/pages/staff/MyShiftPage.jsx`:

```jsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftApi } from '../../lib/api.js';
import { getUser } from '../../lib/auth.js';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder={placeholder ?? '0'}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
    />
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
    />
  );
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 resize-none"
    />
  );
}

export function MyShiftPage() {
  const user      = getUser();
  const today     = format(new Date(), 'yyyy-MM-dd');
  const shiftType = user?.role === 'barista_am' ? 'am' : user?.role === 'barista_pm' ? 'pm' : 'am';
  const qc        = useQueryClient();

  // Fetch today's shifts for the current user
  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ['my-shift-today', today],
    queryFn:  () => shiftApi.getAll({ from: today, to: today }).then((r) => r.data),
    staleTime: 30_000,
  });

  const shifts   = shiftsData?.shifts ?? [];
  const myShift  = shifts.find((s) => s.shiftType === shiftType) ?? null;

  // Opening float for start
  const [openingFloat, setOpeningFloat] = useState('');

  // Report form state
  const [form, setForm] = useState({
    cashSales:      '',
    digitalSales:   '',
    closingCash:    '',
    drinksCount:    '',
    popularDrink:   '',
    pastriesSold:   '',
    equipmentIssue: false,
    equipmentNotes: '',
    complaintFlag:  false,
    complaintNotes: '',
    shiftNotes:     '',
  });

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  // Start shift mutation
  const { mutate: startShift, isPending: starting, error: startError } = useMutation({
    mutationFn: () => shiftApi.create({ date: today, shiftType, openingFloat: Number(openingFloat) || undefined }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['my-shift-today'] }),
  });

  // Update + submit mutation
  const { mutate: submitReport, isPending: submitting, error: submitError } = useMutation({
    mutationFn: async () => {
      const payload = {
        cashSales:      form.cashSales !== '' ? Number(form.cashSales) : undefined,
        digitalSales:   form.digitalSales !== '' ? Number(form.digitalSales) : undefined,
        closingCash:    form.closingCash !== '' ? Number(form.closingCash) : undefined,
        drinksCount:    form.drinksCount !== '' ? Number(form.drinksCount) : undefined,
        popularDrink:   form.popularDrink || undefined,
        pastriesSold:   form.pastriesSold !== '' ? Number(form.pastriesSold) : undefined,
        equipmentIssue: form.equipmentIssue,
        equipmentNotes: form.equipmentNotes || undefined,
        complaintFlag:  form.complaintFlag,
        complaintNotes: form.complaintNotes || undefined,
        shiftNotes:     form.shiftNotes || undefined,
      };
      await shiftApi.update(myShift.id, payload);
      await shiftApi.submit(myShift.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-shift-today'] }),
  });

  if (isLoading) {
    return <p className="text-muted text-sm py-12 text-center">Loading…</p>;
  }

  // Submitted view
  if (myShift?.status === 'submitted') {
    const totalSales = (myShift.cashSales ?? 0) + (myShift.digitalSales ?? 0);
    return (
      <div className="space-y-6 max-w-lg">
        <h1 className="text-2xl font-extrabold text-gray-900">My Shift</h1>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="font-bold text-green-800 text-lg">Report Submitted</p>
          <p className="text-green-700 text-sm mt-0.5">
            {myShift.submittedAt ? `Submitted at ${format(new Date(myShift.submittedAt), 'h:mm a')}` : ''}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Cash Sales',    value: myShift.cashSales    != null ? `NPR ${Number(myShift.cashSales).toLocaleString()}`    : '—' },
            { label: 'Digital Sales', value: myShift.digitalSales != null ? `NPR ${Number(myShift.digitalSales).toLocaleString()}` : '—' },
            { label: 'Total Sales',   value: `NPR ${totalSales.toLocaleString()}` },
            { label: 'Closing Cash',  value: myShift.closingCash  != null ? `NPR ${Number(myShift.closingCash).toLocaleString()}`  : '—' },
            { label: 'Drinks Served', value: myShift.drinksCount ?? '—' },
            { label: 'Popular Drink', value: myShift.popularDrink ?? '—' },
            { label: 'Pastries Sold', value: myShift.pastriesSold ?? '—' },
            { label: 'Equipment Issue', value: myShift.equipmentIssue ? 'Yes' : 'None' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted font-bold uppercase tracking-wide">{label}</p>
              <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
          {myShift.shiftNotes && (
            <div className="col-span-2">
              <p className="text-xs text-muted font-bold uppercase tracking-wide">Notes</p>
              <p className="text-sm text-gray-700 mt-0.5">{myShift.shiftNotes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No shift yet — show start button
  if (!myShift) {
    return (
      <div className="space-y-6 max-w-lg">
        <h1 className="text-2xl font-extrabold text-gray-900">My Shift</h1>
        <p className="text-muted text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')} · {shiftType === 'am' ? 'Morning' : 'Afternoon'} shift</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <p className="font-semibold text-gray-900">No shift started for today.</p>
          <Field label="Opening Float (NPR)">
            <NumInput value={openingFloat} onChange={setOpeningFloat} placeholder="e.g. 500" />
          </Field>
          <button
            onClick={() => startShift()}
            disabled={starting}
            className="w-full bg-secondary text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {starting ? 'Starting…' : 'Start My Shift'}
          </button>
          {startError && (
            <p className="text-red-500 text-sm">{startError.response?.data?.error ?? 'Failed to start shift'}</p>
          )}
        </div>
      </div>
    );
  }

  // Shift in progress — show report form
  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-extrabold text-gray-900">My Shift</h1>
      <p className="text-muted text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')} · {shiftType === 'am' ? 'Morning' : 'Afternoon'} shift · In Progress</p>

      {/* Sales */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Sales</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cash Sales (NPR)">
            <NumInput value={form.cashSales} onChange={set('cashSales')} />
          </Field>
          <Field label="Digital Sales (NPR)">
            <NumInput value={form.digitalSales} onChange={set('digitalSales')} />
          </Field>
          <Field label="Closing Cash (NPR)">
            <NumInput value={form.closingCash} onChange={set('closingCash')} />
          </Field>
        </div>
      </section>

      {/* Operations */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Operations</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Drinks Served">
            <NumInput value={form.drinksCount} onChange={set('drinksCount')} />
          </Field>
          <Field label="Pastries Sold">
            <NumInput value={form.pastriesSold} onChange={set('pastriesSold')} />
          </Field>
        </div>
        <Field label="Most Popular Drink">
          <TextInput value={form.popularDrink} onChange={set('popularDrink')} placeholder="e.g. Oat Flat White" />
        </Field>
      </section>

      {/* Issues */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Issues</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.equipmentIssue}
            onChange={(e) => set('equipmentIssue')(e.target.checked)}
            className="w-4 h-4 accent-secondary"
          />
          <span className="text-sm font-medium text-gray-900">Equipment issue occurred</span>
        </label>
        {form.equipmentIssue && (
          <Field label="Equipment Issue Details">
            <Textarea value={form.equipmentNotes} onChange={set('equipmentNotes')} placeholder="Describe the issue…" />
          </Field>
        )}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.complaintFlag}
            onChange={(e) => set('complaintFlag')(e.target.checked)}
            className="w-4 h-4 accent-secondary"
          />
          <span className="text-sm font-medium text-gray-900">Customer complaint received</span>
        </label>
        {form.complaintFlag && (
          <Field label="Complaint Details">
            <Textarea value={form.complaintNotes} onChange={set('complaintNotes')} placeholder="Describe the complaint…" />
          </Field>
        )}
      </section>

      {/* Notes */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Shift Notes</h2>
        <Textarea value={form.shiftNotes} onChange={set('shiftNotes')} placeholder="Anything else to note for the owner…" />
      </section>

      <button
        onClick={() => submitReport()}
        disabled={submitting}
        className="w-full bg-secondary text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Shift Report'}
      </button>
      {submitError && (
        <p className="text-red-500 text-sm">{submitError.response?.data?.error ?? 'Failed to submit report'}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "x:/Fika system"
git add web/src/pages/staff/MyShiftPage.jsx
git commit -m "feat: add MyShiftPage for barista daily sales report"
```

---

## Task 9: Wire pages into App.jsx and DashboardLayout.jsx

**Files:**
- Modify: `web/src/App.jsx`
- Modify: `web/src/pages/staff/DashboardLayout.jsx`

- [ ] **Step 1: Add imports and routes to App.jsx**

In `web/src/App.jsx`, add three import lines after the `SchedulePage` import (line 30):

```jsx
import { AttendancePage } from './pages/staff/AttendancePage.jsx';
import { ChecklistPage }  from './pages/staff/ChecklistPage.jsx';
import { MyShiftPage }    from './pages/staff/MyShiftPage.jsx';
```

Then inside the `<Route path="/staff" ...>` block, add three routes after the `schedule` route (line 65):

```jsx
<Route path="attendance" element={<AttendancePage />} />
<Route path="checklist"  element={<ChecklistPage />} />
<Route path="my-shift"   element={<MyShiftPage />} />
```

- [ ] **Step 2: Add nav items to DashboardLayout.jsx**

In `web/src/pages/staff/DashboardLayout.jsx`, replace the `Operations` links array (lines 8–14) with:

```js
links: [
  { to: '/staff',               label: 'Overview',    end: true },
  { to: '/staff/my-shift',      label: 'My Shift' },
  { to: '/staff/attendance',    label: 'Attendance' },
  { to: '/staff/checklist',     label: 'Checklist' },
  { to: '/staff/shifts',        label: 'Shifts' },
  { to: '/staff/finance',       label: 'Finance' },
  { to: '/staff/reports',       label: 'Reports' },
  { to: '/staff/expenses',      label: 'Expenses' },
],
```

- [ ] **Step 3: Commit**

```bash
cd "x:/Fika system"
git add web/src/App.jsx web/src/pages/staff/DashboardLayout.jsx
git commit -m "feat: add attendance, checklist, my-shift routes and nav items"
```

---

## Task 10: Push to Railway + Vercel deploy

- [ ] **Step 1: Push all commits**

```bash
cd "x:/Fika system"
git push origin main
```

- [ ] **Step 2: Verify Railway backend health**

```bash
curl https://desirable-vision-production-b9ee.up.railway.app/api/health
```

Expected: `{"status":"ok","service":"Fika Takeaway API",...}`

- [ ] **Step 3: Verify new endpoints are live**

```bash
# Should return 401 (not 404) — means route exists but needs auth
curl -s -o /dev/null -w "%{http_code}" https://desirable-vision-production-b9ee.up.railway.app/api/attendance
curl -s -o /dev/null -w "%{http_code}" https://desirable-vision-production-b9ee.up.railway.app/api/checklist
```

Expected: `401` for both.

- [ ] **Step 4: Verify Vercel frontend deployed**

Open the Vercel deployment URL and log in as a barista. Confirm:
- "My Shift", "Attendance", "Checklist" appear in the sidebar under Operations
- Each page loads without errors
