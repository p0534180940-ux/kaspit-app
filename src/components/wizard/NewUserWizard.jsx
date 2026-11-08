import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import BudgetWizard, { wizardFlagKey } from '@/components/wizard/BudgetWizard';

// אשף פתיחה: מוצג פעם אחת למשתמש חדש (בלי תקציב ועם מעט תנועות)
export default function NewUserWizard() {
  const { identity: ownerId } = useUserIdentity();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    try { if (localStorage.getItem(wizardFlagKey(ownerId))) return; } catch {}
    Promise.all([
      base44.entities.Budget.count({ owner_id: ownerId }),
      base44.entities.Transaction.count({ owner_id: ownerId }),
    ]).then(([budgets, txns]) => {
      if (budgets === 0 && txns < 5) setOpen(true);
    });
  }, [ownerId]);

  if (!open) return null;
  return <BudgetWizard open={open} onOpenChange={setOpen} ownerId={ownerId} />;
}