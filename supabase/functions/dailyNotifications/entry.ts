import { createClientFromRequest, secrets, isCronCall } from '../_shared/b44.ts';
import { familyStats, jerusalemToday, addDays } from '../_shared/coachStats.js';

// רץ פעם ביום (תהליך מתוזמן): תזכורות החזר חוב 3 ימים מראש + התראות למאמנים
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('he-IL');

async function sendDebtReminders(db, send, today) {
  const target = addDays(today, 3);
  const debts = await db.Debt.filter({ settled: false, next_payment_date: target }, '-created_date', 2000);
  let sent = 0;
  for (let i = 0; i < debts.length; i += 6) {
    const results = await Promise.allSettled(
      debts.slice(i, i + 6).map(async (d) => {
        if (d.reminded_for === target) return false;
        const settings = (await db.UserSettings.filter({ owner_id: d.owner_id }))[0];
        if (!settings?.email) return false;
        const owed = d.direction === 'owed';
        await send({
          to: settings.email,
          template_name: 'DebtReminder',
          category: 'transactional',
          variables: {
            kind_word: owed ? 'קבלת התשלום' : 'ההחזר',
            direction_word: owed ? 'ממי' : 'למי',
            person: d.person || 'ללא שם',
            amount: fmt(d.monthly_payment || d.amount),
            balance: fmt(d.amount),
            date: target.split('-').reverse().join('/'),
          },
        });
        await db.Debt.update(d.id, { reminded_for: target });
        return true;
      }),
    );
    sent += results.filter((r) => r.status === 'fulfilled' && r.value).length;
  }
  return sent;
}

async function sendCoachAlerts(db, send, today) {
  const coaches = await db.User.filter({ is_coach: true });
  let sent = 0;
  for (const coach of coaches) {
    const accesses = await db.CoachAccess.filter({ coach_user_id: coach.id }, '-created_date', 500);
    const lines = [];
    const newKeys = [];
    for (const a of accesses) {
      const s = await familyStats(db, a.owner_id, a.created_date, today);
      const flagged = s.alerts.inactive || s.alerts.overspend;
      const key = flagged
        ? `${s.alerts.inactive ? 'I' : ''}${s.alerts.overspend ? 'O' : ''}|${s.alerts.inactive ? (s.lastEntry || a.created_date || '').slice(0, 10) : ''}|${s.month}`
        : '';
      // התראה נשלחת רק כשמצב ההתראה השתנה, כדי לא להציף במייל כל יום
      if (flagged && key !== (a.alert_key || '')) {
        const why = [];
        if (s.alerts.inactive) why.push(`לא רשמה כלום ${s.daysSince} ימים`);
        if (s.alerts.overspend) why.push(`חריגה של ${s.overallOverPct}% מהתקציב`);
        lines.push(`משפחה ${a.owner_id}: ${why.join(', ')}`);
      }
      if (key !== (a.alert_key || '')) newKeys.push({ id: a.id, key });
    }
    if (lines.length) {
      const shown = lines.slice(0, 6);
      if (lines.length > 6) shown[5] = `ועוד ${lines.length - 5} משפחות`;
      const vars = { first_name: coach.full_name || coach.email, count: String(lines.length) };
      for (let i = 0; i < 6; i += 1) vars[`line_${i + 1}`] = shown[i] || '';
      await send({ to: coach.email, template_name: 'CoachAlert', category: 'transactional', variables: vars });
      sent += 1;
    }
    for (const n of newKeys) await db.CoachAccess.update(n.id, { alert_key: n.key });
  }
  return sent;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internal = (!!body.internal_key && body.internal_key === secrets.get('IVR_API_KEY')) || (await isCronCall(body));
    if (!internal) {
      const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = jerusalemToday();
    const sr = base44.asServiceRole;
    const send = (p) => sr.integrations.Core.SendEmail(p);
    const debtEmails = await sendDebtReminders(sr.entities, send, today);
    const coachEmails = await sendCoachAlerts(sr.entities, send, today);
    return Response.json({ ok: true, today, debtEmails, coachEmails });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}