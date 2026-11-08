import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getCategory } from '@/lib/categories';
import { formatCurrency, formatDateShort } from '@/lib/format';
import { Check, Trash2, Pencil, X, Loader2 } from 'lucide-react';
import CategoryFixer from '@/components/CategoryFixer';
import SourceBadge from '@/components/SourceBadge';

export default function PendingTransactionCard({ transaction, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [fixerOpen, setFixerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(String(transaction.amount ?? ''));
  const [description, setDescription] = useState(transaction.description || '');

  const cat = getCategory(transaction.category);
  const Icon = cat.icon;
  const isIncome = transaction.type === 'income';

  const approve = async () => {
    setBusy(true);
    try {
      await base44.entities.Transaction.update(transaction.id, { status: 'confirmed' });
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('למחוק את התנועה הזו?')) return;
    setBusy(true);
    try {
      await base44.entities.Transaction.delete(transaction.id);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const saveEdits = async () => {
    const num = parseFloat(String(amount).replace(/[^\d.]/g, ''));
    setBusy(true);
    try {
      await base44.entities.Transaction.update(transaction.id, {
        amount: num > 0 ? num : transaction.amount,
        description: description.trim(),
      });
      setEditing(false);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="bg-card rounded-2xl border border-border shadow-luxe p-3.5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: cat.color + '15' }}
          >
            <Icon className="w-5 h-5" style={{ color: cat.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{cat.label}</p>
            <SourceBadge transaction={transaction} showReason />
            <p className="text-xs text-muted-foreground truncate">
              {transaction.description || formatDateShort(transaction.date)}
            </p>
          </div>
          <p className={`font-bold text-sm shrink-0 ${isIncome ? 'text-income' : 'text-expense'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </p>
        </div>

        {editing && (
          <div className="mt-3 space-y-2 pt-3 border-t border-border/60">
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="סכום"
                className="w-28 h-10 px-3 rounded-lg border border-input bg-background text-sm"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור"
                className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFixerOpen(true)}
                className="h-9 px-3 rounded-lg border border-border text-xs font-medium hover:bg-muted/40 transition-colors"
              >
                שינוי קטגוריה
              </button>
              <button
                onClick={saveEdits}
                disabled={busy}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
              >
                שמירה
              </button>
              <button
                onClick={() => setEditing(false)}
                className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={approve}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-income text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            אישור
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="עריכה"
          >
            {editing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="מחיקה"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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