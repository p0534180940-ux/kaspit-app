export function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function monthKey(date) {
  const d = date ? new Date(date) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_LABELS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

const hebrewMonthFormat = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long' });

// שם החודש העברי (או שני חודשים עבריים כשחודש לועזי חוצה ביניהם)
export function hebrewMonthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  const first = hebrewMonthFormat.format(new Date(year, month - 1, 1));
  const last = hebrewMonthFormat.format(new Date(year, month, 0));
  return first === last ? first : `${first}–${last}`;
}

// "חשוון–כסלו (נובמבר 2026)"
export function monthLabelBoth(key) {
  return `${hebrewMonthLabel(key)} (${monthLabel(key)})`;
}

// חודש לועזי לפי מספר (1-12) עם החודש העברי המקביל: "נובמבר (חשוון–כסלו)"
export function monthNameBoth(num) {
  const key = `2026-${String(num).padStart(2, '0')}`;
  return `${MONTH_LABELS[num - 1]} (${hebrewMonthLabel(key)})`;
}

export function monthLabelShort(key) {
  const [, month] = key.split('-').map(Number);
  return MONTH_LABELS[month - 1];
}

export function shiftMonth(key, delta) {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKey(d);
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'short',
  }).format(d);
}