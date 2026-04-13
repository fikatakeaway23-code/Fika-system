import { Client } from '@notionhq/client';
import { prisma } from '../lib/prisma.js';

let _notion = null;

function getClient() {
  if (!_notion) {
    if (!process.env.NOTION_TOKEN) {
      throw new Error('NOTION_TOKEN is not set in environment variables');
    }
    _notion = new Client({ auth: process.env.NOTION_TOKEN });
  }
  return _notion;
}

const DB = {
  shifts:      process.env.NOTION_DB_SHIFTS      ?? 'f6352734d3df4702bafcad2e4566426d',
  finance:     process.env.NOTION_DB_FINANCE      ?? 'c02e3a7f7f0649e9bcad12cc8cd8600a',
  expenses:    process.env.NOTION_DB_EXPENSES     ?? '12a698558ed14ac790e652135f9ec6b2',
  hr:          process.env.NOTION_DB_HR           ?? '2f71a18986c84eacb5eac19fb0f63a63',
  memberships: process.env.NOTION_DB_MEMBERSHIPS  ?? 'acce6ef958704ac289d3db5d17daee80',
};

// ─────────────────────────────────────────────
// Property builders
// ─────────────────────────────────────────────

const p = {
  title:    (v) => ({ title:      [{ text: { content: String(v ?? '') } }] }),
  text:     (v) => ({ rich_text:  [{ text: { content: String(v ?? '') } }] }),
  number:   (v) => ({ number:      v ?? null }),
  select:   (v) => ({ select:      v ? { name: String(v) } : null }),
  checkbox: (v) => ({ checkbox:    Boolean(v) }),
  date:     (v) => ({ date:        v ? { start: new Date(v).toISOString().split('T')[0] } : null }),
  url:      (v) => ({ url:         v ?? null }),
};

// ─────────────────────────────────────────────
// Shift sync
// ─────────────────────────────────────────────

async function syncShift(shiftId) {
  const notion = getClient();

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      user:         true,
      inventoryLog: true,
      wasteLog:     true,
      espressoLog:  true,
    },
  });

  if (!shift) throw new Error(`Shift ${shiftId} not found`);

  const properties = {
    'Date':             p.date(shift.date),
    'Barista':          p.select(shift.user.name),
    'Shift':            p.select(shift.shiftType === 'am' ? 'AM' : 'PM'),
    'Status':           p.select(shift.status),
    'Opening Float':    p.number(shift.openingFloat),
    'Cash Sales':       p.number(shift.cashSales),
    'Digital Sales':    p.number(shift.digitalSales),
    'Closing Cash':     p.number(shift.closingCash),
    'Drinks Count':     p.number(shift.drinksCount),
    'Popular Drink':    p.text(shift.popularDrink),
    'Pastries Sold':    p.number(shift.pastriesSold),
    'Equipment Issue':  p.checkbox(shift.equipmentIssue),
    'Equipment Notes':  p.text(shift.equipmentNotes),
    'Complaint':        p.checkbox(shift.complaintFlag),
    'Complaint Notes':  p.text(shift.complaintNotes),
    'Shift Notes':      p.text(shift.shiftNotes),
    // Inventory
    'Beans Opening (kg)': p.number(shift.inventoryLog?.beansOpening),
    'Beans Closing (kg)': p.number(shift.inventoryLog?.beansClosing),
    'Milk Opening (L)':   p.number(shift.inventoryLog?.milkOpening),
    'Milk Closing (L)':   p.number(shift.inventoryLog?.milkClosing),
    'Cups Remaining':     p.number(shift.inventoryLog?.cupsRemaining),
    // Waste
    'Calibration Shots': p.number(shift.wasteLog?.calibrationShots),
    'Milk Wasted (L)':   p.number(shift.wasteLog?.milkWasted),
    'Remade Drinks':     p.number(shift.wasteLog?.remadeDrinks),
    'Unsold Pastries':   p.number(shift.wasteLog?.unsoldPastries),
    // Espresso
    'Espresso Dose (g)': p.number(shift.espressoLog?.dose),
    'Espresso Yield (g)':p.number(shift.espressoLog?.yield),
    'Extraction (sec)':  p.number(shift.espressoLog?.extractionTime),
    'Taste':             p.select(shift.espressoLog?.tasteAssessment),
    // ID for de-duplication
    'Fika ID':           p.title(shift.id),
  };

  // Check if page already exists (by Fika ID)
  const existing = await notion.databases.query({
    database_id: DB.shifts,
    filter: { property: 'Fika ID', title: { equals: shift.id } },
  });

  let page;
  if (existing.results.length > 0) {
    page = await notion.pages.update({ page_id: existing.results[0].id, properties });
  } else {
    page = await notion.pages.create({ parent: { database_id: DB.shifts }, properties });
  }

  return page.id;
}

// ─────────────────────────────────────────────
// Finance sync
// ─────────────────────────────────────────────

async function syncFinance(financeId) {
  const notion = getClient();
  const record = await prisma.financeRecord.findUnique({ where: { id: financeId } });
  if (!record) throw new Error(`Finance record ${financeId} not found`);

  const properties = {
    'Fika ID':          p.title(record.id),
    'Date':             p.date(record.date),
    'POS Total':        p.number(record.posTotal),
    'POS Cash':         p.number(record.posCash),
    'POS Digital':      p.number(record.posDigital),
    'Cash Reported':    p.number(record.baristaCashReported),
    'Digital Reported': p.number(record.baristaDigitalReported),
    'Discrepancy':      p.number(record.cashDiscrepancy),
    'Discrepancy Flag': p.checkbox(record.discrepancyFlag),
    'Rent':             p.number(record.rent),
    'Electricity':      p.number(record.electricity),
    'Barista 1 Salary': p.number(record.barista1Salary),
    'Barista 2 Salary': p.number(record.barista2Salary),
    'Milk Bill':        p.number(record.milkBill),
    'Bakery Bill':      p.number(record.bakeryBill),
    'Water Jars':       p.number(record.waterJars),
    'Other Expense':    p.number(record.otherExpense),
    'Other Notes':      p.text(record.otherNotes),
    'Total Expenses':   p.number(record.totalExpenses),
    'Net Profit':       p.number(record.netProfit),
    'Month':            p.number(record.month),
    'Year':             p.number(record.year),
  };

  const existing = await notion.databases.query({
    database_id: DB.finance,
    filter: { property: 'Fika ID', title: { equals: record.id } },
  });

  let page;
  if (existing.results.length > 0) {
    page = await notion.pages.update({ page_id: existing.results[0].id, properties });
  } else {
    page = await notion.pages.create({ parent: { database_id: DB.finance }, properties });
  }

  return page.id;
}

// ─────────────────────────────────────────────
// Expense sync
// ─────────────────────────────────────────────

async function syncExpense(expenseId) {
  const notion = getClient();
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new Error(`Expense ${expenseId} not found`);

  const properties = {
    'Fika ID':    p.title(expense.id),
    'Name':       p.text(expense.name),
    'Date':       p.date(expense.date),
    'Category':   p.select(expense.category),
    'Amount':     p.number(expense.amount),
    'Paid By':    p.select(expense.paidBy),
    'Reimbursed': p.checkbox(expense.reimbursed),
    'Notes':      p.text(expense.notes),
    'Month':      p.number(expense.month),
    'Year':       p.number(expense.year),
  };

  const existing = await notion.databases.query({
    database_id: DB.expenses,
    filter: { property: 'Fika ID', title: { equals: expense.id } },
  });

  let page;
  if (existing.results.length > 0) {
    page = await notion.pages.update({ page_id: existing.results[0].id, properties });
  } else {
    page = await notion.pages.create({ parent: { database_id: DB.expenses }, properties });
  }

  return page.id;
}

// ─────────────────────────────────────────────
// HR sync
// ─────────────────────────────────────────────

async function syncHR(hrId) {
  const notion = getClient();
  const record = await prisma.hRRecord.findUnique({
    where: { id: hrId },
    include: { user: { select: { name: true } } },
  });
  if (!record) throw new Error(`HR record ${hrId} not found`);

  const properties = {
    'Fika ID':        p.title(record.id),
    'Staff':          p.select(record.user.name),
    'Record Type':    p.select(record.recordType),
    'Date':           p.date(record.date),
    'Lateness':       p.select(record.latenessCategory),
    'Leave Type':     p.select(record.leaveType),
    'Leave Days':     p.number(record.leaveDays),
    'Leave Approved': p.checkbox(record.leaveApproved ?? false),
    'Incident Type':  p.select(record.incidentType),
    'Damage Cost':    p.number(record.damageCost),
    'Warning Issued': p.checkbox(record.warningIssued),
    'Salary Before':  p.number(record.salaryBefore),
    'Salary After':   p.number(record.salaryAfter),
    'Increment Type': p.select(record.incrementType),
    'Performance':    p.number(record.performanceRating),
    'Notes':          p.text(record.notes),
    'Follow Up':      p.checkbox(record.followUpRequired),
    'Resolved':       p.checkbox(record.resolved),
  };

  const existing = await notion.databases.query({
    database_id: DB.hr,
    filter: { property: 'Fika ID', title: { equals: record.id } },
  });

  let page;
  if (existing.results.length > 0) {
    page = await notion.pages.update({ page_id: existing.results[0].id, properties });
  } else {
    page = await notion.pages.create({ parent: { database_id: DB.hr }, properties });
  }

  return page.id;
}

// ─────────────────────────────────────────────
// Membership sync
// ─────────────────────────────────────────────

async function syncMembership(membershipId) {
  const notion = getClient();
  const m = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!m) throw new Error(`Membership ${membershipId} not found`);

  const properties = {
    'Fika ID':          p.title(m.id),
    'Company':          p.text(m.companyName),
    'Contact':          p.text(m.contactPerson),
    'WhatsApp':         p.text(m.whatsapp),
    'Tier':             p.select(m.tier),
    'Staff Count':      p.number(m.staffCount),
    'Monthly Fee':      p.number(m.monthlyFee),
    'Drinks Used':      p.number(m.drinksUsed),
    'Drinks Remaining': p.number(m.drinksRemaining),
    'Payment Status':   p.select(m.paymentStatus),
    'Renewal Date':     p.date(m.renewalDate),
    'Status':           p.select(m.status),
    'Usual Order':      p.text(m.usualOrder),
    'Notes':            p.text(m.notes),
    'Total Revenue':    p.number(m.totalRevenue),
    'Months Active':    p.number(m.monthsActive),
    'Joined':           p.date(m.joinedDate),
  };

  const existing = await notion.databases.query({
    database_id: DB.memberships,
    filter: { property: 'Fika ID', title: { equals: m.id } },
  });

  let page;
  if (existing.results.length > 0) {
    page = await notion.pages.update({ page_id: existing.results[0].id, properties });
  } else {
    page = await notion.pages.create({ parent: { database_id: DB.memberships }, properties });
  }

  return page.id;
}

// ─────────────────────────────────────────────
// Log sync result
// ─────────────────────────────────────────────

async function logSync({ recordType, recordId, notionPageId, success, errorMessage, userId, ...ids }) {
  return prisma.notionSync.create({
    data: {
      recordType,
      recordId,
      notionPageId,
      success,
      errorMessage,
      userId,
      ...ids,
    },
  });
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

const syncFunctions = {
  shift:      syncShift,
  finance:    syncFinance,
  expense:    syncExpense,
  hr:         syncHR,
  membership: syncMembership,
};

export async function syncOne(recordType, recordId, userId) {
  const fn = syncFunctions[recordType];
  if (!fn) throw new Error(`Unknown record type: ${recordType}`);

  try {
    const notionPageId = await fn(recordId);
    await logSync({ recordType, recordId, notionPageId, success: true, userId });
    return { success: true, notionPageId };
  } catch (err) {
    await logSync({ recordType, recordId, success: false, errorMessage: err.message, userId });
    throw err;
  }
}

export async function syncAllPending(userId) {
  const results = { success: [], failed: [] };

  // Get recent unsynced or failed records
  const [shifts, financeRecords, expenses, memberships, hrRecords] = await Promise.all([
    prisma.shift.findMany({ where: { status: 'submitted' }, take: 50, orderBy: { submittedAt: 'desc' } }),
    prisma.financeRecord.findMany({ take: 30, orderBy: { date: 'desc' } }),
    prisma.expense.findMany({ take: 50, orderBy: { createdAt: 'desc' } }),
    prisma.membership.findMany({ where: { status: 'active' } }),
    prisma.hRRecord.findMany({ take: 50, orderBy: { date: 'desc' } }),
  ]);

  const tasks = [
    ...shifts.map((r)       => ({ type: 'shift',      id: r.id })),
    ...financeRecords.map((r)=> ({ type: 'finance',    id: r.id })),
    ...expenses.map((r)      => ({ type: 'expense',    id: r.id })),
    ...memberships.map((r)   => ({ type: 'membership', id: r.id })),
    ...hrRecords.map((r)     => ({ type: 'hr',         id: r.id })),
  ];

  for (const task of tasks) {
    try {
      await syncOne(task.type, task.id, userId);
      results.success.push({ type: task.type, id: task.id });
    } catch (err) {
      results.failed.push({ type: task.type, id: task.id, error: err.message });
    }
  }

  return results;
}

export async function getRecentSyncs(limit = 20) {
  return prisma.notionSync.findMany({
    orderBy: { syncedAt: 'desc' },
    take: limit,
  });
}
