import { base44 } from '@/api/base44Client';
import { isTitheIncome } from '@/lib/tithe';
import { isDonation } from '@/lib/categories';

// מסנכרן חובות מעשר: חוב אחד לכל הכנסה מזכה. תרומות סוגרות חובות לפי סדר תאריכים.
export async function syncTitheDebts(ownerId, transactions, s) {
  const pct = Number(s.tithe_percent) || 0;
  const since = s.tithe_since || '';
  const valid = transactions.filter((t) => t.date && (!since || t.date >= since));
  const incomes = valid.filter((t) => isTitheIncome(t, s)).sort((a, b) => a.date.localeCompare(b.date));
  let donations = valid.filter(isDonation).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const page = await base44.entities.Debt.filter({ owner_id: ownerId, kind: 'tithe' }, 'created_date', 5000);
  const existing = page.items || page;
  const byRef = new Map(existing.map((d) => [d.ref, d]));
  const wanted = new Set(incomes.map((t) => t.id));

  for (const d of existing) if (!wanted.has(d.ref)) await base44.entities.Debt.delete(d.id);

  const toCreate = [];
  for (const t of incomes) {
    const amount = Math.round(((Number(t.amount) || 0) * pct) / 100 * 100) / 100;
    const settled = donations >= amount;
    if (settled) donations -= amount;
    const d = byRef.get(t.id);
    if (!d) {
      toCreate.push({ owner_id: ownerId, direction: 'owe', person: 'מעשרות', amount, description: `מעשר מהכנסה מתאריך ${t.date}`, kind: 'tithe', ref: t.id, settled });
    } else if (d.amount !== amount || !!d.settled !== settled) {
      await base44.entities.Debt.update(d.id, { amount, settled });
    }
  }
  if (toCreate.length) await base44.entities.Debt.bulkCreate(toCreate);
}