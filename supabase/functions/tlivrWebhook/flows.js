import { say, menu, askVoice, askDigits, MAIN_MENU_TEXT, EXPLAIN_TEXT } from '../_shared/ivrResponses.js';
import { setSttMode, STT_LABELS } from '../_shared/sttState.js';
import { parseTransaction } from '../_shared/ivrParse.js';
import { classifyWithAI } from '../_shared/aiClassify.js';
import { labelOf, findCategoryByName } from '../_shared/categoryList.js';
import { keypadGroups } from '../_shared/keypadCategories.js';
import { buildMonthlyReport, reportToSpeech, monthKey, fmt } from '../_shared/reportData.js';
import { analysisToSpeech } from '../_shared/smartAnalysis.js';
import { syncAutoTasks } from '../_shared/autoTasks.js';
import { normalizeSpokenEmail, isValidEmail, parseEmailWithAI, spellEmail } from '../_shared/emailParse.js';
import { decodeT9 } from '../_shared/t9Text.js';
import { decodeKeypad } from '../_shared/t9Seed.js';
import { phoneTxnState } from '../_shared/phoneAccount.js';
import * as extra from './extra.js';

const PENDING_NOTE = {
  unregistered: ' המספר שלכם עדיין לא רשום באתר, ולכן התנועה ממתינה לאישור באתר.',
  uncertain: ' הקטגוריה לא זוהתה בוודאות, ולכן התנועה ממתינה לאישור באתר.',
};

// ------------------------------------------------------------------
// בחירה בין הקלטה קולית להקלדה במקשי הטלפון (T9) — בכל שלב שבו נדרש טקסט.
// לכל שלב מוגדר כאן הנוסח הקולי, נוסח ההקלדה, והיעד שאליו נשלח הטקסט המפוענח.
// ------------------------------------------------------------------
const T9_HINT =
  'הקלידו במקשי הטלפון. כל מקש נושא אותיות: לחיצה אחת לאות הראשונה, שתיים לשנייה, שלוש לשלישית, ארבע לרביעית. במקשים ארבע, חמש, שמונה ותשע יש גם אותיות סופיות. ' +
  'לרווח בין מילים הקישו אפס. להפרדה בין שתי אותיות שעל אותו מקש הקישו כוכבית ביניהן. ' +
  'אין צורך בכתיב מדויק, המערכת משלימה לבד. בסיום המתינו רגע.';

const INPUTS = {
  voiceText: {
    voice: 'אנא דווחו על ההוצאה או ההכנסה והסכום לאחר הצליל. לדוגמה: מאה שקל ברב קו, או קיבלתי משכורת שמונת אלפים שקל.',
    keys: 'הקלידו את שם ההוצאה או ההכנסה בלבד, בלי סכום, לדוגמה: רב קו. ' + T9_HINT,
    t9: 'reportFromKeypad',
  },
  newCategory: { voice: 'אנא אמרו את שם הקטגוריה הרצויה לאחר הצליל.', keys: 'הקלידו את שם הקטגוריה. ' + T9_HINT },
  faxCatVoice: { voice: 'אנא אמרו את שם הקטגוריה הרצויה לאחר הצליל.', keys: 'הקלידו את שם הקטגוריה. ' + T9_HINT },
  kpCatVoice: { voice: 'אנא אמרו את שם הקטגוריה לאחר הצליל.', keys: 'הקלידו את שם הקטגוריה. ' + T9_HINT },
  taskVoice: { voice: 'אנא אמרו את המשימה לאחר הצליל.', keys: 'הקלידו את המשימה. ' + T9_HINT },
  summaryCat: { voice: 'אנא אמרו את שם הקטגוריה לאחר הצליל.', keys: 'הקלידו את שם הקטגוריה. ' + T9_HINT },
  devVoice: { voice: 'אנא אמרו את ההודעה או הצעת השיפור לאחר הצליל.', keys: 'הקלידו את ההודעה. ' + T9_HINT },
  irregularVoice: {
    voice: 'אנא אמרו את ההוצאה החריגה, הסכום והסיבה לחריגה, לאחר הצליל.',
    keys: 'הקלידו את שם ההוצאה החריגה. ' + T9_HINT,
    t9: 'irregularFromKeypad',
  },
  fixedVoice: {
    voice: 'אנא דווחו על ההוצאה או ההכנסה והסכום לאחר הצליל, לדוגמה: משכנתא שלושת אלפים שקל.',
    keys: 'הקלידו את שם ההוצאה הקבועה בלבד, בלי סכום. ' + T9_HINT,
    t9: 'fixedFromKeypad',
  },
  debtVoice: {
    voice: 'אנא אמרו את שם האדם והסכום לאחר הצליל, לדוגמה: לוי, אלף שקל.',
    keys: 'הקלידו את שם האדם בלבד, בלי סכום. ' + T9_HINT,
    t9: 'debtFromKeypad',
  },
  budgetCatVoice: {
    voice: 'אנא אמרו את שם הקטגוריה שברצונכם להגדיר לה תקציב, לאחר הצליל.',
    keys: 'הקלידו את שם הקטגוריה שברצונכם להגדיר לה תקציב. ' + T9_HINT,
  },
  remainCat: {
    voice: 'אנא אמרו את שם הקטגוריה לאחר הצליל.',
    keys: 'הקלידו את שם הקטגוריה. ' + T9_HINT,
  },
  emailVoice: {
    voice: 'אנא אמרו את כתובת המייל שלכם לאחר הצליל, אות אחר אות.',
    keys: 'הקלידו את כתובת המייל. ' + T9_HINT,
    t9: 'emailKeys',
  },
};

// בקשת טקסט: קודם בוחרים אם לאמר בקול או להקליד
export async function askInput(ctx, handler, prefix = '') {
  ctx.data = { ...ctx.data, in_handler: handler };
  return menu(ctx, 'inputMode', '1,2', prefix + 'לאמירה בקול הקישו 1. להקלדה במקשי הטלפון הקישו 2.', 2, 7);
}

export async function inputModeChoose(ctx, choice) {
  const handler = ctx.data?.in_handler;
  const cfg = INPUTS[handler];
  if (!cfg) return mainMenu(ctx);
  if (String(choice) === '2') {
    if (handler === 'emailVoice') return emailKeypadPrompt(ctx);
    return askDigits(ctx, 'inputT9', cfg.keys, 200, 2, 'no');
  }
  return askVoice(ctx, handler, cfg.voice, 12);
}

// טקסט שהוקש בהקלדה — מפוענח, מושלם, ומועבר ליעד של אותו שלב
export async function inputT9(ctx, keys) {
  const handler = ctx.data?.in_handler;
  const cfg = INPUTS[handler];
  const res = decodeKeypad(keys);
  // תיעוד ההקשות הגולמיות שהתקבלו מהמרכזיה, לאבחון אותיות שנעלמות
  await ctx.db.Feedback.create({ owner_id: ctx.ownerId, phone: ctx.phone, kind: 'system', handled: true, message: `T9 keys=[${keys}] decoded=[${res.text}] confidence=${res.confidence}` }).catch(() => {});
  if (!res.text || !cfg) return askInput(ctx, handler || 'voiceText', 'לא זוהה טקסט. ');
  // ביטחון נמוך: מקריאים את האפשרות הראשונה ומבקשים אישור
  if (res.confidence < 60 && res.options.length) {
    ctx.data = { ...ctx.data, t9_options: res.options.slice(0, 5), t9_idx: 0 };
    return t9ConfirmPrompt(ctx);
  }
  return TARGETS[cfg.t9 || handler](ctx, res.text);
}

async function t9ConfirmPrompt(ctx) {
  const opts = ctx.data?.t9_options || [];
  const idx = Number(ctx.data?.t9_idx || 0);
  const more = idx + 1 < opts.length ? ' לאפשרות הבאה הקישו 2.' : ' להקלדה מחדש הקישו 2.';
  return menu(ctx, 't9Confirm', '1,2', `האם התכוונתם ל: ${opts[idx]}? לאישור הקישו 1.${more}`, 2, 9);
}

export async function t9ConfirmHandle(ctx, choice) {
  const handler = ctx.data?.in_handler;
  const cfg = INPUTS[handler];
  const opts = ctx.data?.t9_options || [];
  const idx = Number(ctx.data?.t9_idx || 0);
  if (!cfg || !opts.length) return mainMenu(ctx);
  if (String(choice) === '1') return TARGETS[cfg.t9 || handler](ctx, opts[idx]);
  if (idx + 1 < opts.length) {
    ctx.data = { ...ctx.data, t9_idx: idx + 1 };
    return t9ConfirmPrompt(ctx);
  }
  return askInput(ctx, handler);
}

// ------------------------------------------------------------------
// תפריט ראשי
// ------------------------------------------------------------------
export async function mainMenu(ctx) {
  ctx.data = {};
  // רק תנועות פקס מאושרות בטלפון; תנועות שנקלטו מהטלפון ממתינות לאישור באתר
  const pending = (await ctx.db.Transaction.filter({ owner_id: ctx.ownerId, status: 'pending' })).filter((t) => t.source !== 'ivr');
  if (pending.length) {
    ctx.data = { pending_ids: pending.map((t) => t.id), idx: 0 };
    return faxApprovalPrompt(ctx, `התקבלו ${pending.length} תנועות מפקס הממתינות לאישור. `);
  }
  return menuRoot(ctx);
}

export async function menuRoot(ctx) {
  ctx.data = {};
  return menu(ctx, 'main', '1,2,3,4,5,6,7,8,9,0,#', MAIN_MENU_TEXT, 3, 8);
}

async function faxApprovalPrompt(ctx, prefix = '') {
  const ids = ctx.data?.pending_ids || [];
  const idx = Number(ctx.data?.idx || 0);
  if (idx >= ids.length) {
    ctx.data = {};
    return menuRoot(ctx);
  }
  const txn = await ctx.db.Transaction.get(ids[idx]).catch(() => null);
  if (!txn || txn.status !== 'pending') {
    ctx.data = { ...ctx.data, idx: idx + 1 };
    return faxApprovalPrompt(ctx, prefix);
  }
  const kind = txn.type === 'income' ? 'הכנסה' : 'הוצאה';
  const label = labelOf(txn.category, txn.type);
  return menu(
    ctx,
    'faxApprove',
    '1,2,3,0',
    `${prefix}תנועה ${idx + 1} מתוך ${ids.length}: ${kind} של ${fmt(txn.amount)} שקלים בקטגוריית ${label}. ` +
      'לאישור הקישו 1. למחיקה הקישו 2. לשינוי הקטגוריה הקישו 3. לדילוג על כל השאר ולמעבר לתפריט הראשי הקישו אפס.',
    3,
    9
  );
}

export async function faxApproveHandle(ctx, choice) {
  const ids = ctx.data?.pending_ids || [];
  const idx = Number(ctx.data?.idx || 0);
  const id = ids[idx];
  const c = String(choice);

  if (c === '0' || !id) {
    ctx.data = {};
    return menuRoot(ctx);
  }
  if (c === '3') return askInput(ctx, 'faxCatVoice');
  if (c === '1') await ctx.db.Transaction.update(id, { status: 'confirmed' });
  else await ctx.db.Transaction.delete(id).catch(() => {});

  ctx.data = { ...ctx.data, idx: idx + 1 };
  return faxApprovalPrompt(ctx, c === '1' ? 'התנועה אושרה. ' : 'התנועה נמחקה. ');
}

export async function faxCategoryVoice(ctx, spoken) {
  const ids = ctx.data?.pending_ids || [];
  const idx = Number(ctx.data?.idx || 0);
  const id = ids[idx];
  if (!id) {
    ctx.data = {};
    return menuRoot(ctx);
  }
  const label = String(spoken || '').trim();
  if (!label) return askInput(ctx, 'faxCatVoice', 'לא זיהיתי שם קטגוריה. ');

  const txn = await ctx.db.Transaction.get(id).catch(() => null);
  const type = txn?.type || 'expense';
  const found = findCategoryByName(label, type);
  if (!found) await ensureCustomCategory(ctx, label, type);
  await ctx.db.Transaction.update(id, { category: found || `custom:${label}`, status: 'confirmed' });

  ctx.data = { ...ctx.data, idx: idx + 1 };
  return faxApprovalPrompt(ctx, `התנועה נשמרה בקטגוריית ${found ? labelOf(found, type) : label}. `);
}

export async function mainHandle(ctx, choice) {
  switch (String(choice)) {
    case '1':
      return askInput(ctx, 'voiceText');
    case '2':
      return keypadStart(ctx);
    case '3':
      return fixedMenu(ctx);
    case '4':
      return debtsMenu(ctx);
    case '5':
      return summaryMenu(ctx);
    case '6':
      return tasksMenu(ctx);
    case '7':
      return reportsMenu(ctx);
    case '8':
      return say(EXPLAIN_TEXT);
    case '9':
      return messagesMenu(ctx);
    case '#':
      return adminGate(ctx);
    case '0':
      return settingsMenu(ctx);
    case 'ERROR':
      return say('לא זוהתה הקשה. להתראות.');
    default:
      return mainMenu(ctx);
  }
}

async function saveTransaction(ctx, data) {
  const state = phoneTxnState(ctx.registered, data.category);
  await ctx.db.Transaction.create({
    type: data.type,
    amount: data.amount,
    category: data.category,
    description: data.description || '',
    date: ctx.today,
    owner_id: ctx.ownerId,
    source: 'ivr',
    ...state,
  });
  await ctx.clearSession();
  const note = state.pending_reason ? PENDING_NOTE[state.pending_reason] : '';
  return say(`נרשמה ${data.type === 'income' ? 'הכנסה' : 'הוצאה'} של ${fmt(data.amount)} שקלים בקטגוריית ${data.category_label}.${note} תודה ולהתראות.`);
}

// אישור תנועה — קודם משמיעים את התמלול עצמו, ורק אחר כך את התפריט,
// כדי שהמתקשר יוכל לוודא שהמערכת הבינה נכון לפני שהוא מאשר.
async function confirmMenu(ctx, data) {
  const label = data.type === 'income' ? 'הכנסה' : 'הוצאה';
  ctx.data = { ...ctx.data, ...data };
  const heard = data.transcript ? `זיהיתי: ${data.transcript}. ` : '';
  return menu(
    ctx,
    'confirm',
    '1,2,3,4',
    `${heard}מכך הבנתי ${label} של ${fmt(data.amount)} שקלים בקטגוריית ${data.category_label}. ` +
      'לאישור ושמירה הקישו 1. לדיווח מחדש הקישו 2. לשינוי הקטגוריה הקישו 3. לביטול הקישו 4.',
    3,
    10
  );
}

// --- שלוחה 1: דיווח בקול או בהקלדה ---
export async function reportFromKeypad(ctx, text) {
  ctx.data = { ...ctx.data, description: text };
  return askDigits(ctx, 't9Amount', `זיהיתי: ${text}. כעת הקישו את הסכום בשקלים בספרות, ובסיום הקישו סולמית.`, 8, 1);
}

export async function reportT9Amount(ctx, digits) {
  const amount = parseFloat(String(digits).replace(/\D/g, ''));
  const description = ctx.data?.description || '';
  if (!amount) return askDigits(ctx, 't9Amount', 'הסכום לא זוהה. הקישו את הסכום בשקלים בספרות, ובסיום הקישו סולמית.', 8, 1);
  return handleVoiceTransaction(ctx, `${description} ${amount} שקל`);
}

export async function handleVoiceTransaction(ctx, spoken) {
  const transcript = String(spoken || '').trim();
  const parsed = parseTransaction(transcript);
  if (!parsed) {
    return askInput(ctx, 'voiceText', transcript ? `זיהיתי: ${transcript}, אך לא נמצא סכום. ` : 'לא זיהיתי דיווח. ');
  }

  if (parsed.category === 'other_expense' || parsed.category === 'misc_income_general') {
    const ai = await classifyWithAI(ctx.base44, parsed.description || transcript, parsed.type).catch(() => null);
    if (ai?.category) parsed.category = ai.category;
  }

  return confirmMenu(ctx, {
    type: parsed.type,
    amount: parsed.amount,
    category: parsed.category,
    category_label: labelOf(parsed.category, parsed.type),
    description: parsed.description,
    transcript,
  });
}

export async function handleConfirm(ctx, choice) {
  const data = ctx.data || {};
  if (!data.amount) return mainMenu(ctx);
  const c = String(choice);

  if (c === '3') return askInput(ctx, 'newCategory');
  if (c === '2') return askInput(ctx, 'voiceText', 'נתחיל מחדש. ');
  if (c === '1') return saveTransaction(ctx, data);

  await ctx.clearSession();
  return say('התנועה בוטלה ולא נשמרה. להתראות.');
}

export async function handleNewCategory(ctx, spoken) {
  const data = ctx.data || {};
  if (!data.amount) return mainMenu(ctx);

  const found = findCategoryByName(spoken, data.type);
  if (found) return confirmMenu(ctx, { ...data, category: found, category_label: labelOf(found, data.type) });

  const label = String(spoken || '').trim();
  if (!label) return askInput(ctx, 'newCategory', 'לא זיהיתי שם קטגוריה. ');
  await ensureCustomCategory(ctx, label, data.type);
  return confirmMenu(ctx, { ...data, category: `custom:${label}`, category_label: label });
}

async function ensureCustomCategory(ctx, label, type) {
  const existing = await ctx.db.CustomCategory.filter({ owner_id: ctx.ownerId, label, type });
  if (!existing[0]) await ctx.db.CustomCategory.create({ owner_id: ctx.ownerId, label, type });
}

// --- שלוחה 2: דיווח מודרך בהקשה ---
export async function keypadStart(ctx) {
  ctx.data = {};
  return menu(ctx, 'kpType', '1,2', 'לדיווח על הוצאה הקישו 1. לדיווח על הכנסה הקישו 2.');
}

export async function keypadType(ctx, choice) {
  ctx.data = { type: String(choice) === '2' ? 'income' : 'expense' };
  return askDigits(ctx, 'kpAmount', 'הקישו את הסכום בשקלים בספרות, ובסיום הקישו סולמית.', 8, 1);
}

export async function keypadAmount(ctx, digits) {
  const amount = parseFloat(String(digits).replace(/\D/g, ''));
  if (!amount) return askDigits(ctx, 'kpAmount', 'הסכום לא זוהה. הקישו את הסכום בשקלים בספרות, ובסיום הקישו סולמית.', 8, 1);
  ctx.data = { ...ctx.data, amount };
  const groups = keypadGroups(ctx.data.type);
  const text =
    `הסכום שהוקש: ${fmt(amount)} שקלים. בחרו קבוצת קטגוריות: ` +
    groups.map((g, i) => `ל${g.label} הקישו ${i + 1}.`).join(' ') +
    ' לאמירת שם הקטגוריה בקול או להקלדתה הקישו אפס.';
  return menu(ctx, 'kpGroup', groups.map((_, i) => i + 1).join(',') + ',0', text, 2, 9);
}

export async function keypadGroup(ctx, choice) {
  const data = ctx.data || {};
  if (String(choice) === '0') return askInput(ctx, 'kpCatVoice');
  const groups = keypadGroups(data.type);
  const groupIndex = Number(String(choice).replace(/\D/g, '')) - 1;
  const group = groups[groupIndex];
  if (!group) return mainMenu(ctx);
  ctx.data = { ...data, group_index: groupIndex };
  const text = `${group.label}. בחרו קטגוריה: ` + group.items.map((id, i) => `ל${labelOf(id, data.type)} הקישו ${i + 1}.`).join(' ');
  return menu(ctx, 'kpCat', group.items.map((_, i) => i + 1).join(','), text, 2, 9);
}

export async function keypadCategory(ctx, choice) {
  const data = ctx.data || {};
  const groups = keypadGroups(data.type);
  const group = groups[Number(data.group_index) || 0] || groups[0];
  const category = group.items[Number(String(choice).replace(/\D/g, '')) - 1];
  if (!category) return mainMenu(ctx);
  return saveTransaction(ctx, {
    ...data,
    category,
    category_label: labelOf(category, data.type),
    description: labelOf(category, data.type),
  });
}

export async function keypadCategoryVoice(ctx, spoken) {
  const data = ctx.data || {};
  const label = String(spoken || '').trim();
  if (!label) return askInput(ctx, 'kpCatVoice', 'לא זיהיתי שם קטגוריה. ');

  const found = findCategoryByName(label, data.type);
  if (found) {
    return saveTransaction(ctx, {
      ...data,
      category: found,
      category_label: labelOf(found, data.type),
      description: labelOf(found, data.type),
    });
  }
  ctx.data = { ...data, new_label: label };
  return menu(
    ctx,
    'kpNewCat',
    '1,2',
    `לא נמצאה קטגוריה בשם ${label}. ליצירת קטגוריה חדשה בשם זה ולשמירת התנועה הקישו 1. לניסיון נוסף הקישו 2.`,
    2,
    9
  );
}

export async function keypadNewCategory(ctx, choice) {
  const data = ctx.data || {};
  if (String(choice) === '2') return askInput(ctx, 'kpCatVoice');
  const label = data.new_label || 'קטגוריה חדשה';
  await ensureCustomCategory(ctx, label, data.type);
  return saveTransaction(ctx, { ...data, category: `custom:${label}`, category_label: label, description: label });
}

// --- שלוחה 6: משימות ---
export async function tasksMenu(ctx) {
  return menu(ctx, 'tasksChoice', '1,2', 'לשמיעת המשימות שלכם הקישו 1. לדיווח על משימה חדשה הקישו 2.');
}

export async function tasksHandle(ctx, choice) {
  if (String(choice) === '2') return askInput(ctx, 'taskVoice');
  await syncAutoTasks(ctx).catch(() => {});
  const tasks = await ctx.db.UserTask.filter({ owner_id: ctx.ownerId, done: false });
  await ctx.clearSession();
  if (!tasks.length) return say('אין משימות פתוחות. כל הכבוד!');
  return say('המשימות שלכם, מעודכנות לפי מצב החשבון: ' + tasks.slice(0, 10).map((t, i) => `${i + 1}. ${t.title}.`).join(' '));
}

export async function taskSave(ctx, spoken) {
  const title = String(spoken || '').trim();
  if (!title) return askInput(ctx, 'taskVoice', 'לא זיהיתי משימה. ');
  await ctx.db.UserTask.create({ owner_id: ctx.ownerId, title, source: 'ivr' });
  await ctx.clearSession();
  return say('המשימה נרשמה בהצלחה. להתראות.');
}

// --- שלוחה 7: דוחות ---
export async function reportsMenu(ctx) {
  return menu(ctx, 'reportsChoice', '1,2', 'לשליחת הדוח המפורט לפקס הקישו 1. לשליחת הדוח המפורט למייל הקישו 2.');
}

export async function reportsHandle(ctx, choice) {
  if (String(choice) === '1') {
    return askDigits(ctx, 'faxNumber', 'הקישו את מספר הפקס, ובסיום הקישו סולמית.', 12, 7);
  }
  const email = ctx.settings?.email;
  await ctx.clearSession();
  if (!email) return say('לא הוגדרה כתובת מייל בחשבון. ניתן להגדיר אותה בשלוחת ההגדרות, בהקשה על אפס.');
  const res = await ctx.base44.functions.invoke('sendUserReport', { phone: ctx.phone, channel: 'email', internal_key: ctx.internalKey });
  if (res?.data?.ok) return say('הדוח המפורט נשלח לכתובת המייל שלכם. תודה ולהתראות.');
  return say('שליחת הדוח למייל נכשלה. אנא נסו מאוחר יותר.');
}

export async function faxSend(ctx, digits) {
  const fax = String(digits).replace(/\D/g, '');
  if (fax.length < 7) return askDigits(ctx, 'faxNumber', 'מספר הפקס לא זוהה. הקישו את המספר המלא בספרות, ובסיום הקישו סולמית.', 12, 7);
  await ctx.clearSession();
  const res = await ctx.base44.functions.invoke('sendUserReport', { phone: ctx.phone, channel: 'fax', fax, internal_key: ctx.internalKey });
  if (res?.data?.ok) return say('הדוח המפורט נשלח לפקס שהקשתם. תודה ולהתראות.');
  return say('שליחת הפקס נכשלה. אנא נסו מאוחר יותר, או קבלו את הדוח למייל.');
}

// --- שלוחה 5: סיכומים ---
export async function summaryMenu(ctx) {
  return menu(
    ctx,
    'summaryChoice',
    '1,2,3,4,5,6,7',
    'לשמיעת סיכום של קטגוריה מסוימת הקישו 1. לסיכום מלא של כל הקטגוריות הקישו 2. לניתוח מצב חכם הקישו 3. ' +
      'ליתרת המעשרות הקישו 4. לקופות החיסכון ולהפקדה לקופה הקישו 5. לכמה נשאר בתקציב של קטגוריה הקישו 6. להערה האחרונה מהמאמן הכלכלי הקישו 7.',
    3,
    9
  );
}

export async function summaryHandle(ctx, choice) {
  const c = String(choice);
  if (c === '1') return askInput(ctx, 'summaryCat');
  if (c === '4') return extra.titheSummary(ctx);
  if (c === '5') return extra.savingsMenu(ctx);
  if (c === '6') return askInput(ctx, 'remainCat');
  if (c === '7') return extra.lastCoachNote(ctx);
  if (c === '3') {
    await ctx.clearSession();
    const report = await buildMonthlyReport(ctx.db, ctx.ownerIds, monthKey(new Date()));
    return say(analysisToSpeech(report));
  }
  return summaryFull(ctx, 0);
}

function monthByOffset(offset) {
  const d = new Date();
  return monthKey(new Date(d.getFullYear(), d.getMonth() + offset, 1));
}

// סיכום מלא עם מעבר בין חודשים: 2 לחודש הבא, 8 לחודש הקודם
async function summaryFull(ctx, offset, prefix = '') {
  ctx.data = { ...ctx.data, offset };
  const report = await buildMonthlyReport(ctx.db, ctx.ownerIds, monthByOffset(offset));
  return menu(
    ctx,
    'summaryNav',
    '2,8,0',
    prefix + reportToSpeech(report) + ' לחודש הבא הקישו 2. לחודש הקודם הקישו 8. לתפריט הראשי הקישו אפס.',
    3,
    10
  );
}

export async function summaryNav(ctx, choice) {
  const offset = Number(ctx.data?.offset || 0);
  const c = String(choice);
  if (c === '0') return menuRoot(ctx);
  if (c === '2') {
    if (offset >= 0) return summaryFull(ctx, 0, 'זהו החודש הנוכחי, אין חודש מאוחר יותר. ');
    return summaryFull(ctx, offset + 1);
  }
  if (c === '8') return summaryFull(ctx, offset - 1);
  return summaryFull(ctx, offset);
}

export async function summaryByCategory(ctx, spoken) {
  const expenseCat = findCategoryByName(spoken, 'expense');
  const incomeCat = findCategoryByName(spoken, 'income');
  const category = expenseCat || incomeCat;
  if (!category) return askInput(ctx, 'summaryCat', 'לא זיהיתי את שם הקטגוריה. ');
  await ctx.clearSession();
  const type = expenseCat ? 'expense' : 'income';
  const report = await buildMonthlyReport(ctx.db, ctx.ownerIds, monthKey(new Date()));
  const list = type === 'expense' ? report.expenseByCategory : report.incomeByCategory;
  const row = list.find((c) => c.category === category);
  const label = labelOf(category, type);
  if (!row) return say(`בקטגוריית ${label} לא נרשמו נתונים בחודש ${report.monthLabel}.`);
  return say(`בקטגוריית ${label}, בחודש ${report.monthLabel}, נרשמו ${fmt(row.amount)} שקלים.`);
}

// --- שלוחה 9: הודעות, הצעות שיפור ודיווח על הוצאה חריגה ---
export async function messagesMenu(ctx) {
  return menu(
    ctx,
    'messagesChoice',
    '1,2',
    'להשארת הודעה או הצעת שיפור לצוות המערכת הקישו 1. לדיווח על הוצאה חריגה הקישו 2.'
  );
}

export async function messagesHandle(ctx, choice) {
  if (String(choice) === '2') return askInput(ctx, 'irregularVoice');
  return askInput(ctx, 'devVoice');
}

export async function devSave(ctx, spoken) {
  const message = String(spoken || '').trim();
  if (!message) return askInput(ctx, 'devVoice', 'לא זיהיתי הודעה. ');
  await ctx.db.Feedback.create({ owner_id: ctx.ownerId, phone: ctx.phone, message, kind: 'idea' });
  await ctx.notifyAdmin('הודעה חדשה מהמערכת הטלפונית', `מטלפון ${ctx.phone}:\n\n${message}`);
  await ctx.clearSession();
  return say('ההודעה נשמרה והועברה לצוות. תודה רבה!');
}

export async function irregularFromKeypad(ctx, text) {
  ctx.data = { ...ctx.data, description: text };
  return askDigits(ctx, 'irregularAmount', `זיהיתי: ${text}. כעת הקישו את סכום ההוצאה החריגה בספרות, ובסיום הקישו סולמית.`, 8, 1);
}

export async function irregularAmount(ctx, digits) {
  const amount = parseFloat(String(digits).replace(/\D/g, ''));
  if (!amount) return askDigits(ctx, 'irregularAmount', 'הסכום לא זוהה. הקישו את הסכום בספרות, ובסיום הקישו סולמית.', 8, 1);
  return irregularSave(ctx, `${ctx.data?.description || ''} ${amount} שקל`);
}

// הוצאה חריגה נרשמת כתנועה רגילה, ובנוסף נשמרת כדיווח חריגה לצורך בחינה
export async function irregularSave(ctx, spoken) {
  const transcript = String(spoken || '').trim();
  const parsed = parseTransaction(transcript, 'expense');
  if (!parsed) return askInput(ctx, 'irregularVoice', transcript ? `זיהיתי: ${transcript}, אך לא נמצא סכום. ` : 'לא זיהיתי דיווח. ');
  await ctx.db.Transaction.create({
    type: 'expense',
    amount: parsed.amount,
    category: parsed.category,
    description: `הוצאה חריגה: ${parsed.description}`,
    date: ctx.today,
    owner_id: ctx.ownerId,
    source: 'ivr',
    ...phoneTxnState(ctx.registered, parsed.category),
  });
  await ctx.db.Feedback.create({ owner_id: ctx.ownerId, phone: ctx.phone, message: `הוצאה חריגה: ${transcript}`, kind: 'message' });
  await ctx.clearSession();
  return say(`ההוצאה החריגה בסך ${fmt(parsed.amount)} שקלים נרשמה בקטגוריית ${labelOf(parsed.category, 'expense')} וסומנה כחריגה לבחינה. להתראות.`);
}

// --- שלוחה 3: קבועות, שנתיות ותקציב מתוכנן ---
export async function fixedMenu(ctx) {
  return menu(
    ctx,
    'fixedChoice',
    '1,2,3,4',
    'לדיווח על הוצאה או הכנסה קבועה חודשית הקישו 1. לדיווח על הוצאה שנתית הקישו 2. ' +
      'לשמיעת ההוצאות הקבועות הקישו 3. להגדרת תקציב מתוכנן לקטגוריה הקישו 4.'
  );
}

export async function fixedHandle(ctx, choice) {
  const c = String(choice);
  if (c === '1') {
    ctx.data = { channel: 'monthly' };
    return askInput(ctx, 'fixedVoice');
  }
  if (c === '2') {
    ctx.data = { channel: 'annual' };
    return askInput(ctx, 'fixedVoice');
  }
  if (c === '4') return budgetIntro(ctx);
  const items = await ctx.db.FixedItem.filter({ owner_id: ctx.ownerId, active: true });
  await ctx.clearSession();
  if (!items.length) return say('לא נרשמו עדיין הוצאות קבועות.');
  const text = items.slice(0, 15).map((f) => `${labelOf(f.category, f.type)}, ${fmt(f.amount)} שקלים.`).join(' ');
  return say('ההוצאות וההכנסות הקבועות שלכם: ' + text);
}

export async function fixedFromKeypad(ctx, text) {
  ctx.data = { ...ctx.data, description: text };
  return askDigits(ctx, 'fixedAmount', `זיהיתי: ${text}. כעת הקישו את הסכום בספרות, ובסיום הקישו סולמית.`, 8, 1);
}

export async function fixedAmount(ctx, digits) {
  const amount = parseFloat(String(digits).replace(/\D/g, ''));
  if (!amount) return askDigits(ctx, 'fixedAmount', 'הסכום לא זוהה. הקישו את הסכום בספרות, ובסיום הקישו סולמית.', 8, 1);
  return fixedSave(ctx, `${ctx.data?.description || ''} ${amount} שקל`);
}

export async function fixedSave(ctx, spoken) {
  const isAnnual = ctx.data?.channel === 'annual';
  const transcript = String(spoken || '').trim();
  const parsed = parseTransaction(transcript);
  if (!parsed) return askInput(ctx, 'fixedVoice', transcript ? `זיהיתי: ${transcript}, אך לא נמצא סכום. ` : 'לא זיהיתי דיווח. ');

  if (parsed.category === 'other_expense' || parsed.category === 'misc_income_general') {
    const ai = await classifyWithAI(ctx.base44, parsed.description || transcript, parsed.type).catch(() => null);
    if (ai?.category) parsed.category = ai.category;
  }
  const label = labelOf(parsed.category, parsed.type);

  if (isAnnual) {
    await ctx.db.AnnualExpense.create({
      owner_id: ctx.ownerId,
      category: parsed.category,
      amount: parsed.amount,
      description: parsed.description || label,
      months: [],
    });
  } else {
    await ctx.db.FixedItem.create({
      owner_id: ctx.ownerId,
      type: parsed.type,
      category: parsed.category,
      amount: parsed.amount,
      description: parsed.description || label,
      active: true,
    });
  }
  await ctx.clearSession();
  await ctx.base44.functions.invoke('syncFixedItems', { owner_id: ctx.ownerId, internal_key: ctx.internalKey }).catch(() => {});
  return say(
    isAnnual
      ? `ההוצאה השנתית ${label}, בסך ${fmt(parsed.amount)} שקלים, נרשמה ותתחלק אוטומטית לחודשי השנה. להתראות.`
      : `${label}, בסך ${fmt(parsed.amount)} שקלים, נרשם כקבוע חודשי. להתראות.`
  );
}

// הגדרת תקציב מתוכנן — לאחר תקופת לימוד, מול הנתונים שנצברו בפועל
export async function budgetIntro(ctx) {
  return askInput(
    ctx,
    'budgetCatVoice',
    'הגדרת תקציב מתוכנן. מומלץ להגדיר תקציב רק לאחר כמה חודשי דיווח, כשהנתונים בפועל כבר ידועים. '
  );
}

export async function budgetCategory(ctx, spoken) {
  const category = findCategoryByName(spoken, 'expense');
  if (!category) return askInput(ctx, 'budgetCatVoice', 'לא זיהיתי את שם הקטגוריה. ');
  const month = monthKey(new Date());
  const report = await buildMonthlyReport(ctx.db, ctx.ownerIds, month);
  const row = (report.expenseByCategory || []).find((c) => c.category === category);
  const label = labelOf(category, 'expense');
  ctx.data = { ...ctx.data, category, category_label: label };
  const actual = row ? `בחודש ${report.monthLabel} נרשמו בה ${fmt(row.amount)} שקלים בפועל. ` : 'בחודש הנוכחי לא נרשמו בה הוצאות עד כה. ';
  return askDigits(ctx, 'budgetAmount', `הקטגוריה: ${label}. ${actual}הקישו את הסכום המתוכנן לחודש בספרות, ובסיום הקישו סולמית.`, 8, 1);
}

export async function budgetAmount(ctx, digits) {
  const amount = parseFloat(String(digits).replace(/\D/g, ''));
  const category = ctx.data?.category;
  const label = ctx.data?.category_label || '';
  if (!category) return fixedMenu(ctx);
  if (!amount) return askDigits(ctx, 'budgetAmount', 'הסכום לא זוהה. הקישו את הסכום המתוכנן בספרות, ובסיום הקישו סולמית.', 8, 1);

  const month = monthKey(new Date());
  const existing = await ctx.db.Budget.filter({ owner_id: ctx.ownerId, month, category });
  if (existing[0]) await ctx.db.Budget.update(existing[0].id, { planned_amount: amount });
  else await ctx.db.Budget.create({ owner_id: ctx.ownerId, month, category, type: 'expense', planned_amount: amount });

  await ctx.clearSession();
  return say(`נקבע תקציב מתוכנן של ${fmt(amount)} שקלים לחודש בקטגוריית ${label}. מעתה הדוחות יציגו את הפער בין המתוכנן למצוי. להתראות.`);
}

// --- שלוחה 4: חובות ---
export async function debtsMenu(ctx) {
  return menu(
    ctx,
    'debtChoice',
    '1,2,3,4',
    'לרישום חוב שאתם חייבים לאחרים הקישו 1. לרישום חוב שחייבים לכם הקישו 2. לשמיעת החובות הקישו 3. ' +
      'להקראת החובות עם מועד ההחזר הבא ולרישום תשלום החזר הקישו 4.'
  );
}

export async function debtsHandle(ctx, choice) {
  if (String(choice) === '4') return extra.debtsList(ctx);
  if (String(choice) === '3') {
    const debts = await ctx.db.Debt.filter({ owner_id: ctx.ownerId, settled: false });
    await ctx.clearSession();
    if (!debts.length) return say('לא נרשמו חובות.');
    const owe = debts.filter((d) => d.direction === 'owe');
    const owed = debts.filter((d) => d.direction === 'owed');
    const sum = (a) => fmt(a.reduce((s, d) => s + (Number(d.amount) || 0), 0));
    return say(`אתם חייבים ${sum(owe)} שקלים ב${owe.length} חובות. חייבים לכם ${sum(owed)} שקלים ב${owed.length} חובות.`);
  }
  ctx.data = { direction: String(choice) === '1' ? 'owe' : 'owed' };
  return askInput(ctx, 'debtVoice');
}

export async function debtFromKeypad(ctx, text) {
  ctx.data = { ...ctx.data, person: text };
  return askDigits(ctx, 'debtAmount', `זיהיתי: ${text}. כעת הקישו את סכום החוב בספרות, ובסיום הקישו סולמית.`, 8, 1);
}

export async function debtAmount(ctx, digits) {
  const amount = parseFloat(String(digits).replace(/\D/g, ''));
  if (!amount) return askDigits(ctx, 'debtAmount', 'הסכום לא זוהה. הקישו את סכום החוב בספרות, ובסיום הקישו סולמית.', 8, 1);
  return debtSave(ctx, `${ctx.data?.person || ''} ${amount} שקל`);
}

export async function debtSave(ctx, spoken) {
  const direction = ctx.data?.direction || 'owe';
  const transcript = String(spoken || '').trim();
  const parsed = parseTransaction(transcript, 'expense');
  if (!parsed) return askInput(ctx, 'debtVoice', transcript ? `זיהיתי: ${transcript}, אך לא נמצא סכום. ` : 'לא זיהיתי דיווח. ');
  await ctx.db.Debt.create({
    owner_id: ctx.ownerId,
    direction,
    person: parsed.description || '',
    amount: parsed.amount,
    description: transcript,
  });
  await ctx.clearSession();
  return say(direction === 'owe'
    ? `נרשם חוב שלכם בסך ${fmt(parsed.amount)} שקלים. להתראות.`
    : `נרשם חוב שחייבים לכם בסך ${fmt(parsed.amount)} שקלים. להתראות.`);
}

// --- שלוחת סולמית: ניהול המערכת (למנהל בלבד, מוגנת בקוד) ---
export async function adminGate(ctx) {
  if (!ctx.adminCode) return say('שלוחת הניהול אינה פעילה. להתראות.');
  return askDigits(ctx, 'adminCode', 'שלוחת ניהול המערכת. הקישו את קוד המנהל, ובסיום הקישו סולמית.', 8, 3);
}

export async function adminVerify(ctx, digits) {
  const code = String(digits).replace(/\D/g, '');
  if (!ctx.adminCode || code !== String(ctx.adminCode)) {
    await ctx.clearSession();
    return say('הקוד שגוי. שלוחה זו מיועדת לניהול המערכת בלבד. להתראות.');
  }
  return adminMenu(ctx);
}

export async function adminMenu(ctx) {
  return menu(
    ctx,
    'adminChoice',
    '1,2',
    `תפריט ניהול המערכת. מנוע התמלול הפעיל: ${STT_LABELS[ctx.sttMode] || STT_LABELS.self}. ` +
      'להחלפת מנוע התמלול הקישו 1. לשמיעת מספר ההודעות שהתקבלו מהמשתמשים הקישו 2.',
    2,
    9
  );
}

export async function adminHandle(ctx, choice) {
  if (String(choice) === '2') {
    const rows = await ctx.db.Feedback.filter({ handled: false });
    await ctx.clearSession();
    return say(`התקבלו ${rows.length} הודעות שלא טופלו. הן ממתינות באתר הניהול. להתראות.`);
  }
  return sttMenu(ctx);
}

export async function sttMenu(ctx) {
  return menu(
    ctx,
    'sttChoice',
    '1,2,3',
    `בחירת מנוע התמלול. הפעיל כרגע: ${STT_LABELS[ctx.sttMode] || STT_LABELS.self}. ` +
      'לתמלול של כספית הקישו 1. לתמלול של המרכזיה הטלפונית הקישו 2. לתמלול של ג׳ימיני הקישו 3.',
    2,
    9
  );
}

export async function sttChoose(ctx, choice) {
  const map = { '1': 'self', '2': 'yemot', '3': 'gemini' };
  const mode = map[String(choice)];
  if (!mode) return sttMenu(ctx);
  await setSttMode(ctx.db, ctx.sttState, mode);
  await ctx.clearSession();
  return say(`מנוע התמלול עודכן ל${STT_LABELS[mode]}. להתראות.`);
}

// --- שלוחה 0: הגדרות אישיות ---
export async function settingsMenu(ctx) {
  return menu(
    ctx,
    'settingsChoice',
    '1,2,3,4',
    'ההגדרות האישיות שלכם. לחיבור טלפון נוסף לאותו חשבון הקישו 1. לבחירת אופן הזיהוי הקישו 2. ' +
      'לעדכון כתובת המייל לקבלת דוחות הקישו 3. לשמיעת ההגדרות הנוכחיות הקישו 4.'
  );
}

export async function settingsHandle(ctx, choice) {
  const c = String(choice);
  if (c === '1') return askDigits(ctx, 'extraPhone', 'הקישו את מספר הטלפון הנוסף, ובסיום הקישו סולמית.', 12, 9);
  if (c === '2') return menu(ctx, 'identifyChoice', '1,2', 'לזיהוי לפי מספר הטלפון הקישו 1. לזיהוי לפי קוד מזהה הקישו 2.');
  if (c === '3') return askInput(ctx, 'emailVoice');

  const s = ctx.settings || {};
  const mode = s.identify_mode === 'code' ? 'קוד מזהה' : 'מספר טלפון';
  const linked = (s.linked_phones || []).length;
  await ctx.clearSession();
  return say(`אופן הזיהוי: ${mode}. כתובת המייל: ${s.email ? 'מוגדרת' : 'לא מוגדרת'}. טלפונים נוספים המחוברים לחשבון: ${linked}.`);
}

export async function addLinkedPhone(ctx, digits) {
  const phone = String(digits).replace(/\D/g, '');
  if (phone.length < 9) return askDigits(ctx, 'extraPhone', 'מספר לא תקין. הקישו שוב את מספר הטלפון הנוסף, ובסיום הקישו סולמית.', 12, 9);
  const list = ctx.settings?.linked_phones || [];
  if (!list.includes(phone)) {
    await ctx.db.UserSettings.update(ctx.settings.id, { linked_phones: [...list, phone] });
  }
  await ctx.clearSession();
  return say('הטלפון הנוסף חובר לחשבון בהצלחה. להתראות.');
}

export async function setIdentifyMode(ctx, choice) {
  await ctx.db.UserSettings.update(ctx.settings.id, { identify_mode: String(choice) === '2' ? 'code' : 'phone' });
  await ctx.clearSession();
  return say(String(choice) === '2' ? 'הזיהוי יתבצע מעתה לפי קוד מזהה. להתראות.' : 'הזיהוי יתבצע מעתה לפי מספר הטלפון. להתראות.');
}

// הקלדת כתובת המייל באמצעות מקשי הטלפון (T9) — מתחיל באנגלית
export async function emailKeypadPrompt(ctx, prefix = '') {
  ctx.data = { ...ctx.data, in_handler: 'emailVoice' };
  return askDigits(
    ctx,
    'emailKeys',
    prefix +
      'הקלידו את כתובת המייל במקשי הטלפון, בשפה האנגלית. ' +
      'כל מקש נושא שלוש אותיות: לחיצה אחת לאות הראשונה, שתיים לשנייה, שלוש לשלישית. ' +
      'הקלידו רק את השם שלפני השטרודל, והמערכת תוסיף אוטומטית שטרודל ג׳ימייל נקודה קום. ' +
      'להפרדה בין שתי אותיות שעל אותו מקש הקישו כוכבית ביניהן. ' +
      'להקשת ספרות הקישו סולמית, והקשה נוספת מחזירה לאנגלית. לנקודה בתוך השם הקישו 1 פעמיים. בסיום המתינו רגע.',
    60,
    2,
    'no'
  );
}

export async function emailFromKeypad(ctx, keys) {
  const typed = decodeT9(keys, 'en').replace(/\s+/g, '');
  const email = typed.includes('@') ? typed : (typed ? `${typed}@gmail.com` : '');
  if (!isValidEmail(email)) {
    return emailKeypadPrompt(ctx, `הכתובת שהתקבלה, ${email || 'ריקה'}, אינה תקינה. `);
  }
  ctx.data = { ...ctx.data, email };
  return menu(ctx, 'emailConfirm', '1,2', `הכתובת שהוקשה היא: ${spellEmail(email)}. לאישור ושמירה הקישו 1. להקלדה מחדש הקישו 2.`, 2, 9);
}

export async function setEmail(ctx, spoken) {
  const raw = String(spoken || '').trim();
  if (!raw) return askInput(ctx, 'emailVoice', 'לא זיהיתי כתובת מייל. ');

  let email = normalizeSpokenEmail(raw);
  if (!isValidEmail(email)) email = await parseEmailWithAI(ctx.base44, raw).catch(() => null);
  if (!email) return askInput(ctx, 'emailVoice', `זיהיתי: ${raw}, אך לא הצלחתי להסיק כתובת תקינה. `);

  ctx.data = { ...ctx.data, email };
  return menu(ctx, 'emailConfirm', '1,2', `הכתובת שזיהיתי היא: ${spellEmail(email)}. לאישור ושמירה הקישו 1. להקלדה מחדש הקישו 2.`, 2, 9);
}

export async function confirmEmail(ctx, choice) {
  const email = ctx.data?.email;
  if (!email) return settingsMenu(ctx);
  if (String(choice) === '2') return emailKeypadPrompt(ctx);
  await ctx.db.UserSettings.update(ctx.settings.id, { email });
  await ctx.clearSession();
  await ctx.base44.asServiceRole.integrations.Core.SendEmail({
    to: email,
    subject: 'כתובת המייל עודכנה בכספית',
    body: '<div dir="rtl" style="font-family:Arial"><h2>הכתובת עודכנה בהצלחה</h2><p>מעתה הדוחות והסיכומים מכספית יישלחו לכתובת הזו.</p></div>',
    from_name: 'כספית',
  }).catch(() => {});
  return say('כתובת המייל נשמרה בחשבון, ושלחנו אליה הודעת אישור. תודה ולהתראות.');
}

// יעדי הטקסט המפוענח מהקשה (T9)
const TARGETS = {
  voiceText: handleVoiceTransaction,
  reportFromKeypad,
  newCategory: handleNewCategory,
  faxCatVoice: faxCategoryVoice,
  kpCatVoice: keypadCategoryVoice,
  taskVoice: taskSave,
  summaryCat: summaryByCategory,
  devVoice: devSave,
  irregularVoice: irregularSave,
  irregularFromKeypad,
  fixedVoice: fixedSave,
  fixedFromKeypad,
  debtVoice: debtSave,
  debtFromKeypad,
  budgetCatVoice: budgetCategory,
  remainCat: extra.remainingForCategory,
};