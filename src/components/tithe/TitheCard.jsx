import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { onlyConfirmed } from '@/lib/txnStatus';
import { computeTithe } from '@/lib/tithe';
import { formatCurrency } from '@/lib/format';
import { syncTitheDebts } from '@/lib/titheDebts';
import { Button } from '@/components/ui/button';
import { HeartHandshake, Settings, BarChart3 } from 'lucide-react';
import TitheSettingsDialog from '@/components/tithe/TitheSettingsDialog';
import TitheYearReport from '@/components/tithe/TitheYearReport';

// סנכרון חובות המעשר ברצף: ריצה אחת בכל פעם, כדי שלא ייווצרו חובות כפולים
let syncing = false;
let pending = null;
async function runSync(ownerId, txns, s) {
  if (syncing) { pending = [ownerId, txns, s]; return; }
  syncing = true;
  try { await syncTitheDebts(ownerId, txns, s); } finally { syncing = false; }
  if (pending) { const p = pending; pending = null; await runSync(...p); }
}

export default function TitheCard() {
  const { identity: ownerId } = useUserIdentity();
  const [settings, setSettings] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(async () => {
    if (!ownerId) return;
    const rows = await base44.entities.UserSettings.filter({ owner_id: ownerId });
    const s = rows[0] || null;
    setSettings(s);
    if (s?.tithe_enabled) {
      const all = await base44.entities.Transaction.filter({ owner_id: ownerId }, '-date', 3000);
      const confirmed = onlyConfirmed(all.items || all);
      setTxns(confirmed);
      await runSync(ownerId, confirmed, s);
    }
    setLoaded(true);
  }, [ownerId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!ownerId) return;
    return base44.entities.Transaction.subscribe(() => load());
  }, [ownerId, load]);

  if (!loaded) return null;
  const enabled = !!settings?.tithe_enabled;
  const { balance } = enabled ? computeTithe(txns, settings) : { balance: 0 };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-luxe p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <HeartHandshake className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          {enabled ? (
            <p className="font-bold text-sm">
              {balance >= 0 ? `יתרת מעשרות לתת: ${formatCurrency(balance)}` : `שולם ביתר במעשרות: ${formatCurrency(-balance)}`}
            </p>
          ) : (
            <p className="font-bold text-sm">חשבון מעשרות</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {enabled ? 'החישוב לפי ההגדרות שבחרת. לשאלות הלכתיות יש להתייעץ עם רב' : 'חשבון מעשרות אוטומטי לפי ההכנסות שלך'}
          </p>
        </div>
        {enabled && (
          <Button size="icon" variant="ghost" onClick={() => setReportOpen(true)} aria-label="דוח שנתי"><BarChart3 className="w-4 h-4" /></Button>
        )}
        {enabled ? (
          <Button size="icon" variant="ghost" onClick={() => setSettingsOpen(true)} aria-label="הגדרות מעשרות"><Settings className="w-4 h-4" /></Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>הפעלה</Button>
        )}
      </div>
      {settingsOpen && (
        <TitheSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} ownerId={ownerId} settings={settings} onSaved={load} />
      )}
      {reportOpen && <TitheYearReport open={reportOpen} onOpenChange={setReportOpen} transactions={txns} settings={settings} />}
    </div>
  );
}