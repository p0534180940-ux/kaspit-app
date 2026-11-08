import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Check, RotateCcw, Wand2 } from 'lucide-react';
import { getCategory } from '@/lib/categories';
import { parseTransaction } from '@/lib/parseTransaction';
import CategorySelect from '@/components/CategorySelect';
import { loadRules, loadGlobalRules, matchRuleGlobal, saveRule } from '@/lib/categoryRules';

export default function SmartAdd({ onSaved }) {
  const { identity } = useUserIdentity();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [rules, setRules] = useState([]);
  const [globalRules, setGlobalRules] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!identity) return;
    loadRules(identity).then(setRules).catch(() => {});
    loadGlobalRules().then(setGlobalRules).catch(() => {});
  }, [identity]);

  const parse = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError('');
    setPreview(null);
    let result = parseTransaction(text);
    if (!result) {
      setLoading(false);
      setError('לא הצלחתי להבין את הטקסט. נסה למשל: "100 שח ברמי לוי" או "קיבלתי משכורת 8000" או "משכנתא 3500"');
      return;
    }
    // החל כללים שנלמדו מייבוא / תיקונים ידניים קודמים — עוקף את הסיווג הסטטי
    const rule = matchRuleGlobal(result.description || text, rules, globalRules);
    if (rule) {
      result = { ...result, type: rule.type, category: rule.category };
    } else if (result.category === 'other_expense' || result.category === 'misc_income_general') {
      // סיווג חכם בצד השרת (בינה מלאכותית + מידע על בתי עסק בישראל)
      const res = await base44.functions
        .invoke('classifyTransaction', { text, type: result.type })
        .catch(() => null);
      if (res?.data?.ok && res.data.category) {
        result = { ...result, category: res.data.category, type: res.data.type };
      }
    }
    setLoading(false);
    setPreview(result);
  };

  const confirm = async () => {
    if (!preview || loading) return;
    setLoading(true);
    try {
      await base44.entities.Transaction.create({
        type: preview.type,
        amount: Number(preview.amount),
        category: preview.category,
        description: preview.description || '',
        date: new Date().toISOString().split('T')[0],
        owner_id: identity,
      });
      // למידה: שמור כלל שמקשר תיאור → קטגוריה כדי שפעם הבאה יזהה אוטומטית
      if (preview.description && preview.description.trim().length >= 2) {
        try {
          const saved = await saveRule(identity, preview.description, preview.category, preview.type);
          if (saved) setRules((prev) => [saved, ...prev]);
        } catch {}
      }
      setText('');
      setPreview(null);
      onSaved?.();
    } catch (e) {
      setError('שמירה נכשלה. נסה שנית.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setError('');
    inputRef.current?.focus();
  };

  const previewCat = preview ? getCategory(preview.category) : null;
  const isIncome = preview?.type === 'income';

  return (
    <div className="bg-card rounded-2xl border border-border shadow-luxe p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <h2 className="font-heading font-bold text-sm">רישום מהיר חכם</h2>
      </div>

      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); setPreview(null); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') parse(); }}
          placeholder='למשל: "100 שח ברמי לוי" או "משכנתא 3500" או "אלף שקל בכולל"'
          className="h-12 flex-1 text-base"
          disabled={loading}
        />
        <Button
          onClick={parse}
          disabled={!text.trim() || loading}
          className="h-12 px-5 bg-primary text-primary-foreground hover:bg-primary/90 border-0"
          size="lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}

      {preview && previewCat && (
        <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: previewCat.color + '20' }}
            >
              <previewCat.icon className="w-6 h-6" style={{ color: previewCat.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xl">
                {isIncome ? '+' : '-'}{new Intl.NumberFormat('he-IL').format(preview.amount)} ₪
              </p>
              <p className="text-sm text-muted-foreground font-medium">{previewCat.label}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${isIncome ? 'bg-income text-white' : 'bg-expense text-white'}`}>
              {isIncome ? 'הכנסה' : 'הוצאה'}
            </span>
          </div>

          {preview.description && (
            <p className="text-sm text-foreground/70 bg-card rounded-lg px-3 py-2 border border-border">
              {preview.description}
            </p>
          )}

          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">קטגוריה — אפשר לשנות</p>
            <CategorySelect
              type={preview.type}
              value={preview.category}
              onChange={(cat) => setPreview({ ...preview, category: cat })}
            />
            <p className="text-[11px] text-muted-foreground">
              אם תשנו את הקטגוריה, המערכת תזכור זאת לפעם הבאה עבור "{preview.description || text}".
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={confirm}
              disabled={loading}
              className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 border-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span className="font-semibold">אישור ושמירה</span>
            </Button>
            <Button
              onClick={reset}
              variant="outline"
              disabled={loading}
              className="h-11 px-4"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}