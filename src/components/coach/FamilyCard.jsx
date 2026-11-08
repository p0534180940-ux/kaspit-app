import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import NotesBox from '@/components/coach/NotesBox';

// כרטיס משפחה באזור המאמן: קריאה בלבד, ללא עריכת תנועות
export default function FamilyCard({ family, onChanged }) {
  const { stats, owner_id, notes } = family;
  const flagged = stats.alerts.inactive || stats.alerts.overspend;
  const last = stats.lastEntry ? new Date(stats.lastEntry).toLocaleDateString('he-IL') : 'עוד לא נרשם דבר';

  return (
    <div className={`bg-card rounded-2xl border p-4 shadow-luxe space-y-3 ${flagged ? 'border-destructive/50' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <h2 dir="ltr">{owner_id}</h2>
        <span className="text-xs text-muted-foreground">רישום אחרון: {last}</span>
      </div>

      {flagged && (
        <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-2 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            {stats.alerts.inactive && <p>לא נרשם דבר {stats.daysSince} ימים</p>}
            {stats.alerts.overspend && <p>חריגה של {stats.overallOverPct}% מהתקציב החודשי</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div><p className="text-[11px] text-muted-foreground">הכנסות</p><p className="font-bold" dir="ltr">{formatCurrency(stats.income)}</p></div>
        <div><p className="text-[11px] text-muted-foreground">הוצאות</p><p className="font-bold" dir="ltr">{formatCurrency(stats.expense)}</p></div>
        <div><p className="text-[11px] text-muted-foreground">מאזן</p><p className={`font-bold ${stats.balance < 0 ? 'text-destructive' : ''}`} dir="ltr">{formatCurrency(stats.balance)}</p></div>
      </div>

      <div>
        <p className="text-xs font-bold text-muted-foreground mb-1">קטגוריות בחריגה</p>
        {stats.overCategories.length === 0 ? <p className="text-sm">אין חריגות החודש</p> : stats.overCategories.map((c) => (
          <p key={c.category} className="text-sm flex justify-between">
            <span>{c.label}</span>
            <span className={c.overPct > 20 ? 'text-destructive font-bold' : ''} dir="ltr">{c.actual.toLocaleString('he-IL')} / {c.planned.toLocaleString('he-IL')} (+{c.overPct}%)</span>
          </p>
        ))}
      </div>

      <NotesBox ownerId={owner_id} notes={notes} onChanged={onChanged} />
    </div>
  );
}