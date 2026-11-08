// עזרי לוח עברי לתאריכי יעד (ללא ספריות חיצוניות)
const parts = new Intl.DateTimeFormat('en-u-ca-hebrew-nu-latn', { day: 'numeric', month: 'long' });
const full = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });

export const HEBREW_MONTHS = [
  { key: 'Tishri', label: 'תשרי' }, { key: 'Heshvan', label: 'חשוון' }, { key: 'Kislev', label: 'כסלו' },
  { key: 'Tevet', label: 'טבת' }, { key: 'Shevat', label: 'שבט' }, { key: 'Adar', label: 'אדר' },
  { key: 'Nisan', label: 'ניסן' }, { key: 'Iyar', label: 'אייר' }, { key: 'Sivan', label: 'סיוון' },
  { key: 'Tamuz', label: 'תמוז' }, { key: 'Av', label: 'אב' }, { key: 'Elul', label: 'אלול' },
];

export const toIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fromIso = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

// המופע הקרוב (מהיום והלאה) של תאריך עברי, כתאריך לועזי yyyy-mm-dd
export function nextHebrewDate(day, monthKey) {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  for (let i = 0; i < 800; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12);
    const p = parts.formatToParts(d);
    const month = p.find((x) => x.type === 'month')?.value;
    const dd = Number(p.find((x) => x.type === 'day')?.value);
    const monthOk = month === monthKey || (monthKey === 'Adar' && month === 'Adar II');
    if (dd === Number(day) && monthOk) return toIso(d);
  }
  return '';
}

// ראשון בספטמבר הקרוב (פתיחת שנת לימודים)
export function nextSeptemberFirst() {
  const now = new Date();
  const y = now.getMonth() > 8 || (now.getMonth() === 8 && now.getDate() > 1) ? now.getFullYear() + 1 : now.getFullYear();
  return `${y}-09-01`;
}

export function inMonths(n) {
  const d = new Date();
  return toIso(new Date(d.getFullYear(), d.getMonth() + n, d.getDate(), 12));
}

export function hebrewDateLabel(iso) {
  if (!iso) return '';
  return full.format(fromIso(iso));
}

export function gregorianLabel(iso) {
  if (!iso) return '';
  return fromIso(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function daysUntil(iso) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((fromIso(iso) - today) / 86400000);
}