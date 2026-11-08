import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GraduationCap, Loader2 } from 'lucide-react';

// מינוי והסרה של מאמנים (לפי כתובת מייל של משתמש רשום)
export default function CoachManager() {
  const [coaches, setCoaches] = useState([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const res = await base44.functions.invoke('coachApi', { action: 'list_coaches' });
    setCoaches(res.data.coaches || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setCoach = async (mail, value) => {
    setBusy(true);
    setMsg('');
    const res = await base44.functions.invoke('coachApi', { action: 'set_coach', email: mail, value }).catch((e) => e.response);
    if (res?.data?.ok) { setEmail(''); await load(); }
    else setMsg('לא נמצא משתמש רשום עם המייל הזה. המאמן צריך להירשם לאפליקציה קודם.');
    setBusy(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-luxe space-y-3">
      <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4" /><h2>מאמנים</h2></div>
      <div className="flex gap-2">
        <Input dir="ltr" placeholder="מייל של המאמן" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button disabled={busy || !email.trim()} onClick={() => setCoach(email, true)}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'מנה'}
        </Button>
      </div>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
      {coaches.map((c) => (
        <div key={c.id} className="flex items-center justify-between text-sm border-t border-border pt-2">
          <span dir="ltr">{c.email}</span>
          <button className="text-xs text-destructive" onClick={() => setCoach(c.email, false)}>הסר</button>
        </div>
      ))}
    </div>
  );
}