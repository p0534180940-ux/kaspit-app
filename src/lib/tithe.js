import { isDonation } from '@/lib/categories';

// חישוב מעשרות לפי הגדרות המשתמש, מתאריך ההפעלה והלאה
export function isTitheIncome(t, s) {
  if (t.type !== 'income') return false;
  return s.tithe_mode === 'selected' ? (s.tithe_categories || []).includes(t.category) : true;
}

export function computeTithe(transactions, s, year) {
  const pct = Number(s.tithe_percent) || 0;
  const since = s.tithe_since || '';
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i, income: 0, owed: 0, given: 0 }));
  let owed = 0;
  let given = 0;
  for (const t of transactions) {
    if (!t.date || (since && t.date < since)) continue;
    const amount = Number(t.amount) || 0;
    const y = Number(t.date.slice(0, 4));
    const m = Number(t.date.slice(5, 7)) - 1;
    const inc = isTitheIncome(t, s);
    const don = isDonation(t);
    if (!inc && !don) continue;
    if (inc) owed += (amount * pct) / 100;
    if (don) given += amount;
    if (year && y === year) {
      if (inc) {
        months[m].income += amount;
        months[m].owed += (amount * pct) / 100;
      }
      if (don) months[m].given += amount;
    }
  }
  return { owed, given, balance: owed - given, months };
}