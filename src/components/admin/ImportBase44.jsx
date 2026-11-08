import { useState } from 'react';
import { supabase } from '@/api/base44Client';
import defaults from '@/api/entityDefaults.json';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';

// ייבוא חד-פעמי של הנתונים שיוצאו מ-Base44 (קובץ data.json)
const SKIP = new Set(['User']);
const META = new Set(['id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'is_sample', 'app_id']);

export default function ImportBase44() {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  const run = async (file) => {
    setBusy(true);
    setLog([]);
    try {
      const all = JSON.parse(await file.text());
      for (const [entity, rows] of Object.entries(all)) {
        if (SKIP.has(entity) || !Array.isArray(rows) || !rows.length) continue;
        const records = rows.map((r) => {
          const data = { ...(defaults[entity] || {}) };
          for (const [k, v] of Object.entries(r)) if (!META.has(k)) data[k] = v;
          return {
            id: r.id,
            entity,
            data,
            created_by: r.created_by_id || null,
            created_date: r.created_date || new Date().toISOString(),
            updated_date: r.updated_date || r.created_date || new Date().toISOString(),
          };
        });
        for (let i = 0; i < records.length; i += 300) {
          const { error } = await supabase.from('records').upsert(records.slice(i, i + 300), { onConflict: 'id' });
          if (error) throw new Error(`${entity}: ${error.message}`);
        }
        setLog((l) => [...l, `${entity}: ${records.length}`]);
      }
      setLog((l) => [...l, 'הייבוא הסתיים']);
    } catch (e) {
      setLog((l) => [...l, 'שגיאה: ' + e.message]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-luxe space-y-3">
      <div className="flex items-center gap-2 font-heading font-bold">
        <Upload className="w-4 h-4" /> ייבוא נתונים מ-Base44
      </div>
      <p className="text-sm text-muted-foreground">בחרו את הקובץ data.json. אפשר להריץ שוב בלי כפילויות.</p>
      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground cursor-pointer text-sm">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        בחירת קובץ
        <input type="file" accept=".json,application/json" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
      </label>
      {log.length > 0 && (
        <ul className="text-sm space-y-1">
          {log.map((l, i) => (
            <li key={i} className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" /> {l}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
