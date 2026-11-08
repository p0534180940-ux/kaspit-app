import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown, Scale, CreditCard } from 'lucide-react';

export default function SummaryCard({ income, expense, balance, debt = 0 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Balance */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-luxe">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">יתרה</span>
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Scale className="w-4 h-4" style={{ color: 'hsl(210 14% 20%)' }} />
          </div>
        </div>
        <p className={`text-xl font-bold ${balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
          {formatCurrency(balance)}
        </p>
      </div>

      {/* Debt */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-luxe">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">חובות</span>
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-destructive" />
          </div>
        </div>
        <p className="text-xl font-bold text-destructive">
          {debt > 0 ? '-' : ''}{formatCurrency(debt)}
        </p>
      </div>

      {/* Expenses */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-luxe">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">הוצאות</span>
          <div className="w-8 h-8 rounded-lg bg-expense/10 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-expense" />
          </div>
        </div>
        <p className="text-xl font-bold text-expense">-{formatCurrency(expense)}</p>
      </div>

      {/* Income */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-luxe">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">הכנסות</span>
          <div className="w-8 h-8 rounded-lg bg-income/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-income" />
          </div>
        </div>
        <p className="text-xl font-bold text-income">{formatCurrency(income)}</p>
      </div>
    </div>
  );
}