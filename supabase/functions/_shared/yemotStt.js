// תמלול הקלטות אצלנו במקום התמלול היקר של המרכזיה:
// המרכזיה רק מקליטה לקובץ, אנחנו מורידים אותו ומתמללים בעצמנו.

export const DEFAULT_IVR_BASE = 'https://www.call2all.co.il/ym/api/';

export function apiBase(raw) {
  const b = (raw || DEFAULT_IVR_BASE).trim();
  return b.endsWith('/') ? b : b + '/';
}

export function looksLikeRecordingPath(value) {
  const v = String(value || '');
  return /^ivr2?:\//i.test(v) || /\.wav$/i.test(v);
}

export function recordingPath(folder, fileName) {
  return `${String(folder).replace(/\/+$/, '')}/${fileName}.wav`;
}

const GEMINI_PROMPT =
  'לפניך הקלטה קצרה בעברית של דיווח על הוצאה או הכנסה במשק בית בישראל. ' +
  'תמלל את הנאמר במדויק בעברית, ללא פירוש, ללא הסבר וללא תוספות. ' +
  'סכומים שנאמרו במילים יש לכתוב בספרות בלבד: "מאה חמישים שקל" יירשם "150 שקל". ' +
  'שמות חנויות ושירותים בישראל יש לכתוב בכתיב המקובל. ' +
  'אם לא נשמע דיבור, החזר טקסט ריק. החזר את התמלול בלבד.';

// חשוב: התשובה מוחזרת כטקסט חופשי. בקשת JSON כאן החזירה לעיתים אובייקט ריק,
// וזו הסיבה שהתמלול של ג'ימיני לא עבד.
async function geminiTranscribe(base44, fileUrl) {
  const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: GEMINI_PROMPT,
    file_urls: [fileUrl],
    model: 'gemini_3_flash',
  });
  const text = typeof out === 'string' ? out : String(out?.text || out?.response || '');
  return text.replace(/^["'\s]+|["'\s]+$/g, '').trim();
}

export async function transcribeRecording(base44, { token, base, path, mode = 'self' }) {
  const url = `${apiBase(base)}DownloadFile?token=${encodeURIComponent(token)}&path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) return '';

  const bytes = new Uint8Array(await res.arrayBuffer());
  // קובץ קטן מדי = לא נקלטה הקלטה אמיתית
  if (bytes.byteLength < 3000) return '';

  const file = new File([bytes], 'recording.wav', { type: 'audio/wav' });
  const up = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
  if (!up?.file_url) return '';

  if (mode === 'gemini') return await geminiTranscribe(base44, up.file_url);

  const out = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: up.file_url });
  const text = (typeof out === 'string' ? out : String(out?.transcript || out?.text || '')).trim();
  // אם מנוע התמלול הרגיל לא החזיר דבר — מנסים בג'ימיני לפני שמכריזים על כישלון
  if (!text) return await geminiTranscribe(base44, up.file_url).catch(() => '');
  return text;
}