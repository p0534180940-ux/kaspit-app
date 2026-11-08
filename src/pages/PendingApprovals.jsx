import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { ensureFaxCode } from '@/lib/faxCode';
import PendingTransactionCard from '@/components/pending/PendingTransactionCard';
import FaxInstructionsCard from '@/components/pending/FaxInstructionsCard';
import { CheckCheck, Inbox, Loader2 } from 'lucide-react';

export default function PendingApprovals() {
  const { identity: ownerId } = useUserIdentity();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingAll, setApprovingAll] = useState(false);
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const rows = await base44.entities.Transaction.filter(
        { owner_id: ownerId, status: 'pending' },
        '-date',
        500
      );
      setPending(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!ownerId) return;
    ensureFaxCode(ownerId).then(setCode).catch(() => {});
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) return;
    const unsubscribe = base44.entities.Transaction.subscribe(() => load());
    return unsubscribe;
  }, [ownerId, load]);

  const approveAll = async () => {
    if (!pending.length) return;
    setApprovingAll(true);
    try {
      await base44.entities.Transaction.bulkUpdate(
        pending.map((t) => ({ id: t.id, status: 'confirmed' }))
      );
      await load();
    } finally {
      setApprovingAll(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-xl">ממתין לאישור</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            תנועות מפקס ומהטלפון שממתינות לאישור שלך
          </p>
        </div>
        {pending.length > 0 && (
          <button
            onClick={approveAll}
            disabled={approvingAll}
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl gradient-primary text-primary-foreground text-sm font-bold shadow-luxe hover:opacity-90 active:scale-[0.98] transition-all shrink-0"
          >
            {approvingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            אישור הכל
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/50 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-luxe text-center py-12 px-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-7 h-7 text-foreground/70" />
          </div>
          <p className="font-semibold">אין תנועות הממתינות לאישור</p>
          <p className="text-sm mt-1 text-muted-foreground">
            כל התנועות שהתקבלו אושרו ונכללות בדוחות
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pending.map((t) => (
            <PendingTransactionCard key={t.id} transaction={t} onChanged={load} />
          ))}
        </div>
      )}

      <FaxInstructionsCard code={code} />
    </div>
  );
}