import { useState, useEffect } from 'react';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { inMonths } from '@/lib/hebrewCalendar';
import { formatCurrency } from '@/lib/format';

const STORAGE_KEY = 'paamonim_emergency_fund';

export default function EmergencyFundWidget({ monthlyExpense = 0 }) {
  const [saved, setSaved] = useState(() => {
    try { return Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { return 0; }
  });
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);

  const { identity: ownerId } = useUserIdentity();
  const [hasGoal, setHasGoal] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    base44.entities.SavingsGoal.filter({ owner_id: ownerId, template: 'emergency' }).then((r) => setHasGoal((r.items || r).length > 0));
  }, [ownerId]);

  // מעבר לקופת חירום ביעדי החיסכון: הסכום שנצבר עד היום עובר איתו
  const migrate = async () => {
    await base44.entities.SavingsGoal.create({
      owner_id: ownerId, name: 'קופת חירום', template: 'emergency', saved_amount: saved,
      target_amount: Math.max(1000, Math.round((monthlyExpense * 3) / 100) * 100), target_date: inMonths(12),
    });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setHasGoal(true);
  };

  const target = monthlyExpense * 3;
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  const handleSave = () => {
    const val = Number(input) || 0;
    setSaved(val);
    try { localStorage.setItem(STORAGE_KEY, String(val)); } catch {}
    setEditing(false);
  };

  if (hasGoal) return null;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-luxe overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'hsl(210 70% 52% / 0.15)' }}>
          <Shield className="w-4 h-4" style={{ color: 'hsl(210 70% 52%)' }} />
        </div>
        <div className="flex-1 text-right">
          <p className="font-bold text-sm">קופת חירום</p>
          <p className="text-xs text-muted-foreground">יעד: 3 משכורות | {pct}% הושג</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>נחסך: <strong className="text-foreground">{formatCurrency(saved)}</strong></span>
            <span>יעד: <strong className="text-foreground">{formatCurrency(target)}</strong></span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: 'hsl(210 70% 52%)' }}
            />
          </div>
          {pct < 100 && (
            <p className="text-xs text-muted-foreground">
              נותרו {formatCurrency(Math.max(0, target - saved))} להשלמת יעד 3 המשכורות על פי המלצת פעמונים
            </p>
          )}
          {pct >= 100 && (
            <p className="text-xs text-income font-semibold">✓ הגעתם ליעד קופת החירום!</p>
          )}
          <button onClick={migrate} className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            העבר ליעדי החיסכון (עם חישוב חיסכון חודשי)
          </button>
          {editing ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm text-right"
                placeholder="סכום שחסכתם"
                autoFocus
              />
              <button onClick={handleSave} className="px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">שמור</button>
              <button onClick={() => setEditing(false)} className="px-3 h-9 rounded-lg bg-muted text-sm">ביטול</button>
            </div>
          ) : (
            <button
              onClick={() => { setInput(String(saved)); setEditing(true); }}
              className="w-full h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              עדכן סכום חסוך
            </button>
          )}
        </div>
      )}
    </div>
  );
}