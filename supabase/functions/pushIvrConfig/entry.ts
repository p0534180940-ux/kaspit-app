import { createClientFromRequest } from '../_shared/b44.ts';
import { secrets } from '../_shared/b44.ts';

const DEFAULT_BASE = 'https://www.call2all.co.il/ym/api/';

function apiBase() {
  const raw = (secrets.get('IVR_API_BASE_URL') || DEFAULT_BASE).trim();
  return raw.endsWith('/') ? raw : raw + '/';
}

// כל קבצי התצורה שיידחפו למערכת ה-IVR של ימות המשיח
const FILES = [
  {
    path: 'ivr.ini',
    contents: 'type=menu\n1=1\n2=2\n3=3\n4=4\n5=5\ntitle=כספית, המאמן הכלכלי',
  },
  {
    path: 'ivr2/1/ivr.ini',
    contents: 'type=record\ntitle=אנא הקליטו את שמכם, או הקישו את מספר הזיהוי שלכם.\nrecord_ok_say=נרשם בהצלחה, תודה רבה\nrecord_hangup=yes',
  },
  {
    path: 'ivr2/2/ivr.ini',
    contents: 'type=record\ntitle=אנא הקליטו את ההוצאה. לדוגמה: מאה שקל ברמי לוי. להקשה הקישו סכום ואז סוג הוצאה.\nrecord_ok_say=נרשם בהצלחה, תודה רבה\nrecord_hangup=yes',
  },
  {
    path: 'ivr2/3/ivr.ini',
    contents: 'type=record\ntitle=אנא הקליטו את ההכנסה. לדוגמה: קיבלתי אלף שקל בכולל. להקשה הקישו סכום ואז סוג הכנסה.\nrecord_ok_say=נרשם בהצלחה, תודה רבה\nrecord_hangup=yes',
  },
  {
    path: 'ivr2/4/ivr.ini',
    contents: 'type=api\napi_link=https://bouncy-smart-budget-keeper.base44.app/functions/playSummary\ntitle=שמיעת נתונים לחודש הנוכחי',
  },
  {
    path: 'ivr2/5/ivr.ini',
    contents: 'type=api\napi_link=https://bouncy-smart-budget-keeper.base44.app/functions/sendReport\ntitle=שליחת דוח חודשי',
  },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const token = secrets.get('IVR_API_KEY') || secrets.get('YEMOT_API_KEY');
    if (!token) {
      return Response.json({ error: 'IVR_API_KEY אינו מוגדר בסודות האפליקציה' }, { status: 500 });
    }
    const base = apiBase();

    const results = [];
    for (const file of FILES) {
      try {
        const res = await fetch(base + 'UploadIVR', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, path: file.path, contents: file.contents }),
        });
        const data = await res.json();
        const ok = data && (data.responseStatus === 'OK' || data.yhidamAtaSucc === true);
        results.push({ path: file.path, ok, status: data?.responseStatus, message: data?.message || data?.exception });
      } catch (e) {
        results.push({ path: file.path, ok: false, message: e.message });
      }
    }

    const allOk = results.every((r) => r.ok);
    return Response.json({ success: allOk, pushed: results.filter((r) => r.ok).length, total: FILES.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}