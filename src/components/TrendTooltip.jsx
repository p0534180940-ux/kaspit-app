import { formatCurrency } from '@/lib/format';

// חודש בלי הכנסות מתועדות מוצג "לא תועד" ולא 0
export default function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-luxe">
      <div className="font-medium mb-1">{label}</div>
      <div>הכנסות: {row.הכנסות === null ? 'לא תועד' : formatCurrency(row.הכנסות)}</div>
      <div>הוצאות: {formatCurrency(row.הוצאות)}</div>
    </div>
  );
}