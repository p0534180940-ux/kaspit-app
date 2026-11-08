import { ChevronRight, ChevronLeft } from 'lucide-react';
import { monthLabel, hebrewMonthLabel, shiftMonth } from '@/lib/format';

export default function MonthPicker({ month, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-card rounded-xl border border-border px-2 py-1.5 shadow-luxe">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        aria-label="חודש קודם"
      >
        <ChevronRight className="w-4 h-4 text-foreground" />
      </button>
      <span className="min-w-[110px] text-center leading-tight">
        <span className="block font-semibold text-sm">{hebrewMonthLabel(month)}</span>
        <span className="block text-[11px] text-muted-foreground">{monthLabel(month)}</span>
      </span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        aria-label="חודש הבא"
      >
        <ChevronLeft className="w-4 h-4 text-foreground" />
      </button>
    </div>
  );
}