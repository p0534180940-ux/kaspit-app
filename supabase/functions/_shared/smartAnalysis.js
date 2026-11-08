// ניתוח מצב חכם להקראה בטלפון, לפי מודל כספית
import { diagnose, nextSteps, proactiveStep } from './kaspitModel.js';
import { fmt } from './reportData.js';

const clean = (s) => String(s || '').replace(/ ש"ח/g, ' שקלים');

export function analysisToSpeech(r) {
  const bal = r.balance >= 0
    ? `החודש מסתכם בעודף של ${fmt(r.balance)} שקלים`
    : `החודש מסתכם בגירעון של ${fmt(Math.abs(r.balance))} שקלים`;
  const parts = [`ניתוח מצב חכם ל${r.monthLabel}. הכנסות ${fmt(r.totalIncome)} שקלים, הוצאות ${fmt(r.totalExpense)} שקלים. ${bal}.`];
  const findings = diagnose(r).slice(0, 3).map((f) => clean(f.text));
  if (findings.length) parts.push('מה שבולט: ' + findings.join(' '));
  else parts.push('אין עדיין מספיק נתונים לניתוח מעמיק.');
  const steps = nextSteps(r).slice(0, 2).map(clean);
  if (steps.length) parts.push('מה כדאי לעשות: ' + steps.join(' '));
  parts.push('צעד יזום לחודש הבא: ' + clean(proactiveStep(r)));
  return parts.join(' ').replace(/-/g, ' ');
}