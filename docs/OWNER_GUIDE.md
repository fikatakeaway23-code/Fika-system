# Owner Guide — Fika Takeaway System

Complete reference for the owner dashboard (mobile app + web).

---

## Logging In

**Mobile app:** Tap **Owner** → enter PIN `0000` (change this immediately)  
**Web dashboard:** Go to `https://your-app.vercel.app/staff/login` → tap Owner → enter PIN

---

## Dashboard Overview

The first screen shows:
- **Today's Sales** — POS total for the day
- **Drinks Today** — total drinks served across both shifts
- **Active Members** — corporate memberships currently active
- **Discrepancies** — unresolved cash discrepancies (red alert if > 0)
- **Weekly Revenue Chart** — 7-day bar chart
- **Recent Shifts** — last 3 with status badges

---

## Finance Entry

Every day, enter the POS figures:

1. Go to **Finance** tab
2. Enter **POS Total**, **POS Cash**, **POS Digital**
3. Enter what the barista reported: **Cash Collected**, **Digital Confirmed**
4. Tap **Save Finance Record**

If the difference between POS cash and barista-reported cash is over **NPR 50**, the system flags it as a discrepancy and shows you a reconciliation screen.

### Resolving Discrepancies

The discrepancy screen shows:
- POS figures vs barista-reported figures
- The NPR difference
- Guidance on what to check

Common causes:
- Barista miscounted the drawer
- A sale was entered wrong in the POS
- A refund or void wasn't recorded

After investigating, acknowledge the discrepancy. The record stays flagged in the Finance tab for audit purposes.

---

## Reviewing Shifts

Go to **Shifts** tab (mobile) or **Shifts** page (web).

Filter by Today / This Week / This Month.

Tap any shift row to see full details:
- Cash figures
- Espresso dial-in results
- Drinks count and popular drink
- Equipment issues
- Shift notes from the barista

---

## Monthly Reports

Go to **More → Monthly Report** (mobile) or **Reports** (web).

Use the ← → arrows to navigate months.

Shows:
- **Revenue** — total, cash, digital, net profit
- **Expenses** by category
- **Operations** — shifts completed, avg drinks/shift
- **Waste** — calibration shots, milk, remade drinks, unsold pastries
- **Top Drinks** — ranked by popularity

Use this monthly to review performance and adjust operations.

---

## Expenses

### Reviewing barista expenses

Go to **More → Expenses** (mobile) or **Expenses** (web).

Baristas log expenses on their shift. You see all of them here, organised by month and category.

### Adding your own expenses

Use the same screen to log owner-entered expenses (e.g. supplier invoices, equipment repairs).

### Deleting an expense

- Mobile: long-press the expense row
- Web: hover over the row and click ✕

---

## Corporate Memberships

Go to **More → Memberships** (mobile) or **Memberships** (web).

### Adding a membership

Tap **+ Add** and fill in:
- Company name
- Contact person + WhatsApp
- Tier (Individual / Team / Corporate / Enterprise)
- Monthly fee, staff count, renewal date

### Tracking drink usage

Each membership shows a usage bar: **drinks used / total allotment**.

To record a drink:
- Mobile: tap the membership → tap **+ Drink**
- Web: click the membership row → click **+ Drink**

Do this each time a corporate staff member picks up a drink.

### Allotments by tier

| Tier         | Drinks/month | Price      |
|--------------|-------------|------------|
| Individual   | 20          | NPR 2,500  |
| Team Pack    | 50          | NPR 8,000  |
| Corporate    | 100         | NPR 15,000 |
| Enterprise   | 200         | NPR 25,000 |

### Renewing / changing status

On the membership detail screen, tap the status buttons: **active** / **expired** / **cancelled**.

---

## HR Records

Go to **More → HR Records** (mobile) or **HR** (web).

Four tabs:

### Attendance
Log each day: arrival time, late minutes, overtime, absent.

### Leave
Log approved leave: sick, personal, annual, unpaid.
Toggle **Approved by owner** to confirm you authorised it.

### Incidents
Log any performance issues or commendations.
Types: late, no-show, misconduct, complaint, praise, other.

### Salary
Record monthly salary payments:
- Base salary
- Bonus
- Deductions
- Payment date

---

## Settings

Go to **More → Settings** (mobile).

### Changing PINs

You can change the PIN for any staff member:
1. Select whose PIN to change
2. Enter your own (owner) PIN to authorise
3. Enter the new PIN twice

### Notion Sync

Tap **↑ Sync All to Notion** to push all records to the Notion databases.

See `docs/NOTION_SYNC.md` for database IDs and setup.

---

## Web Dashboard vs Mobile App

| Feature              | Mobile | Web |
|----------------------|--------|-----|
| Dashboard overview   | ✓      | ✓   |
| Shifts review        | ✓      | ✓   |
| Finance entry        | ✓      | ✓   |
| Discrepancy screen   | ✓      | ✓   |
| Monthly report       | ✓      | ✓ (charts) |
| Expenses             | ✓      | ✓   |
| Memberships          | ✓      | ✓   |
| HR records           | ✓      | ✓   |
| Notion sync          | ✓ (mobile Settings) | — |
| Change PINs          | ✓ (mobile Settings) | — |

Use the **web dashboard** for in-depth analysis and report reviews.  
Use the **mobile app** for day-to-day operations.

---

## Daily Checklist for the Owner

- [ ] Review both shift reports (check notes for issues)
- [ ] Enter POS figures in Finance (or verify barista entry)
- [ ] Check for cash discrepancies
- [ ] Update corporate drink counts if members visited
- [ ] Review any expense logs from baristas

## Weekly Checklist

- [ ] Review weekly revenue vs last week
- [ ] Check waste trends — rising remade drinks or milk waste may mean calibration issues
- [ ] Review HR attendance records
- [ ] Sync to Notion for backup

## Monthly Checklist

- [ ] Run monthly report — compare revenue, expenses, net profit
- [ ] Process salary payments and log in HR
- [ ] Renew or update corporate memberships
- [ ] Review discrepancy log for patterns
