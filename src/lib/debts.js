export const DEBT_TYPES = [
  { id: 'gmach', label: 'גמ"ח', direction: 'owe', who: 'לאיזה גמ"ח' },
  { id: 'bank', label: 'בנק', direction: 'owe', who: 'לאיזה בנק' },
  { id: 'person', label: 'אדם פרטי', direction: 'owe', who: 'למי' },
  { id: 'owed_to_me', label: 'חייבים לי', direction: 'owed', who: 'מי חייב לי' },
];

export function typeOf(debt) {
  const id = debt.debt_type || (debt.direction === 'owed' ? 'owed_to_me' : 'person');
  return DEBT_TYPES.find((t) => t.id === id) || DEBT_TYPES[2];
}

export const isTithe = (d) => d.kind === 'tithe';

const pad = (n) => String(n).padStart(2, '0');

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// אותו יום בחודש הבא (או היום האחרון בחודש אם אין יום כזה)
export function addMonth(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const last = new Date(y, m + 1, 0).getDate();
  const next = new Date(y, m, Math.min(d, last));
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

export const sumBalance = (debts, direction) =>
  debts.filter((d) => !d.settled && d.direction === direction).reduce((s, d) => s + (Number(d.amount) || 0), 0);

export const formatDate = (s) => (s ? s.split('-').reverse().join('/') : '');