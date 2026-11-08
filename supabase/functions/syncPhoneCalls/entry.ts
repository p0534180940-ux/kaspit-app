import { createClientFromRequest } from '../_shared/b44.ts';
import { secrets } from '../_shared/b44.ts';
import { getCaller } from '../_shared/callerAuth.js';
import { transcribeRecording } from '../_shared/yemotStt.js';
import { getSttState } from '../_shared/sttState.js';
import { parseTransaction } from '../_shared/ivrParse.js';

// סנכרון אוטומטי של הקלטות מהקו הטלפוני: הקלטות שנשמרו במרכזיה אך לא טופלו בשיחה
// (למשל כי המתקשר ניתק) מתומללות, והופכות לתנועה שממתינה לאישור באתר.
const MIN_AGE_MIN = 3;
const GIVE_UP_MIN = 180;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const caller = await getCaller(base44, body, secrets.get('IVR_API_KEY'));
    if (!caller.internal && !caller.isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sttState = await getSttState(db);
    const mode = sttState.mode === 'gemini' ? 'gemini' : 'self';
    const token = secrets.get('IVR_API_KEY') || secrets.get('YEMOT_API_KEY');
    const base = secrets.get('IVR_API_BASE_URL');

    const logs = await db.PhoneLog.filter({ status: 'waiting' }, 'created_date', 100);
    const result = { checked: logs.length, created: 0, failed: 0, waiting: 0, skipped: 0 };

    for (const log of logs) {
      const ageMin = (Date.now() - new Date(log.created_date).getTime()) / 60000;
      if (ageMin < MIN_AGE_MIN) { result.waiting++; continue; }

      if (log.handler !== 'voiceText') {
        await db.PhoneLog.update(log.id, { status: 'skipped', note: 'הקלטה שאינה דיווח תנועה' });
        result.skipped++;
        continue;
      }

      const text = await transcribeRecording(base44, { token, base, path: log.file_path, mode }).catch(() => '');
      if (!text) {
        if (ageMin > GIVE_UP_MIN) {
          await db.PhoneLog.update(log.id, { status: 'failed', note: 'לא נמצאה הקלטה במרכזיה' });
          result.failed++;
        } else {
          result.waiting++;
        }
        continue;
      }

      const parsed = parseTransaction(text);
      if (!parsed) {
        await db.PhoneLog.update(log.id, { status: 'failed', transcript: text, note: 'לא זוהה סכום בהקלטה' });
        result.failed++;
        continue;
      }

      const date = new Date(log.created_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
      await db.Transaction.create({
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description || text,
        date,
        owner_id: log.owner_id,
        source: 'ivr',
        status: 'pending',
        pending_reason: 'unconfirmed_call',
      });
      await db.PhoneLog.update(log.id, { status: 'done', transcript: text });
      result.created++;
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}