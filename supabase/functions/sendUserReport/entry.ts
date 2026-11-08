import { createClientFromRequest } from '../_shared/b44.ts';
import { secrets } from '../_shared/b44.ts';
import { buildMonthlyReport, reportToHtml, reportToPlainText, monthKey } from '../_shared/reportData.js';
import { resolveAccount } from '../_shared/accountResolve.js';
import { getCaller, ownsIdentity } from '../_shared/callerAuth.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));

    const caller = await getCaller(base44, body, secrets.get('IVR_API_KEY'));
    const phone = String(body.phone || body.owner_id || '').trim();
    if (!phone) return Response.json({ error: 'missing phone' }, { status: 400 });
    if (!caller.internal && !caller.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ownsIdentity(caller, phone)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const account = await resolveAccount(db, phone);
    const month = body.month || monthKey(new Date());
    const report = await buildMonthlyReport(db, account.ownerIds.length ? account.ownerIds : [phone], month);

    const channel = body.channel === 'fax' ? 'fax' : 'email';

    if (channel === 'email') {
      const email = (caller.internal && body.email) || account.settings?.email;
      if (!email) return Response.json({ ok: false, reason: 'no_email' });
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `דוח כספית — ${report.monthLabel}`,
        body: reportToHtml(report),
        from_name: 'כספית',
      });
      return Response.json({ ok: true, channel: 'email', to: email });
    }

    const fax = String((caller.internal && body.fax) || account.settings?.fax || '').replace(/\D/g, '');
    if (!fax) return Response.json({ ok: false, reason: 'no_fax' });

    // שליחת פקס דרך שירות "מייל לפקס" — הדוח נשלח כמייל לכתובת <מספר-פקס>@<דומיין-הספק>
    const faxDomain = 'fax.exm.co.il';
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: `${fax}@${faxDomain}`,
        subject: `דוח כספית — ${report.monthLabel}`,
        body: reportToPlainText(report),
        from_name: 'כספית',
      });
      return Response.json({ ok: true, channel: 'fax', to: fax, via: faxDomain });
    } catch (e) {
      await db.Feedback.create({
        owner_id: account.ownerIds[0] || phone,
        phone,
        message: `כשל בשליחת פקס ל-${fax} דרך ${faxDomain}: ${String(e.message).slice(0, 300)}`,
        kind: 'system',
      }).catch(() => {});
      return Response.json({ ok: false, channel: 'fax', to: fax, reason: 'fax_send_failed' });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}