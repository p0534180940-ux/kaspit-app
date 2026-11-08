import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportAllData } from '@/lib/exportAll';

export default function ExportAllButton({ identity }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    await exportAllData(identity);
    setBusy(false);
  };
  return (
    <button onClick={run} disabled={busy} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-right">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-primary" />}
      <span className="text-sm font-medium">ייצוא כל הנתונים שלי</span>
    </button>
  );
}