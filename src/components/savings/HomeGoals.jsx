import { Link } from 'react-router-dom';
import { useUserIdentity } from '@/lib/userIdentity';
import { goalStats } from '@/lib/savings';
import GoalCard from '@/components/savings/GoalCard';
import useGoals from '@/components/savings/useGoals';
import { PiggyBank } from 'lucide-react';

// שלושת היעדים הקרובים (שטרם הושגו)
export default function HomeGoals() {
  const { identity: ownerId } = useUserIdentity();
  const { goals, loading, reload } = useGoals(ownerId);
  if (loading) return null;
  const upcoming = goals.filter((g) => !goalStats(g).done).slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-base flex items-center gap-2"><PiggyBank className="w-4 h-4" />קופות חיסכון</h2>
        <Link to="/savings" className="text-xs text-primary font-semibold">{goals.length ? 'לכל היעדים' : 'הגדרת יעד'}</Link>
      </div>
      {upcoming.length === 0 && (
        <p className="text-xs text-muted-foreground">אין יעדי חיסכון פעילים. אפשר להוסיף יעד לפסח, לראש השנה, לחתונה ועוד.</p>
      )}
      {upcoming.map((g) => <GoalCard key={g.id} goal={g} ownerId={ownerId} compact onChanged={reload} />)}
    </div>
  );
}