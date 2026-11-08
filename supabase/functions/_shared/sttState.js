// מנוע התמלול הפעיל במערכת:
// 'self'   = תמלול אצלנו (זול)
// 'yemot'  = תמלול של המרכזיה הטלפונית
// 'gemini' = תמלול באמצעות מודל ג'ימיני
// אם התמלול אצלנו נכשל (למשל כשנגמרו הקרדיטים), עוברים אוטומטית למרכזיה,
// ואחרי פרק זמן המערכת בודקת שוב אם הקרדיטים התמלאו וחוזרת לתמלול העצמי.
// בחירה ידנית מהשלוחה נשמרת ואינה מתאפסת אוטומטית.

const RETRY_AFTER_HOURS = 6;
const MANUAL = 'נבחר ידנית';

export const STT_LABELS = {
  self: 'התמלול של כספית',
  yemot: 'התמלול של המרכזיה',
  gemini: 'התמלול של ג׳ימיני',
};

export async function getSttState(db) {
  const rows = await db.SttState.list();
  let state = rows[0];
  if (!state) state = await db.SttState.create({ mode: 'self' });

  if (state.mode === 'yemot' && state.switched_at && state.reason !== MANUAL) {
    const hours = (Date.now() - new Date(state.switched_at).getTime()) / 36e5;
    if (hours >= RETRY_AFTER_HOURS) {
      state = await db.SttState.update(state.id, { mode: 'self', reason: 'בדיקה חוזרת של הקרדיטים' });
    }
  }
  return state;
}

export async function switchToYemot(db, state, reason) {
  if (!state?.id || state.mode === 'yemot') return;
  await db.SttState.update(state.id, {
    mode: 'yemot',
    reason: String(reason || '').slice(0, 300),
    switched_at: new Date().toISOString(),
  });
}

export async function setSttMode(db, state, mode) {
  if (!state?.id) return;
  await db.SttState.update(state.id, { mode, reason: MANUAL, switched_at: new Date().toISOString() });
}