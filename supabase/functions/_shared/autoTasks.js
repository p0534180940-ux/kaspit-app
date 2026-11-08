// משימות שמתעדכנות אוטומטית לפי מצב החשבון (נקראות בשלוחת המשימות)
import { buildMonthlyReport, monthKey } from './reportData.js';

async function desiredTitles(ctx) {
  const titles = [];
  const pending = await ctx.db.Transaction.filter({ owner_id: ctx.ownerId, status: 'pending' });
  if (pending.length) titles.push(`לאשר ${pending.length} תנועות שממתינות לאישור`);

  const report = await buildMonthlyReport(ctx.db, ctx.ownerIds, monthKey(new Date()));
  for (const c of report.expenseByCategory) {
    if (c.planned > 0 && c.diff < 0) titles.push(`לבדוק חריגה בתקציב ${c.label}`);
  }

  const debts = await ctx.db.Debt.filter({ owner_id: ctx.ownerId, settled: false, direction: 'owe' });
  for (const d of debts) {
    if (d.due_date && d.due_date <= ctx.today) titles.push(`להסדיר חוב${d.person ? ' ל' + d.person : ''}`);
  }

  if (!ctx.settings?.email) titles.push('להגדיר כתובת מייל לקבלת דוחות');
  return titles.slice(0, 8);
}

export async function syncAutoTasks(ctx) {
  const wanted = await desiredTitles(ctx);
  const auto = await ctx.db.UserTask.filter({ owner_id: ctx.ownerId, source: 'auto' });
  for (const t of auto) {
    if (!t.done && !wanted.includes(t.title)) await ctx.db.UserTask.update(t.id, { done: true });
  }
  for (const title of wanted) {
    if (!auto.some((t) => t.title === title)) {
      await ctx.db.UserTask.create({ owner_id: ctx.ownerId, title, source: 'auto' });
    }
  }
}