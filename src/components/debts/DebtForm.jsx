import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { DEBT_TYPES, typeOf } from '@/lib/debts';

const EMPTY = { debt_type: 'gmach', person: '', original_amount: '', amount: '', monthly_payment: '', next_payment_date: '' };

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function DebtForm({ open, onClose, debt, ownerId, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setF(debt ? {
      debt_type: typeOf(debt).id,
      person: debt.person || '',
      original_amount: debt.original_amount ?? debt.amount ?? '',
      amount: debt.amount ?? '',
      monthly_payment: debt.monthly_payment ?? '',
      next_payment_date: debt.next_payment_date || '',
    } : EMPTY);
  }, [open, debt]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const type = DEBT_TYPES.find((t) => t.id === f.debt_type);

  const save = async () => {
    const original = Number(f.original_amount) || 0;
    const balance = debt ? Number(f.amount) || 0 : original;
    if (!f.person.trim()) { setError('יש למלא שם'); return; }
    if (original <= 0) { setError('יש למלא סכום מקורי'); return; }
    setBusy(true);
    const data = {
      owner_id: ownerId,
      direction: type.direction,
      debt_type: type.id,
      person: f.person.trim(),
      original_amount: original,
      amount: balance,
      monthly_payment: Number(f.monthly_payment) || 0,
      next_payment_date: f.next_payment_date || '',
      settled: balance <= 0,
    };
    if (debt) await base44.entities.Debt.update(debt.id, data);
    else await base44.entities.Debt.create(data);
    setBusy(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{debt ? 'עריכת חוב' : 'חוב או הלוואה חדשים'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {DEBT_TYPES.map((t) => (
              <button key={t.id} onClick={() => set('debt_type', t.id)}
                className={`h-10 rounded-lg border text-sm font-medium ${f.debt_type === t.id ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <Field label={type.who}><Input value={f.person} onChange={(e) => set('person', e.target.value)} /></Field>
          <Field label="סכום מקורי"><Input type="number" dir="ltr" value={f.original_amount} onChange={(e) => set('original_amount', e.target.value)} /></Field>
          {debt && <Field label="יתרה"><Input type="number" dir="ltr" value={f.amount} onChange={(e) => set('amount', e.target.value)} /></Field>}
          <Field label="החזר חודשי"><Input type="number" dir="ltr" value={f.monthly_payment} onChange={(e) => set('monthly_payment', e.target.value)} /></Field>
          <Field label="תאריך ההחזר הבא"><Input type="date" dir="ltr" value={f.next_payment_date} onChange={(e) => set('next_payment_date', e.target.value)} /></Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={save} disabled={busy} className="w-full">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}שמור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}