import { daysUntil } from '@/lib/hebrewCalendar';

// כמה לחסוך כל חודש כדי להגיע ליעד בזמן
export function goalStats(goal) {
  const target = Number(goal.target_amount) || 0;
  const saved = Number(goal.saved_amount) || 0;
  const remaining = Math.max(0, target - saved);
  const days = daysUntil(goal.target_date);
  const months = Math.max(1, Math.ceil(days / 30.4));
  return {
    remaining,
    days,
    months,
    overdue: days < 0 && remaining > 0,
    done: remaining === 0,
    pct: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
    monthly: remaining === 0 ? 0 : Math.ceil(remaining / months),
  };
}

export const GOAL_TEMPLATES = [
  { id: 'pesach', name: 'פסח' },
  { id: 'rosh_hashana', name: 'ראש השנה וסוכות' },
  { id: 'school', name: 'פתיחת שנת לימודים' },
  { id: 'wedding', name: 'חתונה / שמחה' },
  { id: 'emergency', name: 'קופת חירום' },
];