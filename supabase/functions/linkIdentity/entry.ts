import { createClientFromRequest } from '../_shared/b44.ts';

// משייך מזהה (טלפון / קוד אישי) לחשבון המייל של המשתמש. מזהה שכבר שייך למשתמש אחר נדחה.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const identity = String(body.identity || '').trim();
    if (identity.length < 5) return Response.json({ ok: false, reason: 'invalid' }, { status: 400 });

    const users = base44.asServiceRole.entities.User;
    const holders = await users.filter({ owner_identity: identity });
    if (holders.some((u) => u.id !== user.id)) {
      return Response.json({ ok: false, reason: 'taken' }, { status: 409 });
    }
    if (user.owner_identity !== identity) await users.update(user.id, { owner_identity: identity });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}