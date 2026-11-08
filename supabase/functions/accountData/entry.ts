import { createClientFromRequest } from '../_shared/b44.ts';
import { ownsOnly } from '../_shared/coachStats.js';
import { normalizePhone } from '../_shared/accountResolve.js';

// מחיקת החשבון וכל הנתונים של בעל החשבון (המזהה חייב להיות המזהה המקושר למשתמש המחובר)
const OWNED = [
  'Transaction', 'Budget', 'FixedItem', 'AnnualExpense', 'Debt', 'SavingsGoal', 'UserSettings',
  'CustomCategory', 'CategoryRule', 'UserTask', 'Feedback', 'CallSession', 'IncomingFax', 'CoachAccess', 'CoachNote',
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    if (body.action !== 'delete_all') return Response.json({ error: 'Unknown action' }, { status: 400 });

    const ownerId = String(body.owner_id || '').trim();
    if (!ownsOnly(user, ownerId)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const ids = [...new Set([ownerId, normalizePhone(ownerId)].filter(Boolean))];
    let deleted = 0;
    for (const id of ids) {
      for (const name of OWNED) {
        const res = await db[name].deleteMany({ owner_id: id });
        deleted += Number(res?.deleted_count ?? res?.deleted ?? 0);
      }
    }
    await db.PhoneRegistration.deleteMany({ created_by_id: user.id });

    await db.User.update(user.id, { owner_identity: '' });
    let accountRemoved = false;
    if (user.role !== 'admin') {
      accountRemoved = await db.User.delete(user.id).then(() => true).catch(() => false);
    }
    return Response.json({ ok: true, deleted, account_removed: accountRemoved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}