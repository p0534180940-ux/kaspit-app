// תחליף ל-SDK של Base44 בצד השרת (Supabase Edge Functions).
// אותו ממשק: createClientFromRequest(req) -> { auth.me, entities, asServiceRole, integrations, functions }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { makeEntities } from './entityStore.js';
import * as XLSX from 'npm:xlsx@0.18.5';
import { unzipSync, strFromU8 } from 'npm:fflate@0.8.2';
import defaults from './entityDefaults.json' with { type: 'json' };

const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const secrets = { get: (k: string) => Deno.env.get(k) || '' };

export const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const PROFILE_COLS = ['email', 'full_name', 'role', 'owner_identity', 'is_coach'];

function profileToUser(p: any) {
  if (!p) return null;
  return {
    ...(p.data || {}),
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    role: p.role,
    owner_identity: p.owner_identity,
    is_coach: p.is_coach,
    created_date: p.created_date,
    updated_date: p.updated_date,
  };
}

function userEntityFor(client: any) {
  const api: any = {
    async filter(query: Record<string, unknown> = {}) {
      let q = client.from('profiles').select('*');
      for (const [k, v] of Object.entries(query)) {
        q = PROFILE_COLS.includes(k) || k === 'id' ? q.eq(k, v) : q.contains('data', { [k]: v });
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(profileToUser);
    },
    async list() {
      return api.filter({});
    },
    async get(id: string) {
      const r = await api.filter({ id });
      if (!r[0]) throw Object.assign(new Error('Not found'), { status: 404 });
      return r[0];
    },
    async update(id: string, patch: Record<string, unknown>) {
      const top: Record<string, unknown> = {};
      const data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch || {})) {
        if (k === 'id') continue;
        if (PROFILE_COLS.includes(k)) top[k] = v;
        else data[k] = v;
      }
      if (Object.keys(data).length) {
        const { data: cur } = await client.from('profiles').select('data').eq('id', id).maybeSingle();
        top.data = { ...(cur?.data || {}), ...data };
      }
      const { data: res, error } = await client.from('profiles').update(top).eq('id', id).select('*').single();
      if (error) throw error;
      return profileToUser(res);
    },
  };
  return api;
}

// ---------- AI (Gemini) ----------
const GEMINI_KEY = () => Deno.env.get('GEMINI_API_KEY') || '';
const MODELS = () => [Deno.env.get('GEMINI_MODEL'), 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean) as string[];

function b64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function fileParts(urls: string[] = []) {
  const parts = [];
  for (const u of urls) {
    const r = await fetch(u);
    if (!r.ok) continue;
    const mime = (r.headers.get('content-type') || 'application/octet-stream').split(';')[0];
    const bytes = new Uint8Array(await r.arrayBuffer());
    const path = u.split('?')[0].toLowerCase();
    const isSheet = /spreadsheet|ms-excel|text\/csv|officedocument\.spreadsheetml/.test(mime) || /\.(xlsx|xls|csv)$/.test(path);
    if (isSheet) {
      // Gemini לא קורא קבצי אקסל ישירות: ממירים כל גיליון לטקסט CSV
      const wb = XLSX.read(bytes, { type: 'array', cellDates: true });
      const text = wb.SheetNames.map((n) => `גיליון: ${n}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n], { dateNF: 'yyyy-mm-dd' })).join('\n\n');
      parts.push({ text: `תוכן הקובץ (CSV):\n${text.slice(0, 400000)}` });
      continue;
    }
    const isDocx = /wordprocessingml/.test(mime) || path.endsWith('.docx');
    if (isDocx) {
      // Gemini לא קורא Word: מחלצים טקסט וטבלאות מתוך document.xml
      const xml = strFromU8(unzipSync(bytes)['word/document.xml'] || new Uint8Array());
      const text = xml
        .replace(/<\/w:tc>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, '\t')
        .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      parts.push({ text: `תוכן מסמך ה-Word:\n${text.slice(0, 400000)}` });
      continue;
    }
    if (/msword/.test(mime) || path.endsWith('.doc')) {
      throw new Error('קובץ Word ישן (.doc) לא נתמך. שמרו אותו כ-docx או PDF ונסו שוב.');
    }
    parts.push({ inlineData: { mimeType: mime === 'application/octet-stream' && path.endsWith('.wav') ? 'audio/wav' : mime, data: b64(bytes) } });
  }
  return parts;
}

// ממיר JSON Schema לפורמט ש-Gemini מקבל
function toGeminiSchema(s: any): any {
  if (!s || typeof s !== 'object') return s;
  const out: any = {};
  const t = Array.isArray(s.type) ? s.type.find((x: string) => x !== 'null') : s.type;
  if (t) out.type = String(t).toUpperCase();
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum.map(String);
  if (s.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(s.properties)) out.properties[k] = toGeminiSchema(v);
  }
  if (s.required) out.required = s.required;
  if (s.items) out.items = toGeminiSchema(s.items);
  if (s.type === 'array' && !s.items) out.items = { type: 'STRING' };
  return out;
}

export async function gemini({ prompt, system, parts = [], schema, history }: any) {
  const key = GEMINI_KEY();
  if (!key) throw new Error('GEMINI_API_KEY חסר');
  const contents = history || [{ role: 'user', parts: [{ text: String(prompt || '') }, ...parts] }];
  const body: any = { contents, generationConfig: { temperature: 0.2 } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (schema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = toGeminiSchema(schema);
  }
  let lastErr = '';
  for (const model of MODELS()) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    if (r.status === 404) {
      lastErr = `model ${model} not found`;
      continue;
    }
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || `Gemini error ${r.status}`);
    const text = (j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
    if (!schema) return text;
    try {
      return JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      return m ? JSON.parse(m[0]) : {};
    }
  }
  throw new Error(lastErr || 'no model available');
}

const SITE = () => Deno.env.get('SITE_URL') || '';
function renderTemplate(name: string, v: Record<string, string> = {}) {
  const wrap = (title: string, lines: string[], link: string, label: string) => ({
    subject: title,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
      <h2 style="color:#1f385c;margin-top:0">${title}</h2>${lines.filter(Boolean).map((l) => `<p style="margin:6px 0">${l}</p>`).join('')}
      ${link ? `<p style="margin-top:20px"><a href="${link}" style="background:#1f385c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">${label}</a></p>` : ''}
      <p style="color:#6b7280;font-size:12px;margin-top:24px">כספית — המאמן הכלכלי שלך</p></div>`,
  });
  if (name === 'DebtReminder') {
    return wrap(`תזכורת: מועד ${v.kind_word || 'תשלום'} בעוד 3 ימים`, [
      `${v.direction_word || ''}: <b>${v.person || ''}</b>`,
      `סכום: <b>${v.amount || ''} ש"ח</b>`,
      v.balance ? `יתרה כרגע: <b>${v.balance} ש"ח</b>` : '',
      v.date ? `תאריך: ${v.date}` : '',
    ], SITE() ? SITE() + '#/debts' : '', 'פתיחת החובות שלי');
  }
  if (name === 'CoachAlert') {
    return wrap(`שלום ${v.first_name || ''}, יש משפחות שדורשות מעקב`, [1, 2, 3, 4, 5, 6].map((i) => v['line_' + i] || ''),
      SITE() ? SITE() + '#/coach' : '', 'פתיחת אזור המאמן');
  }
  return wrap(name, Object.values(v), '', '');
}

async function sendEmail(p: any) {
  if (p.template_name) {
    const t = renderTemplate(p.template_name, p.variables || {});
    p = { ...p, subject: p.subject || t.subject, body: t.html };
  }
  const { to, subject, body, from_name } = p;
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) {
    console.log('SendEmail skipped (no RESEND_API_KEY):', to, subject);
    return { ok: false, skipped: true };
  }
  const from = `${from_name || 'כספית'} <${Deno.env.get('MAIL_FROM') || 'onboarding@resend.dev'}>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html: body }),
  });
  if (!r.ok) throw new Error('SendEmail failed: ' + (await r.text()));
  return { ok: true };
}

async function uploadPublic(file: File) {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}-${(file.name || 'file').replace(/[^\w.-]/g, '_')}`;
  const { error } = await admin.storage.from('public').upload(name, file, { contentType: file.type || undefined });
  if (error) throw error;
  return admin.storage.from('public').getPublicUrl(name).data.publicUrl;
}

const TRANSCRIBE_PROMPT =
  'תמלל את ההקלטה בעברית במדויק. סכומים כתוב בספרות. החזר את התמלול בלבד, בלי הסברים. אם אין דיבור החזר טקסט ריק.';


// שמות שדות שאינם באנגלית מוחלפים זמנית (Gemini דוחה אותם)
function asciiSchema(schema: any) {
  const map: Record<string, string> = {};
  let n = 0;
  const walk = (s: any): any => {
    if (!s || typeof s !== 'object') return s;
    const out: any = { ...s };
    if (s.properties) {
      out.properties = {};
      for (const [k, v] of Object.entries(s.properties)) {
        const safe = /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : (map[k] = map[k] || `field_${n++}`);
        if (safe !== k) map[safe] = k;
        out.properties[safe] = walk(v);
      }
      if (s.required) out.required = s.required.map((k: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : map[k]));
    }
    if (s.items) out.items = walk(s.items);
    return out;
  };
  const restore = (v: any): any => {
    if (Array.isArray(v)) return v.map(restore);
    if (v && typeof v === 'object') {
      const o: any = {};
      for (const [k, val] of Object.entries(v)) o[map[k] && k.startsWith('field_') ? map[k] : k] = restore(val);
      return o;
    }
    return v;
  };
  return { schema: walk(schema), back: restore };
}

export const Core = {
  async InvokeLLM({ prompt, response_json_schema, file_urls }: any) {
    const parts = await fileParts(file_urls || []);
    return await gemini({ prompt, parts, schema: response_json_schema });
  },
  async TranscribeAudio({ audio_url }: any) {
    const parts = await fileParts([audio_url]);
    const text = await gemini({ prompt: TRANSCRIBE_PROMPT, parts });
    return String(text || '').trim();
  },
  async ExtractDataFromUploadedFile({ file_url, json_schema }: any) {
    try {
      const parts = await fileParts([file_url]);
      // Gemini מקבל רק שמות שדות באנגלית: ממירים שמות כמו "אסמכתא" לשמות זמניים ומחזירים בסוף
      const { schema, back } = asciiSchema(json_schema);
      // כמו ב-Base44: סכימה של שורה אחת = מחזירים רשימה של שורות
      const isRow = schema?.type === 'object' && !Object.values(schema.properties || {}).some((p: any) => p?.type === 'array');
      const output = await gemini({
        prompt: 'חלץ מהקובץ המצורף את כל השורות/התנועות לפי המבנה המבוקש. אל תדלג על שורות ואל תמציא נתונים שאינם בקובץ. שורות סיכום ויתרה אינן תנועות.',
        parts,
        schema: isRow ? { type: 'array', items: schema } : schema,
      });
      return { status: 'success', output: back(output) };
    } catch (e) {
      console.error('ExtractDataFromUploadedFile failed:', (e as Error).message);
      return { status: 'error', details: (e as Error).message };
    }
  },
  async SendEmail(p: any) {
    return await sendEmail(p);
  },
  async UploadPublicFile({ file }: any) {
    return { file_url: await uploadPublic(file) };
  },
  async UploadFile({ file }: any) {
    return { file_url: await uploadPublic(file) };
  },
};

async function invokeFunction(name: string, body: unknown, authHeader?: string) {
  const r = await fetch(`${URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader || `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify(body || {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data?.error || `function ${name} failed`), { status: r.status, response: { data } });
  return { data, status: r.status };
}

export function createClientFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const userClient = createClient(URL, ANON, {
    global: { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const auth = {
    async me() {
      if (!jwt || jwt === ANON) throw Object.assign(new Error('Unauthorized'), { status: 401 });
      const { data, error } = await admin.auth.getUser(jwt);
      if (error || !data?.user) throw Object.assign(new Error('Unauthorized'), { status: 401 });
      const { data: p } = await admin.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (!p) throw Object.assign(new Error('Unauthorized'), { status: 401 });
      return profileToUser(p);
    },
  };

  return {
    auth,
    entities: makeEntities(userClient, defaults, { onUser: userEntityFor(userClient) }),
    integrations: { Core },
    functions: { invoke: (name: string, body: unknown) => invokeFunction(name, body, authHeader) },
    asServiceRole: {
      entities: makeEntities(admin, defaults, { onUser: userEntityFor(admin) }),
      integrations: { Core },
      functions: { invoke: (name: string, body: unknown) => invokeFunction(name, body) },
    },
  };
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// עוטף handler בסגנון Base44 ומוסיף CORS
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    let res: Response;
    try {
      res = await handler(req);
    } catch (e) {
      res = Response.json({ error: (e as Error).message }, { status: 500 });
    }
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) h.set(k, v);
    return new Response(res.body, { status: res.status, headers: h });
  });
}

// קריאה מהמשימות המתוזמנות של המסד (pg_cron)
let cronKeyCache = '';
export async function isCronCall(body: any) {
  if (!body?.cron_key) return false;
  if (!cronKeyCache) {
    const { data } = await admin.from('private_settings').select('value').eq('key', 'cron_key').maybeSingle();
    cronKeyCache = data?.value || '';
  }
  return !!cronKeyCache && body.cron_key === cronKeyCache;
}
