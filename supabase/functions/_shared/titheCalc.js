// חישוב יתרת מעשרות, זהה ללוגיקה באתר (src/lib/tithe.js)
const DONATION_CATEGORIES = ['charity', 'maaser'];

function isDonation(t) {
  if (t.type !== 'expense') return false;
  if (DONATION_CATEGORIES.includes(t.category)) return true;
  return String(t.category).startsWith('custom:') && /צדקה|מעשר|תרומ/.test(t.category);
}

function isTitheIncome(t, s) {
  if (t.type !== 'income') return false;
  return s.tithe_mode === 'selected' ? (s.tithe_categories || []).includes(t.category) : true;
}

export function computeTitheBalance(transactions, s) {
  const pct = Number(s.tithe_percent) || 0;
  const since = s.tithe_since || '';
  let owed = 0;
  let given = 0;
  for (const t of transactions) {
    if (!t.date || (since && t.date < since)) continue;
    const amount = Number(t.amount) || 0;
    if (isTitheIncome(t, s)) owed += (amount * pct) / 100;
    if (isDonation(t)) given += amount;
  }
  return { owed, given, balance: owed - given };
}