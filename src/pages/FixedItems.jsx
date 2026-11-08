import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import FixedItemForm from '@/components/fixed/FixedItemForm';
import FixedItemsList from '@/components/fixed/FixedItemsList';
import { Repeat, CalendarClock, Loader2 } from 'lucide-react';

export default function FixedItems() {
  const { identity } = useUserIdentity();
  const [fixed, setFixed] = useState([]);
  const [annual, setAnnual] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!identity) return;
    setLoading(true);
    const [f, a] = await Promise.all([
      base44.entities.FixedItem.filter({ owner_id: identity }, '-created_date', 200).catch(() => []),
      base44.entities.AnnualExpense.filter({ owner_id: identity }, '-created_date', 200).catch(() => []),
    ]);
    setFixed(f);
    setAnnual(a);
    setLoading(false);
  }, [identity]);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    await base44.functions.invoke('syncFixedItems', { owner_id: identity }).catch(() => {});
    await base44.entities.UserSettings.filter({ owner_id: identity }).then(async (rows) => {
      if (rows[0]) await base44.entities.UserSettings.update(rows[0].id, { fixed_entered: true });
      else await base44.entities.UserSettings.create({ owner_id: identity, fixed_entered: true, identify_mode: 'phone' });
    }).catch(() => {});
  };

  const addFixed = async (data) => {
    await base44.entities.FixedItem.create({
      owner_id: identity,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      active: true,
    });
    await sync();
    load();
  };

  const addAnnual = async (data) => {
    await base44.entities.AnnualExpense.create({
      owner_id: identity,
      category: data.category,
      amount: data.amount,
      description: data.description,
      months: data.months || [],
    });
    await sync();
    load();
  };

  const removeFixed = async (item) => {
    await base44.entities.FixedItem.delete(item.id);
    load();
  };

  const removeAnnual = async (item) => {
    await base44.entities.AnnualExpense.delete(item.id);
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-xl">הוצאות והכנסות קבועות</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          לפי שיטת מסילה — קודם משריינים את הקבוע והשנתי, ורק היתרה מיועדת לשוטף. כל מה שתזינו כאן מסתנכרן אוטומטית לתקציב החודשי.
        </p>
      </div>

      <section className="bg-card rounded-2xl border border-border shadow-luxe p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-bold text-sm">קבוע חודשי</h2>
        </div>
        <FixedItemForm mode="monthly" onSubmit={addFixed} />
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          <FixedItemsList items={fixed} onDelete={removeFixed} emptyText="לא הוזנו עדיין הוצאות או הכנסות קבועות" />
        )}
      </section>

      <section className="bg-card rounded-2xl border border-border shadow-luxe p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-bold text-sm">הוצאות שנתיות</h2>
        </div>
        <FixedItemForm mode="annual" onSubmit={addAnnual} />
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          <FixedItemsList items={annual} onDelete={removeAnnual} emptyText="לא הוזנו עדיין הוצאות שנתיות" />
        )}
      </section>
    </div>
  );
}