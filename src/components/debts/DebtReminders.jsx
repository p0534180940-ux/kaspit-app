import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { daysUntil, formatDate, typeOf } from '@/lib/debts';
import { formatCurrency } from '@/lib/format';

// תזכורת במסך הבית: החזרים שמועדם בתוך 3 ימים (או שחלף)
export default function DebtReminders({ debts }) {
  const due = debts
    .filter((d) => !d.settled && d.next_payment_date && daysUntil(d.next_payment_date) <= 3)
    .sort((a, b) => a.next_payment_date.localeCompare(b.next_payment_date));
  if (!due.length) return null;
  return (
    <Link to="/debts" className="block bg-expense/10 border border-expense/30 rounded-xl p-3 space-y-1.5">
      <div className="flex items-center gap-2 font-bold text-sm"><BellRing className="w-4 h-4 text-expense" />תזכורת החזרים</div>
      {due.map((d) => {
        const days = daysUntil(d.next_payment_date);
        const when = days < 0 ? 'באיחור' : days === 0 ? 'היום' : `בעוד ${days} ימים`;
        return (
          <p key={d.id} className="text-sm">
            {typeOf(d).direction === 'owed' ? 'לקבל מ' : 'להחזיר ל'}{d.person}: {formatCurrency(d.monthly_payment || d.amount)}, {formatDate(d.next_payment_date)} ({when})
          </p>
        );
      })}
    </Link>
  );
}