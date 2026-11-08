// חילוץ סכום מתוך תמלול חופשי בעברית.
// הבעיה שהיה צריך לפתור: בתמלול מופיעים לפעמים כמה מספרים ("רב קו לשני חודשים 250 שקל"),
// וגם מכפילים שנאמרים אחרי ספרה ("3 אלף"). לכן:
// 1. אוספים את כל המועמדים (ספרות + מילים בעברית) עם מקומם בטקסט.
// 2. מעדיפים את המועמד שצמוד למילת שקל.
// 3. פוסלים מספרים לא סבירים (מספרי טלפון, שנים, סכומים ענקיים).
import { parseHebrewNumber } from './hebrewNumbers.js';

const SHEKEL_WORDS = ['שקל', 'שקלים', 'שח', 'שכ', '₪'];
const MULTIPLIER_WORDS = { אלף: 1000, אלפים: 1000, אלפי: 1000, מאות: 100, מאה: 100, מיליון: 1000000 };
const MAX_AMOUNT = 500000;

function clean(word) {
  return String(word || '').replace(/[^\u0590-\u05FF0-9.,₪]/g, '');
}

function isShekelWord(word) {
  const w = clean(word).replace(/[.,]/g, '');
  return SHEKEL_WORDS.includes(w) || w === '₪';
}

// מספר טלפון / שנה / מספר כרטיס אינם סכומים
function plausible(n, raw) {
  if (!(n > 0) || n > MAX_AMOUNT) return false;
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length >= 7) return false;
  return true;
}

export function extractAmount(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;
  const words = text.split(/\s+/);
  const candidates = [];

  // מועמדים בספרות, כולל מכפיל שנאמר אחריהם ("3 אלף שקל")
  words.forEach((word, i) => {
    const c = clean(word);
    const m = c.match(/^(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/);
    if (!m) return;
    let value = parseFloat(m[1].replace(/,/g, ''));
    const next = clean(words[i + 1] || '');
    const mult = MULTIPLIER_WORDS[next] || MULTIPLIER_WORDS[next.replace(/^[ווהב]/, '')];
    const used = [word];
    if (mult && value < 1000) {
      value *= mult;
      used.push(words[i + 1]);
    }
    if (plausible(value, m[1])) candidates.push({ amount: value, index: i, words: used, digits: true });
  });

  // מועמד במילים בעברית ("אלפיים וחמש מאות")
  const heb = parseHebrewNumber(text);
  if (heb && plausible(heb.amount)) {
    const firstWord = heb.words[0];
    const index = Math.max(0, words.findIndex((w) => w === firstWord));
    candidates.push({ amount: heb.amount, index, words: heb.words, digits: false });
  }

  if (!candidates.length) return null;

  // עדיפות למועמד שצמוד למילת שקל
  const shekelIndexes = words.map((w, i) => (isShekelWord(w) ? i : -1)).filter((i) => i >= 0);
  if (shekelIndexes.length) {
    let best = null;
    let bestDist = 99;
    for (const c of candidates) {
      const last = c.index + c.words.length - 1;
      for (const s of shekelIndexes) {
        const dist = s >= last ? s - last : c.index - s;
        if (dist >= 0 && dist <= 3 && dist < bestDist) {
          best = c;
          bestDist = dist;
        }
      }
    }
    if (best) return best;
  }

  // אחרת: הסכום המשמעותי ביותר מבין המועמדים
  return candidates.sort((a, b) => b.amount - a.amount)[0];
}