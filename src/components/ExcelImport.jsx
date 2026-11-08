import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { saveRule, norm } from '@/lib/categoryRules';
import { EXCLUDED_CATEGORIES } from '@/lib/categories';
import { extractRaw, buildRows, fileHash, findPreviousImport } from '@/lib/importPipeline';
import PreviewRow from '@/components/import/PreviewRow';
import ClarifyPanel from '@/components/import/ClarifyPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, Loader2, Download, CheckCircle2, AlertCircle, Sparkles, Undo2, Copy, Camera } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function downloadTemplate() {
  const csv = 'תאריך,תיאור,סכום,אסמכתא\n2026-07-12,קניות ברמי לוי,150,\n2026-07-11,העברת משכורת,8000,\n2026-07-10,חשמל העברת הוראת קבע,320,';
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'תבנית_כספית.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const UI_FLAGS = ['_removed', 'skip', 'review', 'dupNote', 'suspicious', 'needsClarify'];
const money = (n) => Math.round(n).toLocaleString('he-IL');

function Centered({ children }) {
  return <div className="flex flex-col items-center gap-3 py-8">{children}</div>;
}

export default function ExcelImport({ onImported }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('idle');
  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState({ summaryDropped: 0 });
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const { identity } = useUserIdentity();
  const inputRef = useRef(null);
  const receiptRef = useRef(null);
  const { toast } = useToast();
  const importsStorageKey = `kasplit_imports_${identity || 'anon'}`;
  const [imports, setImports] = useState(() => {
    try { return JSON.parse(localStorage.getItem(importsStorageKey)) || []; } catch { return []; }
  });
  const [deletingId, setDeletingId] = useState(null);

  const updateRow = (index, changes) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...changes } : r)));

  const resolveMerchant = (name, category) => {
    setRows((prev) => prev.map((r) => (norm(r.description) === norm(name) && r.category === 'to_clarify' ? { ...r, category, needsClarify: false } : r)));
    saveRule(identity, name, category, 'expense');
  };

  const handleFile = async (file) => {
    if (!file || !identity) return;
    setFileName(file.name);
    setStage('extracting');
    setError('');
    setOpen(true);
    try {
      const hash = await fileHash(file);
      const prev = await findPreviousImport(identity, hash);
      if (prev) {
        setError('הקובץ הזה כבר יובא בעבר, ולכן לא יובא שוב. כדי לייבא אותו מחדש מחקו תחילה את הייבוא הקודם.');
        setStage('error');
        return;
      }
      const { receipt, raw } = await extractRaw(file);
      setStage('categorizing');
      const result = await buildRows(raw, { identity, fileName: file.name, hash, receipt });
      if (!result.rows.length) {
        setError('לא נמצאו שורות תקינות. ודאו שיש עמודות תאריך, תיאור וסכום.');
        setStage('error');
        return;
      }
      setNotes({ summaryDropped: result.summaryDropped });
      setRows(result.rows);
      setStage('preview');
    } catch (e) {
      setError(e?.message || 'שגיאה בעיבוד הקובץ');
      setStage('error');
    }
  };

  const active = rows.filter((r) => !r._removed && !r.skip);

  const confirmImport = async () => {
    setStage('saving');
    try {
      const toCreate = active.map((r) => {
        const clean = { ...r };
        UI_FLAGS.forEach((k) => delete clean[k]);
        return clean;
      });
      if (!toCreate.length) {
        setError('אין עסקאות לייבוא — כל השורות הוסרו.');
        setStage('error');
        return;
      }
      const created = await base44.entities.Transaction.bulkCreate(toCreate);
      let list = Array.isArray(created) ? created : (created?.items || created?.records || []);
      if (!list.length) {
        const recent = await base44.entities.Transaction.filter({ owner_id: identity }, { sort: '-created_date', limit: toCreate.length });
        list = recent.items || [];
      }
      const ids = list.map((r) => r.id).filter(Boolean);
      if (ids.length) {
        const info = { id: Date.now().toString(), fileName, ids, count: ids.length, date: new Date().toISOString() };
        const updated = [info, ...imports];
        localStorage.setItem(importsStorageKey, JSON.stringify(updated));
        setImports(updated);
      }
      setStage('done');
      if (onImported) onImported();
    } catch (e) {
      setError(e?.message || 'שגיאה בשמירת העסקאות');
      setStage('error');
    }
  };

  const undoImport = async (imp) => {
    if (!imp?.ids?.length || deletingId) return;
    setDeletingId(imp.id);
    try {
      await base44.entities.Transaction.deleteMany({ id: { $in: imp.ids } });
      const updated = imports.filter((i) => i.id !== imp.id);
      localStorage.setItem(importsStorageKey, JSON.stringify(updated));
      setImports(updated);
      toast({ title: 'הייבוא נמחק', description: `${imp.count} עסקאות הוסרו${imp.fileName ? ' (' + imp.fileName + ')' : ''}` });
      if (onImported) onImported();
    } catch (e) {
      toast({ title: 'שגיאה במחיקה', description: e?.message || 'נסה שוב', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const reset = () => { setStage('idle'); setRows([]); setError(''); setFileName(''); };

  const counted = active.filter((r) => !EXCLUDED_CATEGORIES.includes(r.category));
  const totalExpense = counted.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const totalIncome = counted.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const skipCount = rows.filter((r) => !r._removed && r.skip).length;
  const reviewCount = rows.filter((r) => !r._removed && r.review).length;
  const suspiciousCount = rows.filter((r) => !r._removed && r.suspicious).length;

  const pick = (ref) => (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx" className="hidden" onChange={pick()} />
      <input ref={receiptRef} type="file" accept="image/*" className="hidden" onChange={pick()} />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted/40 active:scale-[0.98] transition-all"
      >
        <FileSpreadsheet className="w-4 h-4 text-primary" />
        ייבוא מקובץ (אקסל / PDF)
      </button>
      <button
        onClick={() => receiptRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted/40 active:scale-[0.98] transition-all"
      >
        <Camera className="w-4 h-4 text-primary" />
        צילום או תמונה של קבלה
      </button>

      {imports.length > 0 && (
        <div className="space-y-1.5">
          {imports.map((imp) => (
            <div key={imp.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" dir="auto">{imp.fileName || 'ייבוא'}</p>
                <p className="text-[10px] text-muted-foreground">{imp.count} עסקאות · {new Date(imp.date).toLocaleDateString('he-IL')}</p>
              </div>
              <button
                onClick={() => undoImport(imp)}
                disabled={deletingId === imp.id}
                className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-destructive/30 text-destructive text-[11px] font-medium hover:bg-destructive/5 active:scale-95 transition-all disabled:opacity-50"
              >
                {deletingId === imp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                מחק
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              ייבוא עסקאות
            </DialogTitle>
          </DialogHeader>

          {stage === 'extracting' && (
            <Centered>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">קורא את הקובץ...</p>
              <p className="text-xs text-muted-foreground truncate max-w-full" dir="ltr">{fileName}</p>
            </Centered>
          )}

          {stage === 'categorizing' && (
            <Centered>
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              <p className="text-sm font-medium">מסווג ובודק כפילויות...</p>
            </Centered>
          )}

          {stage === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-2">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  ניתן לערוך כל קטגוריה וסכום לפני הייבוא.
                  {notes.summaryDropped > 0 && ` ${notes.summaryDropped} שורות סיכום או ללא תאריך לא נכללו.`}
                </span>
              </div>
              {skipCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-expense bg-expense/10 rounded-lg p-2 ring-1 ring-expense/30">
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1"><b>{skipCount}</b> כפילויות ודאיות (אסמכתא זהה או קובץ חופף) לא ייובאו. אפשר לייבא כל אחת בכל זאת.</span>
                  <button
                    onClick={() => setRows((prev) => prev.map((r) => (!r._removed && r.skip ? { ...r, skip: false } : r)))}
                    className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md bg-card border border-border text-foreground"
                  >
                    ייבא את כל הכפילויות
                  </button>
                </div>
              )}
              {reviewCount > 0 && (
                <div className="text-xs bg-accent rounded-lg p-2 ring-1 ring-border">
                  <b>{reviewCount}</b> עסקאות מסומנות "לבדיקה": קיימת עסקה זהה, ויובאו אלא אם תמחקו אותן.
                </div>
              )}
              {suspiciousCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2 ring-1 ring-destructive/30">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span><b>{suspiciousCount}</b> עסקאות עם סכום חריג (מעל 100 אלף ₪). בדקו או מחקו.</span>
                </div>
              )}
              <ClarifyPanel rows={rows} onResolve={resolveMerchant} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">לייבוא: <b className="text-foreground">{active.length}</b> עסקאות</span>
                <span className="text-xs text-muted-foreground">
                  הוצאות <b className="text-expense">{money(totalExpense)} ₪</b>
                  {totalIncome !== 0 && <> · הכנסות <b className="text-income">{money(totalIncome)} ₪</b></>}
                </span>
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {rows.map((r, i) => (r._removed ? null : <PreviewRow key={i} row={r} index={i} onUpdate={updateRow} />))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={confirmImport} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  אשר ייבוא ({active.length})
                </button>
                <button onClick={reset} className="px-4 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">ביטול</button>
              </div>
            </div>
          )}

          {stage === 'saving' && (
            <Centered>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">שומר עסקאות...</p>
            </Centered>
          )}

          {stage === 'done' && (
            <Centered>
              <div className="w-14 h-14 rounded-full bg-income/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-income" />
              </div>
              <p className="text-sm font-semibold">הייבוא הושלם בהצלחה!</p>
              <p className="text-xs text-muted-foreground">{active.length} עסקאות נוספו לחשבון</p>
              <button onClick={() => { reset(); setOpen(false); }} className="mt-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                סגור
              </button>
            </Centered>
          )}

          {stage === 'error' && (
            <Centered>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm font-medium text-center px-4">{error}</p>
              <button onClick={reset} className="mt-2 h-10 px-6 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">
                נסה שנית
              </button>
            </Centered>
          )}

          {stage === 'idle' && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                בחרו קובץ אקסל, CSV או PDF מייצוא הבנק או האשראי, או תמונה של קבלה. המערכת תסווג, תדלג על שורות סיכום ותזהה כפילויות אמיתיות בלבד.
              </p>
              <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5">
                <Download className="w-4 h-4" />
                הורד תבנית לדוגמה
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}