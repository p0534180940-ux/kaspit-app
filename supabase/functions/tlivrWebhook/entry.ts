import { createClientFromRequest } from '../_shared/b44.ts';
import { secrets } from '../_shared/b44.ts';
import { say, askVoice } from '../_shared/ivrResponses.js';
import { resolveAccount, ensureSettings, normalizePhone } from '../_shared/accountResolve.js';
import { transcribeRecording, looksLikeRecordingPath, recordingPath } from '../_shared/yemotStt.js';
import { getSttState, switchToYemot } from '../_shared/sttState.js';
import * as flows from './flows.js';
import * as extra from './extra.js';
import { isRegisteredOwner } from '../_shared/phoneAccount.js';

// כל שלב בשיחה נשמר בסשן עם שם פרמטר ייחודי (handler_seq),
// כך שהפרמטרים שנצברים בשיחה לא מחזירים את המתקשר לשלב קודם.
const HANDLERS = {
  main: flows.mainHandle,
  inputMode: flows.inputModeChoose,
  inputT9: flows.inputT9,
  t9Confirm: flows.t9ConfirmHandle,
  faxApprove: flows.faxApproveHandle,
  faxCatVoice: flows.faxCategoryVoice,
  t9Amount: flows.reportT9Amount,
  voiceText: flows.handleVoiceTransaction,
  confirm: flows.handleConfirm,
  newCategory: flows.handleNewCategory,
  kpType: flows.keypadType,
  kpAmount: flows.keypadAmount,
  kpGroup: flows.keypadGroup,
  kpCat: flows.keypadCategory,
  kpCatVoice: flows.keypadCategoryVoice,
  kpNewCat: flows.keypadNewCategory,
  tasksChoice: flows.tasksHandle,
  taskVoice: flows.taskSave,
  reportsChoice: flows.reportsHandle,
  faxNumber: flows.faxSend,
  summaryChoice: flows.summaryHandle,
  summaryNav: flows.summaryNav,
  summaryCat: flows.summaryByCategory,
  messagesChoice: flows.messagesHandle,
  devVoice: flows.devSave,
  irregularVoice: flows.irregularSave,
  irregularAmount: flows.irregularAmount,
  fixedChoice: flows.fixedHandle,
  fixedVoice: flows.fixedSave,
  fixedAmount: flows.fixedAmount,
  budgetCatVoice: flows.budgetCategory,
  budgetAmount: flows.budgetAmount,
  debtChoice: flows.debtsHandle,
  debtVoice: flows.debtSave,
  debtAmount: flows.debtAmount,
  debtPick: extra.debtPick,
  debtPay: extra.debtPay,
  savingsChoice: extra.savingsChoice,
  savingsAmount: extra.savingsAmount,
  remainCat: extra.remainingForCategory,
  adminCode: flows.adminVerify,
  adminChoice: flows.adminHandle,
  sttChoice: flows.sttChoose,
  settingsChoice: flows.settingsHandle,
  extraPhone: flows.addLinkedPhone,
  identifyChoice: flows.setIdentifyMode,
  emailKeys: flows.emailFromKeypad,
  emailVoice: flows.setEmail,
  emailConfirm: flows.confirmEmail,
};

export default async function (req) {
  try {
    const url = new URL(req.url);
    const p = {};
    url.searchParams.forEach((v, k) => { p[k] = v; });
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      Object.assign(p, body || {});
    }

    const expectedKey = secrets.get('IVR_API_KEY');
    // כל בקשה למערכת הטלפונית חייבת לשאת את מפתח המרכזיה
    if (!expectedKey || p.key !== expectedKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (p.PBXcallStatus === 'HANGUP') return Response.json({ ok: true });

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const phone = normalizePhone(p.PBXphone);
    const callId = p.PBXcallId || phone || 'anonymous';

    const account = await resolveAccount(db, phone || callId);
    const ownerId = account.ownerId || callId;
    const settings = await ensureSettings(db, ownerId);

    const sessions = await db.CallSession.filter({ call_id: callId });
    let session = sessions[0] || null;

    // תיקיית ההקלטות במרכזיה, ושם קובץ ייחודי לכל שלב בשיחה
    const recFolder = 'ivr2:/1';
    const recPrefix = 'rec' + String(callId).replace(/\D/g, '').slice(-8);
    const recName = (name) => recPrefix + String(name).replace(/[^a-zA-Z0-9]/g, '');

    const sttState = await getSttState(db);

    const ctx = {
      // קוד הגישה לשלוחת ניהול המערכת — למנהל בלבד
      adminCode: secrets.get('ADMIN_IVR_CODE') || '',
      internalKey: expectedKey,
      sttMode: sttState.mode,
      sttState,
      recFolder,
      recFileName: recName,
      base44,
      db,
      phone: phone || callId,
      ownerId,
      ownerIds: account.ownerIds.length ? account.ownerIds : [ownerId],
      settings,
      registered: await isRegisteredOwner(db, ownerId),
      flows: { askInput: flows.askInput, menuRoot: flows.menuRoot },
      data: session?.data ? { ...session.data } : {},
      today: new Date().toISOString().split('T')[0],

      // שומר את השלב הבא ומחזיר את הוראת המרכזיה
      async ask(handler, build, mode = 'digits') {
        const seq = Number(session?.seq || 0) + 1;
        const name = `${handler}_${seq}`;
        const payload = {
          mode,
          call_id: callId,
          phone: phone || callId,
          owner_id: ownerId,
          step: handler,
          flow: handler,
          expect: name,
          handler,
          seq,
          data: ctx.data || {},
        };
        if (session) await db.CallSession.update(session.id, payload);
        else session = await db.CallSession.create(payload);
        // רישום ההקלטה שהתבקשה, כדי שהסנכרון האוטומטי יטפל בהקלטה גם אם השיחה נותקה באמצע
        if (mode === 'record') {
          await db.PhoneLog.create({
            call_id: callId,
            phone: phone || callId,
            owner_id: ownerId,
            handler,
            file_path: recordingPath(recFolder, recName(name)),
            status: 'waiting',
          }).catch(() => {});
        }
        return Response.json(build(name));
      },

      async clearSession() {
        if (session) {
          await db.CallSession.delete(session.id).catch(() => {});
          session = null;
        }
        ctx.data = {};
      },

      async notifyAdmin(subject, text) {
        const to = secrets.get('ADMIN_EMAIL');
        if (!to) return;
        text = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject,
          body: `<div dir="rtl" style="font-family:Arial;white-space:pre-wrap">${text}</div>`,
          from_name: 'כספית',
        }).catch(() => {});
      },
    };

    // האם התקבלה תשובה לשלב שביקשנו?
    if (session?.expect && p[session.expect] !== undefined) {
      const handler = HANDLERS[session.handler];
      let value = p[session.expect];

      // שלב הקלטה — מורידים את הקובץ מהמרכזיה ומתמללים אצלנו
      if (session.mode === 'record') {
        const path = looksLikeRecordingPath(value)
          ? String(value)
          : recordingPath(recFolder, recName(session.expect));
        try {
          value = await transcribeRecording(base44, {
            token: secrets.get('IVR_API_KEY') || secrets.get('YEMOT_API_KEY'),
            base: secrets.get('IVR_API_BASE_URL'),
            path,
            mode: sttState.mode,
          });
        } catch (err) {
          // התמלול אצלנו נכשל (למשל נגמרו הקרדיטים) — עוברים אוטומטית לתמלול המרכזיה
          await switchToYemot(db, sttState, err?.message || 'transcription failed');
          ctx.sttMode = 'yemot';
          return await askVoice(ctx, session.handler, 'אנא חזרו על הדיווח לאחר הצליל.', 10);
        }
        // ההקלטה טופלה בתוך השיחה, הסנכרון האוטומטי לא צריך לגעת בה
        const logs = await db.PhoneLog.filter({ file_path: recordingPath(recFolder, recName(session.expect)), status: 'waiting' }).catch(() => []);
        for (const l of logs) await db.PhoneLog.update(l.id, { status: 'done', transcript: String(value || '') }).catch(() => {});
      }

      if (handler) return await handler(ctx, value);
    }

    // תמיכה גם בהקשה שהגיעה משלוחה שהוגדרה ידנית עם השם menuChoice
    if (p.menuChoice !== undefined && !session) {
      return await flows.mainHandle(ctx, p.menuChoice);
    }

    return await flows.mainMenu(ctx);
  } catch (error) {
    return say('אירעה שגיאה טכנית. אנא נסו מאוחר יותר.');
  }
}