// Generates realistic (fictional) sample data for the Bikhar Phenday Tshokpa
// Management System and writes it to data/db.json.
const fs = require('fs');
const path = require('path');

function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260719);

const firstNames = ['Tshering','Sonam','Pema','Karma','Kinley','Ugyen','Wangmo','Choden','Dema','Zangmo',
  'Lhamo','Yeshi','Namgay','Jigme','Sangay','Kezang','Tenzin','Dechen','Norbu','Phuntsho',
  'Dorji','Wangchuk','Rinzin','Tandin','Chimi','Sherab','Dawa','Passang','Gyeltshen','Namgyel'];
const lastNames = ['Dorji','Wangchuk','Wangmo','Choden','Zangmo','Lhamo','Tshering','Pelden','Namgyel',
  'Gyeltshen','Penjor','Tobgay','Wangdi','Dukpa','Rabgay','Phuntsho','Tenzin','Norbu','Dema','Yangzom'];
const dzongkhags = {
  'Thimphu': ['Kawang','Chang','Mewang','Naro','Dagala','Genekha','Soe','Ganglakha'],
  'Paro': ['Doga','Dopshari','Hungrel','Lamgong','Naja','Shaba','Tsento'],
  'Punakha': ['Guma','Kabjisa','Lingmukha','Shengana','Talo','Toewang'],
  'Wangdue Phodrang': ['Athang','Bjena','Dangchu','Gase','Nahi','Phobjikha'],
  'Chukha': ['Bongo','Chapcha','Dala','Geling','Metakha','Phuentsholing'],
  'Samtse': ['Bara','Chargharey','Dorokha','Sipsu','Tading'],
  'Sarpang': ['Chuzangang','Gelephu','Jigmecholing','Samtenling'],
  'Mongar': ['Balam','Chali','Drametse','Ngatshang','Silambi'],
  'Trashigang': ['Bidung','Kanglung','Radhi','Sakteng','Thrimshing'],
  'Bumthang': ['Chhoekhor','Chhume','Tang','Ura'],
};
const dzongkhagList = Object.keys(dzongkhags);
const occupations = ['Civil Servant','Teacher','Farmer','Shopkeeper','Driver','Nurse','Bank Officer',
  'Engineer','Accountant','Police Officer','Army Personnel','Private Employee','Retired Civil Servant','Self-employed'];
const maritalOptions = ['Single','Married','Widowed'];
const genders = ['Male','Female'];
const paymentModes = ['mBOB','Mpay','DrukPay','ePay','Tpay','DK','Cash'];
const villageNames = ['Babena','Dratshang','Yusipang','Taba','Changjiji','Jungshina','Simtokha','Langjophakha',
  'Dechencholing','Zilukha','Lango','Kabesa','Wolakha','Yoezerthang','Samtenling','Rinchending','Gedu','Tsimasham'];

function randomDate(startYear, endYear) {
  const y = startYear + Math.floor(rnd() * (endYear - startYear + 1));
  const m = 1 + Math.floor(rnd() * 12);
  const d = 1 + Math.floor(rnd() * 28);
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function formatDate(iso) {
  const [y,m,d] = iso.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[m-1]} ${y}`;
}

// ---------- Members ----------
const members = [];
const usedCids = new Set();
const NUM_MEMBERS = 62;
for (let i = 0; i < NUM_MEMBERS; i++) {
  const dz = pick(dzongkhagList, rnd);
  const gewog = pick(dzongkhags[dz], rnd);
  const gender = pick(genders, rnd);
  const first = pick(firstNames, rnd);
  const last = pick(lastNames, rnd);
  const name = `${first} ${last}`;
  let cid;
  do { cid = '1' + String(Math.floor(rnd() * 9000000000) + 1000000000); } while (usedCids.has(cid));
  usedCids.add(cid);
  const joinedYear = 2015 + Math.floor(rnd() * 12); // 2015-2026
  const dobYear = 1958 + Math.floor(rnd() * 45);
  const statusRoll = rnd();
  const status = statusRoll < 0.86 ? 'active' : (statusRoll < 0.95 ? 'pending' : 'resigned');
  members.push({
    id: 'MBR-' + String(1000 + i),
    cid,
    name,
    village: pick(villageNames, rnd),
    gewog,
    dzongkhag: dz,
    joined: String(joinedYear),
    status,
    photo: '',
    dob: `${dobYear}-${String(1+Math.floor(rnd()*12)).padStart(2,'0')}-${String(1+Math.floor(rnd()*28)).padStart(2,'0')}`,
    gender,
    marital: pick(maritalOptions, rnd),
    occupation: pick(occupations, rnd),
    address: `House No. ${1+Math.floor(rnd()*40)}, Thram No. ${1+Math.floor(rnd()*90)}`,
    contact: '17' + String(100000 + Math.floor(rnd() * 900000)),
    email: rnd() > 0.3 ? `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.bt` : '',
    father: `${pick(firstNames, rnd)} ${pick(lastNames, rnd)}`,
    mother: `${pick(firstNames, rnd)} ${pick(lastNames, rnd)}`,
    ecName: `${pick(firstNames, rnd)} ${pick(lastNames, rnd)}`,
    ecContact: '17' + String(100000 + Math.floor(rnd() * 900000)),
    docs: rnd() > 0.4 ? ['Member_Application_Form.pdf'] : [],
  });
}

// ---------- Contributions ----------
const contributions = [];
let contribId = 1;
const activeMembers = members.filter(m => m.status !== 'resigned');
for (const m of activeMembers) {
  const numPayments = 1 + Math.floor(rnd() * 4);
  for (let p = 0; p < numPayments; p++) {
    const iso = randomDate(2024, 2026);
    contributions.push({
      id: 'CTB-' + String(contribId++).padStart(4, '0'),
      memberId: m.id,
      member: m.name,
      amount: [500,1000,1200,1500][Math.floor(rnd()*4)],
      date: iso,
      dateLabel: formatDate(iso),
      type: pick(['Annual','Monthly','Special'], rnd),
      mode: pick(paymentModes, rnd),
      status: rnd() > 0.12 ? 'active' : 'pending',
    });
  }
}

// ---------- Semso claims (medical / death / other) ----------
const hospitals = ['JDWNRH Thimphu','Mongar Regional Referral Hospital','Phuentsholing General Hospital',
  'Gelephu Central Regional Referral Hospital','Paro Hospital','Punakha Hospital'];
const medicalClaims = [];
for (let i = 0; i < 14; i++) {
  const m = pick(activeMembers, rnd);
  const iso = randomDate(2025, 2026);
  medicalClaims.push({
    id: 'SMD-' + String(i+1).padStart(3,'0'),
    member: m.name,
    memberId: m.id,
    amount: 2000 + Math.floor(rnd() * 20) * 1000,
    hospital: pick(hospitals, rnd),
    dateFiled: iso,
    dateFiledLabel: formatDate(iso),
    status: rnd() > 0.3 ? 'active' : 'pending',
  });
}
const deathClaims = [];
for (let i = 0; i < 5; i++) {
  const deceased = `${pick(firstNames, rnd)} ${pick(lastNames, rnd)}`;
  const claimant = `${pick(firstNames, rnd)} ${pick(lastNames, rnd)}`;
  const iso = randomDate(2025, 2026);
  deathClaims.push({
    id: 'SDT-' + String(i+1).padStart(3,'0'),
    deceased,
    claimant,
    amount: 50000,
    dateFiled: iso,
    dateFiledLabel: formatDate(iso),
    status: rnd() > 0.2 ? 'active' : 'pending',
  });
}
const otherClaimTypes = ['Disability Support','Fire Damage Relief','Natural Calamity Relief','Educational Support'];
const otherClaims = [];
for (let i = 0; i < 6; i++) {
  const m = pick(activeMembers, rnd);
  const iso = randomDate(2025, 2026);
  otherClaims.push({
    id: 'SOT-' + String(i+1).padStart(3,'0'),
    member: m.name,
    memberId: m.id,
    claimType: pick(otherClaimTypes, rnd),
    amount: 3000 + Math.floor(rnd() * 15) * 1000,
    dateFiled: iso,
    dateFiledLabel: formatDate(iso),
    status: rnd() > 0.4 ? 'active' : 'pending',
  });
}

// ---------- Assets ----------
const assetCategories = [
  { category: 'Office Equipment', quantity: 26, value: 2150000 },
  { category: 'Vehicles', quantity: 2, value: 4800000 },
  { category: 'Land & Building', quantity: 1, value: 5500000 },
  { category: 'Furniture', quantity: 48, value: 620000 },
];
const assetPurchases = [
  { item: 'Office Printer', amount: 32000, vendor: 'Tashi Trading', date: '2026-06-10' },
  { item: 'Laptop (Dell Latitude)', amount: 58000, vendor: 'Norling IT Solutions', date: '2026-04-22' },
  { item: 'Conference Table', amount: 45000, vendor: 'Zangdopelri Furniture', date: '2026-02-14' },
];
const assetReplacements = [
  { item: 'Office Chairs', oldValue: 18000, newValue: 24000, date: '2026-05-02' },
  { item: 'Air Conditioner', oldValue: 22000, newValue: 35000, date: '2026-03-18' },
];

// ---------- Expenses ----------
const staffPayments = [
  { staffName: 'Dechen Wangmo', position: 'Accountant', amount: 28000, month: 'July 2026' },
  { staffName: 'Karma Tenzin', position: 'Office Assistant', amount: 18000, month: 'July 2026' },
  { staffName: 'Sonam Dorji', position: 'Driver', amount: 16000, month: 'July 2026' },
];
const otherPayments = [
  { description: 'Venue rental', amount: 15000, paidTo: 'Zhung Dratshang GH', date: '2026-07-01' },
  { description: 'Annual General Meeting catering', amount: 42000, paidTo: 'Menjong Catering', date: '2026-06-20' },
  { description: 'Stationery & printing', amount: 6800, paidTo: 'Thimphu Stationery Mart', date: '2026-06-05' },
];

// ---------- Management committee ----------
const management = [
  { name: 'Sonam Wangchuk', role: 'Chairperson', contact: '17111222', photo: '' },
  { name: 'Dechen Wangmo', role: 'Secretary', contact: '17222333', photo: '' },
  { name: 'Karma Tenzin', role: 'Treasurer', contact: '17333444', photo: '' },
  { name: 'Pema Lhamo', role: 'Vice Chairperson', contact: '17444555', photo: '' },
  { name: 'Ugyen Dorji', role: 'Committee Member', contact: '17555666', photo: '' },
];

// ---------- Forms & Reports ----------
const forms = [
  { formName: 'New Member Application', category: 'Members', lastUpdated: '2026-07-12', status: 'active' },
  { formName: 'Medical Claim Form', category: 'Semso', lastUpdated: '2026-07-01', status: 'active' },
  { formName: 'Death Claim Form', category: 'Semso', lastUpdated: '2026-06-15', status: 'active' },
  { formName: 'Member Resignation Form', category: 'Members', lastUpdated: '2026-05-20', status: 'active' },
];
const reports = [
  { reportName: 'Annual Contribution Report', type: 'PDF', generatedOn: '2026-07-15', status: 'active' },
  { reportName: 'Semso Claims Summary', type: 'Excel', generatedOn: '2026-07-10', status: 'active' },
  { reportName: 'Asset Register', type: 'PDF', generatedOn: '2026-06-30', status: 'active' },
];

// ---------- Aggregate helpers ----------
function sum(arr, f) { return arr.reduce((a, x) => a + f(x), 0); }
const totalContrib = sum(contributions, c => c.amount);
const totalMedical = sum(medicalClaims, c => c.amount);
const totalDeath = sum(deathClaims, c => c.amount);
const totalOther = sum(otherClaims, c => c.amount);
const totalAssetsValue = sum(assetCategories, a => a.value);
const totalStaffExpense = sum(staffPayments, s => s.amount);
const totalOtherExpense = sum(otherPayments, o => o.amount);

const db = {
  meta: {
    organizationName: 'Bikhar Phenday Tshokpa',
    currency: 'Nu. (BTN)',
    generatedAt: new Date().toISOString(),
  },
  members,
  contributions,
  semso: { medical: medicalClaims, death: deathClaims, other: otherClaims },
  assets: { categories: assetCategories, purchases: assetPurchases, replacements: assetReplacements },
  expenses: { staff: staffPayments, other: otherPayments },
  management,
  forms,
  reports,
  aggregates: {
    totalContrib, totalMedical, totalDeath, totalOther,
    totalAssetsValue, totalStaffExpense, totalOtherExpense,
  },
};

fs.writeFileSync(path.join(__dirname, 'data', 'db.json'), JSON.stringify(db, null, 2));
console.log(`Seed data generated: ${members.length} members, ${contributions.length} contributions, ` +
  `${medicalClaims.length + deathClaims.length + otherClaims.length} semso claims.`);
