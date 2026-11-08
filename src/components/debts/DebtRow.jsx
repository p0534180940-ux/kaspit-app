import { Pencil, Trash2, Wallet } from 'lucide-react';
import { typeOf, daysUntil, formatDate } from '@/lib/debts';
import { formatCurrency } from '@/lib/format';

export default function DebtRow({ debt, onRepay, onEdit, onDelete }) {
  const type = typeOf(debt);
  const days = daysUntil(debt.next_payment_date);
  const soon = days !== null && days <= 3 && !debt.settled;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-luxe space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm">{debt.person || 'ללא שם'}</p>
          <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full">{type.label}</span>
        </div>
        <div className="text-left">
          <p className="font-bold" dir="ltr">{formatCurrency(debt.amount)}</p>
          {debt.original_amount > 0 && <p className="text-[11px] text-muted-foreground">מתוך {formatCurrency(debt.original_amount)}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {debt.monthly_payment > 0 && <span>החזר חודשי: {formatCurrency(debt.monthly_payment)}</span>}
        {debt.next_payment_date && (
          <span className={soon ? 'text-destructive font-bold' : ''}>
            החזר הבא: {formatDate(debt.next_payment_date)}{soon ? (days < 0 ? ' (באיחור)' : days === 0 ? ' (היום)' : ` (בעוד ${days} ימים)`) : ''}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onRepay(debt)} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5">
          <Wallet className="w-4 h-4" />{type.direction === 'owed' ? 'קיבלתי תשלום' : 'רשום החזר'}
        </button>
        <button onClick={() => onEdit(debt)} className="w-9 h-9 rounded-lg border border-input flex items-center justify-center" aria-label="עריכה"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => onDelete(debt)} className="w-9 h-9 rounded-lg border border-destructive/30 text-destructive flex items-center justify-center" aria-label="מחיקה"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}