import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pencil, Trash2, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { goalStats } from '@/lib/savings';
import { hebrewDateLabel, gregorianLabel } from '@/lib/hebrewCalendar';
import AddToGoalDialog from '@/components/savings/AddToGoalDialog';

export default function GoalCard({ goal, ownerId, compact, onEdit, onChanged }) {
  const [adding, setAdding] = useState(false);
  const s = goalStats(goal);

  const remove = async () => {
    if (!window.confirm(`למחוק את היעד "${goal.name}"?`)) return;
    await base44.entities.SavingsGoal.delete(goal.id);
    onChanged();
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-luxe p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm">{goal.name}</p>
          <p className="text-[11px] text-muted-foreground">{hebrewDateLabel(goal.target_date)} ({gregorianLabel(goal.target_date)})</p>
        </div>
        {!compact && (
          <div className="flex">
            <Button size="icon" variant="ghost" onClick={() => onEdit(goal)} aria-label="עריכה"><Pencil className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={remove} aria-label="מחיקה"><Trash2 className="w-4 h-4" /></Button>
          </div>
        )}
      </div>
      <Progress value={s.pct} className="h-2.5" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>נחסך {formatCurrency(goal.saved_amount || 0)} מתוך {formatCurrency(goal.target_amount)} ({s.pct}%)</span>
      </div>
      <p className="text-xs font-semibold">
        {s.done ? '✓ היעד הושג!' : s.overdue ? `התאריך עבר. חסרים ${formatCurrency(s.remaining)}` : `לחסוך ${formatCurrency(s.monthly)} בחודש, במשך ${s.months} חודשים`}
      </p>
      {!s.done && (
        <Button size="sm" variant="outline" className="w-full" onClick={() => setAdding(true)}>
          <PiggyBank className="w-4 h-4 ml-2" />הוספה לקופה
        </Button>
      )}
      {adding && <AddToGoalDialog open={adding} onOpenChange={setAdding} ownerId={ownerId} goal={goal} suggested={s.monthly} onSaved={onChanged} />}
    </div>
  );
}