import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { findDuplicateOf } from '@/lib/duplicates';
import { getCategory } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { deleteTransaction } from '@/lib/txnDelete';

// מזהה תנועה כפולה מיד אחרי רישום, ושואל את המשתמש — לעולם לא מוחק לבד
export default function DuplicateWatcher() {
  const { identity } = useUserIdentity();
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (!identity) return;
    const unsubscribe = base44.entities.Transaction.subscribe(async (event) => {
      const tx = { id: event.id, ...event.data };
      // ייבוא קבצים מנהל כפילויות בעצמו; תנועות ממתינות לאישור אינן נבדקות
      if (event.type !== 'create' || tx.owner_id !== identity || tx.source_file || (tx.status && tx.status !== 'confirmed')) return;
      const existing = await findDuplicateOf(tx);
      if (existing) setQueue((q) => (q.some((x) => x.tx.id === tx.id) ? q : [...q, { tx, existing }]));
    });
    return unsubscribe;
  }, [identity]);

  if (!queue.length) return null;
  const { tx } = queue[0];
  const done = () => setQueue((q) => q.slice(1));
  const remove = async () => {
    await deleteTransaction(tx);
    done();
  };

  return (
    <div className="fixed bottom-24 inset-x-0 z-40 px-4">
      <div className="max-w-md mx-auto bg-card border border-border rounded-2xl p-4 shadow-luxe space-y-3">
        <div className="flex items-start gap-3">
          <Copy className="w-5 h-5 mt-0.5 text-expense shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">נראה שזו תנועה כפולה</p>
            <p className="text-muted-foreground">
              כבר קיימת תנועה באותו יום: {getCategory(tx.category).label}, {formatCurrency(tx.amount)}
              {tx.description ? ` (${tx.description})` : ''}.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" className="flex-1" onClick={remove}>מחק את החדשה</Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={done}>השאר את שתיהן</Button>
        </div>
      </div>
    </div>
  );
}