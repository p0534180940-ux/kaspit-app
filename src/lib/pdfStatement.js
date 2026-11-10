// קריאת דף חשבון / פירוט אשראי מקובץ PDF ישירות בדפדפן - בלי AI.
// עובד על PDF עם שכבת טקסט (רוב הקבצים שהבנקים מייצאים). אם לא הצליח - מחזיר null,
// והמערכת עוברת לניתוח ה-AI הרגיל.

const PDFJS_VER = '4.10.38';
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}/build/pdf.min.mjs`;
const WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}/build/pdf.worker.min.mjs`;

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ PDFJS_URL).then((m) => {
      m.GlobalWorkerOptions.workerSrc = WORKER_URL;
      return m;
    }).catch((e) => { pdfjsPromise = null; throw e; });
  }
  return pdfjsPromise;
}

const clean = (s) => String(s || '').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim();
const noCur = (s) => clean(s).replace(/₪|ש"ח|ש״ח|NIS/g, '').trim();

const DATE_RE = /^\d{1,2}[/.-]\d{1,2}[/.-](\d{4}|\d{2})$/;
// סכום כספי חייב לכלול אגורות (1,234.56) - כך מספרי אסמכתא/הלוואה לא נחשבים לסכום
const MONEY_RE = /^\(?[-\u2212\u2013]?\s?(\d{1,3}(,\d{3})+|\d+)\.\d{1,2}\s?[-\u2212\u2013]?\)?$/;
const REF_RE = /^[\d][\d/\s-]*$/;

// כותרות עמודות מוכרות
const HEAD = {
  date: (t) => /^תאריך( ה?עסקה| ביצוע| רכישה| פעולה)?$/.test(t),
  desc: (t) => /תיאור|פרטי(ם)?( ה?תנועה)?$|שם בית ה?עסק|בית ה?עסק|אופי התנועה|^הפעולה$|^פעולה$/.test(t),
  amount: (t) => /זכות ?\/ ?חובה|חובה ?\/ ?זכות|^סכום( ה?חיוב| בש"?ח| ב-?₪)?$|סכום ה?חיוב/.test(t),
  amountTx: (t) => /סכום ה?עסקה|סכום מקורי/.test(t),
  debit: (t) => /^(ב?חובה|משיכה|משיכות|חיוב)$/.test(t),
  credit: (t) => /^(ב?זכות|הפקדה|הפקדות|זיכוי)$/.test(t),
  balance: (t) => /יתרה/.test(t),
  ref: (t) => /אסמכת|שובר|מס'? אישור/.test(t),
};

async function pdfLines(file) {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items
      .filter((i) => clean(i.str))
      .map((i) => ({ str: clean(i.str), x: i.transform[4], y: i.transform[5], w: i.width || 0, h: Math.abs(i.transform[3]) || i.height || 8 }));
    pages.push(items);
  }
  return pages;
}

// פריטים -> שורות (לפי גובה) -> תאים (לפי רווח אופקי)
function toLines(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines = [];
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(2, it.h * 0.35));
    if (line) line.items.push(it);
    else lines.push({ y: it.y, items: [it] });
  }
  return lines.map((l) => ({ y: l.y, cells: toCells(l.items) }));
}

function toCells(items) {
  const s = [...items].sort((a, b) => a.x - b.x);
  const cells = [];
  for (const it of s) {
    const last = cells[cells.length - 1];
    const gap = last ? it.x - last.x1 : Infinity;
    if (last && gap < Math.max(4, it.h * 0.9)) {
      last.parts.push(it);
      last.x1 = Math.max(last.x1, it.x + it.w);
    } else {
      cells.push({ x0: it.x, x1: it.x + it.w, parts: [it] });
    }
  }
  return cells.map((c) => {
    // טקסט עברי נקרא מימין לשמאל; מספרים/תאריכים - חלק אחד בדרך כלל
    const hebrew = c.parts.some((p) => /[\u0590-\u05FF]/.test(p.str));
    const parts = hebrew ? [...c.parts].sort((a, b) => b.x - a.x) : c.parts;
    const text = clean(parts.map((p) => p.str).join(' '));
    return { text, x0: c.x0, x1: c.x1, cx: (c.x0 + c.x1) / 2 };
  });
}

function findHeader(line) {
  const cols = {};
  for (const c of line.cells) {
    const t = noCur(c.text).replace(/\s*\/\s*/g, '/');
    for (const [k, test] of Object.entries(HEAD)) {
      if (!cols[k] && test(t)) { cols[k] = c; break; }
    }
  }
  const hasAmount = cols.amount || cols.debit || cols.credit || cols.amountTx;
  return cols.date && hasAmount && (cols.desc || cols.balance || cols.ref) ? cols : null;
}

const nearest = (cell, cols, keys) => {
  let best = null; let bd = Infinity;
  for (const k of keys) {
    const c = cols[k];
    if (!c) continue;
    // מרחק בין התא לעמודה: חפיפה = 0, אחרת המרחק בין הקצוות
    const d = Math.max(0, c.x0 - cell.x1, cell.x0 - c.x1) + Math.abs(c.cx - cell.cx) * 0.01;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
};

function parseRow(line, cols) {
  const dates = []; const money = []; const rest = [];
  for (const c of line.cells) {
    const t = noCur(c.text);
    if (DATE_RE.test(t)) dates.push(c);
    else if (MONEY_RE.test(t) && /\d/.test(t)) money.push({ ...c, text: t });
    else rest.push({ ...c, text: clean(c.text) });
  }
  if (!dates.length || !money.length) return null;

  const date = dates.length === 1 ? dates[0] : dates.reduce((a, b) => (Math.abs(a.cx - cols.date.cx) <= Math.abs(b.cx - cols.date.cx) ? a : b));
  const moneyKeys = ['amount', 'debit', 'credit', 'balance', 'amountTx'].filter((k) => cols[k]);
  const got = {};
  for (const m of money) {
    const k = nearest(m, cols, moneyKeys);
    if (k && !got[k]) got[k] = m.text;
  }

  let reference = '';
  const descParts = [];
  for (const c of rest) {
    const t = c.text;
    if (cols.ref && REF_RE.test(t) && nearest(c, cols, ['ref', 'desc'].filter((k) => cols[k])) === 'ref') {
      reference = reference || t.replace(/\s+/g, '');
      continue;
    }
    if (cols.desc && nearest(c, cols, Object.keys(cols)) !== 'desc' && !/[\u0590-\u05FFA-Za-z]/.test(t)) continue;
    descParts.push(c);
  }
  const description = clean(descParts.sort((a, b) => b.cx - a.cx).map((c) => c.text).join(' '));
  if (!description) return null;

  // חשבון בנק (עמודת יתרה / חובה-זכות): מינוס = הוצאה, פלוס = הכנסה
  if (got.debit || got.credit) {
    if (got.debit) return { date: date.text, description, amount: got.debit.replace(/[-\u2212\u2013()]/g, ''), type: 'expense', reference };
    return { date: date.text, description, amount: '-' + got.credit.replace(/[-\u2212\u2013()]/g, ''), type: 'income', reference };
  }
  const amt = got.amount || got.amountTx;
  if (!amt) return null;
  if (cols.balance) {
    const neg = /^\(|^[-\u2212\u2013]|[-\u2212\u2013]$/.test(amt);
    const abs = amt.replace(/[-\u2212\u2013()]/g, '');
    // הוצאה כסכום חיובי; זיכוי/הכנסה כסכום שלילי עם סוג "הכנסה" (אותה מוסכמה של שאר הייבוא)
    return neg ? { date: date.text, description, amount: abs, type: 'expense', reference } : { date: date.text, description, amount: '-' + abs, type: 'income', reference };
  }
  // פירוט כרטיס אשראי: הסכום כפי שהוא (מינוס = זיכוי/ביטול)
  return { date: date.text, description, amount: amt, reference };
}

export function parseStatementPages(pages) {
  const rows = [];
  let cols = null; let candidates = 0;
  for (const items of pages) {
    for (const line of toLines(items)) {
      const h = findHeader(line);
      if (h) { cols = h; continue; }
      if (!cols) continue;
      const hasDate = line.cells.some((c) => DATE_RE.test(noCur(c.text)));
      const hasMoney = line.cells.some((c) => MONEY_RE.test(noCur(c.text)));
      if (!hasDate || !hasMoney) continue;
      candidates++;
      const r = parseRow(line, cols);
      if (r) rows.push(r);
    }
  }
  // אם לא זוהו רוב השורות - עדיף לתת ל-AI לנתח
  if (!rows.length || rows.length < candidates * 0.8) return null;
  return rows;
}

export async function readPdfStatement(file) {
  try {
    const pages = await pdfLines(file);
    if (!pages.some((p) => p.length > 10)) return null; // PDF סרוק (תמונה) - צריך AI
    return parseStatementPages(pages);
  } catch (e) {
    console.warn('קריאת PDF מקומית נכשלה, עוברים ל-AI', e);
    return null;
  }
}
