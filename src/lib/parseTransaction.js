import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './categories';
import { matchMerchant, normalizeText } from './merchantMap';
import { parseHebrewNumber } from './hebrewNumbers';

const INCOME_HINTS = [
  'משכורת', 'קיבלתי', 'הכנסה', 'הכנסות', 'החזר', 'קצבה', 'דמי ילדים', 'מתנה',
  'סיוע', 'קצבת', 'הורים עזר', 'עזרה מהורים', 'מזונות קיבל',
  'תקבולים', 'פדיון', 'פידיון', 'מימוש', 'הפקדה', 'הפקדת', 'קבלת', 'מענק', 'זכות', 'פיקדון',
];

const CLEAN_WORDS = [
  'שח', 'ש"ח', '₪', 'שקל', 'שקלים', 'ב', 'בחנות', 'הוצאתי', 'שילמתי',
  'קניתי', 'קנייה', 'קיבלתי', 'הפקדתי', 'הפקדה', 'לחיסכון', 'לחסכון',
  'משכורת', 'עלה', 'עלתה', 'עלה לי', 'שילם', 'שילמנו', 'קנינו',
];

function detectCategory(text, type) {
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const norm = normalizeText(text);
  let bestMatch = null;
  let bestLength = 0;
  for (const cat of cats) {
    for (const kw of (cat.keywords || [])) {
      const k = normalizeText(kw);
      if (k && norm.includes(k) && k.length > bestLength) {
        bestMatch = cat.id;
        bestLength = k.length;
      }
    }
  }
  // מילון בתי העסק — אם ההתאמה שלו ארוכה יותר, היא מדויקת יותר
  const merchant = matchMerchant(text, type);
  if (merchant && merchant.matchLength >= bestLength) {
    bestMatch = merchant.category;
  }
  return bestMatch || (type === 'income' ? 'misc_income_general' : 'other_expense');
}

function extractAmount(text) {
  // Strip date patterns (DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
  let cleaned = text.replace(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g, ' ');
  // Strip long reference numbers (6+ consecutive digits — bank refs, account numbers)
  cleaned = cleaned.replace(/\d{6,}/g, ' ');

  // Prefer numbers adjacent to currency indicators
  const currAfter = cleaned.match(/((?:\d{1,3}(?:[,\u05F4]\d{3})+|\d+)(?:\.\d{1,2})?)\s*(?:₪|ש["\u05F4]?ח|שקלים|שקל)/);
  if (currAfter) return parseFloat(currAfter[1].replace(/[,\u05F4]/g, ''));

  const currBefore = cleaned.match(/(?:₪|ש["\u05F4]?ח|שקלים|שקל)\s*((?:\d{1,3}(?:[,\u05F4]\d{3})+|\d+)(?:\.\d{1,2})?)/);
  if (currBefore) return parseFloat(currBefore[1].replace(/[,\u05F4]/g, ''));

  // Otherwise take the LAST number (usually the amount in natural language)
  const allNumbers = cleaned.match(/(?:\d{1,3}(?:[,\u05F4]\d{3})+|\d+)(?:\.\d{1,2})?/g);
  if (!allNumbers || !allNumbers.length) {
    // סכום שנכתב במילים — "אלף שקל", "חמש מאות"
    const hebrew = parseHebrewNumber(cleaned);
    return hebrew ? hebrew.amount : null;
  }

  const amount = parseFloat(allNumbers[allNumbers.length - 1].replace(/[,\u05F4]/g, ''));
  if (!amount || amount <= 0 || amount > 9999999) return null;
  return amount;
}

function cleanDescription(text, numberStr) {
  let desc = text;
  if (numberStr) desc = desc.replace(numberStr, '');
  for (const w of CLEAN_WORDS) {
    desc = desc.replace(new RegExp(w, 'g'), ' ');
  }
  desc = desc.replace(/\s+/g, ' ').trim();
  return desc;
}

export function parseTransaction(rawText) {
  const text = rawText.trim();
  if (!text) return null;

  const amount = extractAmount(text);
  if (!amount || amount <= 0) return null;

  const isIncome = INCOME_HINTS.some((h) => text.includes(h));
  const type = isIncome ? 'income' : 'expense';

  const category = detectCategory(text, type);

  let cleanedText = text;
  if (!/\d/.test(text)) {
    const hebrew = parseHebrewNumber(text);
    for (const w of (hebrew?.words || [])) cleanedText = cleanedText.replace(w, ' ');
  }
  let description = cleanDescription(cleanedText, String(amount));

  if (!description) {
    const cat = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
      .find((c) => c.id === category);
    description = cat?.label || (type === 'income' ? 'הכנסה' : 'הוצאה');
  }

  return { type, amount, category, description };
}

export function categorizeDescription(rawText, currentType) {
  const text = (rawText || '').trim();
  if (!text) return null;
  const isIncome = INCOME_HINTS.some((h) => text.includes(h));
  if (isIncome) {
    const category = detectCategory(text, 'income');
    return { type: 'income', category: category || 'misc_income_general' };
  }
  const type = currentType || 'expense';
  const category = detectCategory(text, type);
  return { type, category: category || (type === 'income' ? 'misc_income_general' : 'other_expense') };
}