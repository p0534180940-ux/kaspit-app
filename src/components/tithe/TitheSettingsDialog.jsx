import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { INCOME_CATEGORIES } from '@/lib/categories';
import { toIso } from '@/lib/hebrewCalendar';

const PRESETS = [10, 20];

export default function TitheSettingsDialog({ open, onOpenChange, ownerId, settings, onSaved }) {
  const [enabled, setEnabled] = useState(!!settings?.tithe_enabled);
  const [percent, setPercent] = useState(Number(settings?.tithe_percent) || 10);
  const [other, setOther] = useState(!PRESETS.includes(Number(settings?.tithe_percent) || 10));
  const [mode, setMode] = useState(settings?.tithe_mode || 'all');
  const [cats, setCats] = useState(settings?.tithe_categories || []);
  const [saving, setSaving] = useState(false);

  const toggleCat = (id) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const save = async () => {
    setSaving(true);
    const data = {
      tithe_enabled: enabled,
      tithe_percent: Number(percent) || 10,
      tithe_mode: mode,
      tithe_categories: cats,
      tithe_since: settings?.tithe_since || toIso(new Date()),
    };
    if (settings?.id) await base44.entities.UserSettings.update(settings.id, data);
    else await base44.entities.UserSettings.create({ owner_id: ownerId, identify_mode: 'phone', ...data });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle>חשבון מעשרות</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold">הפעל חשבון מעשרות</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
          <div>
            <p className="font-semibold mb-2">אחוז מעשר</p>
            <div className="flex gap-2 items-center">
              {PRESETS.map((p) => (
                <Button key={p} type="button" size="sm" variant={!other && percent === p ? 'default' : 'outline'} onClick={() => { setOther(false); setPercent(p); }}>{p}%</Button>
              ))}
              <Button type="button" size="sm" variant={other ? 'default' : 'outline'} onClick={() => setOther(true)}>אחר</Button>
              {other && <Input type="number" min="1" max="100" value={percent} onChange={(e) => setPercent(e.target.value)} className="w-20 h-9" />}
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">חישוב המעשר</p>
            <label className="flex items-center gap-2 mb-1"><input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} />מכל הכנסה</label>
            <label className="flex items-center gap-2"><input type="radio" checked={mode === 'selected'} onChange={() => setMode('selected')} />רק מקטגוריות הכנסה שאסמן</label>
            {mode === 'selected' && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                {INCOME_CATEGORIES.map((c) => (
                  <label key={c.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={cats.includes(c.id)} onChange={() => toggleCat(c.id)} />{c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            הוצאה בקטגוריית "תרומות" או "מעשרות" מקזזת מהיתרה. החישוב מתחיל מיום ההפעלה.
          </p>
          <Button onClick={save} disabled={saving} className="w-full">שמירה</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}