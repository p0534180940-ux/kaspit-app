import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, LogOut, KeyRound, ShieldOff, ShieldCheck, Loader2, ChevronDown, GraduationCap, Trash2 } from 'lucide-react';
import ExportAllButton from '@/components/account/ExportAllButton';
import DeleteAccountPanel from '@/components/account/DeleteAccountPanel';
import CoachAccessPanel from '@/components/coach/CoachAccessPanel';

export default function AccountMenu() {
  const { identity, hasPassword, verifyPassword, setPassword, removePassword, lockNow, clearIdentity } = useUserIdentity();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('menu');
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!identity) return null;

  const reset = () => { setMode('menu'); setCurrent(''); setPin(''); setConfirm(''); setError(''); };
  const close = () => { setOpen(false); reset(); };
  const hasPin = hasPassword(identity);

  const submitSet = () => {
    if (pin.length < 4) { setError('הסיסמה חייבת להכיל לפחות 4 תווים.'); return; }
    if (pin !== confirm) { setError('הסיסמאות אינן תואמות.'); return; }
    setBusy(true);
    try { setPassword(identity, pin); close(); } finally { setBusy(false); }
  };

  const submitChange = () => {
    if (!verifyPassword(identity, current)) { setError('הסיסמה הנוכחית שגויה.'); return; }
    if (pin.length < 4) { setError('הסיסמה החדשה חייבת להכיל לפחות 4 תווים.'); return; }
    if (pin !== confirm) { setError('הסיסמאות אינן תואמות.'); return; }
    setBusy(true);
    try { setPassword(identity, pin); close(); } finally { setBusy(false); }
  };

  const submitRemove = () => {
    if (!verifyPassword(identity, current)) { setError('סיסמה שגויה.'); return; }
    setBusy(true);
    try { removePassword(identity); close(); } finally { setBusy(false); }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="הגדרות חשבון"
      >
        <Lock className="w-3.5 h-3.5" />
        <span className="truncate max-w-20 hidden sm:inline">{identity}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(true); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4 text-primary" />
              {mode === 'set' ? 'הגדרת סיסמה' : mode === 'change' ? 'שינוי סיסמה' : mode === 'remove' ? 'הסרת סיסמה' : mode === 'coach' ? 'גישת מאמן' : mode === 'delete' ? 'מחיקת החשבון' : 'הגדרות חשבון'}
            </DialogTitle>
          </DialogHeader>

          {mode === 'menu' && (
            <div className="space-y-2">
              {!hasPin ? (
                <button onClick={() => setMode('set')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-right">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">הגדר סיסמה</span>
                </button>
              ) : (
                <>
                  <button onClick={() => setMode('change')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-right">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">שינוי סיסמה</span>
                  </button>
                  <button onClick={() => setMode('remove')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-right">
                    <ShieldOff className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">הסר סיסמה</span>
                  </button>
                </>
              )}
              {hasPin && (
                <button onClick={() => { lockNow(); setOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-right">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">נעילה עכשיו</span>
                </button>
              )}
              <button onClick={() => setMode('coach')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-right">
                <GraduationCap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">גישת מאמן</span>
              </button>
              <ExportAllButton identity={identity} />
              <button onClick={() => setMode('delete')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-right">
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">מחיקת החשבון וכל הנתונים</span>
              </button>
              <button onClick={() => { clearIdentity(); setOpen(false); base44.auth.logout(); }} className="w-full flex items-center gap-3 p-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-right">
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">התנתק</span>
              </button>
            </div>
          )}

          {(mode === 'set' || mode === 'change') && (
            <div className="space-y-3">
              {mode === 'change' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">סיסמה נוכחית</label>
                  <Input type="password" value={current} onChange={(e) => { setCurrent(e.target.value); setError(''); }} dir="ltr" autoFocus />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{mode === 'change' ? 'סיסמה חדשה' : 'סיסמה'}</label>
                <Input type="password" value={pin} onChange={(e) => { setPin(e.target.value); setError(''); }} dir="ltr" autoFocus={mode === 'set'} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">אישור סיסמה</label>
                <Input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); }} dir="ltr" onKeyDown={(e) => { if (e.key === 'Enter') (mode === 'change' ? submitChange : submitSet)(); }} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button onClick={mode === 'change' ? submitChange : submitSet} disabled={busy} className="flex-1">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  שמור
                </Button>
                <Button variant="outline" onClick={reset} className="px-4">חזרה</Button>
              </div>
            </div>
          )}

          {mode === 'coach' && <CoachAccessPanel identity={identity} onBack={reset} />}
          {mode === 'delete' && <DeleteAccountPanel identity={identity} onBack={reset} />}

          {mode === 'remove' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">הזן את הסיסמה הנוכחית כדי להסיר את הנעילה.</p>
              <Input type="password" value={current} onChange={(e) => { setCurrent(e.target.value); setError(''); }} dir="ltr" placeholder="סיסמה נוכחית" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') submitRemove(); }} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button onClick={submitRemove} disabled={busy} variant="destructive" className="flex-1">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                  הסר סיסמה
                </Button>
                <Button variant="outline" onClick={reset} className="px-4">חזרה</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}