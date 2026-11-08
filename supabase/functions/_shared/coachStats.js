// חישובי מאמן: מאזן חודשי, חריגות, רישום אחרון והתראות. משותף לאזור המאמן ולהתראות היומיות.
import { labelOf, EXCLUDED_CATEGORIES } from './categoryList.js';
import { normalizePhone } from './accountResolve.js';

export function jerusalemToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// המשתמש המחובר הוא בעל המזהה (טלפון / קוד אישי) — בלי הרשאת מנהל
export function ownsOnly(user, ownerId) {
  const mine = String(user?.owner_identity || '').trim();
  const target = String(ownerId || '').trim();
  if (!mine || !target) return false;
  if (mine === target) return true;
  const a = normalizePhone(mine);
  return !!a && a === normalizePhone(target);
}

const OVER_LIMIT_PCT = 20;
const INACTIVE_DAYS = 7;

export async function familyStats(db, ownerId, accessCreated, today) {
  const month = today.slice(0, 7);
  const [txns, budgets, lastRows] = await Promise.all([
    db.Transaction.filter({ owner_id: ownerId }, '-date', 2000),
    db.Budget.filter({ owner_id: ownerId, month }, '-created_date', 1000),
    db.Transaction.filter({ owner_id: ownerId }, '-created_date', 1),
  ]);
  const counted = txns.filter(
    (t) => (t.status || 'confirmed') === 'confirmed' && t.date && String(t.date).startsWith(month) && !EXCLUDED_CATEGORIES.includes(t.category),
  );
  const sum = (arr) => arr.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const income = sum(counted.filter((t) => t.type === 'income'));
  const expenses = counted.filter((t) => t.type === 'expense');
  const expense = sum(expenses);

  const planned = {};
  for (const b of budgets) {
    if (b.type === 'income') continue;
    planned[b.category] = (planned[b.category] || 0) + (Number(b.planned_amount) || 0);
  }
  const actual = {};
  for (const t of expenses) actual[t.category] = (actual[t.category] || 0) + (Number(t.amount) || 0);

  const overCategories = Object.keys(planned)
    .filter((c) => planned[c] > 0 && (actual[c] || 0) > planned[c])
    .map((c) => ({
      category: c,
      label: labelOf(c, 'expense'),
      planned: Math.round(planned[c]),
      actual: Math.round(actual[c]),
      overPct: Math.round(((actual[c] - planned[c]) / planned[c]) * 100),
    }))
    .sort((a, b) => b.overPct - a.overPct);

  const totalPlanned = Object.values(planned).reduce((s, v) => s + v, 0);
  const overallOverPct = totalPlanned > 0 ? Math.round(((expense - totalPlanned) / totalPlanned) * 100) : 0;

  const lastEntry = lastRows[0]?.created_date || null;
  const base = (lastEntry || accessCreated || '').slice(0, 10);
  const daysSince = base ? Math.max(0, Math.round((new Date(today) - new Date(base)) / 86400000)) : 0;

  return {
    month,
    income: Math.round(income),
    expense: Math.round(expense),
    balance: Math.round(income - expense),
    totalPlanned: Math.round(totalPlanned),
    overallOverPct,
    overCategories,
    lastEntry,
    daysSince,
    alerts: {
      inactive: daysSince >= INACTIVE_DAYS,
      overspend: totalPlanned > 0 && overallOverPct > OVER_LIMIT_PCT,
    },
  };
}