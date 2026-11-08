import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { parseTransaction } from '@/lib/parseTransaction';
import { getCategory } from '@/lib/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function formatAmount(n) {
  return Math.round(n).toLocaleString('he-IL') + ' ₪';
}

function ResultRow({ result }) {
  if (!result.success) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-destructive">{result.error}</p>
          <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{result.file}</p>
          {result.transcript && (
            <p className="text-[11px] text-muted-foreground mt-1" dir="auto">"{result.transcript}"</p>
          )}
        </div>
      </div>
    );
  }
  const { parsed } = result;
  const cat = getCategory(parsed.category);
  const Icon = cat.icon;
  const isIncome = parsed.type === 'income';
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cat.color + '20' }}>
        <Icon className="w-4 h-4" style={{ color: cat.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{cat.label}</p>
        <p className="text-[11px] text-muted-foreground truncate" dir="auto">{result.transcript}</p>
      </div>
      <div className={`text-sm font-bold shrink-0 ${isIncome ? 'text-income' : 'text-expense'}`}>
        {isIncome ? '+' : '-'}{formatAmount(parsed.amount)}
      </div>
    </div>
  );
}

export default function IvrSync({ onSynced }) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [current, setCurrent] = useState(null);
  const { identity } = useUserIdentity();
  const inputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith('audio/') || /\.(wav|mp3|ogg|oga|m4a|webm|mp4|flac)$/i.test(f.name)
    );
    if (!files.length || !identity) return;
    setProcessing(true);
    setResults([]);
    setOpen(true);

    const collected = [];
    for (let i = 0; i < files.length; i++) {
      setCurrent({ name: files[i].name, index: i, total: files.length });
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
        const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
        const text = typeof transcript === 'string' ? transcript : (transcript?.transcript || transcript?.text || '');
        const parsed = parseTransaction(text);
        if (!parsed) {
          collected.push({ file: files[i].name, success: false, error: 'לא זוהה סכום בהקלטה', transcript: text });
        } else {
          await base44.entities.Transaction.create({
            type: parsed.type,
            amount: parsed.amount,
            category: parsed.category,
            description: parsed.description,
            date: new Date().toISOString().split('T')[0],
            owner_id: identity,
            source: 'ivr',
          });
          collected.push({ file: files[i].name, success: true, parsed, transcript: text });
        }
      } catch (e) {
        collected.push({ file: files[i].name, success: false, error: e?.message || 'שגיאה בעיבוד' });
      }
      setResults([...collected]);
    }
    setProcessing(false);
    setCurrent(null);
    if (onSynced) onSynced();
  };

  const successCount = results.filter((r) => r.success).length;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={processing}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-primary/30 bg-primary/5 text-primary font-semibold text-sm hover:bg-primary/10 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        <Phone className="w-4 h-4" />
        סנכרון הקלטות טלפון
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!processing) setOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>סנכרון הקלטות</DialogTitle>
          </DialogHeader>
          {processing ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">
                מעבד הקלטה {current?.index + 1} מתוך {current?.total}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-full" dir="ltr">{current?.name}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm pb-2 border-b border-border">
                <CheckCircle2 className="w-4 h-4 text-income" />
                <span className="font-medium">{successCount} מתוך {results.length} הוקלטו בהצלחה</span>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {results.map((r, i) => (
                  <ResultRow key={i} result={r} />
                ))}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 mt-2"
              >
                סגור
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}