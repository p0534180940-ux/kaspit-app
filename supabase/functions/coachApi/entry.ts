import { createClientFromRequest } from '../_shared/b44.ts';
import { familyStats, jerusalemToday, ownsOnly } from '../_shared/coachStats.js';

// כל הפעולות של אזור המאמן. המאמן לעולם לא קורא נתוני משפחה ישירות — רק דרך כאן, בקריאה בלבד,
// ורק למשפחות שאישרו לו גישה.
function newCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return String(100000 + n);
}

async function ensureProfile(db, user) {
  const found = await db.CoachProfile.filter({ user_id: user.id });
  if (found[0]) return found[0];
  let code = newCode();
  while ((await db.CoachProfile.filter({ code })).length) code = newCode();
  return db.CoachProfile.create({ user_id: user.id, name: user.full_name || user.email, email: user.email, code });
}

async function families(db, coach) {
  const today = jerusalemToday();
  const accesses = await db.CoachAccess.filter({ coach_user_id: coach.id }, '-created_date', 500);
  const out = [];
  for (let i = 0; i < accesses.length; i += 6) {
    const batch = await Promise.all(
      accesses.slice(i, i + 6).map(async (a) => {
        const [stats, notes] = await Promise.all([
          familyStats(db, a.owner_id, a.created_date, today),
          db.CoachNote.filter({ owner_id: a.owner_id, coach_user_id: coach.id }, '-created_date', 100),
        ]);
        return { access_id: a.id, owner_id: a.owner_id, stats, notes };
      }),
    );
    out.push(...batch);
  }
  return out;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole.entities;
    const action = String(body.action || '');

    // ---- מנהל: מינוי והסרה של מאמנים ----
    if (action === 'list_coaches' || action === 'set_coach') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (action === 'list_coaches') {
        const coaches = await db.User.filter({ is_coach: true });
        return Response.json({ coaches: coaches.map((c) => ({ id: c.id, email: c.email, name: c.full_name })) });
      }
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) return Response.json({ error: 'email is required' }, { status: 400 });
      const target = (await db.User.filter({ email }))[0];
      if (!target) return Response.json({ ok: false, reason: 'not_found' }, { status: 404 });
      await db.User.update(target.id, { is_coach: !!body.value });
      if (!body.value) {
        await db.CoachAccess.deleteMany({ coach_user_id: target.id });
        await db.CoachProfile.deleteMany({ user_id: target.id });
      }
      return Response.json({ ok: true });
    }

    // ---- מאמן ----
    if (['my_profile', 'families', 'add_note', 'delete_note'].includes(action)) {
      const me = (await db.User.filter({ id: user.id }))[0];
      if (!me?.is_coach) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (action === 'my_profile') {
        const p = await ensureProfile(db, user);
        return Response.json({ code: p.code, name: p.name });
      }
      if (action === 'families') return Response.json({ families: await families(db, user) });

      const ownerId = String(body.owner_id || '');
      const access = (await db.CoachAccess.filter({ owner_id: ownerId, coach_user_id: user.id }))[0];
      if (!access) return Response.json({ error: 'No access' }, { status: 403 });
      if (action === 'add_note') {
        const text = String(body.text || '').trim().slice(0, 1000);
        if (!text) return Response.json({ error: 'text is required' }, { status: 400 });
        await db.CoachNote.create({ owner_id: ownerId, coach_user_id: user.id, coach_name: user.full_name || user.email, text });
        return Response.json({ ok: true });
      }
      const note = (await db.CoachNote.filter({ id: String(body.note_id || '') }))[0];
      if (!note || note.coach_user_id !== user.id || note.owner_id !== ownerId) return Response.json({ error: 'Not found' }, { status: 404 });
      await db.CoachNote.delete(note.id);
      return Response.json({ ok: true });
    }

    // ---- משפחה ----
    if (action === 'lookup') {
      const p = (await db.CoachProfile.filter({ code: String(body.code || '').trim() }))[0];
      if (!p) return Response.json({ ok: false, reason: 'not_found' }, { status: 404 });
      return Response.json({ ok: true, coach_name: p.name });
    }

    const ownerId = String(body.owner_id || '').trim();
    if (!['grant', 'revoke', 'my_access'].includes(action)) return Response.json({ error: 'Unknown action' }, { status: 400 });
    if (!ownsOnly(user, ownerId)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'my_access') {
      const list = await db.CoachAccess.filter({ owner_id: ownerId }, '-created_date', 50);
      return Response.json({ access: list.map((a) => ({ id: a.id, coach_name: a.coach_name })) });
    }
    if (action === 'revoke') {
      const a = (await db.CoachAccess.filter({ id: String(body.access_id || ''), owner_id: ownerId }))[0];
      if (a) await db.CoachAccess.delete(a.id);
      return Response.json({ ok: true });
    }
    // grant
    const profile = (await db.CoachProfile.filter({ code: String(body.code || '').trim() }))[0];
    if (!profile) return Response.json({ ok: false, reason: 'not_found' }, { status: 404 });
    const coach = (await db.User.filter({ id: profile.user_id }))[0];
    if (!coach?.is_coach) return Response.json({ ok: false, reason: 'not_found' }, { status: 404 });
    const exists = await db.CoachAccess.filter({ owner_id: ownerId, coach_user_id: coach.id });
    if (!exists.length) await db.CoachAccess.create({ owner_id: ownerId, coach_user_id: coach.id, coach_name: profile.name });
    return Response.json({ ok: true, coach_name: profile.name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}