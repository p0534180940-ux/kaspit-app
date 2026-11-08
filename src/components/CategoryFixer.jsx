import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/categories';
import { saveRule } from '@/lib/categoryRules';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Lightbulb } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CategoryFixer({ transaction, open, onOpenChange, onFixed }) {
  const { identity } = useUserIdentity();
  const { toast } = useToast();
  const [category, setCategory] = useState('other_expense');
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setCategory(transaction.category || 'other_expense');
      setType(transaction.type || 'expense');
      setAmount(String(transaction.amount || ''));
    }
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction) return;
    setSaving(true);
    try {
      const numAmount = Math.abs(Number(amount));
      const updates = { category, type };
      if (!isNaN(numAmount) && numAmount > 0) updates.amount = numAmount;

      await base44.entities.Transaction.update(transaction.id, updates);

      if (transaction.description) {
        await saveRule(identity, transaction.description, category, type);
      }

      toast({ title: 'עודכן ונשמר לעתיד', description: 'עסקאות דומות יסווגו אוטומטית' });
      onFixed?.();
      onOpenChange?.(false);
    } catch (e) {
      toast({ title: 'שגיאה', description: e?.message || 'נסה שוב', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!transaction) return null;
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentCatInList = cats.some((c) => c.id === category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="w-4 h-4 text-primary" />
            תיקון סיווג וסכום
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-muted/40 rounded-lg p-2.5">
            <p className="text-[11px] text-muted-foreground mb-0.5">תיאור העסקה:</p>
            <p className="text-sm font-medium truncate" dir="auto">{transaction.description || '—'}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">סכום</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              dir="ltr"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">סוג</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('expense')}
                className={`h-9 rounded-lg text-sm font-medium transition-colors ${type === 'expense' ? 'bg-expense text-white' : 'bg-muted hover:bg-muted/70'}`}
              >
                הוצאה
              </button>
              <button
                onClick={() => setType('income')}
                className={`h-9 rounded-lg text-sm font-medium transition-colors ${type === 'income' ? 'bg-income text-white' : 'bg-muted hover:bg-muted/70'}`}
              >
                הכנסה
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">קטגוריה</label>
            <select
              value={currentCatInList ? category : ''}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {!currentCatInList && <option value="">— בחר קטגוריה —</option>}
              <optgroup label="הוצאות">
                {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </optgroup>
              <optgroup label="הכנסות">
                {INCOME_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </optgroup>
            </select>
          </div>

          <div className="bg-primary/5 rounded-lg p-2.5 text-[11px] text-muted-foreground leading-relaxed">
            הסיווג יישמר ככלל ויוחל אוטומטית על עסקאות עתידיות עם אותו תיאור.
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'שומר...' : (<><Check className="w-4 h-4 ml-1" /> שמור וזכור</>)}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange?.(false)} className="px-4">
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}