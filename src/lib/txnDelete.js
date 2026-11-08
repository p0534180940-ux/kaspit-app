import { base44 } from '@/api/base44Client';

// מחיקת תנועה. העברה לחיסכון מחזירה את הסכום ליעד, והחזר חוב מחזיר את הסכום ליתרת החוב.
export async function deleteTransaction(tx) {
  await base44.entities.Transaction.delete(tx.id);
  const ref = String(tx.reference || '');
  const amount = Number(tx.amount) || 0;
  if (tx.category === 'savings_transfer' && ref.startsWith('goal:')) {
    const goal = await base44.entities.SavingsGoal.get(ref.slice(5)).catch(() => null);
    if (goal) {
      await base44.entities.SavingsGoal.update(goal.id, { saved_amount: Math.max(0, (Number(goal.saved_amount) || 0) - amount) });
    }
  }
  if (ref.startsWith('debt:')) {
    const debt = await base44.entities.Debt.get(ref.slice(5)).catch(() => null);
    if (debt) {
      await base44.entities.Debt.update(debt.id, { amount: (Number(debt.amount) || 0) + amount, settled: false });
    }
  }
}