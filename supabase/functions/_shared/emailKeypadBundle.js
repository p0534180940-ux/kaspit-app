// ============================================================================
// חבילה להעתקה: הקלדת כתובת מייל במקשי הטלפון (T9) במערכת IVR (TLivr / ימות המשיח)
// קובץ אחד עצמאי. מעתיקים אותו כמו שהוא למערכת השנייה.
//
// מה המערכת השנייה צריכה לספק (ctx):
//   ctx.ask(handler, buildFn, kind)  - שומר בסשן את השלב הבא (handler) ומחזיר תגובת IVR.
//                                      buildFn(name) מחזירה את אובייקט ה-JSON של TLivr.
//   ctx.data                         - אובייקט נתוני סשן שנשמר בין שלבים.
//   ctx.clearSession()               - מנקה את הסשן.
//   ctx.saveEmail(email)             - שמירת המייל במסד (במערכת המקורית: UserSettings.update).
//
// חיווט בניתוב השלבים (handler -> פונקציה):
//   emailKeys    -> emailFromKeypad(ctx, digits)
//   emailConfirm -> confirmEmail(ctx, choice)
// ומתחילים את הזרימה בקריאה ל-emailKeypadPrompt(ctx).
// ============================================================================

// ---------- פענוח T9 ----------
// 1 באנגלית: @ . _ -   |  # = החלפת מודל (עברית ← מספרים ← אנגלית)  |  ** = גם החלפת מודל
// * אחד = מפריד בין שתי אותיות שעל אותו מקש  |  0 = רווח
const HE = {
  '1': ['א', 'ב', 'ג', '.'], '3': ['א', 'ב', 'ג', '.'], '2': ['ד', 'ה', 'ו'], '6': ['ז', 'ח', 'ט'], '5': ['י', 'כ', 'ך', 'ל'],
  '4': ['מ', 'ם', 'נ', 'ן'], '9': ['ס', 'ע', 'פ', 'ף'], '8': ['צ', 'ץ', 'ק'], '7': ['ר', 'ש', 'ת'],
};
const EN = {
  '1': ['@', '.', '_', '-'], '2': ['a', 'b', 'c'], '3': ['d', 'e', 'f'], '4': ['g', 'h', 'i'],
  '5': ['j', 'k', 'l'], '6': ['m', 'n', 'o'], '7': ['p', 'q', 'r', 's'], '8': ['t', 'u', 'v'],
  '9': ['w', 'x', 'y', 'z'],
};
const MODES = ['he', 'num', 'en'];
const nextMode = (mode) => MODES[(MODES.indexOf(mode) + 1) % MODES.length];

export function decodeT9(sequence, startMode = 'he') {
  const seq = String(sequence || '').replace(/[^0-9*#]/g, '');
  let mode = MODES.includes(startMode) ? startMode : 'he';
  let out = '';
  let i = 0;
  while (i < seq.length) {
    const c = seq[i];
    if (c === '#') { mode = nextMode(mode); i += 1; continue; }
    let count = 0;
    while (seq[i + count] === c) count += 1;
    if (c === '*') {
      for (let s = 0; s < Math.floor(count / 2); s++) mode = nextMode(mode);
      i += count;
      continue;
    }
    if (mode === 'num') { out += c.repeat(count); i += count; continue; }
    if (c === '0') { out += ' '; i += count; continue; }
    const letters = (mode === 'he' ? HE : EN)[c];
    if (letters) out += letters[Math.min(count, letters.length) - 1];
    i += count;
  }
  return out.replace(/\s+/g, ' ').trim();
}

// ---------- בדיקה והקראה ----------
export function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || ''));
}

const LETTERS = {
  a: 'איי', b: 'בי', c: 'סי', d: 'די', e: 'אי', f: 'אף', g: 'ג׳י', h: 'אייץ׳',
  i: 'איי', j: 'ג׳יי', k: 'קיי', l: 'אל', m: 'אם', n: 'אן', o: 'או', p: 'פי',
  q: 'קיו', r: 'אר', s: 'אס', t: 'טי', u: 'יו', v: 'וי', w: 'דאבל יו', x: 'אקס',
  y: 'וואי', z: 'זי',
  '@': 'שטרודל', '.': 'נקודה', '-': 'מקף', '_': 'קו תחתון',
};
export function spellEmail(email) {
  return String(email).split('').map((ch) => LETTERS[ch] || ch).join(', ');
}

// ---------- עזרי תגובת TLivr ----------
export function say(text) {
  return Response.json({ type: 'simpleMessage', files: [{ text }] });
}

export function menu(ctx, handler, keys, text, times = 3, timeout = 8) {
  return ctx.ask(handler, (name) => ({
    type: 'simpleMenu', name, enabledKeys: keys, times, timeout,
    errorReturn: 'ERROR', setMusic: 'no', files: [{ text }],
  }));
}

// skipKey='no' - הסולמית משמשת להחלפת מודל ולכן לא מסיימת את הקלט.
// timeout=8 - זמן המתנה ארוך בין הקשות, אחרת המרכזיה קוטעת את הקלט.
export function askDigits(ctx, handler, prompt, max = 10, min = 1, skipKey = '#') {
  return ctx.ask(handler, (name) => ({
    type: 'getDTMF', name, max, min,
    timeout: skipKey === 'no' ? 8 : 6,
    skipKey, confirmType: 'no', setMusic: 'no', files: [{ text: prompt }],
  }));
}

// ---------- הזרימה ----------
// שלב 1: הנחיה והקלטת ההקשות
export function emailKeypadPrompt(ctx, prefix = '') {
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

// שלב 2: פענוח (מתחיל באנגלית), השלמת @gmail.com, ואימות בהקראה
export function emailFromKeypad(ctx, keys) {
  const typed = decodeT9(keys, 'en').replace(/\s+/g, '');
  const email = typed.includes('@') ? typed : (typed ? `${typed}@gmail.com` : '');
  if (!isValidEmail(email)) {
    return emailKeypadPrompt(ctx, `הכתובת שהתקבלה, ${email || 'ריקה'}, אינה תקינה. `);
  }
  ctx.data = { ...ctx.data, email };
  return menu(
    ctx,
    'emailConfirm',
    '1,2',
    `הכתובת שהוקשה היא: ${spellEmail(email)}. לאישור ושמירה הקישו 1. להקלדה מחדש הקישו 2.`,
    2,
    9
  );
}

// שלב 3: אישור ושמירה
export async function confirmEmail(ctx, choice) {
  const email = ctx.data?.email;
  if (!email || String(choice) === '2') return emailKeypadPrompt(ctx);
  await ctx.saveEmail(email);
  await ctx.clearSession();
  return say('כתובת המייל נשמרה בחשבון. תודה ולהתראות.');
}

// ============================================================================
// הקלדת טקסט בעברית במקשי הטלפון (T9)
// שימוש: בשלב שמבקש טקסט, קוראים ל-hebrewKeypadPrompt(ctx, 'hebKeys', 'הקלידו את שם ההוצאה. ')
// ובניתוב: hebKeys -> hebrewFromKeypad(ctx, digits, async (ctx, text) => { ...להמשיך עם הטקסט... })
// (ה-callback הוא מה שהמערכת עושה עם הטקסט שהוקלד)
// ============================================================================

export const HEBREW_T9_HINT =
  'הקלידו במקשי הטלפון. כל מקש נושא אותיות: לחיצה אחת לאות הראשונה, שתיים לשנייה, שלוש לשלישית. ' +
  'לרווח בין מילים הקישו אפס. להפרדה בין שתי אותיות שעל אותו מקש הקישו כוכבית ביניהן. ' +
  'אין צורך בכתיב מדויק, המערכת משלימה לבד. בסיום המתינו רגע.';

export function hebrewKeypadPrompt(ctx, handler, prefix = '') {
  return askDigits(ctx, handler, prefix + HEBREW_T9_HINT, 200, 2, 'no');
}

// דמיון לוינשטיין בין שתי מילים (0 עד 1)
function similarity(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

// השלמת אותיות תנועה חסרות, מילה מילה, עם הגבלה: חייב להישאר 80% דמיון להקשה בפועל.
// base44 = לקוח ה-SDK של האפליקציה (עם asServiceRole). אם אין AI במערכת השנייה, אפשר לדלג על הפונקציה.
async function expandWord(base44, word) {
  if (word.length < 2) return word;
  const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `הטקסט הבא הוקש במקשי טלפון על ידי בן משפחה חרדית בישראל, כשם של הוצאה או הכנסה.
ההקשה לרוב חסרה רק אותיות תנועה (א, ו, י, ה) או מקוצרת מעט, אך רוב האותיות שהוקשו נכונות ומופיעות בסדר הנכון.

המילה שהוקשה: "${word}"

השלימו רק אותיות תנועה חסרות או קיצור קל, כדי לקבל מילה תקנית בעברית — שם בית עסק, מוסד, ספק, שירות או סוג תשלום מוכר בישראל.
דוגמאות: "רמלו" הכוונה רמי לוי. "נטרנט" הכוונה אינטרנט. "משכנת" הכוונה משכנתה. "תת" הכוונה תלמוד תורה.
אסור להחליף במילה שאינה קרובה מאוד, אות באות, לאותיות שהוקשו. אם אינכם בטוחים ברמה גבוהה, החזירו את המילה כמו שהיא.

החזירו אך ורק את המילה המושלמת, בלי הסברים.`,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: { text: { type: 'string' }, confidence: { type: 'number' } },
      required: ['text'],
    },
  });
  const guess = String(res?.text || '').trim();
  if (!guess || (res?.confidence ?? 1) < 0.6) return word;
  return similarity(word, guess) < 0.8 ? word : guess;
}

export async function expandT9Text(base44, raw) {
  const text = String(raw || '').trim();
  if (!text) return text;
  const words = text.split(' ').filter(Boolean);
  const out = await Promise.all(words.map((w) => expandWord(base44, w).catch(() => w)));
  return out.join(' ');
}

// פענוח ההקשות לעברית, השלמה, והעברה לפעולה הבאה
export async function hebrewFromKeypad(ctx, keys, onText) {
  const raw = decodeT9(keys, 'he');
  if (!raw) return hebrewKeypadPrompt(ctx, ctx.data?.hebHandler || 'hebKeys', 'לא זוהה טקסט. ');
  const text = await expandT9Text(ctx.base44, raw).catch(() => raw);
  return onText(ctx, text);
}