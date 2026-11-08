import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';

// כל החובות של המשתמש, מתעדכן בזמן אמת
export default function useDebts() {
  const { identity } = useUserIdentity();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!identity) { setLoading(false); return; }
    const r = await base44.entities.Debt.filter({ owner_id: identity }, '-created_date', 1000);
    setDebts(r.items || r);
    setLoading(false);
  }, [identity]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!identity) return undefined;
    return base44.entities.Debt.subscribe(() => reload());
  }, [identity, reload]);

  return { debts, loading, reload };
}