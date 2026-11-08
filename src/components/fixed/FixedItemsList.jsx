import { getCategory } from '@/lib/categories';
import { Trash2 } from 'lucide-react';

import { monthNameBoth } from '@/lib/format';

export default function FixedItemsList({ items, onDelete, emptyText }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">{emptyText}</p>;
  }

  return (
    <div className="divide-y divide-border/60">
      {items.map((item) => {
        const cat = getCategory(item.category);
        const monthsText = item.months?.length
          ? item.months.map((m) => monthNameBoth(m)).join(', ')
          : null;
        return (
          <div key={item.id} className="flex items-center gap-3 py-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + '20' }}>
              <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{cat.label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {item.description || (item.type === 'income' ? 'הכנסה קבועה' : 'הוצאה קבועה')}
                {monthsText ? ` · ${monthsText}` : ''}
              </p>
            </div>
            <p className={`text-sm font-bold ${item.type === 'income' ? 'text-income' : 'text-foreground'}`}>
              {new Intl.NumberFormat('he-IL').format(item.amount)} ₪
            </p>
            <button onClick={() => onDelete(item)} className="p-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}