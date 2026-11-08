// בניית נתוני דוח חודשי מפורט — משותף לשליחת דוחות ולהקראה בטלפון
import { labelOf, EXCLUDED_CATEGORIES } from './categoryList.js';
import { adviceToHtml, adviceToText, adviceToSpeech } from './reportAdvice.js';

export const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function fmt(n) {
  return Math.round(Number(n) || 0).toLocaleString('he-IL');
}

function prevMonthKey(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

function monthLabel(month) {
  const [year, m] = month.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${year}`;
}

export async function buildMonthlyReport(db, ownerIds, month) {
  const all = [];
  const budgets = [];
  const debts = [];
  for (const id of ownerIds) {
    all.push(...(await db.Transaction.filter({ owner_id: id })));
    budgets.push(...(await db.Budget.filter({ owner_id: id, month })));
    debts.push(...(await db.Debt.filter({ owner_id: id, settled: false })));
  }

  // תנועות שממתינות לאישור (למשל מפקס) אינן נכללות בדוח
  const confirmed = all.filter((t) => (t.status || 'confirmed') === 'confirmed');
  const inMonth = (key) => confirmed.filter((t) => t.date && String(t.date).startsWith(key));
  // משיכות מזומן והעברות לעצמי אינן הוצאה בפועל
  const counted = (t) => !EXCLUDED_CATEGORIES.includes(t.category);
  const txns = inMonth(month).filter(counted);
  const prevKey = prevMonthKey(month);
  const prevTxns = inMonth(prevKey).filter(counted);

  const sum = (arr) => arr.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const income = txns.filter((t) => t.type === 'income');
  const expense = txns.filter((t) => t.type === 'expense');

  const plannedMap = {};
  for (const b of budgets) {
    plannedMap[b.category] = (plannedMap[b.category] || 0) + (Number(b.planned_amount) || 0);
  }

  const groupBy = (arr, type, total) => {
    const map = {};
    const counts = {};
    for (const t of arr) {
      map[t.category] = (map[t.category] || 0) + (Number(t.amount) || 0);
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return Object.keys(map)
      .map((cat) => ({
        category: cat,
        label: labelOf(cat, type),
        amount: map[cat],
        count: counts[cat],
        share: total > 0 ? Math.round((map[cat] / total) * 100) : 0,
        planned: plannedMap[cat] || 0,
        diff: (plannedMap[cat] || 0) - map[cat],
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const totalIncome = sum(income);
  const totalExpense = sum(expense);
  const totalPlanned = Object.values(plannedMap).reduce((s, v) => s + v, 0);
  const prevExpense = sum(prevTxns.filter((t) => t.type === 'expense'));
  const prevIncome = sum(prevTxns.filter((t) => t.type === 'income'));

  const topExpenses = [...expense]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 10)
    .map((t) => ({
      date: t.date,
      label: labelOf(t.category, 'expense'),
      description: t.description || '',
      amount: Number(t.amount) || 0,
    }));

  const oweTotal = sum(debts.filter((d) => d.direction === 'owe'));
  const owedTotal = sum(debts.filter((d) => d.direction === 'owed'));

  return {
    month,
    monthLabel: monthLabel(month),
    prevMonthLabel: monthLabel(prevKey),
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    count: txns.length,
    dailyAverage: totalExpense > 0 ? Math.round(totalExpense / new Date().getDate()) : 0,
    savingRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
    totalPlanned,
    plannedDiff: totalPlanned - totalExpense,
    prevIncome,
    prevExpense,
    expenseChange: prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : 0,
    expenseByCategory: groupBy(expense, 'expense', totalExpense),
    incomeByCategory: groupBy(income, 'income', totalIncome),
    topExpenses,
    oweTotal,
    owedTotal,
  };
}

// טקסט להקראה בטלפון
export function reportToSpeech(r) {
  const balText = r.balance >= 0
    ? `היתרה עומדת על ${fmt(r.balance)} שקלים.`
    : `המאזן שלילי ב${fmt(Math.abs(r.balance))} שקלים.`;
  const cats = r.expenseByCategory
    .map((c) => `${c.label}, ${fmt(c.amount)} שקלים, ${c.share} אחוז.`)
    .join(' ');
  const compare = r.prevExpense > 0
    ? ` בהשוואה ל${r.prevMonthLabel}, ההוצאות ${r.expenseChange >= 0 ? 'גבוהות' : 'נמוכות'} ב${Math.abs(r.expenseChange)} אחוז.`
    : '';
  return `סיכום ${r.monthLabel}. הכנסות ${fmt(r.totalIncome)} שקלים. הוצאות ${fmt(r.totalExpense)} שקלים. ${balText}${compare} פירוט ההוצאות לפי קטגוריות: ${cats || 'לא נרשמו הוצאות החודש.'} צעד יזום לחודש הבא: ${adviceToSpeech(r)}`;
}

const TD = 'padding:6px 10px;border-bottom:1px solid #eee';

function catTable(list, showBudget) {
  if (!list.length) return '<p style="color:#777">אין נתונים</p>';
  const head = `<tr style="background:#f6f6f6"><th style="${TD};text-align:right">קטגוריה</th><th style="${TD};text-align:left">סכום</th><th style="${TD};text-align:left">אחוז</th><th style="${TD};text-align:left">תנועות</th>${showBudget ? `<th style="${TD};text-align:left">תקציב</th><th style="${TD};text-align:left">פער</th>` : ''}</tr>`;
  const rows = list.map((c) => `<tr>
      <td style="${TD}">${c.label}</td>
      <td style="${TD};text-align:left">${fmt(c.amount)} ₪</td>
      <td style="${TD};text-align:left">${c.share}%</td>
      <td style="${TD};text-align:left">${c.count}</td>
      ${showBudget ? `<td style="${TD};text-align:left">${c.planned ? fmt(c.planned) + ' ₪' : '—'}</td><td style="${TD};text-align:left;color:${c.planned && c.diff < 0 ? '#c0392b' : '#2d7d32'}">${c.planned ? (c.diff >= 0 ? 'נותרו ' : 'חריגה ') + fmt(Math.abs(c.diff)) + ' ₪' : '—'}</td>` : ''}
    </tr>`).join('');
  return `<table style="border-collapse:collapse;width:100%;max-width:640px">${head}${rows}</table>`;
}

// דוח HTML מפורט לשליחה במייל — ברמת הפירוט של דוח מלא
export function reportToHtml(r) {
  const box = (title, value, note) => `<div style="border:1px solid #eee;border-radius:10px;padding:10px 14px;min-width:140px">
      <div style="font-size:12px;color:#888">${title}</div>
      <div style="font-size:19px;font-weight:bold">${value}</div>
      ${note ? `<div style="font-size:11px;color:#888">${note}</div>` : ''}
    </div>`;

  return `<div dir="rtl" style="font-family:Arial,sans-serif;color:#222;line-height:1.6">
    <h2 style="margin-bottom:2px">דוח כספית — ${r.monthLabel}</h2>
    <p style="color:#888;margin-top:0">${r.count} תנועות נרשמו החודש</p>

    <div style="display:flex;flex-wrap:wrap;gap:10px;margin:14px 0">
      ${box('הכנסות', fmt(r.totalIncome) + ' ₪', `${r.prevMonthLabel}: ${fmt(r.prevIncome)} ₪`)}
      ${box('הוצאות', fmt(r.totalExpense) + ' ₪', `${r.prevMonthLabel}: ${fmt(r.prevExpense)} ₪ (${r.expenseChange >= 0 ? '+' : ''}${r.expenseChange}%)`)}
      ${box('מאזן', fmt(r.balance) + ' ₪', `שיעור חיסכון ${r.savingRate}%`)}
      ${box('ממוצע יומי', fmt(r.dailyAverage) + ' ₪', '')}
    </div>

    <h3>עמידה בתקציב</h3>
    <p>${r.totalPlanned > 0
      ? `תקציב מתוכנן: <b>${fmt(r.totalPlanned)} ₪</b> · בפועל: <b>${fmt(r.totalExpense)} ₪</b> · ${r.plannedDiff >= 0 ? `נותרו <b>${fmt(r.plannedDiff)} ₪</b>` : `<b style="color:#c0392b">חריגה של ${fmt(Math.abs(r.plannedDiff))} ₪</b>`}`
      : 'לא הוגדר תקציב לחודש זה.'}</p>

    <h3>פילוח הוצאות לפי קטגוריה</h3>
    ${catTable(r.expenseByCategory, true)}

    <h3>פילוח הכנסות לפי קטגוריה</h3>
    ${catTable(r.incomeByCategory, false)}

    <h3>ההוצאות הגדולות החודש</h3>
    ${r.topExpenses.length
      ? `<table style="border-collapse:collapse;width:100%;max-width:640px">${r.topExpenses.map((t) => `<tr><td style="${TD}">${t.date}</td><td style="${TD}">${t.label}${t.description ? ' — ' + t.description : ''}</td><td style="${TD};text-align:left">${fmt(t.amount)} ₪</td></tr>`).join('')}</table>`
      : '<p style="color:#777">אין נתונים</p>'}

    <h3>חובות פתוחים</h3>
    <p>אתם חייבים: <b>${fmt(r.oweTotal)} ₪</b> · חייבים לכם: <b>${fmt(r.owedTotal)} ₪</b></p>

    ${adviceToHtml(r)}

    <p style="color:#888;font-size:12px">נשלח אוטומטית ממערכת כספית.</p>
  </div>`;
}

export function reportToPlainText(r) {
  const lines = [
    `דוח כספית — ${r.monthLabel}`,
    `מספר תנועות: ${r.count}`,
    '',
    `הכנסות: ${fmt(r.totalIncome)} ש"ח (חודש קודם: ${fmt(r.prevIncome)})`,
    `הוצאות: ${fmt(r.totalExpense)} ש"ח (חודש קודם: ${fmt(r.prevExpense)}, שינוי ${r.expenseChange}%)`,
    `מאזן: ${fmt(r.balance)} ש"ח | שיעור חיסכון: ${r.savingRate}%`,
    `ממוצע הוצאה יומי: ${fmt(r.dailyAverage)} ש"ח`,
    r.totalPlanned > 0
      ? `תקציב מתוכנן: ${fmt(r.totalPlanned)} ש"ח | ${r.plannedDiff >= 0 ? `נותרו ${fmt(r.plannedDiff)}` : `חריגה ${fmt(Math.abs(r.plannedDiff))}`} ש"ח`
      : 'לא הוגדר תקציב לחודש זה',
    '',
    'פילוח הוצאות:',
  ];
  for (const c of r.expenseByCategory) {
    lines.push(`${c.label}: ${fmt(c.amount)} ש"ח (${c.share}%, ${c.count} תנועות)${c.planned ? ` | תקציב ${fmt(c.planned)}` : ''}`);
  }
  lines.push('', 'פילוח הכנסות:');
  for (const c of r.incomeByCategory) lines.push(`${c.label}: ${fmt(c.amount)} ש"ח (${c.share}%)`);
  lines.push('', 'ההוצאות הגדולות:');
  for (const t of r.topExpenses) lines.push(`${t.date} ${t.label}${t.description ? ' — ' + t.description : ''}: ${fmt(t.amount)} ש"ח`);
  lines.push('', `חובות — אתם חייבים: ${fmt(r.oweTotal)} ש"ח | חייבים לכם: ${fmt(r.owedTotal)} ש"ח`);
  const advice = adviceToText(r);
  if (advice) lines.push(advice);
  return lines.join('\n');
}