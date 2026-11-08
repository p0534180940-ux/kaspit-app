import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { monthKey } from '@/lib/format';
import { getCategory, MIGRATION_MAP, EXPENSE_GROUPS } from '@/lib/categories';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, ListTodo } from 'lucide-react';
import { mesilaTaskOfDay } from '@/lib/mesila';

export default function DailyTasksWidget() {
  const { identity } = useUserIdentity();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(() => {
    try {
      const day = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`kasplit_tasks_done_${identity || 'anon'}`);
      return saved === day;
    } catch { return false; }
  });
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(`kasplit_tasks_enabled_${identity || 'anon'}`) !== '0'; }
    catch { return true; }
  });

  const buildTasks = (transactions, budgets) => {
    const month = monthKey();
    const monthTxns = transactions.filter((t) => t.date && t.date.startsWith(month));
    const result = [];

    const actualMap = {};
    const plannedMap = {};
    monthTxns.forEach((t) => {
      if (t.type === 'expense') {
        const migrated = MIGRATION_MAP[t.category] || t.category;
        actualMap[migrated] = (actualMap[migrated] || 0) + (t.amount || 0);
      }
    });
    budgets.forEach((b) => {
      const migrated = MIGRATION_MAP[b.category] || b.category;
      plannedMap[migrated] = (plannedMap[migrated] || 0) + (b.planned_amount || 0);
    });

    // Fixed payments categories — alert if missing this month
    const fixedCats = ['rent', 'mortgage', 'electricity', 'water_sewage', 'municipal_tax', 'health_fund', 'life_insurance'];
    const dayOfMonth = new Date().getDate();
    fixedCats.forEach((catId) => {
      const planned = plannedMap[catId];
      if (planned && !actualMap[catId] && dayOfMonth >= 10) {
        const cat = getCategory(catId);
        result.push({
          id: `fixed_${catId}`,
          icon: cat.icon,
          color: cat.color,
          title: `תשלום קבוע: ${cat.label}`,
          detail: `תקציב ${planned.toFixed(0)} ₪ — טרם נרשמה תנועה החודש`,
          severity: 'warn',
        });
      }
    });

    // Overspend alerts — category exceeded budget by 30%+
    Object.keys(plannedMap).forEach((catId) => {
      const planned = plannedMap[catId];
      const actual = actualMap[catId] || 0;
      if (planned > 0 && actual > planned * 1.3) {
        const cat = getCategory(catId);
        const over = actual - planned;
        result.push({
          id: `over_${catId}`,
          icon: cat.icon,
          color: cat.color,
          title: `חריגה: ${cat.label}`,
          detail: `${actual.toFixed(0)} ₪ מתוך תקציב ${planned.toFixed(0)} ₪ (חריגה ${over.toFixed(0)} ₪)`,
          severity: 'danger',
        });
      }
    });

    // No transactions logged this month
    if (monthTxns.length === 0) {
      result.push({
        id: 'empty',
        icon: ListTodo,
        color: '#B8893A',
        title: 'רישום תנועות',
        detail: 'לא נרשמו תנועות החודש — ייבא קובץ עובר ושב או הוסף ידנית',
        severity: 'info',
      });
    }

    // Suggest reviewing budget if no budget set
    if (Object.keys(plannedMap).length === 0 && monthTxns.length > 0) {
      result.push({
        id: 'no_budget',
        icon: Sparkles,
        color: '#5B6CFF',
        title: 'הגדרת תקציב',
        detail: 'קיימות תנועות אך לא הוגדר תקציב — כנס לדף התקציב להצבת יעדים',
        severity: 'info',
      });
    }

    // משימת אימון יומית לפי שיטת מסילה
    result.push({
      id: 'mesila',
      icon: Sparkles,
      color: '#B8893A',
      title: 'תרגול מסילה להיום',
      detail: mesilaTaskOfDay(),
      severity: 'info',
    });

    return result.slice(0, 5);
  };

  useEffect(() => {
    if (!identity || !enabled) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      base44.entities.Transaction.filter({ owner_id: identity }, '-date', 2000).catch(() => []),
      base44.entities.Budget.filter({ owner_id: identity, month: monthKey() }).catch(() => []),
    ]).then(([txns, budgets]) => {
      setTasks(buildTasks(txns, budgets));
      setLoading(false);
    });
  }, [identity, enabled]);

  const markDone = () => {
    const day = new Date().toISOString().split('T')[0];
    localStorage.setItem(`kasplit_tasks_done_${identity || 'anon'}`, day);
    setDone(true);
  };

  const toggleEnabled = () => {
    const next = !enabled;
    localStorage.setItem(`kasplit_tasks_enabled_${identity || 'anon'}`, next ? '1' : '0');
    setEnabled(next);
  };

  if (!enabled) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">משימות יומיות מושבתות</p>
        </div>
        <button onClick={toggleEnabled} className="text-xs font-medium text-primary">הפעל</button>
      </div>
    );
  }

  if (done && tasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-luxe overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-bold text-sm">משימות להיום</h2>
          {!loading && tasks.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{tasks.length}</span>
          )}
        </div>
        <button onClick={toggleEnabled} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">השבת</button>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center gap-2 py-3 px-1">
            <CheckCircle2 className="w-5 h-5 text-income" />
            <p className="text-sm font-medium text-income">הכל בסדר! אין משימות דחופות להיום.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const Icon = task.icon;
              return (
                <div key={task.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: task.color + '20' }}>
                    {task.severity === 'danger' ? (
                      <AlertCircle className="w-4 h-4" style={{ color: task.color }} />
                    ) : (
                      <Icon className="w-4 h-4" style={{ color: task.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{task.detail}</p>
                  </div>
                </div>
              );
            })}
            {!done && (
              <button
                onClick={markDone}
                className="w-full h-9 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/40 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                סימנתי כטופל להיום
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}