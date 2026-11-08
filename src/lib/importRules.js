import { norm, matchRuleGlobal } from '@/lib/categoryRules';
import { categorizeDescription } from '@/lib/parseTransaction';

// --- שורות סיכום (סה"כ / סיכום / יתרה) — אינן עסקאות ---
export function isSummaryDescription(desc) {
  return /^(סה ?כ|סך ?הכל|סיכום|יתרה)( |$)/.test(norm(desc));
}

// --- סכום: שומר סימן. מינוס מוביל/סופי, סוגריים או מינוס יוניקוד = שלילי (זיכוי/ביטול) ---
export function parseAmount(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const t = String(val).replace(/ש"ח|שח|[₪\s]/g, '');
  if (!/\d/.test(t)) return null;
  const neg = /^\(.*\)$/.test(t) || /^[-−–]/.test(t) || /[-−–]$/.test(t);
  let d = t.replace(/[^\d.,]/g, '');
  if (d.includes(',') && d.includes('.')) {
    d = d.lastIndexOf(',') > d.lastIndexOf('.') ? d.replace(/\./g, '').replace(',', '.') : d.replace(/,/g, '');
  } else if (d.includes(',')) {
    d = /,\d{1,2}$/.test(d) ? d.replace(',', '.') : d.replace(/,/g, '');
  }
  const n = parseFloat(d);
  if (!Number.isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

// --- תאריך: YYYY-MM-DD או null אם אין תאריך תקין ---
export function parseDate(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  const ok = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100
    ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null);
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ok(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/);
  if (m) return ok(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  const n = Number(s);
  if (!isNaN(n) && n > 30000 && n < 80000) return new Date(Math.round((n - 25569) * 86400 * 1000)).toISOString().split('T')[0];
  return null;
}

export function normalizeType(val) {
  if (!val) return null;
  const t = String(val).trim().toLowerCase();
  if (['הכנסה', 'הכנסות', 'income', 'זכות', 'קבלת', 'הפקדה'].some((s) => t.includes(s))) return 'income';
  if (['הוצאה', 'הוצאות', 'expense', 'חובה', 'משיכה', 'חיוב'].some((s) => t.includes(s))) return 'expense';
  return null;
}

// --- מילות מפתח כברירת מחדל (אחרי טבלת בתי העסק, לפני "לבירור") ---
// מילה עד 3 אותיות נבדקת כמילה שלמה בלבד; ארוכה יותר — כתת-מחרוזת.
const KEYWORDS = [
  ['electricity', ['חברת חשמל']],
  ['health_general', ['סופר פארם', 'קופת חולים', 'קופח', 'כללית', 'מאוחדת', 'מכבי', 'מרקחת']],
  ['commissions', ['דמי כרטיס', 'עמלה', 'עמלת']],
  ['savings_deposits', ['גמל', 'השתלמות', 'פנסיה', 'פסגות', 'מיטב', 'אלטשולר']],
  ['charity', ['צדקה', 'חסד', 'תרומה', 'מוסדות', 'ער', 'קרן', 'למען']],
  ['food', ['רמי לוי', 'שופרסל', 'יוחננוף', 'אושר עד', 'מכולת', 'סופר', 'מרקט', 'פיצוחי', 'מכונות']],
  ['restaurant', ['פיצה', 'פלאפל', 'שווארמה', 'מסעדה', 'גלידה', 'קפה', 'מאפה', 'מאפיית', 'אנגל', 'ממתק', 'מתוק']],
  ['clothing_general', ['נעל', 'נעלי', 'הנעלה', 'אופנה', 'בגדי', 'ביגוד']],
  ['baby_kids', ['תינוק', 'עגלות', 'baby', 'בייבי']],
  ['books_periodicals', ['שבועון', 'עיתון', 'מגזין', 'ירחון', 'ספרי']],
  ['judaica', ['תכלת', 'ציצית', 'תפילין', 'סתם', 'יודאיקה']],
  ['public_transport', ['קווים', 'דן', 'אגד', 'אפיקים', 'רב קו', 'רכבת', 'מוניות']],
  ['vacations', ['מלון', 'בתי מלון', 'אולם', 'אולמי']],
  ['family_celebrations', ['יומולדת', 'מתנות', 'בלונים']],
  ['advertising', ['פרסום', 'מודעות']],
  ['photo_print', ['צילום', 'תמונות', 'פוטו', 'הדפסה']],
  ['electronics', ['מסך', 'מחשב', 'סלולר', 'אלקטרוניקה', 'חשמל']],
  ['tv_internet', ['נט', 'נטוורק', 'אינטרנט', 'תקשורת', 'סלקום', 'פרטנר', 'בזק']],
  ['home_contents_general', ['בזאר', 'כלבו', 'מציאות', 'הכל בדולר']],
];

export function keywordCategory(desc) {
  const n = norm(desc);
  if (!n) return null;
  if (/^ע[.\s]/.test(n)) return 'commissions';
  if (n.startsWith('מרכז רפואי')) return 'health_general';
  const tokens = n.split(' ');
  for (const [cat, words] of KEYWORDS) {
    for (const w of words) {
      const k = norm(w);
      if (k.length <= 3 ? tokens.includes(k) : n.includes(k)) return cat;
    }
  }
  return null;
}

// סדר: כלל אישי/גלובלי (בתי עסק) ← מילות מפתח ← זיהוי הכנסה ← "לבירור"
export function resolveCategory(desc, fileType, personalRules, globalRules) {
  const rule = matchRuleGlobal(desc, personalRules, globalRules);
  if (rule) return { type: rule.type, category: rule.category, source: 'rule' };
  const kw = keywordCategory(desc);
  if (kw) return { type: 'expense', category: kw, source: 'keyword' };
  const g = categorizeDescription(desc, fileType || 'expense');
  if (g?.type === 'income' || fileType === 'income') {
    return { type: 'income', category: g?.type === 'income' ? g.category : 'misc_income_general', source: 'keyword' };
  }
  return { type: 'expense', category: 'to_clarify', source: 'unknown' };
}