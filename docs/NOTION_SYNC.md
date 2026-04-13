# Notion Sync Guide

Fika syncs operational data to five Notion databases for backup, reporting, and cross-team visibility.

---

## Database IDs

| Database     | ID                                   | Contents                          |
|--------------|--------------------------------------|-----------------------------------|
| Shifts       | `f6352734d3df4702bafcad2e4566426d`   | Daily shift reports               |
| Finance      | `c02e3a7f7f0649e9bcad12cc8cd8600a`   | Daily POS & cash records          |
| Expenses     | `12a698558ed14ac790e652135f9ec6b2`   | All expense entries               |
| HR           | `2f71a18986c84eacb5eac19fb0f63a63`   | Attendance, leave, salary         |
| Memberships  | `acce6ef958704ac289d3db5d17daee80`   | Corporate membership records      |

---

## Setup

### 1. Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Name it `Fika Takeaway Sync`
4. Select your workspace
5. Under **Capabilities**, enable: Read content, Insert content, Update content
6. Copy the **Internal Integration Secret** (starts with `ntn_...`)

> **Security:** Treat this token like a password. Never commit it to git. Rotate it if it's ever exposed.

### 2. Share databases with the integration

For each of the 5 databases:
1. Open the database in Notion
2. Click **...** (top right) → **Connections** → **+ Add connection**
3. Search for `Fika Takeaway Sync` and connect

### 3. Set environment variables

In your Railway backend environment:
```
NOTION_TOKEN=ntn_your_integration_secret_here
NOTION_DB_SHIFTS=f6352734d3df4702bafcad2e4566426d
NOTION_DB_FINANCE=c02e3a7f7f0649e9bcad12cc8cd8600a
NOTION_DB_EXPENSES=12a698558ed14ac790e652135f9ec6b2
NOTION_DB_HR=2f71a18986c84eacb5eac19fb0f63a63
NOTION_DB_MEMBERS=acce6ef958704ac289d3db5d17daee80
```

---

## How Sync Works

### Upsert pattern

Every record has a `Fika ID` title property set to the internal database ID (cuid). Before creating a new Notion page, the sync service queries by `Fika ID`:
- **Found:** Updates the existing page
- **Not found:** Creates a new page

This prevents duplicates on repeated syncs.

### Sync log

Every sync attempt is logged in the `NotionSync` table with:
- Record type and ID
- Notion page ID
- Success / failure
- Error message (if failed)

---

## Triggering a Sync

### From the mobile app

**More → Settings → ↑ Sync All to Notion**

### Via the API

```bash
# Sync everything
curl -X POST https://your-backend.up.railway.app/api/notion/sync-all \
  -H "Authorization: Bearer <token>"

# Sync a single record
curl -X POST https://your-backend.up.railway.app/api/notion/sync/shift/<shiftId> \
  -H "Authorization: Bearer <token>"

# Check sync status
curl https://your-backend.up.railway.app/api/notion/status \
  -H "Authorization: Bearer <token>"
```

---

## Notion Database Schema

### Shifts
| Property         | Type     |
|------------------|----------|
| Fika ID          | Title    |
| Date             | Date     |
| Shift Type       | Select   |
| Status           | Select   |
| Drinks Count     | Number   |
| Popular Drink    | Text     |
| Cash Sales       | Number   |
| Digital Sales    | Number   |
| Cash Discrepancy | Number   |
| Equipment Issue  | Checkbox |
| Shift Notes      | Text     |

### Finance
| Property              | Type     |
|-----------------------|----------|
| Fika ID               | Title    |
| Date                  | Date     |
| POS Total             | Number   |
| POS Cash              | Number   |
| Barista Cash Reported | Number   |
| Cash Discrepancy      | Number   |
| Discrepancy Flag      | Checkbox |
| Net Profit            | Number   |

### Expenses
| Property  | Type   |
|-----------|--------|
| Fika ID   | Title  |
| Name      | Text   |
| Date      | Date   |
| Category  | Select |
| Amount    | Number |
| Paid By   | Select |
| Reimbursed| Checkbox |

### HR Records
| Property     | Type   |
|--------------|--------|
| Fika ID      | Title  |
| Staff Member | Select |
| Type         | Select |
| Date         | Date   |
| Notes        | Text   |
| Amount (Salary) | Number |

### Memberships
| Property       | Type   |
|----------------|--------|
| Fika ID        | Title  |
| Company Name   | Text   |
| Tier           | Select |
| Status         | Select |
| Drinks Used    | Number |
| Monthly Fee    | Number |
| Renewal Date   | Date   |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `401 Unauthorized` from Notion | Token expired or wrong — regenerate and update env var |
| `404 Not Found` for database | Database ID wrong, or integration not shared with that database |
| Sync shows `failed` records | Check `/api/notion/status` for error messages. Usually a missing field or wrong property type |
| Duplicates in Notion | Run sync-all again — the upsert will merge them. If duplicates persist, check that `Fika ID` title property exists in Notion |

---

## Rotating the Notion Token

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Select `Fika Takeaway Sync`
3. Click **...** → **Regenerate token**
4. Update `NOTION_TOKEN` in Railway environment variables
5. Re-deploy the backend (or Railway picks it up on next deploy)
