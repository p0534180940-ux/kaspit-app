import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { monthKey } from '@/lib/format';
import QuickAddForm from '@/components/QuickAddForm';
import SmartAdd from '@/components/SmartAdd';
import TransactionItem from '@/components/TransactionItem';
import MonthPicker from '@/components/MonthPicker';
import SummaryCard from '@/components/SummaryCard';
import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import EmergencyFundWidget from '@/components/EmergencyFundWidget';
import ExcelImport from '@/components/ExcelImport';
import IvrSync from '@/components/IvrSync';
import { isSpend } from '@/lib/categories';
import DailyTasksWidget from '@/components/DailyTasksWidget';
import FixedSetupPrompt from '@/components/fixed/FixedSetupPrompt';
import PendingFaxWidget from '@/components/PendingFaxWidget';
import { onlyConfirmed } from '@/lib/txnStatus';
import TitheCard from '@/components/tithe/TitheCard';
import HomeGoals from '@/components/savings/HomeGoals';
import NewUserWizard from '@/components/wizard/NewUserWizard';

import useDebts from '@/components/debts/useDebts';
import DebtReminders from '@/components/debts/DebtReminders';
import CoachNotesCard from '@/components/coach/CoachNotesCard';
import { sumBalance } from '@/lib/debts';

export default function Home() {
  const [month, setMonth] = useState(monthKey());
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState('expense');

  const { identity: ownerId } = useUserIdentity();

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const all = await base44.entities.Transaction.filter(
        { owner_id: ownerId },
        '-date',
        1000
      );
      setTransactions(onlyConfirmed(all).filter((t) => t.date && t.date.startsWith(month)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month, ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh when transactions change anywhere (e.g. Budget page)
  useEffect(() => {
    if (!ownerId) return;
    const unsubscribe = base44.entities.Transaction.subscribe(() => {
      load();
    });
    return unsubscribe;
  }, [ownerId, load]);

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + (t.amount || 0), 0);
  const expense = transactions
    .filter(isSpend)
    .reduce((s, t) => s + (t.amount || 0), 0);
  const { debts } = useDebts();
  const debt = sumBalance(debts, 'owe');
  const balance = income - expense;

  const openAdd = (type) => {
    setAddType(type);
    setAddOpen(true);
  };

  return (
    <div className="space-y-5">
      <NewUserWizard />
      <FixedSetupPrompt />
      <PendingFaxWidget />
      <DebtReminders debts={debts} />
      <CoachNotesCard />

      {/* Title + Month Picker */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl">פעילות שוטפת</h1>
          <p className="text-sm text-muted-foreground mt-0.5">להכיר את החשבון מצד הפלוס</p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {/* Summary cards */}
      <SummaryCard income={income} expense={expense} balance={balance} debt={debt} />

      {/* Daily AI tasks */}
      <DailyTasksWidget />

      {/* Smart Add */}
      <SmartAdd onSaved={load} />

      {/* Phone recordings sync + Excel import */}
      <div className="grid grid-cols-2 gap-3">
        <IvrSync onSynced={load} />
        <ExcelImport onImported={load} />
      </div>

      <TitheCard />
      <HomeGoals />

      {/* Emergency Fund */}
      <EmergencyFundWidget monthlyExpense={expense} />

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => openAdd('expense')}
          className="flex items-center justify-center gap-2 h-14 rounded-xl bg-expense text-white font-bold shadow-luxe hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <ArrowDownRight className="w-5 h-5" />
          <span>הוצאה חדשה</span>
        </button>
        <button
          onClick={() => openAdd('income')}
          className="flex items-center justify-center gap-2 h-14 rounded-xl bg-income text-white font-bold shadow-luxe hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <ArrowUpRight className="w-5 h-5" />
          <span>הכנסה חדשה</span>
        </button>
      </div>

      {/* Transaction table */}
      <div className="bg-card rounded-2xl border border-border shadow-luxe overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <h2 className="font-heading font-bold text-base">תנועות אחרונות</h2>
          {transactions.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {transactions.length}
            </span>
          )}
        </div>

        {/* Table header - desktop only */}
        <div className="hidden sm:grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
          <span />
          <span>קטגוריה ותיאור</span>
          <span className="text-left w-28">סכום</span>
          <span className="w-8" />
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-7 h-7" style={{ color: 'hsl(210 14% 20%)' }} />
            </div>
            <p className="font-semibold text-foreground">אין תנועות בחודש זה</p>
            <p className="text-sm mt-1 text-muted-foreground">לחץ על הוספת הוצאה או הכנסה כדי להתחיל</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {transactions.slice(0, 20).map((t) => (
              <TransactionItem key={t.id} transaction={t} onChanged={load} />
            ))}
          </div>
        )}
      </div>

      <QuickAddForm
        open={addOpen}
        onOpenChange={setAddOpen}
        type={addType}
        onSaved={load}
      />
    </div>
  );
}