import { EXPENSE_CATEGORIES } from '@/lib/categories';
import { norm } from '@/lib/categoryRules';
import { HelpCircle } from 'lucide-react';

// בתי עסק שלא זוהו: שאלה אחת לכל בית עסק, והתשובה נשמרת כחוק קבוע
export default function ClarifyPanel({ rows, onResolve }) {
  const names = [];
  const seen = new Set();
  for (const r of rows) {
    if (r._removed || r.category !== 'to_clarify') continue;
    const k = norm(r.description);
    if (!seen.has(k)) { seen.add(k); names.push(r.description); }
  }
  if (!names.length) return null;
  return (
    <div className="rounded-lg border border-border bg-accent/50 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <HelpCircle className="w-3.5 h-3.5" /> {names.length} בתי עסק לבירור. התשובה נשמרת כחוק קבוע.
      </div>
      {names.slice(0, 8).map((name) => (
        <div key={name} className="flex items-center gap-2">
          <span className="text-xs flex-1 min-w-0 truncate" dir="auto">על מה שילמת ב-{name}?</span>
          <select
            defaultValue=""
            onChange={(e) => e.target.value && onResolve(name, e.target.value)}
            className="text-xs h-8 rounded-md border border-input bg-card px-1 max-w-[45%]"
          >
            <option value="">בחר קטגוריה</option>
            {EXPENSE_CATEGORIES.filter((c) => c.id !== 'to_clarify' && c.id !== 'other_expense').map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      ))}
      {names.length > 8 && <p className="text-[10px] text-muted-foreground">לאחר המענה על אלה יוצגו הבאים.</p>}
    </div>
  );
}