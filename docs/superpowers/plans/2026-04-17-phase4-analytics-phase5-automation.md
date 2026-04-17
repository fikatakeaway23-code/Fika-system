# Phase 4 Analytics + Phase 5 Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an owner-only Analytics page (MRR, renewal calendar, barista leaderboard, overdue filter) and automate QR code generation + WhatsApp message templates for corporate memberships.

**Architecture:** Phase 4 adds three backend analytics endpoints and a new `AnalyticsPage` in the staff web dashboard. Phase 5 adds a QR code endpoint on the backend (using the `qrcode` npm package) displayed in the existing Portal modal, an email prefill flow in the member portal login, and client-side WhatsApp link builders on the MembershipsPage.

**Tech Stack:** Node.js/Express/Prisma (backend), React 18/Vite/Tailwind (web), `qrcode` npm package, WhatsApp `wa.me` deep-link protocol.

---

## File Map

### New files
- `backend/src/controllers/analytics.controller.js` — MRR, renewals, leaderboard logic
- `backend/src/routes/analytics.routes.js` — mounts analytics endpoints
- `web/src/pages/staff/AnalyticsPage.jsx` — owner-only analytics dashboard
- `web/src/lib/whatsapp.js` — WhatsApp template link builder

### Modified files
- `backend/src/app.js` — register `/api/analytics` router
- `backend/src/controllers/membership.controller.js` — add `getMemberQrCode` export
- `backend/src/routes/membership.routes.js` — add `GET /:id/qr` route
- `backend/package.json` — add `qrcode` dependency
- `web/src/App.jsx` — import + route for AnalyticsPage
- `web/src/pages/staff/DashboardLayout.jsx` — add Analytics nav link
- `web/src/pages/staff/MembershipsPage.jsx` — QR display in portal modal + WhatsApp buttons + overdue filter chip
- `web/src/lib/api.js` — add `analyticsApi`
- `member-portal/src/pages/LoginPage.jsx` — read `?email` query param to prefill email field

---

## Task 1: Analytics backend controller and routes

**Files:**
- Create: `backend/src/controllers/analytics.controller.js`
- Create: `backend/src/routes/analytics.routes.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Create `backend/src/controllers/analytics.controller.js`**

```js
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

// GET /api/analytics/mrr
export async function getMrr(req, res, next) {
  try {
    const memberships = await prisma.membership.findMany({
      where: { status: 'active' },
      select: { monthlyFee: true, tier: true, companyName: true },
    });

    const totalMrr = memberships.reduce((s, m) => s + (m.monthlyFee ?? 0), 0);
    const byTier = {};
    for (const m of memberships) {
      byTier[m.tier] = (byTier[m.tier] ?? 0) + (m.monthlyFee ?? 0);
    }

    res.json({
      totalMrr,
      memberCount: memberships.length,
      avgFee: memberships.length > 0 ? totalMrr / memberships.length : 0,
      byTier,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/renewals?days=30
export async function getRenewals(req, res, next) {
  try {
    const { days = 30 } = z.object({
      days: z.coerce.number().int().min(1).max(365).default(30),
    }).parse(req.query);

    const now    = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() + days);

    const memberships = await prisma.membership.findMany({
      where: {
        status: 'active',
        renewalDate: { lte: cutoff },
      },
      orderBy: { renewalDate: 'asc' },
      select: {
        id: true,
        companyName: true,
        whatsapp: true,
        renewalDate: true,
        monthlyFee: true,
        tier: true,
        paymentStatus: true,
      },
    });

    const withDays = memberships.map((m) => {
      const diffMs   = new Date(m.renewalDate).getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...m, daysLeft };
    });

    res.json({ renewals: withDays, count: withDays.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/leaderboard?month=4&year=2026
export async function getLeaderboard(req, res, next) {
  try {
    const now = new Date();
    const { month, year } = z.object({
      month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
      year:  z.coerce.number().int().min(2020).default(now.getFullYear()),
    }).parse(req.query);

    const shifts = await prisma.shift.findMany({
      where: {
        status: 'submitted',
        date: {
          gte: new Date(year, month - 1, 1),
          lt:  new Date(year, month, 1),
        },
      },
      include: { user: { select: { id: true, name: true } } },
    });

    const byUser = {};
    for (const s of shifts) {
      if (!byUser[s.userId]) {
        byUser[s.userId] = { userId: s.userId, name: s.user.name, drinks: 0, shifts: 0 };
      }
      byUser[s.userId].drinks += s.drinksCount ?? 0;
      byUser[s.userId].shifts += 1;
    }

    const leaderboard = Object.values(byUser).sort((a, b) => b.drinks - a.drinks);

    res.json({ month, year, leaderboard });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Create `backend/src/routes/analytics.routes.js`**

```js
import { Router } from 'express';
import { getMrr, getRenewals, getLeaderboard } from '../controllers/analytics.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, requireOwner);

router.get('/mrr',         getMrr);
router.get('/renewals',    getRenewals);
router.get('/leaderboard', getLeaderboard);

export default router;
```

- [ ] **Step 3: Register route in `backend/src/app.js`**

Find the line `import memberAuthRouter from './routes/memberAuth.routes.js';` and add after the last import block:
```js
import analyticsRoutes    from './routes/analytics.routes.js';
```

Find where routes are registered (e.g. `app.use('/api/member', memberDataRouter);`) and add:
```js
app.use('/api/analytics',  analyticsRoutes);
```

- [ ] **Step 4: Test endpoints manually**

Start the backend with `cd backend && npm run dev`.

```bash
# In a second terminal — get a staff JWT first:
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"role":"owner","pin":"1234"}' | jq .token

# Then (replace TOKEN):
curl -s http://localhost:4000/api/analytics/mrr \
  -H "Authorization: Bearer TOKEN" | jq .

curl -s "http://localhost:4000/api/analytics/renewals?days=60" \
  -H "Authorization: Bearer TOKEN" | jq .

curl -s "http://localhost:4000/api/analytics/leaderboard?month=4&year=2026" \
  -H "Authorization: Bearer TOKEN" | jq .
```

Expected: each endpoint returns JSON without errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/analytics.controller.js \
        backend/src/routes/analytics.routes.js \
        backend/src/app.js
git commit -m "feat: add analytics endpoints for MRR, renewals, leaderboard"
```

---

## Task 2: AnalyticsPage web UI

**Files:**
- Create: `web/src/pages/staff/AnalyticsPage.jsx`
- Modify: `web/src/lib/api.js`

- [ ] **Step 1: Add `analyticsApi` to `web/src/lib/api.js`**

Find the `export const reportApi` block and add after it:

```js
export const analyticsApi = {
  mrr:         ()       => api.get('/analytics/mrr'),
  renewals:    (days)   => api.get('/analytics/renewals', { params: { days } }),
  leaderboard: (m, y)   => api.get('/analytics/leaderboard', { params: { month: m, year: y } }),
};
```

- [ ] **Step 2: Create `web/src/pages/staff/AnalyticsPage.jsx`**

```jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addMonths, subMonths } from 'date-fns';
import { analyticsApi } from '../../lib/api.js';

const TIER_LABEL = {
  daily_pass:    'Daily Pass',
  team_pack:     'Team Pack',
  office_bundle: 'Office Bundle',
};
const TIER_COLOR = {
  daily_pass:    'bg-green-100 text-green-800',
  team_pack:     'bg-yellow-100 text-yellow-800',
  office_bundle: 'bg-purple-100 text-purple-700',
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function RenewalRow({ m }) {
  const overdue = m.daysLeft < 0;
  const urgent  = m.daysLeft >= 0 && m.daysLeft <= 3;
  const warning = m.daysLeft > 3  && m.daysLeft <= 7;

  const badge = overdue ? 'bg-red-100 text-red-700'
    : urgent  ? 'bg-red-100 text-red-600'
    : warning ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-600';

  const label = overdue ? `${Math.abs(m.daysLeft)}d overdue`
    : m.daysLeft === 0  ? 'today'
    : `${m.daysLeft}d left`;

  return (
    <tr className="border-t border-gray-50">
      <td className="py-2 pr-4 font-medium text-sm text-gray-900">{m.companyName}</td>
      <td className="py-2 pr-4">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLOR[m.tier] ?? 'bg-gray-100 text-gray-600'}`}>
          {TIER_LABEL[m.tier] ?? m.tier}
        </span>
      </td>
      <td className="py-2 pr-4 text-sm text-gray-500">
        {m.renewalDate ? format(new Date(m.renewalDate), 'MMM d') : '—'}
      </td>
      <td className="py-2 pr-4">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
      </td>
      <td className="py-2 text-sm text-gray-700">NPR {m.monthlyFee?.toLocaleString()}</td>
    </tr>
  );
}

export function AnalyticsPage() {
  const now = new Date();
  const [lbDate, setLbDate] = useState(now);
  const lbMonth = lbDate.getMonth() + 1;
  const lbYear  = lbDate.getFullYear();

  const { data: mrr } = useQuery({
    queryKey: ['analytics-mrr'],
    queryFn:  () => analyticsApi.mrr().then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: renewals } = useQuery({
    queryKey: ['analytics-renewals'],
    queryFn:  () => analyticsApi.renewals(60).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: lb } = useQuery({
    queryKey: ['analytics-leaderboard', lbMonth, lbYear],
    queryFn:  () => analyticsApi.leaderboard(lbMonth, lbYear).then((r) => r.data),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black text-gray-900">Analytics</h1>

      {/* MRR */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Monthly Recurring Revenue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total MRR"
            value={`NPR ${(mrr?.totalMrr ?? 0).toLocaleString()}`}
            sub={`${mrr?.memberCount ?? 0} active memberships`}
          />
          <StatCard
            label="Avg Fee"
            value={`NPR ${Math.round(mrr?.avgFee ?? 0).toLocaleString()}`}
            sub="per active member"
          />
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">By Tier</p>
            <div className="space-y-1">
              {Object.entries(mrr?.byTier ?? {}).map(([tier, rev]) => (
                <div key={tier} className="flex justify-between text-sm">
                  <span className="text-gray-600">{TIER_LABEL[tier] ?? tier}</span>
                  <span className="font-bold text-gray-900">NPR {rev.toLocaleString()}</span>
                </div>
              ))}
              {Object.keys(mrr?.byTier ?? {}).length === 0 && (
                <p className="text-sm text-gray-400">No active memberships</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Renewal Calendar */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          Upcoming Renewals <span className="text-gray-300 font-normal">(next 60 days)</span>
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(renewals?.renewals ?? []).length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No renewals due in the next 60 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left px-4">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Company</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Tier</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Fee</th>
                  </tr>
                </thead>
                <tbody className="px-4">
                  {renewals.renewals.map((m) => (
                    <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-sm text-gray-900">{m.companyName}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLOR[m.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                          {TIER_LABEL[m.tier] ?? m.tier}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {m.renewalDate ? format(new Date(m.renewalDate), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const overdue = m.daysLeft < 0;
                          const urgent  = m.daysLeft >= 0 && m.daysLeft <= 3;
                          const warning = m.daysLeft > 3  && m.daysLeft <= 7;
                          const badge   = overdue ? 'bg-red-100 text-red-700'
                            : urgent  ? 'bg-red-100 text-red-600'
                            : warning ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600';
                          const label   = overdue ? `${Math.abs(m.daysLeft)}d overdue`
                            : m.daysLeft === 0 ? 'today'
                            : `${m.daysLeft}d left`;
                          return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">NPR {m.monthlyFee?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Barista Leaderboard */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Barista Leaderboard</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLbDate((d) => subMonths(d, 1))}
              className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded"
            >‹</button>
            <span className="text-sm font-medium text-gray-700">{format(lbDate, 'MMMM yyyy')}</span>
            <button
              onClick={() => setLbDate((d) => addMonths(d, 1))}
              disabled={lbDate >= now}
              className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded disabled:opacity-30"
            >›</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(lb?.leaderboard ?? []).length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No submitted shifts for this month.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-8">#</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Barista</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Drinks</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Shifts</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Avg/Shift</th>
                </tr>
              </thead>
              <tbody>
                {lb.leaderboard.map((b, i) => (
                  <tr key={b.userId} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-bold text-gray-300">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-sm text-gray-900">
                      {i === 0 && <span className="mr-1">🏆</span>}
                      {b.name}
                    </td>
                    <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">{b.drinks}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 text-right">{b.shifts}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 text-right">
                      {b.shifts > 0 ? (b.drinks / b.shifts).toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/staff/AnalyticsPage.jsx web/src/lib/api.js
git commit -m "feat: add AnalyticsPage with MRR, renewal calendar, barista leaderboard"
```

---

## Task 3: Wire AnalyticsPage into router, nav, and add overdue filter to MembershipsPage

**Files:**
- Modify: `web/src/App.jsx`
- Modify: `web/src/pages/staff/DashboardLayout.jsx`
- Modify: `web/src/pages/staff/MembershipsPage.jsx`

- [ ] **Step 1: Add route in `web/src/App.jsx`**

Add import after the last staff page import (before `function RequireAuth`):
```jsx
import { AnalyticsPage }     from './pages/staff/AnalyticsPage.jsx';
```

Add route inside the `/staff` nested routes (after `my-shift`):
```jsx
<Route path="analytics"     element={<AnalyticsPage />} />
```

- [ ] **Step 2: Add nav link in `web/src/pages/staff/DashboardLayout.jsx`**

Find `NAV_GROUPS` array. In the `Management` group (the one with `ownerOnly: true`), add this link at the top of the `links` array:

```js
{ to: '/staff/analytics', label: 'Analytics' },
```

So the Management group becomes:
```js
{
  label: 'Management',
  ownerOnly: true,
  links: [
    { to: '/staff/analytics',   label: 'Analytics' },
    { to: '/staff/menu',        label: 'Menu' },
    { to: '/staff/targets',     label: 'Targets' },
    { to: '/staff/suppliers',   label: 'Suppliers' },
    { to: '/staff/memberships', label: 'Memberships' },
    { to: '/staff/inventory',   label: 'Inventory' },
    { to: '/staff/waste',       label: 'Waste Log' },
    { to: '/staff/equipment',   label: 'Equipment' },
  ],
},
```

- [ ] **Step 3: Add overdue filter chip to `web/src/pages/staff/MembershipsPage.jsx`**

Find where the status filter buttons are rendered. Look for the STATUS filter group — it will have buttons for `all`, `active`, `pending`, `expired`, `cancelled`. Add an `overdue` filter option.

Find the status filter state (something like `const [statusFilter, setStatusFilter] = useState('')`) and the filter button group. Add an "Overdue" chip that uses a computed client-side filter.

Near the top of the component, find where memberships are fetched:
```js
const { data, ... } = useQuery({
  queryFn: () => membershipApi.getAll({ status: statusFilter, ... })
```

Add a new state variable:
```js
const [showOverdue, setShowOverdue] = useState(false);
```

Find where memberships list is derived and add client-side overdue filtering. Find the line that renders the membership rows and wrap the list with:
```js
const displayed = showOverdue
  ? (data ?? []).filter((m) => {
      if (!m.renewalDate) return false;
      return new Date(m.renewalDate) < new Date() && m.status === 'active';
    })
  : (data ?? []);
```

Then use `displayed` instead of `data` when rendering the list.

In the filter chips bar (find the existing status filter buttons group), add after the last status chip:
```jsx
<button
  onClick={() => setShowOverdue((v) => !v)}
  className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
    showOverdue
      ? 'bg-red-500 text-white border-red-500'
      : 'bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-500'
  }`}
>
  Overdue
</button>
```

- [ ] **Step 4: Verify in browser**

Start web dev server: `cd web && npm run dev`

1. Log in as owner → click "Analytics" in sidebar → verify three sections render without errors
2. Click "Memberships" → verify "Overdue" chip appears and filters correctly

- [ ] **Step 5: Commit**

```bash
git add web/src/App.jsx web/src/pages/staff/DashboardLayout.jsx web/src/pages/staff/MembershipsPage.jsx
git commit -m "feat: wire AnalyticsPage into router and nav, add overdue filter to MembershipsPage"
```

---

## Task 4: QR code backend endpoint

**Files:**
- Modify: `backend/package.json` (add `qrcode`)
- Modify: `backend/src/controllers/membership.controller.js` (add `getMemberQrCode`)
- Modify: `backend/src/routes/membership.routes.js` (add GET `/:id/qr`)

- [ ] **Step 1: Install `qrcode` package**

```bash
cd backend && npm install qrcode
```

Also add `@types/qrcode` for TypeScript support (dev dependency):
```bash
npm install --save-dev @types/qrcode
```

- [ ] **Step 2: Add `getMemberQrCode` to `backend/src/controllers/membership.controller.js`**

Add this import at the top of the file (after existing imports):
```js
import QRCode from 'qrcode';
```

Add this new export at the end of the file:
```js
export async function getMemberQrCode(req, res, next) {
  try {
    const { id } = req.params;
    const account = await prisma.memberAccount.findUnique({
      where: { membershipId: id },
      select: { email: true },
    });

    if (!account) {
      return res.status(404).json({ error: 'No portal account for this membership' });
    }

    const portalUrl = process.env.MEMBER_PORTAL_URL || 'https://fika-member.vercel.app';
    const loginUrl  = `${portalUrl}?email=${encodeURIComponent(account.email)}`;

    const qrDataUrl = await QRCode.toDataURL(loginUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });

    res.json({ qrDataUrl, loginUrl });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 3: Add route in `backend/src/routes/membership.routes.js`**

Add `getMemberQrCode` to the import:
```js
import {
  createMembership,
  getMemberships,
  getMembershipById,
  updateMembership,
  deleteMembership,
  incrementDrinks,
  redeemDrink,
  getUsage,
  getUsageSummary,
  renewMembership,
  getMemberQrCode,
} from '../controllers/membership.controller.js';
```

Add the route (owner-only, after the existing `/:id/member-account` routes):
```js
router.get('/:id/qr', authenticate, requireOwner, getMemberQrCode);
```

- [ ] **Step 4: Add `MEMBER_PORTAL_URL` to `backend/.env`**

Open `backend/.env` and add:
```
MEMBER_PORTAL_URL="https://fika-member.vercel.app"
```

(Replace with actual Vercel URL once deployed.)

- [ ] **Step 5: Test the endpoint**

```bash
# Start backend in one terminal
cd backend && npm run dev

# In another terminal — get token then test:
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"role":"owner","pin":"1234"}' | jq -r .token)

# Replace MEMBERSHIP_ID with an ID that has a portal account:
curl -s http://localhost:4000/api/memberships/MEMBERSHIP_ID/qr \
  -H "Authorization: Bearer $TOKEN" | jq .qrDataUrl | head -c 100
```

Expected: JSON with `qrDataUrl` starting with `"data:image/png;base64,..."`

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json \
        backend/src/controllers/membership.controller.js \
        backend/src/routes/membership.routes.js \
        backend/.env
git commit -m "feat: add QR code endpoint for member portal login"
```

---

## Task 5: QR code display in Portal modal + email prefill in member portal login

**Files:**
- Modify: `web/src/pages/staff/MembershipsPage.jsx` — show QR in Portal modal
- Modify: `web/src/lib/api.js` — add `membershipApi.getQr`
- Modify: `member-portal/src/pages/LoginPage.jsx` — read `?email` query param

- [ ] **Step 1: Add `getQr` to `membershipApi` in `web/src/lib/api.js`**

Find the `membershipApi` object and add:
```js
getQr: (id) => api.get(`/memberships/${id}/qr`),
```

- [ ] **Step 2: Add QR display in the Portal modal in `web/src/pages/staff/MembershipsPage.jsx`**

Find the `PortalAccountModal` component (the one that shows the portal account management UI). Inside the component, the state should have a branch for when an account exists (showing its email, a delete button, etc.).

Add a QR code section inside the "account exists" branch. First, add a query to fetch the QR:

Inside the `PortalAccountModal` function body, add:
```jsx
const { data: qrData, isLoading: qrLoading } = useQuery({
  queryKey: ['membership-qr', membership.id],
  queryFn:  () => membershipApi.getQr(membership.id).then((r) => r.data),
  enabled:  !!membership.memberAccount,
  staleTime: Infinity,
});
```

In the JSX, inside the "account exists" section (where you show the email and delete button), add below the email line:
```jsx
{/* QR Code */}
<div className="mt-4 flex flex-col items-center gap-2">
  <p className="text-xs text-gray-400">Scan to open member portal</p>
  {qrLoading ? (
    <div className="w-[180px] h-[180px] bg-gray-50 rounded-lg flex items-center justify-center">
      <span className="text-xs text-gray-400">Loading...</span>
    </div>
  ) : qrData?.qrDataUrl ? (
    <>
      <img
        src={qrData.qrDataUrl}
        alt="Member portal QR"
        className="w-[180px] h-[180px] rounded-lg border border-gray-100"
      />
      <a
        href={qrData.qrDataUrl}
        download={`fika-qr-${membership.companyName}.png`}
        className="text-xs text-blue-500 hover:underline"
      >
        Download QR
      </a>
    </>
  ) : null}
</div>
```

- [ ] **Step 3: Prefill email in `member-portal/src/pages/LoginPage.jsx`**

Read the full current file first, then make this change.

Find the `email` state initializer. It will be something like:
```jsx
const [email, setEmail] = useState('');
```

Replace with:
```jsx
const [email, setEmail] = useState(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('email') ?? '';
});
```

This reads `?email=user@example.com` from the URL and pre-fills the email field.

- [ ] **Step 4: Verify**

1. In staff dashboard, open a membership that has a portal account → click "Portal" → verify QR code image appears and "Download QR" link works
2. Copy the QR code's embedded URL (shown as `loginUrl` in the API response) → paste in browser → confirm the member portal login page opens with email pre-filled

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/staff/MembershipsPage.jsx \
        web/src/lib/api.js \
        member-portal/src/pages/LoginPage.jsx
git commit -m "feat: show QR code in portal modal and prefill email on member portal login"
```

---

## Task 6: WhatsApp template buttons on MembershipsPage

**Files:**
- Create: `web/src/lib/whatsapp.js`
- Modify: `web/src/pages/staff/MembershipsPage.jsx`

- [ ] **Step 1: Create `web/src/lib/whatsapp.js`**

```js
/**
 * Build a WhatsApp deep link that opens a pre-filled chat.
 * phone: international format digits only, e.g. "9779841234567"
 */
function waLink(phone, text) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function renewalReminderLink({ phone, companyName, monthlyFee, renewalDate }) {
  const dateStr = renewalDate
    ? new Date(renewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'soon';

  const text = `Hello ${companyName} team! 👋

This is a friendly reminder that your Fika coffee membership is due for renewal on *${dateStr}*.

💰 Monthly fee: NPR ${monthlyFee?.toLocaleString()}

To renew, please transfer to our account and send us the screenshot, or visit us in person. Let us know if you have any questions!

☕ Fika Takeaway`;

  return waLink(phone, text);
}

export function topUpAckLink({ phone, companyName }) {
  const text = `Hello ${companyName} team! ☕

We've received your top-up request and will process it shortly. Your drink balance will be updated within 24 hours.

Thank you for being a valued Fika member! 🙏

☕ Fika Takeaway`;

  return waLink(phone, text);
}
```

- [ ] **Step 2: Add WhatsApp buttons to `web/src/pages/staff/MembershipsPage.jsx`**

Add imports at the top of the file:
```jsx
import { renewalReminderLink, topUpAckLink } from '../../lib/whatsapp.js';
```

Find where each membership row is rendered (in the membership list/table). There should be action buttons (Log drink, Usage, Portal). Add two new buttons per row — or add them as a collapsed "..." menu if the row is getting wide.

For simplicity, add them as small icon-style links directly in the row:

In the membership row actions area, add:
```jsx
<a
  href={renewalReminderLink({
    phone:       m.whatsapp,
    companyName: m.companyName,
    monthlyFee:  m.monthlyFee,
    renewalDate: m.renewalDate,
  })}
  target="_blank"
  rel="noopener noreferrer"
  title="Send renewal reminder on WhatsApp"
  className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 border border-green-200 hover:border-green-400 rounded-lg px-2 py-1 transition-colors"
>
  📲 Renewal
</a>
<a
  href={topUpAckLink({ phone: m.whatsapp, companyName: m.companyName })}
  target="_blank"
  rel="noopener noreferrer"
  title="Send top-up acknowledgement on WhatsApp"
  className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 border border-green-200 hover:border-green-400 rounded-lg px-2 py-1 transition-colors"
>
  📲 Top-up
</a>
```

- [ ] **Step 3: Verify in browser**

1. Open Memberships page
2. Click "📲 Renewal" for any membership → WhatsApp should open (or redirect to `wa.me/`) with the renewal reminder message pre-filled
3. Click "📲 Top-up" → WhatsApp should open with the top-up ack message pre-filled

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/whatsapp.js web/src/pages/staff/MembershipsPage.jsx
git commit -m "feat: add WhatsApp renewal reminder and top-up acknowledgement buttons"
```

---

## Verification Checklist

### Phase 4 — Analytics
- [ ] `GET /api/analytics/mrr` returns `{ totalMrr, memberCount, avgFee, byTier }`
- [ ] `GET /api/analytics/renewals?days=60` returns memberships with `daysLeft` (negative = overdue)
- [ ] `GET /api/analytics/leaderboard?month=4&year=2026` returns sorted leaderboard
- [ ] `/staff/analytics` page loads without errors (owner only)
- [ ] Three sections render: MRR cards, renewal table, leaderboard table
- [ ] Month navigation on leaderboard works
- [ ] Analytics link appears in sidebar Management section
- [ ] "Overdue" chip on MembershipsPage filters to active memberships past renewal date

### Phase 5 — Automation
- [ ] `GET /api/memberships/:id/qr` returns `{ qrDataUrl, loginUrl }` when account exists, 404 when not
- [ ] QR code image appears inside Portal modal for memberships with accounts
- [ ] "Download QR" link triggers PNG download
- [ ] Scanning QR (or visiting URL) lands on member portal login with email pre-filled
- [ ] "📲 Renewal" button opens WhatsApp with correct renewal reminder message
- [ ] "📲 Top-up" button opens WhatsApp with top-up ack message
- [ ] WhatsApp links work on mobile (open the WhatsApp app)
