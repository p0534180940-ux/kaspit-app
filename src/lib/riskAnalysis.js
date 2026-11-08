import { formatCurrency } from './format';
import { isSpend } from './categories';

const DEVIATION_THRESHOLD = 1.3;

export function maskUserId(id) {
  if (!id) return 'אנונימי';
  const s = String(id);
  if (s.match(/^0\d{8,}/)) {
    return s.slice(0, 4) + '****' + s.slice(-4);
  }
  if (s.length <= 6) return s;
  return s.slice(0, 3) + '***' + s.slice(-3);
}

export function analyzeUserRisk(transactions = [], budgets = [], month) {
  const monthTxns = transactions.filter((t) => t.date && t.date.startsWith(month));
  const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = monthTxns.filter(isSpend).reduce((s, t) => s + (t.amount || 0), 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  const plannedMap = {};
  budgets.filter((b) => b.month === month).forEach((b) => {
    plannedMap[b.category] = b.planned_amount;
  });

  const actualMap = {};
  monthTxns.filter(isSpend).forEach((t) => {
    actualMap[t.category] = (actualMap[t.category] || 0) + (t.amount || 0);
  });

  const overBudget = Object.keys(plannedMap)
    .filter((cat) => (actualMap[cat] || 0) > plannedMap[cat])
    .map((cat) => ({
      categoryId: cat,
      planned: plannedMap[cat],
      actual: actualMap[cat],
      overBy: actualMap[cat] - plannedMap[cat],
      pctOver: plannedMap[cat] > 0 ? ((actualMap[cat] - plannedMap[cat]) / plannedMap[cat]) * 100 : 0,
    }))
    .sort((a, b) => b.overBy - a.overBy);

  const riskReasons = [];
  if (balance < 0) {
    riskReasons.push(`מאזן חודשי שלילי — גרעון של ${formatCurrency(Math.abs(balance))}`);
  }
  if (overBudget.length > 0) {
    riskReasons.push(`${overBudget.length} קטגוריות בחריגה מהתקציב`);
  }
  if (income > 0 && savingsRate < 0) {
    riskReasons.push('שיעור חיסכון שלילי — הוצאות עולות על הכנסות');
  }

  const hasNegativeBalance = balance < 0;
  const hasMultipleDeviations = overBudget.length >= 3;
  const hasLargeDeviation = overBudget.some((d) => d.pctOver >= 50);

  let riskLevel = 'healthy';
  if (hasNegativeBalance && (hasMultipleDeviations || hasLargeDeviation)) {
    riskLevel = 'high';
  } else if (hasNegativeBalance || hasMultipleDeviations || hasLargeDeviation) {
    riskLevel = 'medium';
  }

  return {
    income,
    expense,
    balance,
    savingsRate,
    overBudget,
    riskLevel,
    riskReasons,
    txnCount: monthTxns.length,
  };
}