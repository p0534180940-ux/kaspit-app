import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// יעדי חיסכון של המשתמש, ממוינים לפי תאריך יעד (הקרוב ראשון)
export default function useGoals(ownerId) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ownerId) return;
    const rows = await base44.entities.SavingsGoal.filter({ owner_id: ownerId }, 'target_date', 200);
    setGoals(rows.items || rows);
    setLoading(false);
  }, [ownerId]);

  useEffect(() => { load(); }, [load]);
  return { goals, loading, reload: load };
}