import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { Printer, ChevronLeft } from 'lucide-react';

export default function PendingFaxWidget() {
  const { identity: ownerId } = useUserIdentity();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!ownerId) return;
    try {
      const rows = await base44.entities.Transaction.filter(
        { owner_id: ownerId, status: 'pending' },
        '-date',
        500
      );
      setCount(rows.length);
    } catch {
      setCount(0);
    }
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!ownerId) return;
    const unsubscribe = base44.entities.Transaction.subscribe(() => load());
    return unsubscribe;
  }, [ownerId, load]);

  if (!count) return null;

  return (
    <Link
      to="/pending"
      className="flex items-center gap-3 bg-card rounded-2xl border border-primary/30 shadow-luxe p-4 hover:bg-primary/5 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-sm">
        <Printer className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{count} תנועות ממתינות לאישור (פקס / טלפון)</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          הן ייכללו בדוחות ובתקציב רק לאחר אישור
        </p>
      </div>
      <ChevronLeft className="w-5 h-5 text-muted-foreground shrink-0" />
    </Link>
  );
}