import { EXPENSE_CATEGORIES, getCategory, isSpend } from './categories';
import { formatCurrency } from './format';

const DEVIATION_THRESHOLD = 1.3;

export function generateBudgetAdvice(data) {
  const {
    transactions = [],
    budgetRecords = [],
    month,
    monthLabelStr,
  } = data;

  const monthTxns = transactions.filter((t) => t.date && t.date.startsWith(month));
  const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = monthTxns.filter(isSpend).reduce((s, t) => s + (t.amount || 0), 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? ((balance / income) * 100) : 0;
  const hasData = monthTxns.length > 0;

  if (!hasData) {
    return `# ברוכים הבאים לכספית! 👋

אני המאמן הכלכלי שלך. כדי שאוכל לאמן אותך נכון, אני צריך להכיר את המספרים שלך.

## איך מתחילים?

1. **רישום מהיר** — השתמשו בתיבה החכמה בדף הבית, או פשוט כתבו "100 שח ברמי לוי"
2. **תכנון תקציב** — הגדירו יעדים חודשיים בדף התקציב
3. **חזרו אליי** — אחרי שתרשמו כמה הוצאות, חזרו לכאן ואני אנתח ואייעץ

ככל שתקפידו על רישום, כך האימון יהיה מדויק יותר. 💪`;
  }

  const plannedMap = {};
  budgetRecords.forEach((b) => { plannedMap[b.category] = b.planned_amount; });

  const actualMap = {};
  monthTxns.forEach((t) => {
    actualMap[t.category] = (actualMap[t.category] || 0) + (t.amount || 0);
  });

  const prevTxns = transactions.filter(
    (t) => t.date && !t.date.startsWith(month) && isSpend(t)
  );
  const prevMonthsSet = new Set();
  const prevByCategory = {};
  prevTxns.forEach((t) => {
    const m = t.date.slice(0, 7);
    prevMonthsSet.add(m);
    if (!prevByCategory[t.category]) prevByCategory[t.category] = {};
    prevByCategory[t.category][m] = (prevByCategory[t.category][m] || 0) + (t.amount || 0);
  });
  const prevMonthCount = Math.max(prevMonthsSet.size, 1);
  const baselineMap = {};
  Object.keys(prevByCategory).forEach((cat) => {
    const totals = Object.values(prevByCategory[cat]);
    baselineMap[cat] = totals.reduce((s, v) => s + v, 0) / prevMonthCount;
  });

  const deviations = [];
  Object.keys(actualMap).forEach((cat) => {
    const actual = actualMap[cat];
    const baseline = baselineMap[cat];
    if (baseline > 0 && actual > baseline * DEVIATION_THRESHOLD && prevMonthCount >= 1) {
      const pctAbove = ((actual - baseline) / baseline) * 100;
      deviations.push({
        categoryId: cat,
        actual,
        baseline,
        pctAbove,
        diff: actual - baseline,
      });
    }
  });
  deviations.sort((a, b) => b.pctAbove - a.pctAbove);

  const overBudget = EXPENSE_CATEGORIES
    .map((c) => ({ ...c, actual: actualMap[c.id] || 0, planned: plannedMap[c.id] || 0 }))
    .filter((c) => c.planned > 0 && c.actual > c.planned)
    .sort((a, b) => (b.actual - b.planned) - (a.actual - a.planned));

  const topExpenses = EXPENSE_CATEGORIES
    .map((c) => ({ ...c, actual: actualMap[c.id] || 0 }))
    .filter((c) => c.actual > 0)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 5);

  let advice = `# דו"ח אימון — ${monthLabelStr || month}\n\n`;

  if (balance > 0) {
    advice += `## נקודת אור ✅\n\n`;
    advice += `מצב פיננסי **חיובי** החודש!\n\n`;
    advice += `- הכנסות: ${income > 0 ? formatCurrency(income) : 'לא תועד'}\n`;
    advice += `- הוצאות: ${formatCurrency(expense)}\n`;
    advice += `- **מאזן: ${formatCurrency(balance)}** (${savingsRate.toFixed(0)}% חיסכון)\n\n`;
    if (savingsRate >= 20) {
      advice += `🎯 מעולה! חוסכים מעל 20% — רמה מצוינת. כל הכבוד!\n\n`;
    } else if (savingsRate >= 10) {
      advice += `חיסכון של ${savingsRate.toFixed(0)}% — יפה, אבל נשאף ל-20%. בואו נראה איפה אפשר לצמצם.\n\n`;
    } else {
      advice += `החיסכון נמוך (${savingsRate.toFixed(0)}%). לא נורא — ביחד נמצא את הדרך לשפר. 💪\n\n`;
    }
  } else if (balance < 0) {
    advice += `## נדרשת תשומת לב ⚠️\n\n`;
    advice += `המאזן החודשי **שלילי**:\n\n`;
    advice += `- הכנסות: ${income > 0 ? formatCurrency(income) : 'לא תועד'}\n`;
    advice += `- הוצאות: ${formatCurrency(expense)}\n`;
    advice += `- **גרעון: ${formatCurrency(Math.abs(balance))}**\n\n`;
    advice += `אל תדאגו — בואו נזהה איפה אפשר להתייעל. הצעד הראשון: להבין לאן הולך הכסף.\n\n`;
  } else {
    advice += `## מאוזן\n\nההכנסות וההוצאות שוות. נשאף ליצור עודף קטן לחיסכון.\n\n`;
  }

  if (deviations.length > 0) {
    advice += `## 🚨 חריגות שזיהיתי\n\n`;
    advice += `זיהיתי שההוצאות שלך בקטגוריות הבאות **קפצו משמעותית** מהממוצע הרגיל שלך:\n\n`;
    deviations.slice(0, 4).forEach((d) => {
      const cat = getCategory(d.categoryId);
      advice += `- **${cat.label}**: ${formatCurrency(d.actual)} לעומת ממוצע ${formatCurrency(Math.round(d.baseline))} (+${d.pctAbove.toFixed(0)}%)\n`;
    });
    advice += `\n`;
    const topDev = deviations[0];
    const topDevCat = getCategory(topDev.categoryId);
    advice += `**המלצתי:** ההוצאה ב"${topDevCat.label}" עלתה ב-${topDev.pctAbove.toFixed(0)}% מהרגיל. `;
    advice += getDeviationAdvice(topDev.categoryId);
    advice += `\n\n`;
  }

  if (overBudget.length > 0) {
    advice += `## חריגות מהתקציב המתוכנן\n\n`;
    overBudget.forEach((c) => {
      advice += `- **${c.label}**: תכנון ${formatCurrency(c.planned)} / בפועל ${formatCurrency(c.actual)} (חריגה ${formatCurrency(c.actual - c.planned)})\n`;
    });
    advice += `\n**כדאי לשאול:** האם זו הוצאה חד-פעמית או מגמה חדשה? אם חד-פעמית — אפשר להמשיך. אם מגמה — נתאים את התקציב או נצמצם.\n\n`;
  }

  if (topExpenses.length > 0) {
    advice += `## ההוצאות המובילות שלך\n\n`;
    topExpenses.forEach((c, i) => {
      const pct = expense > 0 ? ((c.actual / expense) * 100).toFixed(0) : 0;
      advice += `${i + 1}. **${c.label}** — ${formatCurrency(c.actual)} (${pct}% מההוצאות)\n`;
    });
    advice += `\n`;
  }

  advice += `## צעד יזום לחודש הבא\n\n${proactiveStepText({ income, expense, balance, savingsRate, actualMap, plannedMap })}\n\n`;

  advice += `## תוכנית פעולה 🎯\n\n`;
  if (balance < 0 || savingsRate < 10) {
    advice += `1. **מחר בבוקר** — בדקו את ההוצאות הקבועות (חשמל, תקשורת, ביטוחים). השוואת ספקים יכולה לחסוך מאות שקלים.\n`;
    advice += `2. **השבוע** — רשמו כל הוצאה, גם קטנה. 5 ש"ח פה ו-10 שם מצטברים למאות בחודש.\n`;
    advice += `3. **החודש** — צמצמו אכילה בחוץ ואוכל מוכן בחצי. זה יכול לחסוך 500-1000 ש"ח.\n`;
  } else {
    advice += `1. **המשיכו במגמה** — אתם בכיוון הנכון. ההתמדה ברישום היא המפתח.\n`;
    advice += `2. **הגדילו חיסכון ב-2%** — העבירו עוד קצת לחשבון נפרד שלא נוגעים בו.\n`;
    advice += `3. **בנו קרן חירום** — 3 חודשי הוצאות לפחות, למקרי חירום.\n`;
  }

  advice += `\n## הגדלת הכנסות 💰\n\n`;
  advice += `1. **עבודה גמישה מהבית** — מכירות, כתיבה, ייעוץ — תחומים עם שעות גמישות.\n`;
  advice += `2. **הכשרה מקצועית** — קורס בתחום מבוקש יכול להגדיל הכנסה משמעותית.\n`;
  advice += `3. **מכירת פריטים שאינם בשימוש** — פינוי והכנסה בו זמנית.\n`;

  advice += `\n## קרן חירום 🛡️\n\n`;
  advice += `**יעד: 3-6 חודשי הוצאות.**\n\n`;
  if (balance > 0) {
    const oneMonthTarget = expense;
    const monthsToOne = Math.ceil(oneMonthTarget / Math.max(balance, 1));
    advice += `בקצב הנוכחי תגיעו לחודש חירום אחד תוך ${monthsToOne} חודשים.\n`;
    advice += `התחילו בהפקדת ${formatCurrency(Math.min(balance, Math.round(oneMonthTarget / 6)))} בחודש לחשבון נפרד.\n`;
  } else {
    advice += `התחילו בקטן — גם 100 ש"ח בחודש הם התחלה. הרגל חשוב יותר מסכום.\n`;
  }

  advice += `\n---\n*אני כאן בכל פעם שתצטרכו. רשמו, חזרו, ונמשיך להתקדם ביחד. 💪*`;

  return advice;
}

// סעיפים שאין להציע לצמצם (ערכים ומחויבויות קהילתיות) — תואם base44/shared/kaspitModel.js
const PROTECTED = ['charity', 'kashrut', 'education', 'school', 'shabbat', 'holiday', 'yom_tov', 'day_care', 'noon_care'];
const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step);

// צעד יזום אחד וקונקרטי לחודש הבא, עם יעד מספרי
function proactiveStepText({ income, expense, balance, savingsRate, actualMap, plannedMap }) {
  const rows = Object.keys(actualMap)
    .map((id) => ({ id, actual: actualMap[id], planned: plannedMap[id] || 0 }))
    .filter((c) => c.actual > 0 && getCategory(c.id))
    .sort((a, b) => b.actual - a.actual);
  const free = rows.filter((c) => !PROTECTED.some((p) => c.id.includes(p)));
  const hasPlan = Object.values(plannedMap).some((v) => v > 0);

  if (!hasPlan && rows[0]) {
    return `לפני תחילת החודש הבא קבעו תקציב מתוכנן של ${formatCurrency(roundTo(rows[0].actual, 50))} לסעיף ${getCategory(rows[0].id).label}, הסעיף הגדול ביותר. זו נקודת הייחוס הראשונה שלכם.`;
  }
  if (balance < 0) {
    const c = free.find((x) => x.planned > 0 && x.actual > x.planned) || free[0];
    if (c) {
      const cut = Math.min(roundTo(Math.abs(balance), 10), roundTo(c.actual * 0.15, 10), Math.floor(c.actual));
      return `בחודש הבא הקטינו את ${getCategory(c.id).label} מ-${formatCurrency(c.actual)} ל-${formatCurrency(c.actual - cut)}, וקבעו את הסכום הזה כתקציב מתוכנן מראש. זהו צעד ראשון לסגירת הגרעון של ${formatCurrency(Math.abs(balance))}.`;
    }
  }
  if (income > 0) {
    const amount = balance > 0 && savingsRate >= 12 ? roundTo(balance, 10) : roundTo(income * 0.12, 10);
    return `ביום קבלת ההכנסה בחודש הבא העבירו ${formatCurrency(amount)} לחשבון או למעטפה נפרדת, לפני כל הוצאה. השריון בתחילת החודש, לא ממה שנשאר בסופו.`;
  }
  return 'בשבוע הראשון של החודש הבא, דווחו על כל הוצאה והכנסה ביום שבוצעו. יעד: לפחות 20 דיווחים עד סוף השבוע.';
}

function getDeviationAdvice(categoryId) {
  const adviceMap = {
    clothing_general: 'ביגוד — האם קניתם לקראת עונה או אירוע? אם לא, כדאי להגדיר תקציב ביגוד חודשי קבוע ולהתחייב אליו. המתינו למבצעים וקנו רשימה, לא רגש.',
    shoes: 'נעליים — בדקו האם מדובר ברכישה חד-פעמית. אם זה חוזר, הגדירו תקציב שנתי וחלקו אותו לחודשים.',
    entertainment: 'בילויים — נסו למצוא חלופות זולות: פיקניק במקום מסעדה, סרט בבית במקום קולנוע. הבילוי לא חייב לעלות הרבה.',
    restaurant: 'מסעדות — צמצום ארוחות בחוץ בחצי יכול לחסוך מאות שקלים. נסו לבשל כפול ולהקפיא.',
    tv_internet: 'טלוויזיה ואינטרנט — בדקו אם אפשר לעבור לחבילה זולה יותר. לפעמים שיחת טלפון לספק יכולה להוריד את המחיר.',
    phone_mobile_landline: 'טלפון — השוו בין חברות הסלולר. יש חבילות כשרות זולות שיכולות לחסוך מאות שקלים בשנה.',
    content_services: 'שירותי תוכן — בדקו אילו מנויים אתם באמת צורכים. ביטול מנוי אחד שלא בשימוש יכול לחסוך מאות שקלים בשנה.',
    food: 'מזון — האם קניתם יותר מהרגיל? ערכו רשימת קניות לפני הכניסה לסופר — זה מונע קניות אימפולסיביות וחוסך 15-20%.',
    prepared_food: 'אוכל מוכן — נסו להכין ארוחות מראש לשבוע. זה חוסך זמן וכסף וגם בריא יותר.',
    fuel: 'דלק — צרפו נסיעות, השתמשו בתחבורה ציבורית כשאפשר, ומלאו בתחנות הזולות באזור.',
    pocket_money: 'דמי כיס — בחנו אם העלאת דמי הכיס הכרחית. לפעמים אפשר לתת תקציב קבוע וללמד ניהול עצמאי.',
  };
  return adviceMap[categoryId] || 'בחנו האם זו הוצאה חד-פעמית או מגמה. אם מגמה — הגדירו תקציב חודשי לקטגוריה זו ועקבו אחריו.';
}