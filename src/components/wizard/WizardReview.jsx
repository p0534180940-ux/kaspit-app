import { Input } from '@/components/ui/input';
import { getCategory, EXPENSE_GROUPS } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';

// סקירה ועריכה של ההצעה לפני שמירה. שום ערך לא נשמר בלי אישור המשתמש.
export default function WizardReview({ values, setValues, warnings, existingCount }) {
  const income = Number(values.salary_general) || 0;
  const expenseIds = Object.keys(values).filter((id) => id !== 'salary_general');
  const expense = expenseIds.reduce((s, id) => s + (Number(values[id]) || 0), 0);
  const groups = EXPENSE_GROUPS.map((g) => ({ ...g, ids: expenseIds.filter((id) => getCategory(id).group === g.id) })).filter((g) => g.ids.length);
  const edit = (id, v) => setValues({ ...values, [id]: v });

  return (
    <div className="space-y-3">
      {warnings.map((w) => <p key={w} className="text-xs bg-expense/10 text-expense rounded-lg p-2">{w}</p>)}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-muted rounded-lg p-2">הכנסה<br /><b>{formatCurrency(income)}</b></div>
        <div className="bg-muted rounded-lg p-2">הוצאות<br /><b>{formatCurrency(expense)}</b></div>
        <div className="bg-muted rounded-lg p-2">נשאר<br /><b>{formatCurrency(income - expense)}</b></div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">שכר והכנסות</span>
        <Input type="number" className="w-28 h-8" value={values.salary_general ?? ''} onChange={(e) => edit('salary_general', e.target.value)} />
      </div>
      {groups.map((g) => (
        <div key={g.id}>
          <p className="text-xs font-bold mb-1" style={{ color: g.color }}>{g.label}</p>
          {g.ids.map((id) => (
            <div key={id} className="flex items-center justify-between gap-2 text-sm py-0.5">
              <span>{getCategory(id).label}</span>
              <Input type="number" className="w-28 h-8" value={values[id] ?? ''} onChange={(e) => edit(id, e.target.value)} />
            </div>
          ))}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        הסכומים הם הערכה בלבד. התקציב יישמר לחודש הנוכחי.
        {existingCount > 0 && ` ${existingCount} קטגוריות שכבר הוגדרו בחודש זה יוחלפו בערכים שכאן.`}
      </p>
    </div>
  );
}