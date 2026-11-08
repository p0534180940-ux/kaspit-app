import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { clearIdentity } from '@/lib/userIdentity';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';

const WORD = 'מחק';

// מחיקת החשבון וכל הנתונים, באישור כפול: סימון הבנה, ואז הקלדת המילה "מחק"
export default function DeleteAccountPanel({ identity, onBack }) {
  const [step, setStep] = useState(1);
  const [understood, setUnderstood] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    const res = await base44.functions.invoke('accountData', { action: 'delete_all', owner_id: identity }).catch((e) => e.response);
    if (!res?.data?.ok) { setError('המחיקה נכשלה. נסו שוב.'); setBusy(false); return; }
    Object.keys(localStorage).filter((k) => k.startsWith('kaspit_') || k.startsWith('kasplit_')).forEach((k) => localStorage.removeItem(k));
    clearIdentity();
    base44.auth.logout();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>המחיקה סופית. כל התנועות, התקציבים, החובות, היעדים וההגדרות יימחקו ולא ניתן לשחזר אותם. כדאי לייצא את הנתונים קודם.</p>
      </div>
      {step === 1 ? (
        <>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            אני מבין/ה שכל הנתונים שלי יימחקו לצמיתות
          </label>
          <Button variant="destructive" className="w-full" disabled={!understood} onClick={() => setStep(2)}>המשך</Button>
        </>
      ) : (
        <>
          <p className="text-sm">לאישור סופי, הקלידו <b>{WORD}</b>:</p>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="destructive" className="w-full" disabled={busy || typed.trim() !== WORD} onClick={run}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}מחיקת החשבון וכל הנתונים
          </Button>
        </>
      )}
      <Button variant="outline" onClick={onBack} className="w-full">חזרה</Button>
    </div>
  );
}