import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getCategory } from '@/lib/categories';
import { formatCurrency, formatDateShort } from '@/lib/format';
import { Trash2, Pencil } from 'lucide-react';
import CategoryFixer from '@/components/CategoryFixer';
import SourceBadge from '@/components/SourceBadge';
import { deleteTransaction } from '@/lib/txnDelete';

export default function TransactionItem({ transaction, onChanged }) {
  const [fixerOpen, setFixerOpen] = useState(false);
  const cat = getCategory(transaction.category);
  const Icon = cat.icon;
  const isIncome = transaction.type === 'income';

  const handleDelete = async () => {
    if (!window.confirm('למחוק תנועה זו?')) return;
    await deleteTransaction(transaction);
    onChanged?.();
  };

  return (
    <>
      <div className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: cat.color + '15' }}
        >
          <Icon className="w-5 h-5" style={{ color: cat.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{cat.label}</p>
          <SourceBadge transaction={transaction} />
          {transaction.description ? (
            <p className="text-xs text-muted-foreground truncate">{transaction.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{formatDateShort(transaction.date)}</p>
          )}
        </div>
        <div className="text-left shrink-0">
          <p className={`font-bold text-sm ${isIncome ? 'text-income' : 'text-expense'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </p>
          {transaction.description && (
            <p className="text-xs text-muted-foreground">{formatDateShort(transaction.date)}</p>
          )}
        </div>
        <button
          onClick={() => setFixerOpen(true)}
          className="text-muted-foreground/30 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/10 shrink-0"
          aria-label="תקן סיווג"
          title="תקן סיווג"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="text-muted-foreground/30 hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10 shrink-0"
          aria-label="מחק"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <CategoryFixer
        transaction={transaction}
        open={fixerOpen}
        onOpenChange={setFixerOpen}
        onFixed={onChanged}
      />
    </>
  );
}