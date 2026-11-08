import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import useAppUser from '@/lib/useAppUser';
import FamilyCard from '@/components/coach/FamilyCard';
import { GraduationCap, Loader2, LogOut, Home } from 'lucide-react';

export default function Coach() {
  const user = useAppUser();
  const [profile, setProfile] = useState(null);
  const [families, setFamilies] = useState(null);

  const load = useCallback(async () => {
    const [p, f] = await Promise.all([
      base44.functions.invoke('coachApi', { action: 'my_profile' }),
      base44.functions.invoke('coachApi', { action: 'families' }),
    ]);
    setProfile(p.data);
    setFamilies(f.data.families);
  }, []);

  useEffect(() => { if (user?.is_coach) load(); }, [user, load]);

  if (!user) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!user.is_coach) {
    return (
      <div className="max-w-sm mx-auto mt-20 text-center space-y-2 px-4" dir="rtl">
        <h1>אזור מאמן</h1>
        <p className="text-sm text-muted-foreground">החשבון הזה אינו מוגדר כמאמן. מנהל המערכת יכול להגדיר אותו.</p>
        <Link to="/" className="text-primary text-sm underline">חזרה לאפליקציה</Link>
      </div>
    );
  }

  const flaggedCount = (families || []).filter((f) => f.stats.alerts.inactive || f.stats.alerts.overspend).length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold"><GraduationCap className="w-5 h-5" />אזור מאמן</div>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="flex items-center gap-1 text-muted-foreground"><Home className="w-4 h-4" />לאפליקציה</Link>
            <button onClick={() => base44.auth.logout()} className="flex items-center gap-1 text-muted-foreground"><LogOut className="w-4 h-4" />יציאה</button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {profile && (
          <div className="bg-card border border-border rounded-2xl p-4 shadow-luxe">
            <p className="text-sm text-muted-foreground">קוד המאמן שלך. משפחה שמזינה אותו בהגדרות ומאשרת, תופיע כאן:</p>
            <p className="text-3xl font-bold tracking-widest mt-1" dir="ltr">{profile.code}</p>
          </div>
        )}
        {!families ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
          <>
            <h1>משפחות {flaggedCount > 0 && <span className="text-sm text-destructive">({flaggedCount} דורשות תשומת לב)</span>}</h1>
            {families.length === 0 && <p className="text-sm text-muted-foreground">עדיין אין משפחות שאישרו לך גישה.</p>}
            {[...families].sort((a, b) => Number(b.stats.alerts.inactive || b.stats.alerts.overspend) - Number(a.stats.alerts.inactive || a.stats.alerts.overspend)).map((f) => (
              <FamilyCard key={f.access_id} family={f} onChanged={load} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}