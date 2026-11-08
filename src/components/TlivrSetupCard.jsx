import { useState } from 'react';
import { Copy, Check, PhoneCall, ExternalLink } from 'lucide-react';

const WEBHOOK_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/tlivrWebhook?key=המפתח-שלך';

const STEPS = [
  { title: 'התחברו לממשק המרכזיה', desc: 'היכנסו ל-app.tlivr.com עם פרטי החשבון של המספר 0765674942.' },
  { title: 'פתחו את השלוחה הראשית', desc: 'תפריט "שלוחות" / "עץ שלוחות" ← בחרו את השלוחה הראשית (השלוחה שאליה נכנס המתקשר מיד).' },
  { title: 'שנו את סוג השלוחה ל-API', desc: 'בחרו בסוג שלוחה "API" (או "מודול API / שרת חיצוני"). זה הסוג שבו המרכזיה שואלת את השרת שלנו מה לעשות בכל שלב.' },
  { title: 'הדביקו את כתובת ה-API', desc: 'העתיקו את הכתובת שלמטה, החליפו "המפתח-שלך" במפתח ה-API שלכם מהמרכזיה, והדביקו בשדה הכתובת.' },
  { title: 'שמרו וחייגו לבדיקה', desc: 'לחצו שמירה, חייגו למספר והקישו 3 לשמיעת היתרה — אם נשמע סיכום, החיבור עובד.' },
];

const MENU = [
  { key: '1', label: 'רישום הוצאה בדיבור', desc: 'אומרים "מאה שקל ברמי לוי" — המערכת מתמללת, מזהה סכום וקטגוריה ושומרת.' },
  { key: '2', label: 'רישום הכנסה בדיבור', desc: 'אומרים "משכורת שמונת אלפים שקל" — נרשם כהכנסה.' },
  { key: '3', label: 'שמיעת היתרה החודשית', desc: 'המערכת מקריאה יתרה, סך הכנסות וסך הוצאות לחודש הנוכחי.' },
  { key: '4', label: 'סיכום השבוע', desc: 'סך ההוצאות ומספר העסקאות בשבעת הימים האחרונים.' },
];

export default function TlivrSetupCard() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-2xl border-2 border-primary/40 p-5 shadow-luxe space-y-4">
      <div className="flex items-center gap-2">
        <PhoneCall className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-base">חיבור המרכזיה החדשה (tlivr) — 0765674942</h2>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        במרכזיה הזו אין העלאת קבצי הגדרות: המתקשר נכנס לשלוחה, המרכזיה שולחת בקשה לשרת של כספית, והשרת מחזיר לה בזמן אמת מה להשמיע, מה לבקש ומה להקליט. כל התפריט כבר בנוי בצד שלנו — נשאר רק להצביע מהמרכזיה על הכתובת.
      </p>

      <div>
        <p className="text-xs font-semibold mb-2">מה יקרה למתקשר</p>
        <div className="space-y-1.5">
          {MENU.map((m) => (
            <div key={m.key} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40">
              <span className="w-6 h-6 rounded bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{m.key}</span>
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          הזיהוי אוטומטי לפי מספר הטלפון של המתקשר — אין צורך להקיש קוד אישי, והעסקה נשמרת לחשבון שמחובר לאותו מספר.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">מה צריך לעשות בממשק המרכזיה (פעם אחת)</p>
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1">כתובת ה-API להדבקה</p>
        <div className="relative bg-slate-900 rounded-lg p-3">
          <button onClick={copy} className="absolute top-2 left-2 text-white/40 hover:text-white">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <pre className="text-[11px] text-green-300 font-mono whitespace-pre-wrap break-all pr-6" dir="ltr">{WEBHOOK_URL}</pre>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          המפתח בסוף הכתובת הוא שכבת האבטחה — בלעדיו השרת דוחה כל בקשה, כך שאף אחד חיצוני לא יכול לרשום עסקאות.
        </p>
      </div>

      <a
        href="https://app.tlivr.com/apiModuleDocs.html"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        תיעוד ה-API של הספק <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}