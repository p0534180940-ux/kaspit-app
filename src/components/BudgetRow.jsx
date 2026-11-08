import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';

export default function BudgetRow({ category, planned, actual, onSave, showProgress = true }) {
  const Icon = category.icon;
  const [value, setValue] = useState(planned || '');
  const debounceRef = useRef(null);
  const latestValue = useRef(value);

  useEffect(() => {
    setValue(planned || '');
    latestValue.current = planned || '';
  }, [planned]);

  const doSave = (val) => {
    const num = Number(val) || 0;
    if ((planned || 0) !== num) onSave(val);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setValue(v);
    latestValue.current = v;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSave(v), 700);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    doSave(latestValue.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const percentage = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0;
  const over = planned > 0 && actual > planned;

  return (
    <div className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: category.color + '20' }}
      >
        <Icon className="w-4 h-4" style={{ color: category.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{category.label}</p>
        {showProgress ? (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${over ? 'bg-expense' : 'bg-primary'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatCurrency(actual)}
            </span>
          </div>
        ) : (
          actual > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">בפועל: {formatCurrency(actual)}</p>
          )
        )}
      </div>
      <div className="w-24 shrink-0">
        <Input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="0"
          className="h-9 text-sm text-left"
        />
      </div>
    </div>
  );
}