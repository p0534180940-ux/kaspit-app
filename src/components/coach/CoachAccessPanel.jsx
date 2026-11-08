import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// המשפחה מזינה קוד מאמן, רואה למי מדובר ומאשרת. אפשר לבטל בכל רגע.
export default function CoachAccessPanel({ identity, onBack }) {
  const [list, setList] = useState([]);
  const [code, setCode] = useState('');
  const [found, setFound] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await base44.functions.invoke('coachApi', { action: 'my_access', owner_id: identity });
    setList(res.data.access || []);
  }, [identity]);
  useEffect(() => { load(); }, [load]);

  const lookup = async () => {
    setBusy(true); setError(''); setFound(null);
    const res = await base44.functions.invoke('coachApi', { action: 'lookup', code }).catch((e) => e.response);
    if (res?.data?.ok) setFound(res.data.coach_name); else setError('קוד לא נמצא');
    setBusy(false);
  };
  const grant = async () => {
    setBusy(true);
    await base44.functions.invoke('coachApi', { action: 'grant', owner_id: identity, code });
    setCode(''); setFound(null); setBusy(false);
    load();
  };
  const revoke = async (id) => {
    await base44.functions.invoke('coachApi', { action: 'revoke', owner_id: identity, access_id: id });
    load();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">מאמן שתאשרו יראה, בקריאה בלבד: מאזן החודש, חריגות מהתקציב ותאריך הרישום האחרון. הוא לא יכול לערוך תנועות.</p>
      {list.map((a) => (
        <div key={a.id} className="flex items-center justify-between border border-border rounded-lg p-2 text-sm">
          <span>{a.coach_name}</span>
          <button className="text-xs text-destructive font-bold" onClick={() => revoke(a.id)}>בטל גישה</button>
        </div>
      ))}
      <Input dir="ltr" inputMode="numeric" placeholder="קוד מאמן" value={code} onChange={(e) => { setCode(e.target.value); setFound(null); setError(''); }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {found ? (
        <div className="space-y-2">
          <p className="text-sm">לאשר למאמן <b>{found}</b> גישת צפייה לנתוני התקציב שלכם?</p>
          <Button onClick={grant} disabled={busy} className="w-full">{busy && <Loader2 className="w-4 h-4 animate-spin" />}אני מאשר/ת</Button>
        </div>
      ) : (
        <Button onClick={lookup} disabled={busy || !code.trim()} className="w-full">{busy && <Loader2 className="w-4 h-4 animate-spin" />}בדוק קוד</Button>
      )}
      <Button variant="outline" onClick={onBack} className="w-full">חזרה</Button>
    </div>
  );
}