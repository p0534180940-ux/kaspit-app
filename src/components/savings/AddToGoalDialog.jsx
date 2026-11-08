import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toIso } from '@/lib/hebrewCalendar';

// הוספה לקופה נרשמת כתנועה מסוג "העברה לחיסכון" ולא כהוצאה רגילה
export default function AddToGoalDialog({ open, onOpenChange, ownerId, goal, suggested, onSaved }) {
  const [amount, setAmount] = useState(suggested ? String(suggested) : '');
  const [saving, setSaving] = useState(false);
  const value = Number(amount);

  const save = async () => {
    setSaving(true);
    await base44.entities.Transaction.create({
      type: 'expense',
      amount: value,
      category: 'savings_transfer',
      description: `העברה לחיסכון: ${goal.name}`,
      date: toIso(new Date()),
      owner_id: ownerId,
      source: 'web',
      status: 'confirmed',
      reference: `goal:${goal.id}`,
    });
    await base44.entities.SavingsGoal.update(goal.id, { saved_amount: (Number(goal.saved_amount) || 0) + value });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader><DialogTitle>הוספה ל{goal.name}</DialogTitle></DialogHeader>
        <Input type="number" autoFocus placeholder="סכום בשקלים" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <p className="text-xs text-muted-foreground">הסכום יירשם כ"העברה לחיסכון" ולא יחושב כהוצאה.</p>
        <Button onClick={save} disabled={!(value > 0) || saving} className="w-full">הוספה</Button>
      </DialogContent>
    </Dialog>
  );
}