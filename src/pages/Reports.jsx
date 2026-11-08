import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { formatCurrency, monthKey, shiftMonth, hebrewMonthLabel } from '@/lib/format';
import { isSpend, getCategory, breakdownKey } from '@/lib/categories';
import TrendTooltip from '@/components/TrendTooltip';
import { exportTransactionsCSV, exportTransactionsPDF, exportTransactionsDoc } from '@/lib/exportData';
import MonthPicker from '@/components/MonthPicker';
import SummaryCard from '@/components/SummaryCard';
import EmailSummary from '@/components/EmailSummary';
import { onlyConfirmed } from '@/lib/txnStatus';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';

export default function Reports() {
  const [month, setMonth] = useState(monthKey());
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const { identity: ownerId } = useUserIdentity();

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const all = await base44.entities.Transaction.filter(
        { owner_id: ownerId },
        '-date',
        2000
      );
      setAllTransactions(onlyConfirmed(all));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime sync when transactions change (e.g. from Home page import)
  useEffect(() => {
    if (!ownerId) return;
    const unsubscribe = base44.entities.Transaction.subscribe(() => load());
    return unsubscribe;
  }, [ownerId, load]);

  const monthTransactions = allTransactions.filter(
    (t) => t.date && t.date.startsWith(month)
  );
  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + (t.amount || 0), 0);
  const expense = monthTransactions
    .filter(isSpend)
    .reduce((s, t) => s + (t.amount || 0), 0);
  const balance = income - expense;

  // כל הוצאה נכללת בפילוח: קטגוריה לא מוכרת נכנסת ל"אחר", כך שהסכום שווה לסך ההוצאות
  const breakdown = Object.values(
    monthTransactions.filter(isSpend).reduce((acc, t) => {
      const key = breakdownKey(t.category);
      if (!acc[key]) acc[key] = { ...getCategory(key), id: key, amount: 0 };
      acc[key].amount += t.amount || 0;
      return acc;
    }, {})
  )
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const pieData = breakdown.map((d) => ({ name: d.label, value: d.amount, color: d.color }));

  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const m = shiftMonth(month, -i);
    const txns = allTransactions.filter((t) => t.date && t.date.startsWith(m));
    const incomeTxns = txns.filter((t) => t.type === 'income');
    trendData.push({
      month: hebrewMonthLabel(m),
      // חודש בלי אף הכנסה מתועדת אינו הכנסה 0 — הוא "לא תועד"
      הכנסות: incomeTxns.length ? incomeTxns.reduce((s, t) => s + (t.amount || 0), 0) : null,
      הוצאות: txns
        .filter(isSpend)
        .reduce((s, t) => s + (t.amount || 0), 0),
    });
  }
  const missingIncomeMonths = trendData.filter((d) => d.הכנסות === null).map((d) => d.month);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <MonthPicker month={month} onChange={setMonth} />
        {monthTransactions.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTransactionsCSV(monthTransactions, month)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted/40 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-income" />
              אקסל
            </button>
            <button
              onClick={() => exportTransactionsPDF(monthTransactions, month)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted/40 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-destructive" />
              PDF
            </button>
            <button
              onClick={() => exportTransactionsDoc(monthTransactions, month)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted/40 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-chart-5" />
              Word
            </button>
          </div>
        )}
      </div>
      <SummaryCard income={income} expense={expense} balance={balance} />

      {loading ? (
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
      ) : monthTransactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          אין נתונים לחודש זה
        </div>
      ) : (
        <>
          {pieData.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <h2 className="font-heading font-semibold mb-3">פילוח הוצאות</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="font-medium">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-heading font-semibold mb-3">מגמה חודשית</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={50} />
                <Tooltip content={<TrendTooltip />} />
                <Bar dataKey="הכנסות" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="הוצאות" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {missingIncomeMonths.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                הכנסות לא תועדו ב: {missingIncomeMonths.join(', ')}
              </p>
            )}
          </div>

          {breakdown.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <h2 className="font-heading font-semibold mb-3">פירוט הוצאות</h2>
              <div className="space-y-3">
                {breakdown.map((cat) => {
                  const Icon = cat.icon;
                  const pct = expense > 0 ? (cat.amount / expense) * 100 : 0;
                  return (
                    <div key={cat.id} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.color + '20' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span>{cat.label}</span>
                          <span className="font-medium">{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-left">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <EmailSummary transactions={allTransactions} month={month} />
    </div>
  );
}