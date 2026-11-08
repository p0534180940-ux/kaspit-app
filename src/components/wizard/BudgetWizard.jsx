import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { monthKey } from '@/lib/format';
import { DEFAULT_ANSWERS, suggestBudget } from '@/lib/budgetSuggest';
import WizardAnswers, { STEP_TITLES } from '@/components/wizard/WizardAnswers';
import WizardReview from '@/components/wizard/WizardReview';

export const wizardFlagKey = (ownerId) => `budget_wizard_done_${ownerId}`;

export default function BudgetWizard({ open, onOpenChange, ownerId, onSaved }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS);
  const [values, setValues] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [existing, setExisting] = useState([]);
  const [saving, setSaving] = useState(false);
  const review = step === STEP_TITLES.length;
  const [future, setFuture] = useState(true);
  const month = monthKey();
  const months = future ? [0, 1, 2, 3].map((n) => { const d = new Date(); return monthKey(new Date(d.getFullYear(), d.getMonth() + n, 1)); }) : [month];

  useEffect(() => {
    if (open && ownerId) base44.entities.Budget.filter({ owner_id: ownerId }, 'month', 5000).then((r) => setExisting(r.items || r));
  }, [open, ownerId]);

  const close = (o) => {
    if (!o) { try { localStorage.setItem(wizardFlagKey(ownerId), '1'); } catch {} }
    onOpenChange(o);
  };

  const next = () => {
    if (step === STEP_TITLES.length - 1) {
      const s = suggestBudget(answers);
      setValues({ ...s.income, ...s.expense });
      setWarnings(s.warnings);
    }
    setStep(step + 1);
  };

  const save = async () => {
    setSaving(true);
    const toCreate = [];
    for (const m of months) {
      for (const [category, raw] of Object.entries(values)) {
        const amount = Number(raw) || 0;
        if (amount <= 0) continue;
        const type = category === 'salary_general' ? 'income' : 'expense';
        const found = existing.find((b) => b.category === category && b.month === m);
        if (found) await base44.entities.Budget.update(found.id, { planned_amount: amount });
        else toCreate.push({ owner_id: ownerId, month: m, category, type, planned_amount: amount });
      }
    }
    if (toCreate.length) await base44.entities.Budget.bulkCreate(toCreate);
    setSaving(false);
    close(false);
    onSaved?.();
  };

  const overwritten = existing.filter((b) => months.includes(b.month) && (Number(values[b.category]) || 0) > 0).length;
  const canNext = step !== 2 || Number(answers.income) > 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{review ? 'הצעת התקציב שלכם' : STEP_TITLES[step]}</DialogTitle>
          {!review && <p className="text-xs text-muted-foreground">שאלה {step + 1} מתוך {STEP_TITLES.length}</p>}
        </DialogHeader>
        {review ? (
          <>
            <WizardReview values={values} setValues={setValues} warnings={warnings} existingCount={overwritten} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={future} onChange={(e) => setFuture(e.target.checked)} />
              החל את התקציב גם על 3 החודשים הבאים
            </label>
          </>
        ) : (
          <WizardAnswers step={step} a={answers} set={(p) => setAnswers({ ...answers, ...p })} />
        )}
        <div className="flex gap-2 pt-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>חזרה</Button>}
          {review ? (
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}אישור ושמירה
            </Button>
          ) : (
            <Button className="flex-1" onClick={next} disabled={!canNext}>{step === STEP_TITLES.length - 1 ? 'הצג הצעה' : 'המשך'}</Button>
          )}
        </div>
        <button className="text-xs text-muted-foreground underline" onClick={() => close(false)}>לא עכשיו</button>
      </DialogContent>
    </Dialog>
  );
}