// מודל כספית — מודל התנהלות תקציבית מבוסס כלכלה התנהגותית (כהנמן–טברסקי, ת'יילר),
// מותאם למשק בית שמרני, מרובה ילדים, בעל הכנסה בינונית–נמוכה והוצאות מחזוריות גדולות
// (חינוך, שבתות וחגים, שמחות, כשרות, תמיכה בילדים נשואים).
//
// עקרונות המחקר שהמודל בנוי עליהם:
// 1. חשבונאות מנטלית (Thaler 1985, 1999; בהמשך לכהנמן–טברסקי 1984) — הכסף אינו "בר-החלפה"
//    בתפיסת המשתמש. במקום להילחם בהטיה, המודל מנצל אותה: חלוקה מפורשת לקטגוריות מתוכננות
//    ולשריון של ההוצאות השנתיות ("מעטפות"), כך שהכסף המשוריין אינו נראה כפנוי.
// 2. שנאת אובדן ותלות בנקודת ייחוס (Prospect Theory, כהנמן–טברסקי 1979) — חריגה מוצגת
//    כאובדן מול יעד שנקבע מראש, כי הפסד מורגש חזק יותר מרווח שקול.
// 3. Framing — הצגת נתונים בהיקף חודשי ובהיקף שנתי משנה החלטות; הוצאה מחזורית מוצגת
//    כעלות חודשית שוות-ערך (1/12), אחרת היא נתפסת כ"הוצאה חד-פעמית" שוב ושוב.
// 4. הטיית הווה ומכשירי מחויבות (Laibson; Thaler & Benartzi; ניסויי שדה על lockbox/מעטפה)
//    — הפרדה פיזית/חשבונית של העודף מיד עם קבלת ההכנסה, ולא בסוף החודש.
// 5. מיעוט תשומת לב ועוני קוגניטיבי (Mullainathan & Shafir) — מספר הכללים הפעילים בכל רגע
//    מוגבל; לכן המודל מציג עד שלוש המלצות ממוקדות, לפי סדר חומרה.
// 6. אפקט העדר והנורמה החברתית — בציבור שמרני נורמות הקהילה (שמחות, מוסדות, מתנות)
//    הן מחייבות; המודל אינו מציע לבטל אותן אלא לתכנן אותן מראש כסעיף שנתי.
//
// התאמה לאורח חיים שמרני: אין המלצות על אשראי צרכני, השקעות ספקולטיביות, ביטולי נדרים,
// צמצום מעשרות/צדקה, או שינוי החלטות משפחתיות (מספר ילדים, מוסדות חינוך). ההמלצות עוסקות
// אך ורק בתכנון, בתזמון, בשריון ובדיווח — ובניסוח ענייני, בלי מוסר ובלי לחץ.

export const PRINCIPLES = [
  { key: 'plan_first', title: 'תכנון לפני החודש', text: 'לכל קטגוריה נקבע סכום מתוכנן לפני תחילת החודש. ההשוואה היא בין המתוכנן למצוי, לא בין החודש הזה לקודמו.' },
  { key: 'annualize', title: 'פריסת מחזוריות', text: 'כל הוצאה שנתית או עונתית נרשמת ונפרסת לשנים-עשר חודשים, ומשוריינת מדי חודש.' },
  { key: 'reserve_first', title: 'שריון בתחילת החודש', text: 'העודף והשריון מופרדים עם קבלת ההכנסה, לא ממה שנשאר בסופו.' },
  { key: 'report_now', title: 'דיווח מיידי', text: 'רישום בזמן ההוצאה. עדכון מאוחר מאבד את ההשפעה על ההחלטה עצמה.' },
  { key: 'few_rules', title: 'מעט כללים', text: 'עד שלוש נקודות טיפול בכל תקופה. ריבוי יעדים מפחית עמידה בהם.' },
  { key: 'no_shame', title: 'נתונים ולא הטפה', text: 'הדוח מציג מספרים ופערים. ההחלטה נשארת בידי בעל הבית, לפי סדר העדיפויות שלו.' },
];

// שיעור שריון חודשי מבוקש להוצאות שנתיות/מחזוריות (12.5% ≈ חודש הוצאות בשנה)
export const TARGET_RESERVE_RATE = 12;

// סעיפים שאין להציע לצמצם — ערכים ומחויבויות קהילתיות
const PROTECTED = ['charity', 'tzedaka', 'maaser', 'donations', 'kashrut', 'education', 'tuition', 'shabbat', 'holidays', 'school', 'holiday_', 'yom_tov', 'day_care', 'noon_care'];

export function isProtectedCategory(category) {
  const c = String(category || '').toLowerCase();
  return PROTECTED.some((p) => c.includes(p));
}

// מדרג חומרה: מה מטופל קודם
export const SEVERITY = { critical: 3, warning: 2, note: 1 };

// מנוע האבחון: מקבל דוח חודשי (reportData) ומחזיר ממצאים ממוינים
export function diagnose(r) {
  const f = [];
  const add = (level, code, text) => f.push({ level, code, text, weight: SEVERITY[level] });

  if (r.totalPlanned <= 0) {
    add('critical', 'no_plan', 'לא נקבע תקציב מתוכנן לחודש זה. בלי נקודת ייחוס שנקבעה מראש אין אפשרות לזהות חריגה, וכל הוצאה נראית סבירה בשעתה. שלב ראשון: קביעת סכום מתוכנן לכל קטגוריה.');
  }

  if (r.balance < 0) {
    add('critical', 'deficit', `גירעון חודשי: ההוצאות עלו על ההכנסות. פער כזה מכוסה בפועל באוברדראפט או בהלוואה, ועלותו נוספת לחודש הבא. הטיפול הוא בחודש הנוכחי, לא בדיעבד.`);
  } else if (r.savingRate < TARGET_RESERVE_RATE) {
    add('warning', 'low_reserve', `שיעור העודף ${r.savingRate}% מההכנסה, מול יעד של ${TARGET_RESERVE_RATE}% לשריון ההוצאות המחזוריות (שמחות, חינוך, ביטוחים, חגים). מומלץ להפריד את הסכום בתחילת החודש, מיד עם קבלת ההכנסה.`);
  } else {
    add('note', 'reserve_ok', `שיעור עודף ${r.savingRate}%. יש להעביר אותו לחשבון או למעטפה נפרדת בתחילת החודש, אחרת הוא נבלע בהוצאות החודש הבא.`);
  }

  if (r.totalPlanned > 0 && r.plannedDiff < 0) {
    add('warning', 'over_plan', `חריגה מהתקציב שנקבע. הפער מוצג מול היעד שקבעתם, ולא מול הממוצע: זו נקודת הייחוס שקובעת אם החודש בשליטה.`);
  }

  const over = (r.expenseByCategory || []).filter((c) => c.planned > 0 && c.diff < 0);
  const overNotProtected = over.filter((c) => !isProtectedCategory(c.category)).slice(0, 3);
  if (overNotProtected.length) {
    add('warning', 'over_categories', 'סעיפים לטיפול (עד שלושה, לפי גודל הפער): ' + overNotProtected.map((c) => c.label).join(', ') + '. ריכוז המעקב בסעיפים מעטים יעיל יותר מצמצום רוחבי.');
  }
  const overProtected = over.filter((c) => isProtectedCategory(c.category)).slice(0, 2);
  if (overProtected.length) {
    add('note', 'protected_over', 'חריגה בסעיפים ' + overProtected.map((c) => c.label).join(', ') + '. סעיפים אלו הם מחויבות קבועה; הטיפול הנכון הוא הגדלת התכנון שלהם מראש, ולא צמצומם.');
  }

  const top = (r.expenseByCategory || [])[0];
  if (top && top.share >= 35) {
    add('note', 'concentration', `${top.label} מהווה ${top.share}% מכלל ההוצאה. בריכוז כזה בדיקה של הסעיף עצמו — תנאים, ספק, מועד תשלום — משפיעה יותר מכל צמצום בשאר הסעיפים.`);
  }

  if (r.prevExpense > 0 && r.expenseChange > 15) {
    add('note', 'spike', `עלייה של ${r.expenseChange}% בהוצאה לעומת ${r.prevMonthLabel}. אם מדובר בהוצאה מחזורית, יש לרשום אותה כהוצאה שנתית כדי שתיפרס לשנים-עשר חודשים ותשוריין מראש.`);
  }

  if (r.oweTotal > 0) {
    add('warning', 'debts', `חובות פתוחים. מומלץ לקבוע סכום החזר חודשי קבוע ולרשום אותו כהוצאה קבועה, כדי שההחזר יהיה חלק מהתקציב ולא שארית ממנו.`);
  }

  // מיעוט תשומת לב: עד ארבעה ממצאים, החמורים ראשונים
  return f.sort((a, b) => b.weight - a.weight).slice(0, 4);
}

// צעדי הפעולה הקבועים של המודל, לפי מצב
export function nextSteps(r) {
  if (r.totalPlanned <= 0) return ['הזנת ההכנסות וההוצאות הקבועות.', 'רישום ההוצאות השנתיות ופריסתן ל-12 חודשים.', 'קביעת סכום מתוכנן לכל קטגוריה.'];
  if (r.balance < 0) return ['בחירת שני סעיפים בלבד לצמצום החודש.', 'קביעת מועד קבוע לבדיקת התקציב פעם בשבוע.', 'דיווח כל הוצאה בזמן אמת.'];
  return ['הפרדת העודף לשריון בתחילת החודש הבא.', 'עדכון התכנון בסעיפים שחרגו דרך קבע.', 'המשך דיווח מיידי של כל תנועה.'];
}

const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step);
const money = (n) => Number(n).toLocaleString('he-IL');

// צעד יזום לחודש הבא: המלצה אחת קונקרטית עם יעד מספרי, בנוסף לאבחון שנעשה בדיעבד.
// עקרונות: תכנון מראש (plan_first), שריון בתחילת החודש (reserve_first),
// מעט כללים (few_rules) — צעד אחד בלבד — ולעולם לא צמצום בסעיפים מוגנים.
export function proactiveStep(r) {
  const exp = r.expenseByCategory || [];
  const free = exp.filter((c) => !isProtectedCategory(c.category));

  if (r.totalPlanned <= 0) {
    const c = exp[0];
    if (!c) return 'בשבוע הראשון של החודש הבא, דווחו על כל הוצאה ביום שבוצעה. יעד: לפחות 20 דיווחים עד סוף השבוע, כדי שיהיה בסיס לתכנון.';
    return `לפני תחילת החודש הבא קבעו תקציב מתוכנן של ${money(roundTo(c.amount, 50))} ש"ח לסעיף ${c.label}, הסעיף הגדול ביותר (בחודש זה נרשמו בו ${money(c.amount)} ש"ח). זו נקודת הייחוס הראשונה שלכם.`;
  }

  if (r.balance < 0) {
    const deficit = Math.abs(r.balance);
    const c = free.find((x) => x.planned > 0 && x.diff < 0) || free[0];
    if (c) {
      const cut = Math.min(roundTo(deficit, 10), roundTo(c.amount * 0.15, 10), Math.floor(c.amount));
      return `בחודש הבא הקטינו את ${c.label} מ-${money(c.amount)} ל-${money(c.amount - cut)} ש"ח, וקבעו את הסכום הזה כתקציב מתוכנן מראש. זהו צעד ראשון לסגירת הגירעון של ${money(deficit)} ש"ח.`;
    }
  }

  if (r.totalIncome > 0) {
    if (r.balance >= 0 && r.savingRate >= TARGET_RESERVE_RATE) {
      return `ביום קבלת ההכנסה בחודש הבא העבירו ${money(roundTo(r.balance, 10))} ש"ח לחשבון או למעטפה נפרדת, לפני כל הוצאה. זהו העודף שנוצר החודש (${r.savingRate}% מההכנסה), והוא משוריין לשמחות, לחגים ולתשלומים שנתיים.`;
    }
    const target = roundTo((r.totalIncome * TARGET_RESERVE_RATE) / 100, 10);
    return `ביום קבלת ההכנסה בחודש הבא העבירו ${money(target)} ש"ח (${TARGET_RESERVE_RATE}% מהכנסה של ${money(r.totalIncome)} ש"ח) לשריון נפרד, לפני כל הוצאה. החודש נשאר עודף של ${r.savingRate}% בלבד.`;
  }

  return 'בשבוע הראשון של החודש הבא, דווחו על כל הוצאה והכנסה ביום שבוצעו. יעד: לפחות 20 דיווחים עד סוף השבוע.';
}