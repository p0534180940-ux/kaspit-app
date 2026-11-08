import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

function Counter({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => onChange(Math.max(0, value - 1))}><Minus className="w-3 h-3" /></Button>
        <span className="w-6 text-center font-bold">{value}</span>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => onChange(value + 1)}><Plus className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}

export const STEP_TITLES = [
  'כמה נפשות במשפחה?',
  'כמה ילדים, ובאילו גילאים?',
  'הכנסה חודשית נטו',
  'שכר דירה או משכנתה',
  'האם יש רכב?',
  'באיזו עיר אתם גרים?',
];

export default function WizardAnswers({ step, a, set }) {
  if (step === 0) return <Counter label="סך הכול נפשות (כולל הורים)" value={a.persons} onChange={(v) => set({ persons: Math.max(1, v) })} />;
  if (step === 1) {
    return (
      <div className="space-y-3">
        <Counter label="גילאי 0 עד 3" value={a.kids03} onChange={(v) => set({ kids03: v })} />
        <Counter label="גילאי 4 עד 12" value={a.kids412} onChange={(v) => set({ kids412: v })} />
        <Counter label="גילאי 13 ומעלה" value={a.kids13} onChange={(v) => set({ kids13: v })} />
        <p className="text-xs text-muted-foreground">סך הכול {a.kids03 + a.kids412 + a.kids13} ילדים</p>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="space-y-2">
        <Input type="number" autoFocus placeholder="למשל 12000" value={a.income} onChange={(e) => set({ income: e.target.value })} />
        <p className="text-xs text-muted-foreground">סך כל השכר והקצבאות שנכנסים בחודש, אחרי ניכויים.</p>
      </div>
    );
  }
  if (step === 3) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {[['rent', 'שכר דירה'], ['mortgage', 'משכנתה'], ['none', 'אין']].map(([k, l]) => (
            <Button key={k} type="button" size="sm" variant={a.housing === k ? 'default' : 'outline'} onClick={() => set({ housing: k, housingAmount: k === 'none' ? '' : a.housingAmount })}>{l}</Button>
          ))}
        </div>
        {a.housing !== 'none' && <Input type="number" placeholder="סכום חודשי" value={a.housingAmount} onChange={(e) => set({ housingAmount: e.target.value })} />}
      </div>
    );
  }
  if (step === 4) {
    return (
      <div className="flex gap-2">
        <Button type="button" variant={a.car ? 'default' : 'outline'} onClick={() => set({ car: true })}>יש רכב</Button>
        <Button type="button" variant={!a.car ? 'default' : 'outline'} onClick={() => set({ car: false })}>אין רכב</Button>
      </div>
    );
  }
  return <Input autoFocus placeholder="למשל בית שמש" value={a.city} onChange={(e) => set({ city: e.target.value })} />;
}