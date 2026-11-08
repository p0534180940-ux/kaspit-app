import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategory } from '@/lib/categories';
import { Copy, AlertCircle, X, Eye } from 'lucide-react';

export default function PreviewRow({ row, index, onUpdate }) {
  const cat = getCategory(row.category);
  const Icon = cat.icon;
  const isIncome = row.type === 'income';
  const credit = row.amount < 0;
  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-lg ${row.skip ? 'bg-muted/20 opacity-60' : row.review ? 'bg-accent ring-1 ring-border' : 'bg-muted/40'}`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cat.color + '20' }}>
        <Icon className="w-4 h-4" style={{ color: cat.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <select
          value={row.category}
          onChange={(e) => onUpdate(index, { category: e.target.value, needsClarify: false })}
          className="w-full bg-transparent text-sm font-medium border-0 outline-none cursor-pointer focus:bg-card rounded px-1 py-0.5 -mx-1"
        >
          <optgroup label="הוצאות">
            {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </optgroup>
          <optgroup label="הכנסות">
            {INCOME_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </optgroup>
        </select>
        <div className="flex items-center gap-1 flex-wrap">
          <p className="text-[11px] text-muted-foreground truncate flex-1" dir="auto" title={row.description}>{row.description || '—'}</p>
          {credit && <span className="text-[10px] font-semibold text-income bg-income/10 px-1.5 py-0.5 rounded-full shrink-0">זיכוי</span>}
          {row.dupNote && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-expense bg-expense/15 px-1.5 py-0.5 rounded-full shrink-0">
              {row.review ? <Eye className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {row.dupNote}
            </span>
          )}
          {row.suspicious && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full shrink-0">
              <AlertCircle className="w-3 h-3" /> סכום חריג
            </span>
          )}
        </div>
      </div>
      {row.skip ? (
        <button onClick={() => onUpdate(index, { skip: false })} className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md border border-border">
          ייבא בכל זאת
        </button>
      ) : (
        <button
          onClick={() => onUpdate(index, { type: isIncome ? 'expense' : 'income' })}
          className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${isIncome ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}
        >
          {isIncome ? 'הכנסה' : 'הוצאה'}
        </button>
      )}
      <div className="text-left shrink-0 w-24">
        <div className="flex items-center gap-0.5 justify-end">
          <input
            type="number"
            value={row.amount}
            onChange={(e) => onUpdate(index, { amount: Number(e.target.value) || 0 })}
            className={`text-sm font-bold w-20 text-left bg-transparent border-0 outline-none focus:bg-card focus:ring-1 focus:ring-primary rounded px-1 py-0.5 ${isIncome ? 'text-income' : 'text-expense'}`}
            dir="ltr"
          />
          <span className="text-[11px] text-muted-foreground">₪</span>
        </div>
        <p className="text-[10px] text-muted-foreground text-left" dir="ltr">{row.date}</p>
      </div>
      <button
        onClick={() => onUpdate(index, { _removed: true })}
        className="shrink-0 w-7 h-7 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}