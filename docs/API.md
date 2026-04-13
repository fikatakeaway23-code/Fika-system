# Fika Takeaway — API Reference

Base URL: `https://your-backend.up.railway.app/api`  
All protected routes require: `Authorization: Bearer <token>`

---

## Authentication

### POST /auth/login
Login with role and PIN. Returns JWT.

**Body**
```json
{ "role": "owner", "pin": "0000" }
```
Roles: `barista_am` · `barista_pm` · `owner`

**Response 200**
```json
{
  "token": "eyJ...",
  "user": { "id": "...", "name": "Owner", "role": "owner" }
}
```

**Errors:** `401` Wrong PIN · `400` Missing fields

---

### POST /auth/change-pin
Change a user's PIN. Owner can change any PIN; baristas can only change their own.

**Body**
```json
{ "role": "barista_am", "currentPin": "1111", "newPin": "5678" }
```
Owner omits `currentPin` when changing another user's PIN.

---

## Shifts

### GET /shifts
List shifts. Role-filtered automatically.

**Query params:** `from` · `to` (YYYY-MM-DD) · `limit` · `offset`

**Response 200** — array of shift objects

---

### GET /shifts/date/:date
Get all shifts for a specific date.

---

### GET /shifts/:id
Get single shift by ID.

---

### POST /shifts
Create a new shift (barista only).

**Body**
```json
{ "date": "2025-01-15", "shiftType": "am" }
```

---

### PUT /shifts/:id
Update shift fields (barista: only own in-progress shifts).

**Body** — any subset of shift fields:
```json
{
  "openingFloat": 2000, "cashSales": 8500, "digitalSales": 3200,
  "closingCash": 10500, "drinksCount": 42, "popularDrink": "Iced Latte",
  "pastriesSold": 8, "shiftNotes": "...", "equipmentIssue": false
}
```

---

### POST /shifts/:id/submit
Mark a shift as submitted. Barista only. Cannot be undone.

---

## Inventory

### POST /inventory
Upsert inventory, waste, or espresso log for a shift.

**Body — Inventory**
```json
{
  "type": "inventory", "shiftId": "...",
  "beansOpening": 1200, "beansClosing": 450,
  "milkOpening": 8, "milkClosing": 2.5,
  "syrupsOk": true, "iceCreamTubs": 3,
  "bobaOk": true, "cupsRemaining": 45,
  "lidsRemaining": 40, "strawsOk": true, "bakeryRemaining": 2
}
```

**Body — Waste**
```json
{
  "type": "waste", "shiftId": "...",
  "calibrationShots": 3, "milkWasted": 200,
  "remadeDrinks": 1, "unsoldPastries": 2, "notes": "Foam too stiff"
}
```

**Body — Espresso**
```json
{
  "type": "espresso", "shiftId": "...",
  "dose": 18.5, "yield": 37, "extractionTime": 27,
  "tasteAssessment": "balanced"
}
```
`tasteAssessment` values: `sour` · `balanced` · `bitter` · `flat`

---

### GET /inventory/shift/:shiftId
Get all inventory records for a shift (returns `{ inventory, waste, espresso }`).

---

## Finance

### POST /finance
Create or update a finance record for a date.

**Body**
```json
{
  "date": "2025-01-15",
  "posTotal": 12500, "posCash": 8500, "posDigital": 4000,
  "baristaCashReported": 8450, "baristaDigitalReported": 4000
}
```
Backend auto-computes: `cashDiscrepancy` · `discrepancyFlag` (>50 NPR) · `netProfit`

---

### GET /finance
List finance records. Query: `from` · `to` · `month` · `year`

---

### GET /finance/date/:date
Get finance record for a specific date.

---

### GET /finance/monthly/:month/:year
Monthly finance summary.

---

### GET /finance/discrepancy
List all finance records where `discrepancyFlag = true`.

---

## Expenses

### POST /expenses
```json
{
  "name": "Milk delivery", "date": "2025-01-15",
  "category": "supplies", "amount": 1200,
  "paidBy": "shop_cash", "reimbursed": false,
  "receiptAvailable": true, "loggedBy": "barista_am",
  "month": 1, "year": 2025
}
```
Categories: `supplies` · `utilities` · `maintenance` · `transport` · `food` · `marketing` · `other`  
Paid by: `barista1` · `barista2` · `owner` · `shop_cash`

---

### GET /expenses
List expenses. Query: `date` · `month` · `year` · `category`

---

### GET /expenses/monthly/:month/:year
Returns `{ expenses: [...], byCategory: { supplies: 1200, ... }, total: 4500 }`

---

### PUT /expenses/:id · DELETE /expenses/:id
Update or delete an expense (owner only).

---

## Memberships

### POST /memberships
```json
{
  "companyName": "Kathmandu Corp", "contactPerson": "Ram Bahadur",
  "whatsapp": "+977 9812345678", "tier": "corporate",
  "staffCount": 20, "monthlyFee": 15000,
  "renewalDate": "2025-02-15", "status": "active"
}
```
Tiers: `individual` · `team` · `corporate` · `enterprise`

---

### GET /memberships
List memberships. Query: `status` · `tier`

---

### GET /memberships/:id · PUT /memberships/:id · DELETE /memberships/:id
Get, update, or delete a membership.

---

### POST /memberships/:id/drinks
Increment or decrement drink count.

**Body:** `{ "delta": 1 }` (use `-1` to decrement)

---

## HR Records

### POST /hr
**Body (attendance)**
```json
{
  "type": "attendance", "staffMemberId": "barista_am",
  "date": "2025-01-15", "arrivalTime": "2025-01-15T06:05:00Z",
  "lateMinutes": 5, "overtimeMinutes": 0, "absent": false
}
```

**Body (leave)**
```json
{
  "type": "leave", "staffMemberId": "barista_pm",
  "startDate": "2025-01-20", "endDate": "2025-01-22",
  "leaveType": "sick", "approvedByOwner": true
}
```
Leave types: `sick` · `personal` · `annual` · `unpaid` · `other`

**Body (incident)**
```json
{
  "type": "incident", "staffMemberId": "barista_am",
  "date": "2025-01-15", "incidentType": "late",
  "description": "Arrived 15 min late without notice", "actionTaken": "Verbal warning"
}
```
Incident types: `late` · `no_show` · `misconduct` · `complaint` · `praise` · `other`

**Body (salary)**
```json
{
  "type": "salary", "staffMemberId": "barista_am",
  "month": 1, "year": 2025,
  "baseSalary": 18000, "bonusAmount": 2000, "deductions": 500,
  "paymentDate": "2025-01-31"
}
```

---

### GET /hr
List records. Query: `type` · `staffMemberId`

---

### GET /hr/staff/:staffId
All HR records for a specific staff member.

---

### PUT /hr/:id
Update an HR record (owner only).

---

## Reports

### GET /reports/weekly
Returns 7-day array with `{ date, revenue, drinksCount, shiftsCompleted }` plus `summary`.

---

### GET /reports/monthly/:month/:year
Returns:
```json
{
  "revenue":    { "total": 0, "cash": 0, "digital": 0 },
  "expenses":   { "total": 0, "byCategory": {} },
  "operations": { "shiftsCompleted": 0, "avgDrinksPerShift": 0, "totalDrinks": 0, "totalPastries": 0 },
  "waste":      { "calibrationShots": 0, "milkWasted": 0, "remadeDrinks": 0, "unsoldPastries": 0 },
  "drinks":     [ { "name": "Iced Latte", "count": 18 } ]
}
```

---

### GET /reports/drinks
Top drinks ranked by `popularDrink` count. Query: `limit` (default 10)

---

## Notion Sync

### POST /notion/sync/:type/:id
Sync a single record to Notion.  
`type`: `shift` · `finance` · `expense` · `hr` · `membership`

---

### POST /notion/sync-all
Sync all records. Returns `{ synced: N, failed: M, errors: [...] }`.

---

### GET /notion/status
Recent sync history. Returns last 20 `NotionSync` records.

---

## Health

### GET /health
```json
{ "status": "ok", "timestamp": "2025-01-15T06:00:00.000Z" }
```

---

## Error Format

All errors return:
```json
{
  "error":   "Human-readable message",
  "details": [{ "field": "pin", "message": "Required" }]
}
```

Common status codes:
| Code | Meaning                              |
|------|--------------------------------------|
| 400  | Validation error (Zod)               |
| 401  | Missing or invalid JWT               |
| 403  | Insufficient role                    |
| 404  | Record not found                     |
| 409  | Duplicate record (unique constraint) |
| 429  | Rate limit exceeded                  |
| 500  | Internal server error                |
