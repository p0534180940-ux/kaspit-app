import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, Hash, LogOut, PhoneCall, TrendingUp, BarChart3, ShieldCheck, ChevronLeft, Wallet, Lock } from 'lucide-react';
import Onboarding from '@/components/Onboarding';
import AccountLock from '@/components/AccountLock';

function normalizePhone(phone) {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('972')) p = '0' + p.slice(3);
  if (p.startsWith('00972')) p = '0' + p.slice(5);
  return p;
}

export function IdentityBadge() {
  const { identity, clearIdentity } = useUserIdentity();
  if (!identity) return null;
  return (
    <button
      onClick={() => { clearIdentity(); base44.auth.logout(); }}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="התנתק"
    >
      <span className="truncate max-w-24 hidden sm:inline">{identity}</span>
      <LogOut className="w-3.5 h-3.5" />
    </button>
  );
}

const FEATURES = [
  { icon: PhoneCall, color: '#16a34a', title: 'רישום מהיר וחכם', desc: 'כתבו בשפה טבעית "100 שח ברמי לוי" והמערכת תרשום אוטומטית' },
  { icon: TrendingUp, color: '#2563eb', title: 'מאמן כלכלי אישי', desc: 'קבלו ייעוץ מותאם אישית, זיהוי חריגות והמלצות לשיפור' },
  { icon: BarChart3, color: '#7c3aed', title: 'דו"חות חכמים', desc: 'גרפים וניתוחים שמראים בדיוק לאן הולך כל שקל' },
  { icon: ShieldCheck, color: '#ea580c', title: 'אנונימיות מלאה', desc: 'המערכת לא שואלת שמות או פרטים מזהים — הפרטיות שלכם קודמת' },
];

export default function IdentityGate({ children }) {
  const { identity, setIdentity, clearIdentity, onboarded, setOnboarded, hasPassword, verifyPassword, setPassword, isUnlocked, unlock } = useUserIdentity();
  const [value, setValue] = useState('');
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState('phone');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [ready, setReady] = useState(false);

  // אם המשתמש כבר מילא בעבר קבועים (גם ממכשיר אחר) — אין צורך להציג שוב את שלב המילוי
  useEffect(() => {
    if (!identity || onboarded) return;
    let cancelled = false;
    setCheckingOnboarding(true);
    base44.entities.Budget.filter({ owner_id: identity }, '-created_date', 1)
      .then((rows) => {
        if (cancelled) return;
        if (rows.length > 0) setOnboarded(true);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCheckingOnboarding(false); });
    return () => { cancelled = true; };
  }, [identity, onboarded, setOnboarded]);

  // הזהות קשורה לחשבון המייל: בכניסה מחשבון אחר או ממכשיר חדש היא נטענת מהחשבון
  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        if (u?.owner_identity && u.owner_identity !== identity) setIdentity(u.owner_identity);
        else if (!u?.owner_identity && identity) {
          const res = await base44.functions.invoke('linkIdentity', { identity }).catch(() => null);
          if (!res?.data?.ok) clearIdentity();
        }
      } catch {} finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const locked = identity && hasPassword(identity) && !isUnlocked();

  if (locked) return <AccountLock identity={identity} />;
  if (identity && checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (identity && !onboarded) return <Onboarding />;
  if (identity) return children;

  const handleSubmit = async () => {
    const v = mode === 'phone' ? normalizePhone(value) : value.trim();
    if (v.length < 5 || pin.length < 4) return;
    const res = await base44.functions.invoke('linkIdentity', { identity: v }).catch(() => null);
    if (!res?.data?.ok) {
      setError('המזהה הזה כבר משויך למשתמש אחר, או שאירעה שגיאה.');
      return;
    }
    if (hasPassword(v)) {
      if (!verifyPassword(v, pin)) {
        setError('הסיסמה שגויה. נסו שוב.');
        setPin('');
        return;
      }
      unlock();
    } else {
      setPassword(v, pin);
    }
    setError('');
    setIdentity(v);
  };

  if (showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-5">
          <button onClick={() => setShowForm(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
            חזרה
          </button>
          <div className="text-center">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow-gold">
              <Wallet className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="font-heading font-bold text-2xl">כספית</h2>
            <p className="text-sm text-muted-foreground mt-1">המאמן הכלכלי שלך</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode('phone')}
              className={`flex-1 h-11 rounded-xl border-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'phone' ? 'border-primary bg-primary/10 text-foreground font-semibold' : 'border-border text-muted-foreground'
              }`}
            >
              <Phone className="w-4 h-4" />
              טלפון
            </button>
            <button
              onClick={() => setMode('id')}
              className={`flex-1 h-11 rounded-xl border-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'id' ? 'border-primary bg-primary/10 text-foreground font-semibold' : 'border-border text-muted-foreground'
              }`}
            >
              <Hash className="w-4 h-4" />
              קוד אישי
            </button>
          </div>

          <div className="space-y-2">
            <Input
              type={mode === 'phone' ? 'tel' : 'text'}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder={mode === 'phone' ? '050-1234567' : 'קוד אישי'}
              className="h-14 text-center text-xl font-bold"
              dir="ltr"
              autoFocus
            />
            <Input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="סיסמה (4-8 ספרות)"
              className="h-14 text-center text-xl font-bold tracking-[0.4em]"
              dir="ltr"
            />
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              הסיסמה נשמרת במכשיר שלכם בלבד ומגנה על הנתונים
            </p>
          </div>

          {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={value.trim().length < 5 || pin.length < 4}
            className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-bold rounded-xl"
            size="lg"
          >
            כניסה למערכת
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto" dir="rtl">
      {/* Hero */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-6 pt-14 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-5">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="text-primary text-sm font-extrabold">כספית</span>
        </div>
        <h1 className="font-heading font-extrabold text-3xl leading-tight mb-3">
          המאמן הכלכלי<br />האישי שלך
        </h1>
        <p className="text-white/70 text-base leading-relaxed max-w-xs mx-auto mb-8">
          נהלו את התקציב המשפחתי בקלות — רישום מהיר, דו"חות חכמים וייעוץ מותאם אישית
        </p>
        <Button
          onClick={() => setShowForm(true)}
          className="h-14 px-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg rounded-2xl shadow-glow-gold"
          size="lg"
        >
          כניסה / הצטרפות
        </Button>
        <p className="text-white/50 text-xs mt-3">ללא הרשמה · ללא פרטים אישיים</p>
      </div>

      {/* Features */}
      <div className="px-5 py-7 space-y-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3 shadow-luxe">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: f.color + '18' }}>
                <Icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <div>
                <p className="font-bold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-10">
        <Button
          onClick={() => setShowForm(true)}
          className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg rounded-2xl"
          size="lg"
        >
          התחילו עכשיו — בחינם
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          ללא הרשמה · אנונימי לחלוטין
        </p>
        <p className="text-center text-xs mt-4 space-x-3 space-x-reverse">
          <a href="/privacy" className="text-primary underline">מדיניות פרטיות</a>
          <a href="/terms" className="text-primary underline">תנאי שימוש</a>
          <a href="/coach" className="text-primary underline">כניסת מאמן</a>
        </p>
      </div>
    </div>
  );
}