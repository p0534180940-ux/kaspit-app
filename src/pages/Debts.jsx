import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import useDebts from '@/components/debts/useDebts';
import DebtRow from '@/components/debts/DebtRow';
import DebtForm from '@/components/debts/DebtForm';
import RepayDialog from '@/components/debts/RepayDialog';
import { sumBalance, isTithe } from '@/lib/debts';
import { formatCurrency } from '@/lib/format';
import { Plus, Loader2 } from 'lucide-react';

function Section({ title, total, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2>{title}</h2>
        <span className="font-bold text-sm" dir="ltr">{formatCurrency(total)}</span>
      </div>
      {children}
    </div>
  );
}

export default function Debts() {
  const { identity } = useUserIdentity();
  const { debts, loading, reload } = useDebts();
  const [formDebt, setFormDebt] = useState(undefined);
  const [repayDebt, setRepayDebt] = useState(null);

  const open = debts.filter((d) => !d.settled && !isTithe(d));
  const mine = open.filter((d) => d.direction === 'owe');
  const theirs = open.filter((d) => d.direction === 'owed');
  const tithe = debts.filter((d) => !d.settled && isTithe(d)).reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const remove = async (d) => {
    if (!window.confirm(`למחוק את החוב ל${d.person}?`)) return;
    await base44.entities.Debt.delete(d.id);
    reload();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <h1>חובות והלוואות</h1>
        <button onClick={() => setFormDebt(null)} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />חדש
        </button>
      </div>

      <Section title="אני חייב" total={sumBalance(debts, 'owe')}>
        {mine.length === 0 && <p className="text-sm text-muted-foreground">אין חובות פתוחים.</p>}
        {mine.map((d) => <DebtRow key={d.id} debt={d} onRepay={setRepayDebt} onEdit={setFormDebt} onDelete={remove} />)}
        {tithe > 0 && <p className="text-xs text-muted-foreground">הסכום כולל מעשרות שטרם שולמו: {formatCurrency(tithe)} (מתעדכן אוטומטית מכרטיס המעשרות).</p>}
      </Section>

      <Section title="חייבים לי" total={sumBalance(debts, 'owed')}>
        {theirs.length === 0 && <p className="text-sm text-muted-foreground">אין חובות פתוחים.</p>}
        {theirs.map((d) => <DebtRow key={d.id} debt={d} onRepay={setRepayDebt} onEdit={setFormDebt} onDelete={remove} />)}
      </Section>

      <DebtForm open={formDebt !== undefined} debt={formDebt} ownerId={identity} onClose={() => setFormDebt(undefined)} onSaved={reload} />
      <RepayDialog open={!!repayDebt} debt={repayDebt} ownerId={identity} onClose={() => setRepayDebt(null)} onDone={reload} />
    </div>
  );
}