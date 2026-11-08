// המרת כתובת מייל שנאמרה בעל פה לכתובת תקנית + הקראה אות אחר אות

const SPOKEN = [
  [/\s+/g, ''],
  [/שטרודל|אטרודל|את סיין|כרוכית/g, '@'],
  [/נקודה|נקוד/g, '.'],
  [/מקף תחתון|קו תחתון/g, '_'],
  [/מקף|מינוס/g, '-'],
];

export function normalizeSpokenEmail(spoken) {
  let s = String(spoken || '').trim().toLowerCase();
  for (const [re, rep] of SPOKEN) s = s.replace(re, rep);
  return s;
}

export function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || ''));
}

// זיהוי חכם: המשתמש מאיית או אומר את הכתובת, והמודל מחזיר כתובת תקנית
export async function parseEmailWithAI(base44, spoken) {
  const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `המשתמש הכתיב בטלפון כתובת אימייל בעברית (אפשר שאיית אותה אות אחר אות, אמר "שטרודל" במקום @ ו"נקודה" במקום נקודה, או השתמש בשמות אותיות באנגלית כמו "איי בי סי").
הטקסט שזוהה: "${spoken}"
החזר את כתובת האימייל התקנית באנגלית בלבד, באותיות קטנות. אם אי אפשר להסיק כתובת סבירה החזר email ריק.
דוגמאות: "איי בי סי שטרודל ג'ימייל נקודה קום" => "abc@gmail.com"; "משה 12 שטרודל וואלה נקודה קו איי אל" => "moshe12@walla.co.il".`,
    response_json_schema: {
      type: 'object',
      properties: { email: { type: 'string' } },
    },
  });
  const email = String(res?.email || '').trim().toLowerCase();
  return isValidEmail(email) ? email : null;
}

const LETTERS = {
  a: 'איי', b: 'בי', c: 'סי', d: 'די', e: 'אי', f: 'אף', g: 'ג׳י', h: 'אייץ׳',
  i: 'איי', j: 'ג׳יי', k: 'קיי', l: 'אל', m: 'אם', n: 'אן', o: 'או', p: 'פי',
  q: 'קיו', r: 'אר', s: 'אס', t: 'טי', u: 'יו', v: 'וי', w: 'דאבל יו', x: 'אקס',
  y: 'וואי', z: 'זי',
  '@': 'שטרודל', '.': 'נקודה', '-': 'מקף', '_': 'קו תחתון',
};

// הקראה אות אחר אות כדי שהמשתמש יוכל לאמת
export function spellEmail(email) {
  return String(email)
    .split('')
    .map((ch) => LETTERS[ch] || ch)
    .join(', ');
}