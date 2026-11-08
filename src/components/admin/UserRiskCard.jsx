import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingDown, AlertTriangle, ShieldCheck, Wallet, ArrowDown, ArrowUp } from 'lucide-react';
import { getCategory } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { maskUserId } from '@/lib/riskAnalysis';
import { Progress } from '@/components/ui/progress';

const RISK_CONFIG = {
  high: {
    label: 'סיכון גבוה',
    color: '#dc2626',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-500 text-white',
    icon: AlertTriangle,
  },
  medium: {
    label: 'סיכון בינוני',
    color: '#d97706',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-500 text-white',
    icon: AlertTriangle,
  },
  healthy: {
    label: 'יציב',
    color: '#16a34a',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-500 text-white',
    icon: ShieldCheck,
  },
};

export default function UserRiskCard({ user, analysis }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RISK_CONFIG[analysis.riskLevel] || RISK_CONFIG.healthy;
  const RiskIcon = cfg.icon;
  const maskedId = maskUserId(user.ownerId);

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden shadow-luxe`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-right hover:bg-black/[0.02] transition-colors"
      >
        {/* Risk icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.color + '20' }}>
          <RiskIcon className="w-5 h-5" style={{ color: cfg.color }} />
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm font-mono" dir="ltr">{maskedId}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.badge}`}>{cfg.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {analysis.txnCount} תנועות · {analysis.riskReasons.length > 0 ? analysis.riskReasons[0] : 'אין חריגות'}
          </p>
        </div>

        {/* Balance */}
        <div className="text-left shrink-0">
          <p className="text-[10px] text-muted-foreground">מאזן</p>
          <p className={`font-bold text-sm ${analysis.balance < 0 ? 'text-expense' : 'text-income'}`} dir="ltr">
            {analysis.balance < 0 ? '-' : '+'}{formatCurrency(Math.abs(analysis.balance))}
          </p>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3 bg-card/50">
          {/* Financial summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-income/5 rounded-xl p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-income font-medium mb-0.5">
                <ArrowUp className="w-3 h-3" />
                הכנסות
              </div>
              <p className="font-bold text-sm text-income" dir="ltr">{formatCurrency(analysis.income)}</p>
            </div>
            <div className="bg-expense/5 rounded-xl p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-expense font-medium mb-0.5">
                <ArrowDown className="w-3 h-3" />
                הוצאות
              </div>
              <p className="font-bold text-sm text-expense" dir="ltr">{formatCurrency(analysis.expense)}</p>
            </div>
            <div className="bg-primary/5 rounded-xl p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-foreground font-medium mb-0.5">
                <Wallet className="w-3 h-3" />
                חיסכון
              </div>
              <p className={`font-bold text-sm ${analysis.savingsRate >= 0 ? 'text-income' : 'text-expense'}`}>
                {analysis.savingsRate.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Risk reasons */}
          {analysis.riskReasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1.5">סיבות סיכון:</p>
              <ul className="space-y-1">
                {analysis.riskReasons.map((reason, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-expense mt-0.5">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Budget deviations */}
          {analysis.overBudget.length > 0 ? (
            <div>
              <p className="text-xs font-semibold mb-2">חריגות מהתקציב:</p>
              <div className="space-y-2">
                {analysis.overBudget.map((dev) => {
                  const cat = getCategory(dev.categoryId);
                  const Icon = cat.icon;
                  return (
                    <div key={dev.categoryId} className="bg-muted/40 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + '20' }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                        </div>
                        <span className="text-xs font-medium flex-1">{cat.label}</span>
                        <span className="text-xs font-bold text-expense" dir="ltr">+{formatCurrency(dev.overBy)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min((dev.actual / dev.planned) * 100, 100)} className="h-2 flex-1" />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatCurrency(dev.actual)} / {formatCurrency(dev.planned)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">אין חריגות מהתקציב החודשי</p>
          )}
        </div>
      )}
    </div>
  );
}