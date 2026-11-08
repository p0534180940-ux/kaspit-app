import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, AlertTriangle, ShieldCheck, TrendingUp, Loader2, Search, ChevronDown } from 'lucide-react';
import { monthKey, monthLabel } from '@/lib/format';
import { analyzeUserRisk } from '@/lib/riskAnalysis';
import MonthPicker from '@/components/MonthPicker';
import UserRiskCard from '@/components/admin/UserRiskCard';
import AdminGate from '@/components/admin/AdminGate';
import CoachManager from '@/components/admin/CoachManager';
import ImportBase44 from '@/components/admin/ImportBase44';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-luxe">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-heading font-bold" dir="ltr">{value}</p>
    </div>
  );
}

export default function Admin() {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
}

function AdminDashboard() {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    Promise.all([
      base44.entities.Transaction.list('-created_date', 500).catch(() => []),
      base44.entities.Budget.list('-created_date', 500).catch(() => []),
    ])
      .then(([txns, budgs]) => {
        if (!mounted) return;
        setTransactions(txns || []);
        setBudgets(budgs || []);
      })
      .catch((e) => {
        setError('שגיאה בטעינת נתונים. נסה שוב.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const usersAnalysis = useMemo(() => {
    const byOwner = {};
    transactions.forEach((t) => {
      if (!t.owner_id) return;
      if (!byOwner[t.owner_id]) byOwner[t.owner_id] = { txns: [], budgets: [] };
      byOwner[t.owner_id].txns.push(t);
    });
    budgets.forEach((b) => {
      if (!b.owner_id) return;
      if (!byOwner[b.owner_id]) byOwner[b.owner_id] = { txns: [], budgets: [] };
      byOwner[b.owner_id].budgets.push(b);
    });

    const results = Object.entries(byOwner).map(([ownerId, data]) => {
      const analysis = analyzeUserRisk(data.txns, data.budgets, month);
      return { ownerId, analysis };
    });

    results.sort((a, b) => {
      const order = { high: 0, medium: 1, healthy: 2 };
      return order[a.analysis.riskLevel] - order[b.analysis.riskLevel];
    });

    return results;
  }, [transactions, budgets, month]);

  const filtered = useMemo(() => {
    if (!search.trim()) return usersAnalysis;
    return usersAnalysis.filter((u) => u.ownerId.includes(search.trim()));
  }, [usersAnalysis, search]);

  const stats = useMemo(() => {
    const total = usersAnalysis.length;
    const high = usersAnalysis.filter((u) => u.analysis.riskLevel === 'high').length;
    const medium = usersAnalysis.filter((u) => u.analysis.riskLevel === 'medium').length;
    const healthy = usersAnalysis.filter((u) => u.analysis.riskLevel === 'healthy').length;
    const totalVolume = usersAnalysis.reduce((s, u) => s + u.analysis.expense, 0);
    return { total, high, medium, healthy, totalVolume };
  }, [usersAnalysis]);

  const atRiskUsers = filtered.filter((u) => u.analysis.riskLevel === 'high' || u.analysis.riskLevel === 'medium');
  const healthyUsers = filtered.filter((u) => u.analysis.riskLevel === 'healthy');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">טוען נתוני משתמשים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-8 h-8 text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-xl">ניהול מאמנים</h1>
          <p className="text-xs text-muted-foreground mt-0.5">תמונת מצב כללית של כל המשתמשים</p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="סה״כ משתמשים" value={stats.total} color="#5B6CFF" />
        <StatCard icon={AlertTriangle} label="סיכון גבוה" value={stats.high} color="#dc2626" />
        <StatCard icon={ShieldCheck} label="יציבים" value={stats.healthy} color="#16a34a" />
        <StatCard icon={TrendingUp} label="היקף הוצאות" value={`₪${stats.totalVolume.toLocaleString('he-IL')}`} color="#d97706" />
      </div>

      <CoachManager />
      <ImportBase44 />

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי מזהה משתמש..."
          className="w-full h-11 pr-10 pl-4 rounded-xl border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Alerts section */}
      {atRiskUsers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full bg-destructive" />
            <h2 className="font-heading font-bold text-lg">התראות — משתמשים בסיכון</h2>
            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">{atRiskUsers.length}</span>
          </div>
          <div className="space-y-2">
            {atRiskUsers.map((u) => (
              <UserRiskCard key={u.ownerId} user={u} analysis={u.analysis} />
            ))}
          </div>
        </div>
      )}

      {/* Healthy users */}
      {healthyUsers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full bg-income" />
            <h2 className="font-heading font-bold text-lg">משתמשים יציבים</h2>
            <span className="text-xs bg-income/10 text-income px-2 py-0.5 rounded-full font-bold">{healthyUsers.length}</span>
          </div>
          <div className="space-y-2">
            {healthyUsers.map((u) => (
              <UserRiskCard key={u.ownerId} user={u} analysis={u.analysis} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {usersAnalysis.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">אין נתוני משתמשים לחודש זה</p>
        </div>
      )}
    </div>
  );
}