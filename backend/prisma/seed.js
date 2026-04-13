import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Fika Takeaway database...\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  const pin1111 = await bcrypt.hash('1111', 12);
  const pin2222 = await bcrypt.hash('2222', 12);
  const pin0000 = await bcrypt.hash('0000', 12);

  const barista1 = await prisma.user.upsert({
    where:  { id: 'user_barista1' },
    update: { pinHash: pin1111 },
    create: { id: 'user_barista1', name: 'Barista 1', role: 'barista_am', pinHash: pin1111 },
  });

  const barista2 = await prisma.user.upsert({
    where:  { id: 'user_barista2' },
    update: { pinHash: pin2222 },
    create: { id: 'user_barista2', name: 'Barista 2', role: 'barista_pm', pinHash: pin2222 },
  });

  const owner = await prisma.user.upsert({
    where:  { id: 'user_owner' },
    update: { pinHash: pin0000 },
    create: { id: 'user_owner', name: 'Owner', role: 'owner', pinHash: pin0000 },
  });

  console.log('✅ Users created:');
  console.log(`   Barista 1 (AM) — PIN: 1111`);
  console.log(`   Barista 2 (PM) — PIN: 2222`);
  console.log(`   Owner          — PIN: 0000\n`);

  // ── Sample Shift (yesterday AM) ────────────────────────────────────────────
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const sampleShift = await prisma.shift.upsert({
    where: { date_shiftType: { date: yesterday, shiftType: 'am' } },
    update: {},
    create: {
      userId:        barista1.id,
      date:          yesterday,
      shiftType:     'am',
      status:        'submitted',
      openingFloat:  1500,
      cashSales:     8200,
      digitalSales:  4800,
      closingCash:   9700,
      drinksCount:   42,
      popularDrink:  'Iced Latte',
      pastriesSold:  18,
      equipmentIssue: false,
      complaintFlag:  false,
      shiftNotes:    'Good morning shift. Busy from 7:30–9:00 AM. Ran low on oat milk.',
      submittedAt:   new Date(yesterday.getTime() + 8 * 60 * 60 * 1000),
    },
  });

  // Inventory log for sample shift
  await prisma.inventoryLog.upsert({
    where:  { shiftId: sampleShift.id },
    update: {},
    create: {
      shiftId:         sampleShift.id,
      beansOpening:    1.2,
      beansClosing:    0.6,
      milkOpening:     8.0,
      milkClosing:     2.5,
      syrupsOk:        true,
      iceCreamTubs:    3,
      bobaOk:          true,
      cupsRemaining:   120,
      lidsRemaining:   115,
      strawsOk:        true,
      bakeryRemaining: 4,
    },
  });

  // Waste log for sample shift
  await prisma.wasteLog.upsert({
    where:  { shiftId: sampleShift.id },
    update: {},
    create: {
      shiftId:          sampleShift.id,
      calibrationShots: 4,
      milkWasted:       0.3,
      remadeDrinks:     2,
      unsoldPastries:   4,
      notes:            'Two iced lattes remade — wrong milk temp.',
    },
  });

  // Espresso log for sample shift
  await prisma.espressoLog.upsert({
    where:  { shiftId: sampleShift.id },
    update: {},
    create: {
      shiftId:         sampleShift.id,
      dose:            18.5,
      yield:           37.0,
      extractionTime:  28,
      tasteAssessment: 'balanced',
    },
  });

  console.log('✅ Sample shift created (yesterday AM — submitted)\n');

  // ── Sample Finance Record ──────────────────────────────────────────────────
  await prisma.financeRecord.upsert({
    where: { date: yesterday },
    update: {},
    create: {
      date:                   yesterday,
      ownerId:                owner.id,
      posTotal:               13200,
      posCash:                8400,
      posDigital:             4800,
      baristaCashReported:    8200,
      baristaDigitalReported: 4800,
      cashDiscrepancy:        -200,
      discrepancyFlag:        true,
      rent:                   45000,
      electricity:            3500,
      barista1Salary:         25000,
      barista2Salary:         25000,
      milkBill:               32000,
      bakeryBill:             18500,
      waterJars:              800,
      otherExpense:           0,
      totalExpenses:          149800,
      netProfit:              -136600,
      month:                  yesterday.getMonth() + 1,
      year:                   yesterday.getFullYear(),
    },
  });

  console.log('✅ Sample finance record created (yesterday)\n');

  // ── Sample Expense ─────────────────────────────────────────────────────────
  await prisma.expense.upsert({
    where:  { id: 'sample_expense_1' },
    update: {},
    create: {
      id:               'sample_expense_1',
      name:             'Emergency milk top-up',
      date:             yesterday,
      category:         'supplies',
      amount:           1800,
      paidBy:           'barista1',
      reimbursed:       false,
      receiptAvailable: true,
      notes:            'Ran out of oat milk mid-shift. Bought 3L from Bhatbhateni.',
      loggedBy:         barista1.id,
      month:            yesterday.getMonth() + 1,
      year:             yesterday.getFullYear(),
    },
  });

  console.log('✅ Sample expense created\n');

  // ── Sample Corporate Membership ────────────────────────────────────────────
  const joinDate = new Date();
  joinDate.setMonth(joinDate.getMonth() - 2);

  await prisma.membership.upsert({
    where:  { id: 'sample_membership_1' },
    update: {},
    create: {
      id:             'sample_membership_1',
      companyName:    'Kathmandu Corp',
      contactPerson:  'Ramesh Shrestha',
      whatsapp:       '+977 9841000000',
      address:        'New Road, Kathmandu',
      distance:       '5 min walk',
      tier:           'team_pack',
      staffCount:     5,
      drinksUsed:     18,
      drinksRemaining: 12,
      paymentStatus:  'paid',
      monthlyFee:     8000,
      paymentDate:    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      renewalDate:    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      preferredTime:  '8:00–9:00 AM',
      usualOrder:     'Iced Latte, Cappuccino',
      monthsActive:   2,
      totalRevenue:   16000,
      notes:          'Very reliable client. Always pays on time.',
      status:         'active',
      joinedDate:     joinDate,
    },
  });

  console.log('✅ Sample corporate membership created (Kathmandu Corp — Team Pack)\n');

  // ── Sample HR Record ───────────────────────────────────────────────────────
  await prisma.hRRecord.upsert({
    where:  { id: 'sample_hr_1' },
    update: {},
    create: {
      id:              'sample_hr_1',
      staffMember:     barista1.id,
      shift:           'am',
      recordType:      'attendance',
      date:            yesterday,
      arrivalTime:     new Date(yesterday.getTime() + 5.9 * 60 * 60 * 1000), // 5:54 AM
      latenessCategory: 'on_time',
      notes:           'Arrived 6 minutes early.',
      followUpRequired: false,
      resolved:        true,
      loggedBy:        owner.id,
    },
  });

  console.log('✅ Sample HR record created\n');

  console.log('─────────────────────────────────────────────');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Barista 1 (AM)  PIN: 1111');
  console.log('  Barista 2 (PM)  PIN: 2222');
  console.log('  Owner           PIN: 0000');
  console.log('─────────────────────────────────────────────\n');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
