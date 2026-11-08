import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { monthKey } from '@/lib/format';
import { isSpend } from '@/lib/categories';
import { onlyConfirmed } from '@/lib/txnStatus';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import GoalCard from '@/components/savings/GoalCard';
import GoalForm from '@/components/savings/GoalForm';
import useGoals from '@/components/savings/useGoals';

export default function SavingsGoals() {
  const { identity: ownerId } = useUserIdentity();
  const { goals, loading, reload } = useGoals(ownerId);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [monthlyExpense, setMonthlyExpense] = useState(0);

  // להצעת יעד קופת חירום: שלוש פעמים ההוצאה החודשית הנוכחית
  useEffect(() => {
    if (!ownerId) return;
    base44.entities.Transaction.filter({ owner_id: ownerId }, '-date', 1000).then((r) => {
      const all = onlyConfirmed(r.items || r).filter((t) => t.date?.startsWith(monthKey()) && isSpend(t));
      setMonthlyExpense(all.reduce((s, t) => s + (t.amount || 0), 0));
    });
  }, [ownerId]);

  const open = (goal) => {
    setEditing(goal);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1>קופות חיסכון</h1>
        <Button size="sm" onClick={() => open(null)}><Plus className="w-4 h-4 ml-1" />יעד חדש</Button>
      </div>
      {loading ? (
        <div className="h-24 bg-muted animate-pulse rounded-2xl" />
      ) : goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">עוד לא הוגדרו יעדים. לחצו על "יעד חדש" ובחרו תבנית מוכנה.</p>
      ) : (
        goals.map((g) => <GoalCard key={g.id} goal={g} ownerId={ownerId} onEdit={open} onChanged={reload} />)
      )}
      {formOpen && (
        <GoalForm key={editing?.id || 'new'} open={formOpen} onOpenChange={setFormOpen} ownerId={ownerId} goal={editing} monthlyExpense={monthlyExpense} onSaved={reload} />
      )}
    </div>
  );
}