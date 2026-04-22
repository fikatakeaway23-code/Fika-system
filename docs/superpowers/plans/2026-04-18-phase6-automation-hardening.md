# Phase 6 — Automation & Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate five workflows that currently require manual effort: top-up request triage in the staff portal, waste/stock analytics visibility, per-membership PDF invoice generation, and zero-touch CI/CD for the member portal (Vercel) and mobile app (EAS).

**Architecture:** All five subsystems build on existing infrastructure — new endpoints bolt onto `membership.routes.js` and `analytics.routes.js`, UI additions extend existing pages, and CI/CD lives entirely in `.github/workflows/`. No new Prisma models. No new pages (except GitHub workflow files). All automation is code-push triggered.

**Tech Stack:** Express + Prisma (backend), React + React Query v5 + Tailwind (staff portal), pdfkit (invoice PDF), GitHub Actions + Vercel CLI (member portal CI), GitHub Actions + EAS CLI (mobile CI).

---

## File Map

| Action   | Path | Responsibility |
|----------|------|----------------|
| Modify   | `backend/src/controllers/membership.controller.js` | Add `getTopUpRequests`, `updateTopUpRequest`, `getMembershipInvoice` |
| Modify   | `backend/src/routes/membership.routes.js` | Add top-up and invoice routes |
| Modify   | `backend/src/controllers/analytics.controller.js` | Add `getWasteTrend`, `getStockHealth` |
| Modify   | `backend/src/routes/analytics.routes.js` | Add waste trend and stock health routes |
| Modify   | `web/src/lib/api.js` | Add `membershipApi.getTopUpRequests`, `membershipApi.updateTopUpRequest`, `membershipApi.getInvoice`, `analyticsApi.wasteTrend`, `analyticsApi.stockHealth` |
| Modify   | `web/src/pages/staff/DashboardLayout.jsx` | Add pending top-up badge on Memberships nav item |
| Modify   | `web/src/pages/staff/MembershipsPage.jsx` | Add pending top-up review panel + invoice download button |
| Modify   | `web/src/pages/staff/AnalyticsPage.jsx` | Add waste trend chart + stock health section |
| Create   | `.github/workflows/deploy-member-portal.yml` | Auto-deploy member-portal to Vercel on push |
| Create   | `.github/workflows/eas-preview-build.yml` | Auto-build mobile APK via EAS on push |

---

### Task 1: Top-up request API endpoints

**Files:**
- Modify: `backend/src/controllers/membership.controller.js`
- Modify: `backend/src/routes/membership.routes.js`

- [ ] **Step 1: Add `getTopUpRequests` and `updateTopUpRequest` to the controller**

Open `backend/src/controllers/membership.controller.js`. Add these two exports at the bottom of the file:

```js
// GET /api/memberships/topup-requests?status=pending
export async function getTopUpRequests(req, res, next) {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const requests = await prisma.topUpRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        membership: {
          select: { id: true, companyName: true, whatsapp: true, tier: true, drinksRemaining: true },
        },
      },
    });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/memberships/topup-requests/:requestId
export async function updateTopUpRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const schema = z.object({
      status: z.enum(['acknowledged', 'fulfilled']),
    });
    const { status } = schema.parse(req.body);

    const existing = await prisma.topUpRequest.findUnique({ where: { id: requestId } });
    if (!existing) return res.status(404).json({ error: 'Top-up request not found' });

    const updated = await prisma.topUpRequest.update({
      where: { id: requestId },
      data: {
        status,
        acknowledgedAt: status === 'acknowledged' || status === 'fulfilled' ? new Date() : undefined,
      },
    });
    res.json({ request: updated });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Register the new routes**

Open `backend/src/routes/membership.routes.js`. Add the two new imports and routes. The file currently imports from `membership.controller.js` — add the new exports there:

```js
// At the top, add to the existing import from membership.controller.js:
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
  getTopUpRequests,
  updateTopUpRequest,
} from '../controllers/membership.controller.js';
```

Add the routes before `export default router`:

```js
// Top-up request management (owner only)
router.get('/topup-requests',            authenticate, requireOwner, getTopUpRequests);
router.patch('/topup-requests/:requestId', authenticate, requireOwner, updateTopUpRequest);
```

**Important:** These two routes must be placed BEFORE the `/:id` parameterised routes (currently around line 25) so Express matches `/topup-requests` literally before treating it as an `:id` param. Add them before the `router.post('/', ...)` block.

- [ ] **Step 3: Test the endpoints**

Start the backend:
```bash
cd "x:/Fika system/backend"
npm run dev
```

In a second terminal, get an owner JWT and test:
```bash
# Login as owner
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"role":"owner","pin":"<owner-pin>"}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")

curl -s http://localhost:4000/api/memberships/topup-requests \
  -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).requests?.length,'requests found'))"
```

Expected output: `0 requests found` (or a number if there are existing top-up requests in the DB).

- [ ] **Step 4: Commit**

```bash
cd "x:/Fika system"
git add backend/src/controllers/membership.controller.js backend/src/routes/membership.routes.js
git commit -m "feat: add top-up request management API endpoints"
```

---

### Task 2: Top-up requests UI — badge and review panel

**Files:**
- Modify: `web/src/lib/api.js`
- Modify: `web/src/pages/staff/DashboardLayout.jsx`
- Modify: `web/src/pages/staff/MembershipsPage.jsx`

- [ ] **Step 1: Add API methods to api.js**

Open `web/src/lib/api.js`. In the `membershipApi` object, add two new methods after `getQr`:

```js
getTopUpRequests: (status) => api.get('/memberships/topup-requests', { params: status ? { status } : {} }),
updateTopUpRequest: (requestId, status) => api.patch(`/memberships/topup-requests/${requestId}`, { status }),
```

- [ ] **Step 2: Add pending badge to DashboardLayout**

Open `web/src/pages/staff/DashboardLayout.jsx`. Add the React Query import at the top alongside the existing imports:

```js
import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../../lib/api.js';
```

In `SidebarContent`, update the props signature to accept `pendingTopUps`:

```js
function SidebarContent({ owner, onNav, onLogout, user, pendingTopUps }) {
```

Inside `SidebarContent`, replace the nav link rendering block to show a badge for Memberships. Find the `NavLink` render inside `.map(({ to, label, end }) => ...)` and change it to:

```jsx
<NavLink
  key={to}
  to={to}
  end={end}
  onClick={onNav}
  className={({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${
      isActive
        ? 'bg-secondary text-white shadow-sm'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`
  }
>
  <span className="flex-1">{label}</span>
  {label === 'Memberships' && pendingTopUps > 0 && (
    <span className="text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
      {pendingTopUps > 9 ? '9+' : pendingTopUps}
    </span>
  )}
</NavLink>
```

In `DashboardLayout`, add the pending count query and pass it to `SidebarContent`:

```jsx
export function DashboardLayout() {
  const navigate = useNavigate();
  const user     = getUser();
  const owner    = isOwner();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: topUpData } = useQuery({
    queryKey:       ['topup-pending-count'],
    queryFn:        () => membershipApi.getTopUpRequests('pending').then((r) => r.data),
    enabled:        owner,
    refetchInterval: 60_000,
    staleTime:       30_000,
  });
  const pendingTopUps = topUpData?.requests?.length ?? 0;

  function handleLogout() {
    clearSession();
    navigate('/staff/login', { replace: true });
  }

  const initials = user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '??';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 flex-shrink-0">
        <SidebarContent owner={owner} onNav={() => {}} onLogout={handleLogout} user={user} pendingTopUps={pendingTopUps} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-white shadow-xl">
            <SidebarContent owner={owner} onNav={() => setSidebarOpen(false)} onLogout={handleLogout} user={user} pendingTopUps={pendingTopUps} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col gap-1.5 p-1.5 rounded-lg hover:bg-gray-100"
          >
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-secondary rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[10px]">F</span>
            </div>
            <span className="font-black text-secondary tracking-widest text-sm">FIKA</span>
          </div>
          <div className="relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${owner ? 'bg-secondary' : 'bg-primary'}`}>
              {initials}
            </div>
            {pendingTopUps > 0 && (
              <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                {pendingTopUps > 9 ? '9+' : pendingTopUps}
              </span>
            )}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add pending top-up review panel to MembershipsPage**

Open `web/src/pages/staff/MembershipsPage.jsx`.

Add `updateTopUpRequest` to the mutation. Find the existing `useMutation` for `updateMember` and add a new mutation after it:

```js
const ackTopUp = useMutation({
  mutationFn: ({ requestId, status }) => membershipApi.updateTopUpRequest(requestId, status),
  onSuccess:  () => {
    qc.invalidateQueries({ queryKey: ['topup-requests-memberships'] });
    qc.invalidateQueries({ queryKey: ['topup-pending-count'] });
  },
});
```

Add a query for top-up requests at the top of `MembershipsPage` (alongside the existing `memberships` query):

```js
const { data: topUpData } = useQuery({
  queryKey: ['topup-requests-memberships'],
  queryFn:  () => membershipApi.getTopUpRequests('pending').then((r) => r.data),
  staleTime: 30_000,
  refetchInterval: 60_000,
});
const pendingRequests = topUpData?.requests ?? [];
```

Add the pending top-up panel just before the `<div className="grid lg:grid-cols-3 gap-6">` line (around line 426 in the current file):

```jsx
{pendingRequests.length > 0 && (
  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-amber-800">
        {pendingRequests.length} Pending Top-up Request{pendingRequests.length !== 1 ? 's' : ''}
      </span>
    </div>
    <div className="space-y-2">
      {pendingRequests.map((req) => (
        <div key={req.id} className="bg-white rounded-xl border border-amber-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{req.membership.companyName}</p>
            {req.message && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{req.message}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-0.5">
              {new Date(req.requestedAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {req.membership.drinksRemaining != null && ` · ${req.membership.drinksRemaining} drinks remaining`}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => ackTopUp.mutate({ requestId: req.id, status: 'acknowledged' })}
              disabled={ackTopUp.isPending}
              className="px-3 py-1.5 text-xs font-bold border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              Acknowledge
            </button>
            <button
              onClick={() => ackTopUp.mutate({ requestId: req.id, status: 'fulfilled' })}
              disabled={ackTopUp.isPending}
              className="px-3 py-1.5 text-xs font-bold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
            >
              Fulfilled ✓
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Start dev server and verify**

```bash
cd "x:/Fika system/web"
npm run dev
```

Open http://localhost:5173/staff/memberships (log in as owner first). Expected:
- If there are pending top-up requests: amber panel appears above the membership table with Acknowledge/Fulfilled buttons
- Memberships nav link in sidebar shows a red badge with the count
- Clicking "Fulfilled ✓" removes that card from the panel immediately (React Query invalidation)

- [ ] **Step 5: Commit**

```bash
cd "x:/Fika system"
git add web/src/lib/api.js web/src/pages/staff/DashboardLayout.jsx web/src/pages/staff/MembershipsPage.jsx
git commit -m "feat: add top-up request review panel and nav badge in staff portal"
```

---

### Task 3: Waste trend & stock health analytics endpoints

**Files:**
- Modify: `backend/src/controllers/analytics.controller.js`
- Modify: `backend/src/routes/analytics.routes.js`

- [ ] **Step 1: Add `getWasteTrend` and `getStockHealth` to analytics controller**

Open `backend/src/controllers/analytics.controller.js`. Add these two exports at the bottom:

```js
// GET /api/analytics/waste-trend
// Returns waste cost grouped by month for the last 6 calendar months
export async function getWasteTrend(req, res, next) {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const entries = await prisma.wasteEntry.findMany({
      where:   { date: { gte: sixMonthsAgo } },
      select:  { date: true, category: true, cost: true },
      orderBy: { date: 'asc' },
    });

    // Build month buckets
    const buckets = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      buckets[key] = {
        month:      d.getMonth() + 1,
        year:       d.getFullYear(),
        label:      d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        totalCost:  0,
        byCategory: {},
      };
    }

    for (const e of entries) {
      const d   = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!buckets[key]) continue;
      buckets[key].totalCost += e.cost ?? 0;
      buckets[key].byCategory[e.category] =
        (buckets[key].byCategory[e.category] ?? 0) + (e.cost ?? 0);
    }

    res.json({ trend: Object.values(buckets) });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/stock-health
// Returns items at or below reorder level, sorted by urgency (quantity/reorderLevel ratio)
export async function getStockHealth(req, res, next) {
  try {
    const all = await prisma.stockItem.findMany({
      orderBy: { quantity: 'asc' },
    });

    const critical = all
      .filter((s) => s.reorderLevel > 0 && s.quantity <= s.reorderLevel)
      .map((s) => ({
        id:           s.id,
        name:         s.name,
        category:     s.category,
        unit:         s.unit,
        quantity:     s.quantity,
        reorderLevel: s.reorderLevel,
        costPerUnit:  s.costPerUnit,
        pct:          Math.round((s.quantity / s.reorderLevel) * 100),
      }))
      .sort((a, b) => a.pct - b.pct);

    const totalItems   = all.length;
    const criticalCount = critical.length;

    res.json({ critical, totalItems, criticalCount });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Register routes in analytics.routes.js**

Open `backend/src/routes/analytics.routes.js`. Replace the content with:

```js
import { Router } from 'express';
import { getMrr, getRenewals, getLeaderboard, getWasteTrend, getStockHealth } from '../controllers/analytics.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, requireOwner);

router.get('/mrr',          getMrr);
router.get('/renewals',     getRenewals);
router.get('/leaderboard',  getLeaderboard);
router.get('/waste-trend',  getWasteTrend);
router.get('/stock-health', getStockHealth);

export default router;
```

- [ ] **Step 3: Test the endpoints**

```bash
curl -s http://localhost:4000/api/analytics/waste-trend \
  -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).trend?.length,'months'))"
```

Expected: `6 months`

```bash
curl -s http://localhost:4000/api/analytics/stock-health \
  -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{ const d2=JSON.parse(d); console.log(d2.criticalCount,'critical of',d2.totalItems,'items') })"
```

Expected: `0 critical of N items` (unless items are below reorder level in the DB).

- [ ] **Step 4: Add to api.js**

Open `web/src/lib/api.js`. In `analyticsApi`, add:

```js
wasteTrend:  () => api.get('/analytics/waste-trend'),
stockHealth: () => api.get('/analytics/stock-health'),
```

- [ ] **Step 5: Commit**

```bash
cd "x:/Fika system"
git add backend/src/controllers/analytics.controller.js backend/src/routes/analytics.routes.js web/src/lib/api.js
git commit -m "feat: add waste trend (6-month) and stock health analytics endpoints"
```

---

### Task 4: Waste trend and stock health in AnalyticsPage

**Files:**
- Modify: `web/src/pages/staff/AnalyticsPage.jsx`

- [ ] **Step 1: Add waste trend and stock health queries**

Open `web/src/pages/staff/AnalyticsPage.jsx`. Add two new queries inside `AnalyticsPage`, after the existing three queries:

```js
const { data: waste } = useQuery({
  queryKey: ['analytics-waste-trend'],
  queryFn:  () => analyticsApi.wasteTrend().then((r) => r.data),
  staleTime: 120_000,
});

const { data: stock } = useQuery({
  queryKey: ['analytics-stock-health'],
  queryFn:  () => analyticsApi.stockHealth().then((r) => r.data),
  staleTime: 120_000,
});
```

- [ ] **Step 2: Add waste trend section to the JSX**

In `AnalyticsPage`'s return block, add this section after the existing leaderboard section (before the closing `</div>`):

```jsx
{/* Waste Trend — last 6 months */}
<section>
  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Waste Cost Trend (Last 6 Months)</h2>
  {!waste?.trend?.length ? (
    <p className="text-sm text-gray-400">No waste data recorded yet.</p>
  ) : (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="space-y-3">
        {waste.trend.map((m) => {
          const maxCost = Math.max(...waste.trend.map((t) => t.totalCost), 1);
          const pct     = Math.round((m.totalCost / maxCost) * 100);
          return (
            <div key={`${m.year}-${m.month}`} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 w-14 text-right">{m.label}</span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-400 transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                >
                  {pct > 15 && (
                    <span className="text-[10px] text-white font-bold">
                      NPR {Math.round(m.totalCost).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              {pct <= 15 && (
                <span className="text-xs text-gray-500 w-20">
                  NPR {Math.round(m.totalCost).toLocaleString()}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Total 6-month waste: NPR {Math.round(waste.trend.reduce((s, m) => s + m.totalCost, 0)).toLocaleString()}
      </p>
    </div>
  )}
</section>

{/* Stock Health */}
<section>
  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
    Stock Health
    {stock?.criticalCount > 0 && (
      <span className="ml-2 text-xs font-bold text-red-600 normal-case">
        {stock.criticalCount} item{stock.criticalCount !== 1 ? 's' : ''} need restocking
      </span>
    )}
  </h2>
  {!stock ? (
    <p className="text-sm text-gray-400">Loading…</p>
  ) : stock.criticalCount === 0 ? (
    <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4 text-sm text-green-700 font-medium">
      All {stock.totalItems} stock items are above reorder levels. ✓
    </div>
  ) : (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Item</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Stock</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Reorder at</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stock.critical.map((item) => (
            <tr key={item.id} className={item.pct === 0 ? 'bg-red-50' : ''}>
              <td className="px-4 py-3">
                <p className="font-semibold text-gray-900">{item.name}</p>
              </td>
              <td className="px-4 py-3 text-gray-500 hidden sm:table-cell capitalize">{item.category}</td>
              <td className="px-4 py-3 text-right">
                <span className={`font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {item.quantity} {item.unit}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-gray-400 text-xs">{item.reorderLevel} {item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>
```

- [ ] **Step 3: Verify in browser**

Navigate to http://localhost:5173/staff/analytics. Expected:
- Waste trend section shows 6 horizontal bars (one per month, all zero if no waste data)
- Stock health section shows green "all clear" if no items are below reorder, or a table of critical items

- [ ] **Step 4: Commit**

```bash
cd "x:/Fika system"
git add web/src/pages/staff/AnalyticsPage.jsx
git commit -m "feat: add waste trend chart and stock health table to AnalyticsPage"
```

---

### Task 5: Invoice PDF backend endpoint

**Files:**
- Modify: `backend/package.json` (add pdfkit)
- Modify: `backend/src/controllers/membership.controller.js`
- Modify: `backend/src/routes/membership.routes.js`

- [ ] **Step 1: Install pdfkit**

```bash
cd "x:/Fika system/backend"
npm install pdfkit
npm install --save-dev @types/pdfkit
```

Expected: `pdfkit` and `@types/pdfkit` appear in `package.json`.

- [ ] **Step 2: Add `getMembershipInvoice` to the controller**

Open `backend/src/controllers/membership.controller.js`. Add this import at the top of the file, alongside the existing imports:

```js
import PDFDocument from 'pdfkit';
```

Add this export at the bottom of the file:

```js
// GET /api/memberships/:id/invoice?month=4&year=2026
export async function getMembershipInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const now = new Date();
    const { month, year } = z.object({
      month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
      year:  z.coerce.number().int().min(2020).default(now.getFullYear()),
    }).parse(req.query);

    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    // Fetch last 3 months of usage
    const usageMonths = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(year, month - 1 - i, 1);
      usageMonths.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }
    const usageData = await Promise.all(
      usageMonths.map(async ({ month: m, year: y }) => {
        const agg = await prisma.drinkRedemption.aggregate({
          where: { membershipId: id, month: m, year: y },
          _sum:  { count: true },
        });
        const label = new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        return { label, total: agg._sum.count ?? 0 };
      })
    );

    const safeCompany = membership.companyName.replace(/[^a-z0-9\-_ ]/gi, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="fika-invoice-${safeCompany}-${year}-${month}.pdf"`,
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // ── Header ────────────────────────────────────
    doc.fontSize(22).font('Helvetica-Bold').text('FIKA TAKEAWAY', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Membership Statement', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.6);

    // ── Membership details ────────────────────────
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Membership Details');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    const details = [
      ['Company',        membership.companyName],
      ['Contact Person', membership.contactPerson ?? '—'],
      ['Tier',           membership.tier],
      ['Status',         membership.status],
      ['Monthly Fee',    membership.monthlyFee != null ? `NPR ${Number(membership.monthlyFee).toLocaleString()}` : '—'],
      ['Renewal Date',   membership.renewalDate
        ? new Date(membership.renewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—'],
      ['Payment Status', membership.paymentStatus ?? '—'],
    ];
    for (const [label, value] of details) {
      doc.fillColor('#6b7280').text(label, { continued: true, width: 150 });
      doc.fillColor('#000').text(value);
    }
    doc.moveDown(0.8);

    // ── Current balance ───────────────────────────
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Current Balance');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#6b7280').text('Drinks Remaining', { continued: true, width: 150 });
    doc.fillColor('#000').text(membership.drinksRemaining != null ? String(membership.drinksRemaining) : '—');
    doc.fillColor('#6b7280').text('Drinks Used (lifetime)', { continued: true, width: 150 });
    doc.fillColor('#000').text(String(membership.drinksUsed ?? 0));
    if ((membership.rolloverDrinks ?? 0) > 0) {
      doc.fillColor('#6b7280').text('Rollover Drinks', { continued: true, width: 150 });
      doc.fillColor('#000').text(String(membership.rolloverDrinks));
    }
    doc.moveDown(0.8);

    // ── Usage history ─────────────────────────────
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Recent Usage (Last 3 Months)');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    for (const { label, total } of usageData) {
      doc.fillColor('#6b7280').text(label, { continued: true, width: 200 });
      doc.fillColor('#000').text(`${total} drink${total !== 1 ? 's' : ''}`);
    }
    doc.moveDown(1);

    // ── Footer ────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.4);
    doc.fillColor('#9ca3af').fontSize(9)
      .text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, { align: 'center' });
    doc.text('Fika Takeaway — Kathmandu, Nepal', { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 3: Register the invoice route**

Open `backend/src/routes/membership.routes.js`. Add `getMembershipInvoice` to the controller import and add the route:

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
  getTopUpRequests,
  updateTopUpRequest,
  getMembershipInvoice,
} from '../controllers/membership.controller.js';
```

Add the route (with the parameterised routes, around line 42):

```js
router.get('/:id/invoice', authenticate, requireOwner, getMembershipInvoice);
```

- [ ] **Step 4: Test PDF generation**

```bash
curl -s -o /tmp/test-invoice.pdf \
  "http://localhost:4000/api/memberships/<A_VALID_MEMBERSHIP_ID>/invoice" \
  -H "Authorization: Bearer $TOKEN"

# Verify it's a PDF (starts with %PDF)
head -c 4 /tmp/test-invoice.pdf
```

Expected: `%PDF`

- [ ] **Step 5: Commit**

```bash
cd "x:/Fika system"
git add backend/package.json backend/package-lock.json backend/src/controllers/membership.controller.js backend/src/routes/membership.routes.js
git commit -m "feat: add membership invoice PDF endpoint using pdfkit"
```

---

### Task 6: Invoice download button in staff portal

**Files:**
- Modify: `web/src/lib/api.js`
- Modify: `web/src/pages/staff/MembershipsPage.jsx`

- [ ] **Step 1: Add getInvoice to api.js**

Open `web/src/lib/api.js`. In `membershipApi`, add after `updateTopUpRequest`:

```js
getInvoice: (id, month, year) =>
  api.get(`/memberships/${id}/invoice`, {
    params:       { month, year },
    responseType: 'blob',
  }),
```

- [ ] **Step 2: Add download handler and button to the detail panel**

Open `web/src/pages/staff/MembershipsPage.jsx`.

Add an invoice download state and handler inside the `MembershipsPage` component, after the existing `ackTopUp` mutation:

```js
const [invoiceLoading, setInvoiceLoading] = useState(false);

async function handleDownloadInvoice(membership) {
  setInvoiceLoading(membership.id);
  try {
    const now = new Date();
    const res = await membershipApi.getInvoice(membership.id, now.getMonth() + 1, now.getFullYear());
    const url = URL.createObjectURL(res.data);
    const a   = document.createElement('a');
    a.href    = url;
    const safeName = membership.companyName.replace(/[^a-z0-9\-_ ]/gi, '_');
    a.download = `fika-invoice-${safeName}-${now.getFullYear()}-${now.getMonth() + 1}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Silently ignore — PDF download failures are non-critical
  } finally {
    setInvoiceLoading(null);
  }
}
```

In the detail panel's action buttons section (around line 512, inside `selMem ? (...)`), add an invoice button after the existing three action buttons (Log drink / Usage / Portal):

```jsx
{/* Action buttons */}
<div className="flex gap-2">
  <button
    onClick={() => setRedeemTarget(selMem)}
    className="flex-1 py-2 bg-secondary text-white rounded-xl text-sm font-bold hover:bg-secondary/90 transition-colors"
  >
    Log drink
  </button>
  <button
    onClick={() => setUsageTarget(selMem.id)}
    className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-bold text-muted hover:bg-gray-50 transition-colors"
  >
    Usage
  </button>
  <button
    onClick={() => setPortalTarget(selMem)}
    className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-bold text-muted hover:bg-gray-50 transition-colors"
  >
    Portal
  </button>
</div>
<button
  onClick={() => handleDownloadInvoice(selMem)}
  disabled={invoiceLoading === selMem.id}
  className="w-full py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
>
  {invoiceLoading === selMem.id ? 'Generating PDF…' : '⬇ Download Invoice PDF'}
</button>
```

- [ ] **Step 3: Verify in browser**

Select a membership in the staff portal. Verify:
- "⬇ Download Invoice PDF" button appears below the main action buttons
- Clicking it shows "Generating PDF…" briefly then triggers a PDF download
- The downloaded file opens as a valid PDF with company details, balance, and last 3 months usage

- [ ] **Step 4: Commit**

```bash
cd "x:/Fika system"
git add web/src/lib/api.js web/src/pages/staff/MembershipsPage.jsx
git commit -m "feat: add invoice PDF download button to membership detail panel"
```

---

### Task 7: GitHub Actions — Vercel member portal auto-deploy

**Files:**
- Create: `.github/workflows/deploy-member-portal.yml`

This workflow triggers automatically on every push to `main` that touches `member-portal/**`. No manual deploys needed after one-time secret setup.

**One-time secret setup (do this once in GitHub repo settings):**
Settings → Secrets and variables → Actions → New repository secret:
- `VERCEL_TOKEN` — from https://vercel.com/account/tokens (create a new one)
- `VERCEL_ORG_ID` — run `npx vercel whoami` after `npx vercel login`, or from `.vercel/project.json` after linking
- `VERCEL_PROJECT_ID` — from `.vercel/project.json` after running `npx vercel link` inside `member-portal/`

To get the IDs without manual linking:
```bash
cd "x:/Fika system/member-portal"
npx vercel link --yes
cat .vercel/project.json
# Output: {"projectId":"prj_xxx","orgId":"team_xxx"}
```

- [ ] **Step 1: Create the workflow directory and file**

```bash
mkdir -p "x:/Fika system/.github/workflows"
```

Create `.github/workflows/deploy-member-portal.yml`:

```yaml
name: Deploy Member Portal

on:
  push:
    branches: [main]
    paths:
      - 'member-portal/**'

jobs:
  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: member-portal/package-lock.json

      - name: Install dependencies
        working-directory: member-portal
        run: npm install --no-workspaces

      - name: Build
        working-directory: member-portal
        run: npm run build
        env:
          VITE_API_URL: https://desirable-vision-production-b9ee.up.railway.app

      - name: Deploy to Vercel (production)
        working-directory: member-portal
        run: npx vercel --prod --yes --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID:     ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

- [ ] **Step 2: Verify the workflow file is valid YAML**

```bash
cd "x:/Fika system"
node -e "const yaml = require('js-yaml'); yaml.load(require('fs').readFileSync('.github/workflows/deploy-member-portal.yml', 'utf8')); console.log('YAML valid')" 2>/dev/null || python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-member-portal.yml')); print('YAML valid')"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
cd "x:/Fika system"
git add .github/workflows/deploy-member-portal.yml
git commit -m "ci: add GitHub Actions workflow for automatic Vercel member portal deploy"
```

---

### Task 8: GitHub Actions — EAS mobile preview build

**Files:**
- Create: `.github/workflows/eas-preview-build.yml`

This workflow triggers automatically on every push to `main` that touches `mobile/**`. It builds an Android APK (preview profile) via EAS and posts the download URL as a workflow output. No manual builds needed after one-time setup.

**One-time secret setup:**
Settings → Secrets and variables → Actions → New repository secret:
- `EXPO_TOKEN` — from https://expo.dev/accounts/[your-account]/settings/access-tokens (create a new Personal Access Token)

The `eas.json` already has a `preview` profile configured for Android APK internal distribution. No changes needed there.

- [ ] **Step 1: Create the EAS build workflow**

Create `.github/workflows/eas-preview-build.yml`:

```yaml
name: EAS Preview Build (Android)

on:
  push:
    branches: [main]
    paths:
      - 'mobile/**'

jobs:
  build:
    name: Build Android APK (EAS Preview)
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Setup Expo and EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        working-directory: mobile
        run: npm install

      - name: Build Android APK (preview)
        working-directory: mobile
        run: eas build --platform android --profile preview --non-interactive --no-wait
```

`--no-wait` submits the build to EAS cloud and exits immediately. The build runs in EAS's cloud infrastructure — no long CI runner needed. Build status and APK download are available at https://expo.dev/accounts/[account]/projects/fika-takeaway/builds.

- [ ] **Step 2: Verify the workflow file**

```bash
python3 -c "import yaml; yaml.safe_load(open('x:/Fika system/.github/workflows/eas-preview-build.yml')); print('YAML valid')"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit and push**

```bash
cd "x:/Fika system"
git add .github/workflows/eas-preview-build.yml
git commit -m "ci: add GitHub Actions workflow for automatic EAS preview APK build"
git push origin main
```

After pushing, go to the GitHub repo → Actions tab. Both new workflows will appear. They will trigger on their next matching push.

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Staff see pending top-up requests automatically (no manual checking) | Task 1 + 2 |
| Nav badge auto-updates every 60s | Task 2 |
| Owner can acknowledge/fulfill top-up requests in one click | Task 2 |
| Waste cost trend over last 6 months | Task 3 + 4 |
| Stock health alert (items below reorder level) | Task 3 + 4 |
| Invoice PDF download for any membership | Task 5 + 6 |
| Member portal auto-deploys on git push | Task 7 |
| Mobile APK auto-builds on git push | Task 8 |

**Placeholder scan:** No TBDs, no "handle edge cases", all steps have complete code. ✓

**Type consistency:**
- `getTopUpRequests` → returns `{ requests }` → `topUpData?.requests` in frontend ✓
- `updateTopUpRequest(requestId, status)` → `PATCH /topup-requests/:requestId` → `{ status }` body ✓
- `getWasteTrend` → `{ trend: [...{ month, year, label, totalCost, byCategory }] }` → `waste.trend` in UI ✓
- `getStockHealth` → `{ critical, totalItems, criticalCount }` → `stock.critical`, `stock.criticalCount` in UI ✓
- `getMembershipInvoice` → pipes PDF to response → `responseType: 'blob'` in axios → `URL.createObjectURL(res.data)` ✓
- `invoiceLoading` is `membership.id | null` → `invoiceLoading === selMem.id` guards correctly ✓
