import React from 'react';

const HEBREW = [
  ['1', 'א  ב  ג  .'],
  ['2', 'ד  ה  ו'],
  ['4', 'מ  ם  נ  ן'],
  ['5', 'י  כ  ך  ל'],
  ['6', 'ז  ח  ט'],
  ['7', 'ר  ש  ת'],
  ['8', 'צ  ץ  ק'],
  ['9', 'ס  ע  פ  ף'],
  ['0', 'רווח בין מילים'],
];

const ENGLISH = [
  ['1', '@  .  _  -'],
  ['2', 'a  b  c'],
  ['3', 'd  e  f'],
  ['4', 'g  h  i'],
  ['5', 'j  k  l'],
  ['6', 'm  n  o'],
  ['7', 'p  q  r  s'],
  ['8', 't  u  v'],
  ['9', 'w  x  y  z'],
];

const RULES = [
  'לחיצה אחת על מקש = האות הראשונה שעליו, שתי לחיצות = השנייה, שלוש = השלישית, ארבע = הרביעית. במקשים 4, 5, 8, 9 האותיות הסופיות באות מיד אחרי האות הרגילה (למשל במקש 5: י, כ, ך, ל).',
  'אפס (0) = רווח בין מילים.',
  'כוכבית (*) בין שתי אותיות = הפרדה כששתי האותיות נמצאות על אותו מקש.',
  'סולמית (#) = החלפת מצב: עברית ← מספרים ← אנגלית ← עברית.',
  'אין צורך בכתיב מדויק: אפשר להקליד בלי אותיות תנועה (א, ה, ו, י) והמערכת משלימה את המילה.',
  'בסיום ההקלדה מחכים רגע והמערכת ממשיכה.',
];

const EXAMPLES = [
  ['רמי לוי', 'ר=7  מ=4  י=5  רווח=0  ל=5555  ו=222  י=5  ←  7 4 5 0 5555 222 5'],
  ['שלום', 'ש=77  ל=5555  ו=222  ם=44  ←  77 5555 222 44'],
  ['חשמל', 'ח=66  ש=77  מ=4  ל=5555  ←  66 77 4 5555'],
];

function KeyTable({ title, rows }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h2 className="mb-3">{title}</h2>
      <div className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 text-sm">
            <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">{k}</span>
            <span dir={title.includes('אנגלית') ? 'ltr' : 'rtl'} className="whitespace-pre">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function T9Guide() {
  return (
    <div className="space-y-4 pb-8">
      <h1>מדריך הקשות T9</h1>
      <p className="text-sm text-muted-foreground">כך מקלידים שמות והוצאות במקשי הטלפון, בקו הטלפוני.</p>
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="mb-2">כללים</h2>
        <ul className="list-disc pr-5 space-y-1 text-sm">
          {RULES.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </div>
      <KeyTable title="עברית" rows={HEBREW} />
      <KeyTable title="אנגלית (לכתובת מייל)" rows={ENGLISH} />
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="mb-2">דוגמאות</h2>
        <ul className="space-y-1 text-sm">
          {EXAMPLES.map(([name, how]) => <li key={name}><b>{name}</b>: {how}</li>)}
        </ul>
      </div>
    </div>
  );
}