import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GOAL_TEMPLATES } from '@/lib/savings';
import { HEBREW_MONTHS, nextHebrewDate, nextSeptemberFirst, inMonths, hebrewDateLabel, gregorianLabel } from '@/lib/hebrewCalendar';

const sel = 'h-9 rounded-lg border border-input bg-background px-2 text-sm';

export default function GoalForm({ open, onOpenChange, ownerId, goal, monthlyExpense = 0, onSaved }) {
  const [name, setName] = useState(goal?.name || '');
  const [amount, setAmount] = useState(goal?.target_amount || '');
  const [date, setDate] = useState(goal?.target_date || '');
  const [template, setTemplate] = useState(goal?.template || '');
  const [calendar, setCalendar] = useState('gregorian');
  const [hDay, setHDay] = useState(1);
  const [hMonth, setHMonth] = useState('Tishri');
  const [saving, setSaving] = useState(false);

  const pickTemplate = (t) => {
    setTemplate(t.id);
    setName(t.name);
    if (t.id === 'pesach') setDate(nextHebrewDate(15, 'Nisan'));
    if (t.id === 'rosh_hashana') setDate(nextHebrewDate(1, 'Tishri'));
    if (t.id === 'school') setDate(nextSeptemberFirst());
    if (t.id === 'wedding') setDate(inMonths(12));
    if (t.id === 'emergency') {
      setDate(inMonths(12));
      if (monthlyExpense > 0) setAmount(Math.round((monthlyExpense * 3) / 100) * 100);
    }
  };

  const pickHebrew = (d, m) => {
    setHDay(d);
    setHMonth(m);
    setDate(nextHebrewDate(d, m));
  };

  const valid = name.trim() && Number(amount) > 0 && date;

  const save = async () => {
    setSaving(true);
    const data = { name: name.trim(), target_amount: Number(amount), target_date: date, template };
    if (goal?.id) await base44.entities.SavingsGoal.update(goal.id, data);
    else await base44.entities.SavingsGoal.create({ owner_id: ownerId, saved_amount: 0, ...data });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle>{goal ? 'עריכת יעד חיסכון' : 'יעד חיסכון חדש'}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {!goal && (
            <div className="flex flex-wrap gap-2">
              {GOAL_TEMPLATES.map((t) => (
                <Button key={t.id} type="button" size="sm" variant={template === t.id ? 'default' : 'outline'} onClick={() => pickTemplate(t)}>{t.name}</Button>
              ))}
            </div>
          )}
          <Input placeholder="שם היעד" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="number" placeholder="סכום יעד בשקלים" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={calendar === 'gregorian' ? 'default' : 'outline'} onClick={() => setCalendar('gregorian')}>תאריך לועזי</Button>
            <Button type="button" size="sm" variant={calendar === 'hebrew' ? 'default' : 'outline'} onClick={() => pickHebrew(hDay, hMonth)}>תאריך עברי</Button>
          </div>
          {calendar === 'gregorian' ? (
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          ) : (
            <div className="flex gap-2">
              <select className={sel} value={hDay} onChange={(e) => pickHebrew(Number(e.target.value), hMonth)} onFocus={() => setCalendar('hebrew')}>
                {Array.from({ length: 30 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
              <select className={sel} value={hMonth} onChange={(e) => pickHebrew(hDay, e.target.value)}>
                {HEBREW_MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
          )}
          {date && <p className="text-xs text-muted-foreground">{hebrewDateLabel(date)} ({gregorianLabel(date)})</p>}
          <Button onClick={save} disabled={!valid || saving} className="w-full">שמירה</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}