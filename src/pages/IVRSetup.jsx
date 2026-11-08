import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { PhoneCall, Download, Smartphone, CheckCircle2, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Hash, Volume2, FileText, UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { YEMOT_SYSTEM_NUMBER, RECORD_BRANCHES, INFO_BRANCHES } from '@/lib/yemotIvr';
import TlivrSetupCard from '@/components/TlivrSetupCard';

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative bg-slate-900 rounded-lg p-3 mt-1">
      <button onClick={copy} className="absolute top-2 left-2 text-white/40 hover:text-white">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="text-[11px] text-green-300 font-mono whitespace-pre-wrap break-all pr-6" dir="ltr">{code}</pre>
    </div>
  );
}

function BranchCard({ branch, isOpen, onToggle }) {
  const ini = `type=record\ntitle=${branch.prompt}\nrecord_ok_say=נרשם בהצלחה, תודה רבה\nrecord_hangup=yes`;
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-luxe">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="font-bold text-lg text-primary">{branch.path}</span>
        </div>
        <div className="flex-1 text-right">
          <p className="font-semibold text-sm">{branch.label}</p>
          <p className="text-[11px] text-muted-foreground">שלוחת הקלטה — קולית או הקשה</p>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            בתיקייה <code className="bg-muted px-1 rounded">/ivr2/{branch.path}</code>, צור קובץ <code className="bg-muted px-1 rounded">ivr.ini</code>:
          </p>
          <CodeBlock code={ini} />
        </div>
      )}
    </div>
  );
}

function InfoBranchCard({ branch }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border shadow-luxe">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <span className="font-bold text-lg text-muted-foreground">{branch.path}</span>
      </div>
      <div className="flex-1 text-right">
        <p className="font-semibold text-sm">{branch.label}</p>
        <p className="text-[11px] text-muted-foreground">{branch.desc}</p>
      </div>
      {branch.path === '4' ? <Volume2 className="w-4 h-4 text-muted-foreground" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
    </div>
  );
}

const T9_MAP = [
  { key: '1', letters: 'א ב ג' },
  { key: '2', letters: 'ד ה ו' },
  { key: '3', letters: 'ז ח ט' },
  { key: '4', letters: 'י כ ל' },
  { key: '5', letters: 'מ נ ס' },
  { key: '6', letters: 'ע פ צ' },
  { key: '7', letters: 'ק ר ש' },
  { key: '8', letters: 'ת ן ם' },
  { key: '9', letters: 'ץ ף ך' },
];

export default function IVRSetup() {
  const [openBranch, setOpenBranch] = useState(null);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState(null);
  const { toast } = useToast();

  const pushConfig = async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await base44.functions.invoke('pushIvrConfig', {});
      const data = res?.data || res;
      if (data?.success) {
        toast({ title: 'ההגדרות נדחפו בהצלחה', description: `${data.pushed} מתוך ${data.total} קבצים הועלו לימות המשיח` });
        setPushResult({ ok: true, pushed: data.pushed, total: data.total });
      } else {
        const errMsg = data?.error || 'חלק מהקבצים נכשלו';
        toast({ title: 'דחיפה חלקית', description: errMsg, variant: 'destructive' });
        setPushResult({ ok: false, detail: data });
      }
    } catch (e) {
      toast({ title: 'דחיפה נכשלה', description: e?.message || 'נסה שנית', variant: 'destructive' });
      setPushResult({ ok: false, detail: { error: e?.message } });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="space-y-5">
      <TlivrSetupCard />

      {/* Phone number hero */}
      <div className="relative overflow-hidden gradient-primary text-primary-foreground rounded-3xl p-6 shadow-luxe">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/8 rounded-full" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80 font-medium">מספר הקו הטלפוני</p>
            <p className="text-3xl font-heading font-bold mt-1 tracking-tight" dir="ltr">{YEMOT_SYSTEM_NUMBER}</p>
            <p className="text-xs opacity-70 mt-2">חייגו, הקישו שלוחה, והקליטו</p>
          </div>
          <PhoneCall className="w-9 h-9 opacity-25" />
        </div>
      </div>

      {/* Menu structure */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-luxe">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full gradient-primary" />
          <h2 className="font-heading font-bold text-lg">מבנה התפריט</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40"><span className="w-6 h-6 rounded bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span><span className="text-sm font-medium">זיהוי אישי</span></div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40"><span className="w-6 h-6 rounded bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span><span className="text-sm font-medium">רישום הוצאה</span></div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40"><span className="w-6 h-6 rounded bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span><span className="text-sm font-medium">רישום הכנסה</span></div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40"><span className="w-6 h-6 rounded bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">4</span><span className="text-sm font-medium">שמיעת נתונים</span></div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40"><span className="w-6 h-6 rounded bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">5</span><span className="text-sm font-medium">דוחות</span></div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-emerald-900">מצב פשוט — ללא שרת</p>
          <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
            הטלפון רק מקליט. כשפותחים את האפליקציה, לוחצים על "סנכרון הקלטות" ובוחרים את קבצי ההקלטות — האפליקציה מתעתקת (Whisper) ושומרת אותן אוטומטית, ולומדת לסווג לפי היסטוריית התיאורים.
          </p>
        </div>
      </div>

      {/* Record branches */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full gradient-primary" />
          <h2 className="font-heading font-bold text-lg">שלוחות הקלטה (1–3)</h2>
        </div>
        <div className="space-y-2">
          {RECORD_BRANCHES.map((b) => (
            <BranchCard
              key={b.path}
              branch={b}
              isOpen={openBranch === b.path}
              onToggle={() => setOpenBranch(openBranch === b.path ? null : b.path)}
            />
          ))}
        </div>
      </div>

      {/* Info branches */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full gradient-primary" />
          <h2 className="font-heading font-bold text-lg">שלוחות השמעה ודיווח (4–5)</h2>
        </div>
        <div className="space-y-2">
          {INFO_BRANCHES.map((b) => (
            <InfoBranchCard key={b.path} branch={b} />
          ))}
        </div>
      </div>

      {/* T9 keypress */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-luxe">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-base">הקשה למי שאינו יכול לדבר</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          עבור טלפונים כשרים ומצבים שקטים (למשל באוטובוס): כל מקש מייצג 3 אותיות, בדומה למודם T9. הקשת ספרות ברצף מאפשרת רישום ללא דיבור.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
          {T9_MAP.map((t) => (
            <div key={t.key} className="flex flex-col items-center bg-muted/40 rounded-lg py-2">
              <span className="font-bold text-base text-foreground">{t.key}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{t.letters}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          דוגמה: "100" מוקש → סכום. לאחר מכן הקשת קוד קטגוריה מספרי. השיבוץ לקטגוריות נעשה ע"י המערכת לפי היסטוריית השימוש.
        </p>
      </div>

      {/* Main menu */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full gradient-primary" />
          <h2 className="font-heading font-bold text-lg">התפריט הראשי</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          בשלוחה הראשית, צור קובץ <code className="bg-muted px-1 rounded">ivr.ini</code>:
        </p>
        <CodeBlock code={`type=menu\n1=1\n2=2\n3=3\n4=4\n5=5\ntitle=כספית, המאמן הכלכלי`} />
      </div>

      {/* Push to Yemot */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-luxe">
        <div className="flex items-center gap-2 mb-2">
          <UploadCloud className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-base">דחיפה אוטומטית לחשבון ימות המשיח</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          לחיצה על הכפתור תעלה את כל קבצי ה-ivr.ini (התפריט הראשי + 5 השלוחות) ישירות לחשבון ימות המשיח שלך דרך ה-API, ללא צורך בהגדרה ידנית.
        </p>
        <button
          onClick={pushConfig}
          disabled={pushing}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {pushing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          {pushing ? 'דוחף הגדרות...' : 'דחוף הגדרות לימות המשיח'}
        </button>
        {pushResult?.ok && (
          <div className="mt-3 flex items-center gap-2 text-xs text-income bg-income/10 rounded-lg p-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>ההגדרות נדחפו בהצלחה — {pushResult.pushed} מתוך {pushResult.total} קבצים. חייגו לקו כדי לבדוק.</span>
          </div>
        )}
        {pushResult && !pushResult.ok && (
          <div className="mt-3 flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>הדחיפה נכשלה. ודא שהמפתח YEMOT_API_KEY תקין ושיש לחשבון מערכת תוכן (ivr2).</span>
          </div>
        )}
      </div>

      {/* How to get recordings */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-luxe">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-base">איך מורידים את ההקלטות</h2>
        </div>
        <ol className="space-y-2 text-xs text-muted-foreground leading-relaxed list-decimal pr-4">
          <li>
            היכנסו לאתר{' '}
            <a href="https://www.call2all.co.il" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
              call2all.co.il <ExternalLink className="w-3 h-3" />
            </a>{' '}
            והתחברו
          </li>
          <li>פתחו: ניהול קבצים ← מערכת תוכן (ivr2)</li>
          <li>פתחו את התיקיות <code className="bg-muted px-1 rounded">1</code> (זיהוי), <code className="bg-muted px-1 rounded">2</code> (הוצאות), <code className="bg-muted px-1 rounded">3</code> (הכנסות)</li>
          <li>הורידו את קבצי ההקלטות (.wav) למכשיר</li>
        </ol>
      </div>

      {/* Sync in app */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-luxe">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-base">סנכרון באפליקציה</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          בעמוד הבית של האפליקציה, לחצו על "סנכרון הקלטות טלפון", בחרו את הקבצים שהורדתם — והאפליקציה תתעתק ותרשום אותם אוטומטית כעסקאות, ותלמד לשייך תיאורים לקטגוריות.
        </p>
      </div>
    </div>
  );
}