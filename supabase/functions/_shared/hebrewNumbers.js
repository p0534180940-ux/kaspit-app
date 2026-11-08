// זיהוי מספרים שנאמרו במילים: "אלף שקל", "שלושת אלפים", "אלפיים וחמש מאות"

const UNITS = {
  'אחד': 1, 'אחת': 1, 'שתיים': 2, 'שניים': 2, 'שתי': 2, 'שני': 2, 'שנים': 2,
  'שלוש': 3, 'שלושה': 3, 'שלושת': 3, 'ארבע': 4, 'ארבעה': 4, 'ארבעת': 4,
  'חמש': 5, 'חמישה': 5, 'חמשת': 5, 'חמישת': 5, 'שש': 6, 'שישה': 6, 'ששת': 6, 'שישת': 6,
  'שבע': 7, 'שבעה': 7, 'שבעת': 7, 'שמונה': 8, 'שמונת': 8,
  'תשע': 9, 'תשעה': 9, 'תשעת': 9, 'עשר': 10, 'עשרה': 10, 'עשרת': 10,
};

const TENS = {
  'עשרים': 20, 'שלושים': 30, 'ארבעים': 40, 'חמישים': 50,
  'שישים': 60, 'שבעים': 70, 'שמונים': 80, 'תשעים': 90,
};

const SPECIAL = { 'מאה': 100, 'מאתיים': 200, 'אלף': 1000, 'אלפיים': 2000, 'חצי': 0.5 };

const MULTIPLIERS = { 'מאות': 100, 'אלפים': 1000, 'אלפי': 1000 };

const WORDS = [
  ...Object.keys(SPECIAL), ...Object.keys(MULTIPLIERS),
  ...Object.keys(TENS), ...Object.keys(UNITS),
];

// מחזיר { amount, words } או null
export function parseHebrewNumber(text) {
  const raw = String(text || '').split(/\s+/);
  let total = 0;
  let current = 0;
  const used = [];
  let found = false;

  for (const rawWord of raw) {
    let w = rawWord.replace(/[^\u0590-\u05FF]/g, '');
    if (!w) continue;
    if (!WORDS.includes(w) && w.length > 1 && 'ובכלמ'.includes(w[0]) && WORDS.includes(w.slice(1))) {
      w = w.slice(1);
    }

    if (MULTIPLIERS[w]) {
      total += (current || 1) * MULTIPLIERS[w];
      current = 0;
      used.push(rawWord);
      found = true;
      continue;
    }
    if (SPECIAL[w] !== undefined) {
      if (w === 'חצי') total += 0.5;
      else if (SPECIAL[w] >= 1000) { total += SPECIAL[w]; current = 0; }
      else total += SPECIAL[w];
      used.push(rawWord);
      found = true;
      continue;
    }
    if (TENS[w] !== undefined) {
      total += TENS[w];
      used.push(rawWord);
      found = true;
      continue;
    }
    if (UNITS[w] !== undefined) {
      current = UNITS[w];
      used.push(rawWord);
      found = true;
      continue;
    }
    if (found) {
      total += current;
      current = 0;
      break;
    }
  }

  total += current;
  if (!found || total <= 0) return null;
  return { amount: total, words: used };
}