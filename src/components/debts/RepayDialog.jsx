import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { todayStr, addMonth, typeOf } from '@/lib/debts';

// רישום החזר: יוצר תנועה, מקטין את היתרה ומקדם את תאריך ההחזר הבא בחודש
export default function RepayDialog({ open, onClose, debt, ownerId, onDone }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !debt) return;
    const suggested = Number(debt.monthly_payment) || Number(debt.amount) || 0;
    setAmount(String(Math.min(suggested, Number(debt.amount) || 0)));
    setDate(todayStr());
    setError('');
  }, [open, debt]);

  if (!debt) return null;
  const owed = typeOf(debt).direction === 'owed';

  const submit = async () => {
    const paid = Number(amount) || 0;
    if (paid <= 0) { setError('יש למלא סכום'); return; }
    if (paid > Number(debt.amount)) { setError('הסכום גדול מהיתרה'); return; }
    setBusy(true);
    await base44.entities.Transaction.create({
      owner_id: ownerId,
      type: owed ? 'income' : 'expense',
      amount: paid,
      category: owed ? 'refund_income' : 'debt_repayment',
      description: owed ? `החזר מ${debt.person}` : `החזר ל${debt.person}`,
      date,
      source: 'web',
      status: 'confirmed',
      reference: `debt:${debt.id}`,
    });
    const balance = Math.round((Number(debt.amount) - paid) * 100) / 100;
    const patch = { amount: balance, settled: balance <= 0 };
    if (debt.next_payment_date && balance > 0) patch.next_payment_date = addMonth(debt.next_payment_date);
    await base44.entities.Debt.update(debt.id, patch);
    setBusy(false);
    onDone();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{owed ? 'רישום קבלת תשלום' : 'רישום החזר'}: {debt.person}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">היתרה כרגע: {Number(debt.amount).toLocaleString('he-IL')} ₪</p>
          <Input type="number" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}רשום
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}