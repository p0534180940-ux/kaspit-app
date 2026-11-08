// תפריטים נוספים בקו: מעשרות, קופות חיסכון, חובות והחזרים, יתרה בתקציב, הערת המאמן.
// פעולות הכתיבה נרשמות באותן ישויות שהאתר קורא, ולכן מופיעות באתר מיד.
import { say, menu, askDigits } from '../_shared/ivrResponses.js';
import { findCategoryByName, labelOf } from '../_shared/categoryList.js';
import { buildMonthlyReport, monthKey, fmt, MONTH_NAMES } from '../_shared/reportData.js';
import { computeTitheBalance } from '../_shared/titheCalc.js';

const digitsToNumber = (d) => parseFloat(String(d).replace(/\D/g, ''));

function speakDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return `${d} ב${MONTH_NAMES[m - 1]}`;
}

function nextMonth(s) {
  const [y, m, d] = s.split('-').map(Number);
  const last = new Date(y, m + 1, 0).getDate();
  const n = new Date(y, m, Math.min(d, last));
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// ---------- מעשרות ----------
export async function titheSummary(ctx) {
  await ctx.clearSession();
  const s = ctx.settings || {};
  if (!s.tithe_enabled) return say('חישוב המעשרות לא הופעל בחשבון. ניתן להפעיל אותו באתר, בכרטיס המעשרות. להתראות.');
  const all = [];
  for (const id of ctx.ownerIds) all.push(...(await ctx.db.Transaction.filter({ owner_id: id })));
  const confirmed = all.filter((t) => (t.status || 'confirmed') === 'confirmed');
  const r = computeTitheBalance(confirmed, s);
  if (r.balance > 0) {
    return say(`יתרת המעשרות לתשלום היא ${fmt(r.balance)} שקלים. נצבר מעשר של ${fmt(r.owed)} שקלים, ונתרמו ${fmt(r.given)} שקלים. להתראות.`);
  }
  return say(`אין יתרת מעשרות לתשלום. נצבר מעשר של ${fmt(r.owed)} שקלים, ונתרמו ${fmt(r.given)} שקלים. להתראות.`);
}

// ---------- קופות חיסכון ----------
export async function savingsMenu(ctx) {
  const goals = (await ctx.db.SavingsGoal.filter({ owner_id: ctx.ownerId }, 'target_date', 50)).slice(0, 9);
  if (!goals.length) {
    await ctx.clearSession();
    return say('לא הוגדרו קופות חיסכון. ניתן להגדיר אותן באתר. להתראות.');
  }
  ctx.data = { goal_ids: goals.map((g) => g.id) };
  const list = goals
    .map((g, i) => `קופה ${i + 1}, ${g.name}: נחסכו ${fmt(g.saved_amount)} מתוך ${fmt(g.target_amount)} שקלים.`)
    .join(' ');
  return menu(
    ctx,
    'savingsChoice',
    goals.map((_, i) => i + 1).join(',') + ',0',
    `${list} להפקדה לקופה הקישו את מספר הקופה. לתפריט הראשי הקישו אפס.`,
    2,
    9
  );
}

export async function savingsChoice(ctx, choice) {
  if (String(choice) === '0') return ctx.flows.menuRoot(ctx);
  const id = (ctx.data?.goal_ids || [])[Number(choice) - 1];
  const goal = id ? await ctx.db.SavingsGoal.get(id).catch(() => null) : null;
  if (!goal) return ctx.flows.menuRoot(ctx);
  ctx.data = { ...ctx.data, goal_id: goal.id };
  return askDigits(ctx, 'savingsAmount', `הפקדה לקופה ${goal.name}. הקישו את הסכום בשקלים בספרות, ובסיום הקישו סולמית.`, 8, 1);
}

export async function savingsAmount(ctx, digits) {
  const amount = digitsToNumber(digits);
  if (!amount) return askDigits(ctx, 'savingsAmount', 'הסכום לא זוהה. הקישו את הסכום בשקלים בספרות, ובסיום הקישו סולמית.', 8, 1);
  const goal = ctx.data?.goal_id ? await ctx.db.SavingsGoal.get(ctx.data.goal_id).catch(() => null) : null;
  if (!goal) return ctx.flows.menuRoot(ctx);
  await ctx.db.Transaction.create({
    type: 'expense',
    amount,
    category: 'savings_transfer',
    description: `העברה לחיסכון: ${goal.name}`,
    date: ctx.today,
    owner_id: ctx.ownerId,
    source: 'ivr',
    status: 'confirmed',
    reference: `goal:${goal.id}`,
  });
  const saved = (Number(goal.saved_amount) || 0) + amount;
  await ctx.db.SavingsGoal.update(goal.id, { saved_amount: saved });
  await ctx.clearSession();
  return say(`הופקדו ${fmt(amount)} שקלים לקופה ${goal.name}. סך הכל בקופה ${fmt(saved)} שקלים מתוך ${fmt(goal.target_amount)}. להתראות.`);
}

// ---------- חובות: הקראה, החזר הבא ורישום החזר ----------
export async function debtsList(ctx) {
  const open = await ctx.db.Debt.filter({ owner_id: ctx.ownerId, settled: false });
  const debts = open.filter((d) => d.kind !== 'tithe').slice(0, 9);
  if (!debts.length) {
    await ctx.clearSession();
    return say('אין חובות פתוחים. להתראות.');
  }
  ctx.data = { debt_ids: debts.map((d) => d.id) };
  const list = debts
    .map((d, i) => {
      const who = d.direction === 'owed' ? `חייב לכם ${d.person}` : `אתם חייבים ל${d.person}`;
      const next = d.next_payment_date
        ? `, החזר הבא ב${speakDate(d.next_payment_date)}${d.monthly_payment ? ` בסך ${fmt(d.monthly_payment)} שקלים` : ''}`
        : '';
      return `חוב ${i + 1}, ${who}, יתרה ${fmt(d.amount)} שקלים${next}.`;
    })
    .join(' ');
  return menu(
    ctx,
    'debtPick',
    debts.map((_, i) => i + 1).join(',') + ',0',
    `${list} לרישום החזר הקישו את מספר החוב. לתפריט הראשי הקישו אפס.`,
    2,
    9
  );
}

export async function debtPick(ctx, choice) {
  if (String(choice) === '0') return ctx.flows.menuRoot(ctx);
  const id = (ctx.data?.debt_ids || [])[Number(choice) - 1];
  const debt = id ? await ctx.db.Debt.get(id).catch(() => null) : null;
  if (!debt) return ctx.flows.menuRoot(ctx);
  ctx.data = { ...ctx.data, debt_id: debt.id };
  const hint = debt.monthly_payment ? ` ההחזר החודשי המוסכם הוא ${fmt(debt.monthly_payment)} שקלים.` : '';
  return askDigits(ctx, 'debtPay', `רישום החזר, ${debt.person}. היתרה ${fmt(debt.amount)} שקלים.${hint} הקישו את סכום ההחזר בשקלים, ובסיום הקישו סולמית.`, 8, 1);
}

export async function debtPay(ctx, digits) {
  const debt = ctx.data?.debt_id ? await ctx.db.Debt.get(ctx.data.debt_id).catch(() => null) : null;
  if (!debt) return ctx.flows.menuRoot(ctx);
  const paid = digitsToNumber(digits);
  if (!paid || paid > Number(debt.amount)) {
    return askDigits(ctx, 'debtPay', `הסכום לא תקין. היתרה היא ${fmt(debt.amount)} שקלים. הקישו את סכום ההחזר, ובסיום הקישו סולמית.`, 8, 1);
  }
  const owed = debt.direction === 'owed';
  await ctx.db.Transaction.create({
    type: owed ? 'income' : 'expense',
    amount: paid,
    category: owed ? 'refund_income' : 'debt_repayment',
    description: owed ? `החזר מ${debt.person}` : `החזר ל${debt.person}`,
    date: ctx.today,
    owner_id: ctx.ownerId,
    source: 'ivr',
    status: 'confirmed',
    reference: `debt:${debt.id}`,
  });
  const balance = Math.round((Number(debt.amount) - paid) * 100) / 100;
  const patch = { amount: balance, settled: balance <= 0 };
  if (debt.next_payment_date && balance > 0) patch.next_payment_date = nextMonth(debt.next_payment_date);
  await ctx.db.Debt.update(debt.id, patch);
  await ctx.clearSession();
  return say(balance > 0 ? `נרשם החזר של ${fmt(paid)} שקלים. נותרה יתרה של ${fmt(balance)} שקלים. להתראות.` : 'נרשם החזר והחוב נסגר במלואו. להתראות.');
}

// ---------- כמה נשאר בתקציב לקטגוריה ----------
export async function remainingForCategory(ctx, spoken) {
  const category = findCategoryByName(spoken, 'expense');
  if (!category) return ctx.flows.askInput(ctx, 'remainCat', 'לא זיהיתי את שם הקטגוריה. ');
  const month = monthKey(new Date());
  const report = await buildMonthlyReport(ctx.db, ctx.ownerIds, month);
  const row = (report.expenseByCategory || []).find((c) => c.category === category);
  let planned = row?.planned || 0;
  if (!row) {
    for (const id of ctx.ownerIds) {
      const b = await ctx.db.Budget.filter({ owner_id: id, month, category });
      planned += b.reduce((s, x) => s + (Number(x.planned_amount) || 0), 0);
    }
  }
  const actual = row?.amount || 0;
  const label = labelOf(category, 'expense');
  await ctx.clearSession();
  if (!planned) return say(`לא הוגדר תקציב לקטגוריית ${label} בחודש ${report.monthLabel}. נרשמו בה ${fmt(actual)} שקלים. להתראות.`);
  const left = planned - actual;
  if (left >= 0) return say(`בקטגוריית ${label} נותרו ${fmt(left)} שקלים מתוך תקציב של ${fmt(planned)}. נרשמו עד כה ${fmt(actual)} שקלים. להתראות.`);
  return say(`בקטגוריית ${label} יש חריגה של ${fmt(-left)} שקלים. התקציב ${fmt(planned)} שקלים, ונרשמו ${fmt(actual)}. להתראות.`);
}

// ---------- הערה אחרונה מהמאמן ----------
export async function lastCoachNote(ctx) {
  await ctx.clearSession();
  const notes = await ctx.db.CoachNote.filter({ owner_id: ctx.ownerId }, '-created_date', 1);
  if (!notes.length) return say('אין הערות מהמאמן הכלכלי. להתראות.');
  const n = notes[0];
  const date = new Date(n.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
  return say(`ההערה האחרונה מהמאמן הכלכלי${n.coach_name ? ` ${n.coach_name}` : ''}, מתאריך ${date}: ${n.text}. להתראות.`);
}