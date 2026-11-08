// זיהוי עסקאות מטקסט חופשי (מותאם ל-IVR)
import { matchMerchant, normalizeText, skeleton, MERCHANT_MAP, INCOME_MERCHANT_MAP, EXTRA_LABELS } from './merchantMap.js';

const EXPENSE_CATS = [
  { id: "food", label: "מזון", keywords: ["מזון","סופר","רמי לוי","שופרסל","יינות ביתן","מרכול","מכולת","אוכל","ירקות","פירות","קניות","מצרכים","לחם","חלב","ביצים","בשר","דגים","חטיפים"] },
  { id: "prepared_food", label: "אוכל מוכן", keywords: ["אוכל מוכן","ארוחה","סנדוויץ","פלאפל","שווארמה","פיצה","המבורגר","מאפה","בורקס"] },
  { id: "pharma_toiletries", label: "פארמה וטואלטיקה", keywords: ["פארמה","טואלטיקה","שמפו","סבון","משחת שיניים","מגבונים"] },
  { id: "rent", label: "שכר דירה", keywords: ["שכר דירה","שכ\"ד","שכד","שכירות"] },
  { id: "mortgage", label: "משכנתה", keywords: ["משכנתה","משכנתא"] },
  { id: "municipal_tax", label: "ארנונה", keywords: ["ארנונה","עירייה"] },
  { id: "building_committee", label: "ועד בית", keywords: ["ועד בית","מיסי ישוב","ועד הבית"] },
  { id: "electricity", label: "חשמל", keywords: ["חשמל","חברת חשמל"] },
  { id: "water_sewage", label: "מים וביוב", keywords: ["מים וביוב","ביוב","תאגיד מים"] },
  { id: "gas", label: "גז", keywords: ["גז","גז בישול"] },
  { id: "cleaning", label: "ניקיון", keywords: ["ניקיון","מנקה","עזרת בית"] },
  { id: "home_repairs", label: "תיקונים בבית", keywords: ["תיקון","תיקונים","שרברב","חשמלאי","אינסטלטור"] },
  { id: "dental", label: "טיפולי שיניים", keywords: ["שיניים","רופא שיניים"] },
  { id: "medications", label: "תרופות", keywords: ["תרופות","תרופה","בית מרקחת","מרשם"] },
  { id: "health_general", label: "בריאות", keywords: ["בריאות","רפואי","קופת חולים"] },
  { id: "school", label: "בית ספר", keywords: ["בית ספר","תלמוד תורה","ישיבה","כולל"] },
  { id: "school_transport", label: "הסעות", keywords: ["הסעות","הסעה"] },
  { id: "after_school_activities", label: "חוגים", keywords: ["חוג","חוגים","תנועת נוער"] },
  { id: "noon_care", label: "צהרון", keywords: ["צהרון","צהרונים"] },
  { id: "day_care", label: "מעונות יום", keywords: ["מעון","מעונות","מעון יום","מעונות יום","פעוטון","משפחתון","גן ילדים","גננת"] },
  { id: "babysitter_nanny", label: "מטפלת", keywords: ["מטפלת","מטפלות","שמרטפות","טיפול בתינוק"] },
  { id: "summer_care", label: "מסגרות קיץ", keywords: ["קייטנה","קייטנות","מחנה קיץ"] },
  { id: "holiday_pesach", label: "הוצאות פסח", keywords: ["פסח","ליל הסדר","קמח","מצות","קמחא דפסחא","ניקיון לפסח"] },
  { id: "holiday_sukkot", label: "הוצאות סוכות", keywords: ["סוכות","סוכה","ארבעת המינים","לולב","אתרוג","סכך"] },
  { id: "holiday_rosh_hashana", label: "הוצאות ראש השנה", keywords: ["ראש השנה","סימנים","ראש חודש אלול"] },
  { id: "holiday_yom_kippur", label: "הוצאות יום כיפור", keywords: ["יום כיפור","כפרות","סעודה מפסקת"] },
  { id: "holiday_chanuka", label: "הוצאות חנוכה", keywords: ["חנוכה","חנוכיה","נרות חנוכה","סופגניות"] },
  { id: "holiday_purim", label: "הוצאות פורים", keywords: ["פורים","משלוח מנות","משלוחי מנות","מתנות לאביונים","תחפושת","תחפושות"] },
  { id: "holiday_shavuot", label: "הוצאות שבועות", keywords: ["שבועות","עוגת גבינה"] },
  { id: "bein_hazmanim", label: "הוצאות בין הזמנים", keywords: ["בין הזמנים","ביןהזמנים","חופש גדול","טיול בין הזמנים"] },
  { id: "private_lesson", label: "שיעור פרטי", keywords: ["שיעור פרטי","מורה פרטי","תגבור"] },
  { id: "education_general", label: "חינוך", keywords: ["חינוך","שכר לימוד"] },
  { id: "clothing_general", label: "ביגוד", keywords: ["בגדים","ביגוד","הנעלה"] },
  { id: "shoes", label: "נעליים", keywords: ["נעליים","סנדלים","מגפיים"] },
  { id: "fuel", label: "דלק", keywords: ["דלק","בנזין","סונול","דור אלון","פז"] },
  { id: "car_insurance", label: "ביטוח רכב", keywords: ["ביטוח רכב","ביטוח חובה","ביטוח מקיף"] },
  { id: "parking", label: "חניה", keywords: ["חניה","חניון"] },
  { id: "public_transport", label: "תחבורה ציבורית", keywords: ["אוטובוס","רכבת","תחבורה ציבורית","מונית","אגד"] },
  { id: "family_celebrations", label: "אירועי משפחה", keywords: ["שמחה","חתונה","ברית","בר מצווה","אירוע"] },
  { id: "holidays_religious", label: "צרכי דת", keywords: ["צרכי דת","תפילין","טלית","ציצית","סידור","מקווה","בית כנסת","ספרי קודש"] },
  { id: "shabbat_food", label: "צרכי שבת", keywords: ["שבת","צרכי שבת","חלות","יין לקידוש"] },
  { id: "charity", label: "תרומות", keywords: ["צדקה","תרומה","תרומות","מעשר"] },
  { id: "pocket_money", label: "דמי כיס", keywords: ["דמי כיס"] },
  { id: "restaurant", label: "מסעדה", keywords: ["מסעדה","בית קפה","קפה"] },
  { id: "vacations", label: "חופשות", keywords: ["חופשה","מלון","נופש","צימר","טיול"] },
  { id: "sports", label: "ספורט", keywords: ["ספורט","חדר כושר","בריכה"] },
  { id: "savings_deposits", label: "הפקדות לחיסכון", keywords: ["הפקדה","חיסכון","חסכון","פיקדון","קרן השתלמות"] },
  { id: "life_insurance", label: "ביטוח חיים", keywords: ["ביטוח חיים","פנסיה"] },
  { id: "national_insurance", label: "ביטוח לאומי", keywords: ["ביטוח לאומי"] },
  { id: "debt_repayment", label: "החזר חובות", keywords: ["החזר חוב","החזר חובות","חוב","פרעון"] },
  { id: "tv_internet", label: "חדר מחשבים ואינטרנט", keywords: ["חדר מחשבים","מחשבים","אינטרנט","סינון","נטפרי","בזק","הוט"] },
  { id: "phone_mobile_landline", label: "טלפון", keywords: ["טלפון","סלולר","פלאפון","סלקום","נייח"] },
  { id: "content_services", label: "שירותי תוכן", keywords: ["מנוי","נטפליקס","ספוטיפיי"] },
  { id: "hairdresser", label: "מספרה", keywords: ["מספרה","תספורת"] },
  { id: "cosmetics", label: "קוסמטיקה", keywords: ["קוסמטיקה","איפור","בושם"] },
  { id: "furniture", label: "ריהוט", keywords: ["ריהוט","שולחן","כיסא","מיטה","ארון","ספה","מזרון"] },
  { id: "electronics", label: "אלקטרוניקה", keywords: ["מוצרי חשמל","אלקטרוניקה","מחשב","מקרר","מכונת כביסה"] },
  { id: "other_expense", label: "אחר", keywords: ["שילמתי","קניתי","קנייה"] },
];

const INCOME_CATS = [
  { id: "salary_general", label: "שכר", keywords: ["משכורת","שכר עבודה","שכר","תלוש"] },
  { id: "child_benefit", label: "קצבת ילדים", keywords: ["דמי ילדים","קצבת ילדים"] },
  { id: "old_age_pension", label: "קצבת זיקנה", keywords: ["קצבת זיקנה","זקנה"] },
  { id: "disability_benefit", label: "קצבת נכות", keywords: ["קצבת נכות","נכות"] },
  { id: "rent_assistance", label: "סיוע בשכר דירה", keywords: ["סיוע בשכר דירה","סיוע בדיור"] },
  { id: "property_income", label: "הכנסה מנכס", keywords: ["הכנסה מנכס","דמי שכירות"] },
  { id: "parents_help", label: "עזרה מההורים", keywords: ["עזרה מההורים","מההורים","הורים"] },
  { id: "gifts_income", label: "מתנות", keywords: ["מתנה","מתנות"] },
  { id: "refund_income", label: "החזרים", keywords: ["החזר","החזרים"] },
  { id: "business_income", label: "עסק", keywords: ["עסק","מכירה","הכנסה מעסק"] },
  { id: "misc_income_general", label: "הכנסות שונות", keywords: ["הכנסה","הכנסות שונות"] },
];

import { extractAmount } from './amountParse.js';

const INCOME_HINTS = ["משכורת","קיבלתי","הכנסה","החזר","קצבה","דמי ילדים","מתנה","סיוע","קצבת"];
const CLEAN_WORDS = ["שח",'ש"ח',"₪","שקל","שקלים","הוצאתי","שילמתי","קניתי","קנייה","קיבלתי","הפקדתי","הפקדה","לחיסכון","עלה","עלתה","שילם","שילמנו","קנינו"];

function detectCategory(text, type) {
  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
  const norm = normalizeText(text);
  let best = null, bestLen = 0;
  for (const cat of cats) {
    for (const kw of cat.keywords) {
      const k = normalizeText(kw);
      if (k && norm.includes(k) && k.length > bestLen) { best = cat.id; bestLen = k.length; }
    }
  }
  const merchant = matchMerchant(text, type);
  if (merchant && merchant.matchLength >= bestLen) best = merchant.category;
  if (best) return best;

  // התאמה סלחנית: השוואה ללא אותיות תנועה, למשל "נטרנט" → אינטרנט, "רמלו" → רמי לוי
  const skel = skeleton(text);
  if (skel.length >= 3) {
    let bestSkel = null;
    let bestSkelLen = 0;
    const check = (key, id) => {
      const k = skeleton(key);
      if (k.length >= 3 && k.length > bestSkelLen && (skel.includes(k) || k.includes(skel))) {
        bestSkel = id;
        bestSkelLen = k.length;
      }
    };
    for (const cat of cats) for (const kw of cat.keywords) check(kw, cat.id);
    const map = type === "income" ? INCOME_MERCHANT_MAP : MERCHANT_MAP;
    for (const key in map) check(key, map[key]);
    if (bestSkel) return bestSkel;
  }
  return type === "income" ? "misc_income_general" : "other_expense";
}

export function categoryLabel(id, type) {
  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
  const cat = cats.find((c) => c.id === id);
  if (cat) return cat.label;
  if (EXTRA_LABELS[id]) return EXTRA_LABELS[id];
  return type === "income" ? "הכנסה" : "הוצאה";
}

export function parseTransaction(rawText, forcedType) {
  const text = String(rawText || "").trim();
  if (!text) return null;
  const found = extractAmount(text);
  if (!found) return null;
  const amount = found.amount;
  const usedWords = found.words || [];
  if (!amount || amount <= 0) return null;

  const type = forcedType || (INCOME_HINTS.some((h) => text.includes(h)) ? "income" : "expense");
  const category = detectCategory(text, type);

  let desc = text;
  for (const w of usedWords) desc = desc.split(w).join(" ");
  for (const w of CLEAN_WORDS) desc = desc.split(w).join(" ");
  desc = desc.replace(/\s+/g, " ").trim();
  if (!desc) desc = categoryLabel(category, type);

  return { type, amount, category, description: desc };
}

export function fmtNumber(n) {
  return Math.round(n).toLocaleString("he-IL");
}