const { db, RESOURCE_TABLES } = require('./db');

function seedIfEmpty(table, rows) {
  const count = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  if (count > 0) {
    console.log(`${table}: already has data, skipping`);
    return;
  }
  const insert = db.prepare(`INSERT INTO ${table} (data) VALUES (?)`);
  const insertMany = db.transaction((items) => {
    items.forEach(item => insert.run(JSON.stringify(item)));
  });
  insertMany(rows);
  console.log(`${table}: seeded ${rows.length} record(s)`);
}

seedIfEmpty('members', [
  { id: 'MBR-0231', name: 'Sonam Wangchuk', cid: '10912011231', status: 'active', joined: '2024-02-10', contact: '17111222' },
  { id: 'MBR-0455', name: 'Kinley Zangmo', cid: '10908022455', status: 'active', joined: '2024-05-03', contact: '17222333' },
  { id: 'MBR-0512', name: 'Ugyen Tenzin', cid: '10905033512', status: 'pending', joined: '2025-01-20', contact: '17333444' }
]);

seedIfEmpty('management', [
  { name: 'Sonam Wangchuk', role: 'Chairperson', contact: '17111222', photo: '' },
  { name: 'Dechen Wangmo', role: 'Secretary', contact: '17222333', photo: '' },
  { name: 'Karma Tenzin', role: 'Treasurer', contact: '17333444', photo: '' }
]);

seedIfEmpty('contributions', [
  { member: 'Sonam Wangchuk', amount: 1000, dateLabel: '19 Jul 2026', type: 'Annual', status: 'active' },
  { member: 'Pema Lhamo', amount: 1000, dateLabel: '19 Jul 2026', type: 'Annual', status: 'pending' },
  { member: 'Tshering Dorji', amount: 1200, dateLabel: '10 Jul 2026', type: 'Annual', status: 'active' }
]);

seedIfEmpty('semso_medical', [
  { cid: '10905033512', member: 'Ugyen Tenzin', amount: 15000, hospital: 'JDWNRH Thimphu', dateFiledLabel: '05 Jul 2026', status: 'pending' },
  { cid: '10903022477', member: 'Karma Wangmo', amount: 8500, hospital: 'Mongar Hospital', dateFiledLabel: '28 Jun 2026', status: 'active' }
]);
seedIfEmpty('semso_death', [
  { cid: '10901011234', deceased: 'Dorji Norbu', claimant: 'Sonam Dema', amount: 50000, dateFiledLabel: '15 Jun 2026', status: 'active' }
]);
seedIfEmpty('semso_other', [
  { cid: '10906044321', member: 'Pema Choden', claimType: 'Disability Support', amount: 12000, dateFiledLabel: '20 May 2026', status: 'pending' }
]);

seedIfEmpty('assets_purchases', [
  { item: 'Office Printer', amount: 32000, vendor: 'Tashi Trading', date: '10 Jun 2026' }
]);
seedIfEmpty('assets_replacements', [
  { item: 'Office Chairs', oldValue: 18000, newValue: 24000, date: '02 May 2026' }
]);
seedIfEmpty('assets_categories', [
  { category: 'Office Equipment', quantity: 24, value: 2150000 },
  { category: 'Vehicles', quantity: 2, value: 4800000 },
  { category: 'Land & Building', quantity: 1, value: 5500000 }
]);

seedIfEmpty('expenses_staff', [
  { staffName: 'Dechen Wangmo', position: 'Accountant', amount: 28000, month: 'July 2026' }
]);
seedIfEmpty('expenses_other', [
  { description: 'Venue rental', amount: 15000, paidTo: 'Zhung Dratshang GH', date: '01 Jul 2026' }
]);

seedIfEmpty('forms', [
  { formName: 'New Member Application', category: 'Members', lastUpdated: '12 Jul 2026', status: 'active' },
  { formName: 'Medical Claim Form', category: 'Semso', lastUpdated: '01 Jul 2026', status: 'active' }
]);
seedIfEmpty('reports', [
  { reportName: 'Annual Contribution Report', type: 'PDF', generatedOn: '15 Jul 2026', status: 'active' },
  { reportName: 'Semso Claims Summary', type: 'Excel', generatedOn: '10 Jul 2026', status: 'active' }
]);

seedIfEmpty('stmt_individual', [
  { memberId: 'MBR-0231', cid: '10912011231', member: 'Sonam Wangchuk', contributions: 12000, claims: 0, balance: 12000, status: 'active' },
  { memberId: 'MBR-0455', cid: '10908022455', member: 'Kinley Zangmo', contributions: 9000, claims: 2000, balance: 7000, status: 'active' },
  { memberId: 'MBR-0512', cid: '10905033512', member: 'Ugyen Tenzin', contributions: 4000, claims: 0, balance: 4000, status: 'pending' }
]);
seedIfEmpty('stmt_overall', [
  { category: 'Contributions', totalIn: 8450000, totalOut: 0, balance: 8450000, status: 'active' },
  { category: 'Semso Claims', totalIn: 0, totalOut: 1240000, balance: -1240000, status: 'active' },
  { category: 'Assets', totalIn: 0, totalOut: 3600000, balance: -3600000, status: 'active' }
]);

console.log('Seeding complete.');
