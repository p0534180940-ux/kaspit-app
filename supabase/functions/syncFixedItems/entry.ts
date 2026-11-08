import { createClientFromRequest } from '../_shared/b44.ts';
import { secrets } from '../_shared/b44.ts';
import { monthKey } from '../_shared/reportData.js';
import { getCaller, ownsIdentity } from '../_shared/callerAuth.js';

// מסנכרן הוצאות והכנסות קבועות + חלק חודשי של הוצאות שנתיות אל תקציב החודש הנוכחי
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const month = body.month || monthKey(new Date());
    const monthNumber = Number(month.split('-')[1]);
    const ownerId = String(body.owner_id || '').trim();
    if (ownerId) {
      const caller = await getCaller(base44, body, secrets.get('IVR_API_KEY'));
      if (!ownsIdentity(caller, ownerId)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fixed = ownerId
      ? await db.FixedItem.filter({ owner_id: ownerId, active: true })
      : await db.FixedItem.filter({ active: true });

    const annual = ownerId
      ? await db.AnnualExpense.filter({ owner_id: ownerId })
      : await db.AnnualExpense.list('-created_date', 1000);

    const planned = {};
    const addPlan = (owner, type, category, amount) => {
      const key = `${owner}|${type}|${category}`;
      planned[key] = (planned[key] || 0) + (Number(amount) || 0);
    };

    for (const f of fixed) addPlan(f.owner_id, f.type, f.category, f.amount);
    for (const a of annual) {
      const months = (a.months || []).map(Number);
      if (!months.length) {
        addPlan(a.owner_id, 'expense', a.category, (Number(a.amount) || 0) / 12);
      } else if (months.includes(monthNumber)) {
        addPlan(a.owner_id, 'expense', a.category, (Number(a.amount) || 0) / months.length);
      }
    }

    let created = 0;
    let updated = 0;
    for (const key in planned) {
      const [owner, type, category] = key.split('|');
      const amount = Math.round(planned[key]);
      const existing = await db.Budget.filter({ owner_id: owner, month, category, type });
      if (existing[0]) {
        if (Math.round(existing[0].planned_amount || 0) !== amount) {
          await db.Budget.update(existing[0].id, { planned_amount: amount });
          updated++;
        }
      } else {
        await db.Budget.create({ owner_id: owner, month, category, type, planned_amount: amount });
        created++;
      }
    }

    return Response.json({ ok: true, month, created, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}