import { useState } from 'react';
import { useUserIdentity, clearIdentity } from '@/lib/userIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2, AlertCircle } from 'lucide-react';

export default function AccountLock({ identity }) {
  const { verifyPassword, unlock, removePassword } = useUserIdentity();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!pin) return;
    if (verifyPassword(identity, pin)) {
      unlock();
    } else {
      setError('סיסמה שגויה. נסה שוב.');
      setPin('');
    }
  };

  const resetAccount = () => {
    setBusy(true);
    removePassword(identity);
    clearIdentity();
  };

  if (showReset) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="font-heading font-bold text-xl">איפוס חשבון</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            שכחת את הסיסמה? איפוס ימחק את הסיסמה וינתק את המכשיר מהחשבון. תצטרך להיכנס מחדש עם אותו קוד/טלפון כדי לראות את הנתונים שוב.
          </p>
          <div className="flex gap-2">
            <Button onClick={resetAccount} disabled={busy} variant="destructive" className="flex-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              אפס והתנתק
            </Button>
            <Button variant="outline" onClick={() => setShowReset(false)} className="px-4">ביטול</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow-gold">
            <Lock className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="font-heading font-bold text-2xl">חשבון נעול</h2>
          <p className="text-sm text-muted-foreground mt-1">הזן את הסיסמה כדי לפתוח</p>
        </div>

        <Input
          type="password"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="••••"
          className="h-14 text-center text-2xl font-bold tracking-widest"
          dir="ltr"
          autoFocus
        />

        {error && <p className="text-sm text-destructive text-center -mt-2">{error}</p>}

        <Button
          onClick={submit}
          disabled={!pin}
          className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base rounded-xl"
          size="lg"
        >
          פתח חשבון
        </Button>

        <button
          onClick={() => setShowReset(true)}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1"
        >
          שכחת סיסמה? איפוס חשבון
        </button>
      </div>
    </div>
  );
}