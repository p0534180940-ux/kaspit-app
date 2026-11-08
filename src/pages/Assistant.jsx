import { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Lightbulb, Loader2, Send, Check, RotateCcw, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { parseTransaction } from '@/lib/parseTransaction';
import { getCategory } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { useAgent } from '@/hooks/useAgent';
import { loadRules, loadGlobalRules, matchRuleGlobal, saveRule } from '@/lib/categoryRules';

function TransactionChat({ identity }) {
  const storageKey = `kasplit_chat_tx_${identity || 'anon'}`;
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { role: 'assistant', content: 'שלום! 👋 כתוב לי מה שילמת או קיבלת ואני ארשום את זה.\n\nלדוגמה:\n• "100 שח ברמי לוי"\n• "קיבלתי משכורת 8000"\n• "דלק 250"\n• "שכר דירה 3500"' }
    ];
  });
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState(() => {
    try { const s = localStorage.getItem(storageKey + '_preview'); if (s) return JSON.parse(s); } catch {}
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [globalRules, setGlobalRules] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    if (identity) {
      loadRules(identity).then(setRules).catch(() => {});
      loadGlobalRules().then(setGlobalRules).catch(() => {});
    }
  }, [identity]);

  useEffect(() => {
    try {
      if (preview) localStorage.setItem(storageKey + '_preview', JSON.stringify(preview));
      else localStorage.removeItem(storageKey + '_preview');
    } catch {}
  }, [preview, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, preview, loading]);

  const handleParse = () => {
    if (!input.trim() || loading) return;
    let result = parseTransaction(input);
    if (!result) {
      setMessages((prev) => [...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: 'לא הצלחתי להבין את הטקסט. 🤔\nנסה לכלול סכום, למשל: "100 שח ברמי לוי" או "משכורת 8000"' }
      ]);
      setInput('');
      return;
    }
    // החל כללים שנלמדו מתיקונים וייבוא קודמים — עוקף ניחוש שגוי
    const rule = matchRuleGlobal(result.description || input, rules, globalRules);
    if (rule) result = { ...result, type: rule.type, category: rule.category };
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setInput('');
    setPreview(result);
  };

  const confirm = async () => {
    if (!preview) return;
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
      // למידה: שמור את הסיווג ככלל לעתיד
      if (preview.description && preview.description.trim().length >= 2) {
        try {
          const saved = await saveRule(identity, preview.description, preview.category, preview.type);
          if (saved) setRules((prev) => [saved, ...prev]);
        } catch {}
      }
      const cat = getCategory(preview.category);
      const typeLabel = preview.type === 'income' ? 'הכנסה' : 'הוצאה';
      const sign = preview.type === 'income' ? '+' : '-';
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `✅ נרשם בהצלחה!\n\n**${typeLabel}** של ${sign}${formatCurrency(preview.amount)}\n**קטגוריה:** ${cat.label}${preview.description ? `\n**תיאור:** ${preview.description}` : ''}`
      }]);
      setPreview(null);
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'שגיאה בשמירה. נסה שנית. ❌'
      }]);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
  };

  const previewCat = preview ? getCategory(preview.category) : null;
  const isIncome = preview?.type === 'income';

  return (
    <div className="space-y-4">
      <div className="space-y-3 min-h-[40vh]">
        {messages.map((msg, i) => (
          <div key={i} className={`group items-start gap-1 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
            <button
              onClick={() => setMessages((prev) => prev.filter((_, j) => j !== i))}
              title="מחק הודעה"
              className="mt-2 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity order-last"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown className="text-sm prose prose-sm max-w-none">{msg.content || ''}</ReactMarkdown>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {preview && previewCat && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border-2 border-primary/30 bg-primary/5 px-4 py-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: previewCat.color + '20' }}>
                  <previewCat.icon className="w-5 h-5" style={{ color: previewCat.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{isIncome ? '+' : '-'}{formatCurrency(preview.amount)}</p>
                  <p className="text-xs text-muted-foreground">{previewCat.label}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isIncome ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                  {isIncome ? 'הכנסה' : 'הוצאה'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={confirm} disabled={loading} className="flex-1 h-9" size="sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  אישור ושמירה
                </Button>
                <Button onClick={reset} variant="outline" disabled={loading} className="h-9 px-3" size="sm">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {!preview && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleParse(); }}
            placeholder='למשל: "100 שח ברמי לוי"'
            className="h-12"
            disabled={loading}
          />
          <Button onClick={handleParse} disabled={!input.trim() || loading} className="h-12 px-4" size="lg">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AdviceChat({ identity }) {
  const { messages, loading, error, send, deleteMessage } = useAgent('budget_advisor', identity);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, error]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    send(`מזהה משתמש: ${identity}\n\n${input.trim()}`);
    setInput('');
  };

  const displayMessages = messages.map((msg) => {
    if (msg.role === 'user' && msg.content?.startsWith('מזהה משתמש:')) {
      const idx = msg.content.indexOf('\n\n');
      return { ...msg, content: idx >= 0 ? msg.content.slice(idx + 2) : msg.content };
    }
    return msg;
  });

  const hasMessages = displayMessages.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3 min-h-[40vh]">
        {!hasMessages && !error && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl px-4 py-2.5 bg-card border border-border">
              <p className="text-sm">
                שלום! 👋 אני המאמן הכלכלי שלך. שאל כל שאלה — למשל "האם כדאי לי לקנות דירה?", "איך אני חוסך יותר?" או "איפה אני חורג מהתקציב?" — ואני אנתח את הנתונים שלך ואענה לך אישית.
              </p>
            </div>
          </div>
        )}
        {displayMessages.map((msg, i) => (
          <div key={msg.id || i} className={`group items-start gap-1 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
            <button
              onClick={() => deleteMessage(messages[i])}
              title="מחק הודעה"
              className="mt-2 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity order-last"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  className="text-sm prose prose-sm max-w-none"
                  components={{
                    h1: ({ node, ...props }) => <h2 className="text-base font-heading font-bold mt-3 mb-1" {...props} />,
                    h2: ({ node, ...props }) => <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />,
                    p: ({ node, ...props }) => <p className="leading-relaxed mb-2" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pr-5 mb-2 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pr-5 mb-2 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="leading-relaxed text-sm" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                  }}
                >
                  {msg.content || ''}
                </ReactMarkdown>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl px-4 py-2.5 bg-destructive/5 border border-destructive/20">
              <p className="text-sm text-destructive">
                לא הצלחתי להתחבר למאמן הכלכלי כעת. נסה שוב בעוד רגע.
              </p>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="שאל כל שאלה כלכלית..."
          className="h-12"
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={!input.trim() || loading} className="h-12 px-4" size="lg">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}

export default function Assistant() {
  const { identity } = useUserIdentity();
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('kasplit_assistant_tab') || 'transaction'; } catch { return 'transaction'; }
  });

  useEffect(() => {
    try { localStorage.setItem('kasplit_assistant_tab', tab); } catch {}
  }, [tab]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 bg-card rounded-2xl p-1 border border-border">
        <button
          onClick={() => setTab('transaction')}
          className={`flex-1 h-11 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
            tab === 'transaction' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          רישום עסקה
        </button>
        <button
          onClick={() => setTab('budget')}
          className={`flex-1 h-11 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
            tab === 'budget' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          אימון כלכלי
        </button>
      </div>

      {tab === 'transaction' ? (
        <TransactionChat identity={identity} />
      ) : (
        <AdviceChat identity={identity} />
      )}
    </div>
  );
}