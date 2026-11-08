import { base44 } from '@/api/base44Client';
import { norm, loadRules, loadGlobalRules } from '@/lib/categoryRules';
import { isSummaryDescription, parseAmount, parseDate, normalizeType, resolveCategory } from '@/lib/importRules';
import { INCOME_CATEGORIES } from '@/lib/categories';

// סכימה שטוחה עם סכום כטקסט — סימני מטבע, פסיקים ומינוס נשמרים כפי שהם בקובץ
const ROW_SCHEMA = {
  type: 'object',
  properties: {
    date: { type: 'string', description: 'תאריך העסקה' },
    description: { type: 'string', description: 'שם בית העסק / תיאור התנועה המלא' },
    amount: { type: 'string', description: 'סכום כפי שמופיע בקובץ, כולל סימן מינוס או סוגריים אם יש (זיכוי/ביטול)' },
    type: { type: 'string', description: 'income או expense, אם מצוין בקובץ' },
    reference: { type: 'string', description: 'מספר אסמכתא / שובר / אישור אם קיים' },
    'אסמכתא': { type: 'string', description: 'עמודת אסמכתא / מספר שובר / מספר אישור, אם קיימת בקובץ' },
  },
  required: ['description', 'amount'],
};

const FALLBACK_SCHEMA = {
  type: 'object',
  properties: { transactions: { type: 'array', items: ROW_SCHEMA } },
  required: ['transactions'],
};

const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    is_receipt: { type: 'boolean', description: 'האם בתמונה קבלה או חשבונית' },
    merchant: { type: 'string', description: 'שם בית העסק' },
    date: { type: 'string', description: 'תאריך הקבלה בפורמט YYYY-MM-DD' },
    amount: { type: 'number', description: 'הסכום הכולל לתשלום בשקלים' },
    reference: { type: 'string', description: 'מספר קבלה / חשבונית אם קיים' },
  },
  required: ['is_receipt', 'merchant', 'amount'],
};

export async function fileHash(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// (ג) אותו קובץ יובא פעמיים
export async function findPreviousImport(identity, hash) {
  const page = await base44.entities.Transaction.filter({ owner_id: identity, file_hash: hash }, { limit: 1 });
  return (page.items || [])[0] || null;
}

async function upload(file) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  if (!file_uri) throw new Error('העלאת הקובץ נכשלה');
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
  return signed_url;
}

// מחלץ שורות גולמיות מקובץ (אקסל/CSV/PDF) או מתמונת קבלה
export async function extractRaw(file) {
  const url = await upload(file);
  if (file.type?.startsWith('image/')) {
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: 'זוהי תמונה של קבלה או חשבונית. חלץ ממנה את שם בית העסק, תאריך, הסכום הכולל לתשלום ומספר הקבלה. אל תנחש: אם אינך בטוח בשדה, השאר אותו ריק.',
      file_urls: [url],
      response_json_schema: RECEIPT_SCHEMA,
    });
    if (!r?.is_receipt || !r.merchant || !r.amount) throw new Error('לא זוהתה קבלה קריאה בתמונה. נסו צילום ברור יותר.');
    return { receipt: true, raw: [{ description: r.merchant, date: r.date, amount: r.amount, reference: r.reference }] };
  }
  let res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: url, json_schema: ROW_SCHEMA });
  if (res.status === 'error') res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: url, json_schema: FALLBACK_SCHEMA });
  if (res.status === 'error') throw new Error(res.details || 'שגיאה בקריאת הקובץ');
  const out = res.output || {};
  const raw = Array.isArray(out) ? out : Array.isArray(out.transactions) ? out.transactions : out.description ? [out] : [];
  return { receipt: false, raw };
}

const rowKey = (r) => `${r.date}|${norm(r.description)}|${Math.round(r.amount * 100)}`;

// זיהוי כפילויות אמיתי בלבד:
//  (א) אותה אסמכתא פעמיים  (ב) אותה עסקה בדיוק מקובץ אחר החופף בתאריכים
//  ספק (עסקה זהה שנקלטה ללא קובץ מקור, למשל ידנית/טלפון) — "לבדיקה", לא נמחק.
//  שתי קניות זהות באותו קובץ וללא אסמכתא זהה — אינן כפילות.
function markDuplicates(rows, existing, hash) {
  const exRefs = new Set(existing.filter((t) => t.reference).map((t) => t.reference));
  const otherFile = new Map();
  const unknownOrigin = new Map();
  for (const t of existing) {
    const m = t.file_hash && t.file_hash !== hash ? otherFile : t.file_hash ? null : unknownOrigin;
    if (m) m.set(rowKey(t), (m.get(rowKey(t)) || 0) + 1);
  }
  const seenRefs = new Set();
  return rows.map((r) => {
    const out = { ...r };
    if (r.reference && (seenRefs.has(r.reference) || exRefs.has(r.reference))) {
      Object.assign(out, { skip: true, dupNote: 'אסמכתא זהה כבר קיימת' });
    } else if ((otherFile.get(rowKey(r)) || 0) > 0) {
      otherFile.set(rowKey(r), otherFile.get(rowKey(r)) - 1);
      Object.assign(out, { skip: true, dupNote: 'כבר נקלטה מקובץ אחר' });
    } else if ((unknownOrigin.get(rowKey(r)) || 0) > 0) {
      unknownOrigin.set(rowKey(r), unknownOrigin.get(rowKey(r)) - 1);
      Object.assign(out, { review: true, dupNote: 'לבדיקה: עסקה זהה כבר קיימת' });
    }
    if (r.reference) seenRefs.add(r.reference);
    return out;
  });
}

// שורות גולמיות → שורות לתצוגה מקדימה (סינון סיכומים, סימן, סיווג, כפילויות)
export async function buildRows(raw, { identity, fileName, hash, receipt }) {
  const today = new Date().toISOString().split('T')[0];
  let summaryDropped = 0;
  const base = [];
  for (const r of raw) {
    if (!r) continue;
    const description = String(r.description || '').trim();
    const amount = parseAmount(r.amount);
    const date = parseDate(r.date) || (receipt ? today : null);
    if (isSummaryDescription(description) || !date) { summaryDropped++; continue; }
    if (!amount) continue;
    base.push({ description, amount, date, fileType: normalizeType(r.type), reference: String(r.reference || r['אסמכתא'] || '').trim().replace(/^0+$/, '') });
  }

  const [personal, global] = await Promise.all([loadRules(identity).catch(() => []), loadGlobalRules().catch(() => [])]);
  const incomeIds = INCOME_CATEGORIES.map((c) => c.id);
  const rows = base.map(({ fileType, ...r }) => {
    const res = resolveCategory(r.description, fileType, personal, global);
    let { type, category } = res;
    let amount = r.amount;
    // סכום שלילי (זיכוי/ביטול) נשאר שלילי ומתקזז מאותה קטגוריית הוצאה; רק הכנסה אמיתית הופכת לחיובית
    if (amount < 0 && (type === 'income' || incomeIds.includes(category))) amount = Math.abs(amount);
    else if (amount < 0) type = 'expense';
    return {
      type, category, amount, description: r.description, date: r.date, owner_id: identity,
      reference: r.reference || undefined, file_hash: hash, source_file: fileName,
      needsClarify: res.source === 'unknown',
    };
  });

  let withDupes = rows;
  if (rows.length) {
    const dates = rows.map((r) => r.date).sort();
    const page = await base44.entities.Transaction.filter(
      { owner_id: identity, date: { $gte: dates[0], $lte: dates[dates.length - 1] } },
      { sort: '-date', limit: 1000 }
    );
    withDupes = markDuplicates(rows, page.items || [], hash);
  }
  return { rows: withDupes.map((r) => ({ ...r, suspicious: Math.abs(r.amount) > 100000 })), summaryDropped };
}