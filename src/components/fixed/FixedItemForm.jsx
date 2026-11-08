import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CategorySelect from '@/components/CategorySelect';
import { Loader2, Plus } from 'lucide-react';
import { monthNameBoth } from '@/lib/format';

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export default function FixedItemForm({ mode, onSubmit }) {
  const isAnnual = mode === 'annual';
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState(isAnnual ? 'holidays_religious' : 'rent');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [months, setMonths] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleMonth = (m) => {
    setMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const submit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    setSaving(true);
    try {
      await onSubmit({
        type: isAnnual ? 'expense' : type,
        category,
        amount: value,
        description: description.trim(),
        months: isAnnual ? months : undefined,
      });
      setAmount('');
      setDescription('');
      setMonths([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {!isAnnual && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setType('expense'); setCategory('rent'); }}
            className={`h-10 rounded-lg text-sm font-semibold border ${type === 'expense' ? 'bg-expense text-white border-transparent' : 'border-border'}`}
          >
            הוצאה קבועה
          </button>
          <button
            onClick={() => { setType('income'); setCategory('salary_general'); }}
            className={`h-10 rounded-lg text-sm font-semibold border ${type === 'income' ? 'bg-income text-white border-transparent' : 'border-border'}`}
          >
            הכנסה קבועה
          </button>
        </div>
      )}

      <CategorySelect type={isAnnual ? 'expense' : type} value={category} onChange={setCategory} />

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={isAnnual ? 'סכום שנתי ₪' : 'סכום חודשי ₪'}
          className="h-11"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תיאור (לא חובה)"
          className="h-11"
        />
      </div>

      {isAnnual && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">באילו חודשים ההוצאה מתרחשת? (ללא בחירה — תתחלק על כל השנה)</p>
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => toggleMonth(i + 1)}
                className={`min-h-9 py-1 px-1 leading-tight rounded-lg text-[11px] font-medium border ${months.includes(i + 1) ? 'bg-primary text-primary-foreground border-transparent' : 'border-border'}`}
              >
                {monthNameBoth(i + 1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button onClick={submit} disabled={saving || !amount} className="w-full h-11">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        <span className="font-semibold">{isAnnual ? 'הוספת הוצאה שנתית' : 'הוספה לרשימה הקבועה'}</span>
      </Button>
    </div>
  );
}