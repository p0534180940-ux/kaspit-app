import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { formatCurrency, monthKey, monthLabelBoth } from '@/lib/format';
import { getGroupedCategories, getCategory, MIGRATION_MAP, isSpend } from '@/lib/categories';
import { generateBudgetAdvice } from '@/lib/budgetAdvice';
import { onlyConfirmed } from '@/lib/txnStatus';
import MonthPicker from '@/components/MonthPicker';
import BudgetRow from '@/components/BudgetRow';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import BudgetWizard from '@/components/wizard/BudgetWizard';
import { Wand2, Sparkles, Lightbulb, Loader2, TrendingUp, TrendingDown, Scale, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

function BudgetGroup({ group, plannedMap, actualMap, onSave, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const GroupIcon = group.icon;
  return (
    <div className="relative overflow-hidden bg-card rounded-2xl border border-border shadow-luxe">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3.5 hover:bg-accent/5 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: group.color + '22' }}>
          <GroupIcon className="w-4 h-4" style={{ color: group.color }} />
        </div>
        <span className="flex-1 text-right font-bold text-sm">{group.label}</span>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{group.categories.length}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="space-y-1.5 px-2 pb-2">
          {group.categories.map((cat) => (
            <BudgetRow
              key={cat.id}
              category={cat}
              planned={plannedMap[cat.id] || 0}
              actual={actualMap[cat.id] || 0}
              onSave={(amount) => onSave(cat.id, amount, cat.group === 'salary' || cat.group === 'benefits' || cat.group === 'misc_income' ? 'income' : 'expense')}
              showProgress={cat.group !== 'salary' && cat.group !== 'benefits' && cat.group !== 'misc_income'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const GUIDE_CONTENT = `# איך לעקוב אחר התקציב שלך: מדריך מעשי

## לשמירה על יציבות כלכלית — על פי מתודולוגיית פעמונים

ליציבות כלכלית כדרך חיים, תדרשו להקדיש: **15 דק' בשבוע · 30 דק' בחודש · 45 דק' בשנה**

---

## הכנה מוקדמת

**בנו מסלול חיים** — תכנית כלכלית ארוכת טווח הלוקחת בחשבון תחנות עתידיות:
- אירועים משפחתיים: לידה, בר/בת מצווה, חתונה, מעבר דירה
- אירועים כלכליים: שינוי בהחזר משכנתה, סיום חוב, יציאה לפנסיה
- חלומות שתרצו להגשים: שדרוג מטבח, טיול גדול, הרחבת הדירה
- **קופה לשעת חירום:** חסכו לפחות 3 משכורות חודשיות למשברים בלתי צפויים

**חיו רק ממה שיש:**
- אל תוציאו יותר ממה שכבר צברתם
- אל תיקחו הלוואות צרכניות
- אל תמשכנו את העתיד שלכם למען הנאות ההווה

**קבעו דייט חודשי קבוע** לבקרה — שריינו זמן ביומן, בשעות שקטות כשהילדים לא מפריעים.

---

## בקרה שבועית | 15 דקות

**עיקרון המנחה: עומק הבקרה כעומק היתרה**

- היכנסו פעם בשבוע לחשבון הבנק
- וודאו שהיתרה חיובית
- וודאו שהתנועות מוכרות לכם ושהסכומים תואמים לציפיותיכם
- סמנו לברור כל תנועה לא מוכרת

**הגדירו סף תחתון אישי** — לפחות 10% מההוצאה החודשית הממוצעת. כך לא תיכנסו למינוס אפילו כשהחיובים מגיעים לפני המשכורת.

---

## בקרה חודשית | 30 דקות

- **כרטיסי אשראי:** וודאו שכל החיובים מוכרים ושהסכומים נכונים
- **חשבונות:** בדקו חשמל, מים, ארנונה, גז, טלפון — וודאו שהסכומים תואמים לציפיותיכם
- **תלוש שכר:** וודאו שהסכום תואם, הפרשות לפנסיה נכללות, ואין טעויות

**זיהוי נורות אדומות:** אם יתרת החשבון יורדת 3 חודשים רצופים — זוהי נורה אדומה. נתחו את הסיבות, חזרו לבקרה הדוקה ורשמו כל פעולה עד שתתייצבו.

---

## בקרה שנתית | 45 דקות

- **פנסיה וביטוחים:** בדקו שהכספים שהופרשו הגיעו ליעדם. השוו דמי ניהול. ודאו שהכיסוי הביטוחי תואם את הצורך
- **עדכון מסלול החיים:** הוסיפו שנה נוספת לתכנון ועדכנו אירועים צפויים
- **טבלת ריכוז נכסים:** עדכנו את רשימת כל החסכונות והנכסים שברשותכם

---

## התמודדות עם משברים כלכליים

אם נקלעתם למשבר (אובדן עבודה, מחלה, הוצאה גדולה בלתי צפויה):

**שלב 1:** הפעילו את מנגנוני ההגנה — השתמשו בקופת החירום בתבונה ובהדרגה

**שלב 2:** הדקו את הבקרה — חזרו לרישום מפורט של כל פעולה

**שלב 3:** הגדירו מחדש את יעדי החסכונות — אולי תדחו אירוע מתוכנן ותסיטו כספים

**שלב 4:** הגדילו את ההכנסה — גם תוספת הכנסה זמנית יכולה לסייע מאוד

**שלב 5:** רק במידת הצורך — קחו הלוואה חכמה לטווח קצר, אחרי בחינת יכולת החזר

זכרו: אתם כבר יודעים לעשות את זה. מדובר במאמץ זמני עד שתתייצבו מחדש.`;

export default function Budget() {
  const [month, setMonth] = useState(monthKey());
  const [budgetRecords, setBudgetRecords] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { identity: ownerId } = useUserIdentity();

  const load = useCallback(async (silent = false) => {
    if (!ownerId) return;
    if (!silent) setLoading(true);
    try {
      const [budgets, txns] = await Promise.all([
        base44.entities.Budget.filter({ owner_id: ownerId, month }),
        base44.entities.Transaction.filter({ owner_id: ownerId }, '-date', 2000),
      ]);
      setBudgetRecords(budgets);
      setTransactions(onlyConfirmed(txns).filter((t) => t.date && t.date.startsWith(month)));
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [month, ownerId]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh when transactions change anywhere (e.g. Home page)
  useEffect(() => {
    if (!ownerId) return;
    const unsubscribe = base44.entities.Transaction.subscribe(() => {
      load(true);
    });
    return unsubscribe;
  }, [ownerId, load]);

  const plannedMap = {};
  budgetRecords.forEach((b) => {
    const migratedCat = MIGRATION_MAP[b.category] || b.category;
    plannedMap[migratedCat] = b.planned_amount;
  });

  const actualMap = {};
  transactions.forEach((t) => {
    const migratedCat = MIGRATION_MAP[t.category] || t.category;
    actualMap[migratedCat] = (actualMap[migratedCat] || 0) + (t.amount || 0);
  });

  const expenseGroups = getGroupedCategories('expense');
  const incomeGroups = getGroupedCategories('income');

  const totalPlannedIncome = incomeGroups.flatMap((g) => g.categories)
    .reduce((s, c) => s + (plannedMap[c.id] || 0), 0);
  const totalPlannedExpense = expenseGroups.flatMap((g) => g.categories)
    .reduce((s, c) => s + (plannedMap[c.id] || 0), 0);
  const totalActualIncome = transactions
    .filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalActualExpense = transactions
    .filter(isSpend).reduce((s, t) => s + (t.amount || 0), 0);
  const plannedBalance = totalPlannedIncome - totalPlannedExpense;
  const plannedExpenseCount = budgetRecords.filter((b) => b.type !== 'income' && b.planned_amount > 0).length;

  const saveBudgetItem = async (categoryId, amount, type) => {
    const existing = budgetRecords.find((b) => b.category === categoryId);
    const numAmount = Number(amount) || 0;
    try {
      if (existing) {
        if (numAmount <= 0) {
          await base44.entities.Budget.delete(existing.id);
        } else {
          await base44.entities.Budget.update(existing.id, { planned_amount: numAmount });
        }
      } else if (numAmount > 0) {
        await base44.entities.Budget.create({
          owner_id: ownerId, month, category: categoryId, type, planned_amount: numAmount,
        });
      }
      load(true);
    } catch (e) { console.error(e); }
  };

  const getAdvice = async () => {
    setLoadingAdvice(true);
    setAdvice('');
    try {
      const result = generateBudgetAdvice({
        transactions,
        budgetRecords,
        month,
        monthLabelStr: monthLabelBoth(month),
      });
      setAdvice(result);
    } catch (e) {
      setAdvice('שגיאה בהכנת ייעוץ. נסה שוב.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-12 bg-muted animate-pulse rounded-xl" />
        <div className="h-24 bg-muted animate-pulse rounded-2xl" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <MonthPicker month={month} onChange={setMonth} />

      {plannedExpenseCount < 8 && (
        <Button onClick={() => setWizardOpen(true)} variant="outline" className="w-full border-primary/40">
          <Wand2 className="w-4 h-4 ml-2" />בנה לי תקציב
        </Button>
      )}
      {wizardOpen && <BudgetWizard open={wizardOpen} onOpenChange={setWizardOpen} ownerId={ownerId} onSaved={() => load(true)} />}

      <div className="relative overflow-hidden gradient-primary text-primary-foreground rounded-3xl p-6 shadow-luxe">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/8 rounded-full" />
        <div className="absolute -bottom-12 -right-8 w-40 h-40 bg-accent/15 rounded-full" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80 font-medium">מאזן תכנוני</p>
            <p className="text-3xl font-heading font-bold mt-1 tracking-tight">{formatCurrency(plannedBalance)}</p>
          </div>
          <Scale className="w-9 h-9 opacity-25" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden bg-card rounded-2xl p-4 border border-border shadow-luxe">
          <div className="absolute -top-4 -left-4 w-20 h-20 bg-income/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-income flex items-center justify-center shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-income">הכנסות</span>
            </div>
            <p className="text-lg font-heading font-bold mt-2">{formatCurrency(totalPlannedIncome)}</p>
            <p className="text-xs text-muted-foreground">בפועל: {formatCurrency(totalActualIncome)}</p>
          </div>
        </div>
        <div className="relative overflow-hidden bg-card rounded-2xl p-4 border border-border shadow-luxe">
          <div className="absolute -top-4 -left-4 w-20 h-20 bg-expense/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-expense flex items-center justify-center shadow-sm">
                <TrendingDown className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-expense">הוצאות</span>
            </div>
            <p className="text-lg font-heading font-bold mt-2">{formatCurrency(totalPlannedExpense)}</p>
            <p className="text-xs text-muted-foreground">בפועל: {formatCurrency(totalActualExpense)}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full gradient-expense" />
          <h2 className="font-heading font-bold text-lg">תקציב הוצאות</h2>
        </div>
        <div className="space-y-2">
          {expenseGroups.map((group) => (
            <BudgetGroup
              key={group.id}
              group={group}
              plannedMap={plannedMap}
              actualMap={actualMap}
              onSave={saveBudgetItem}
              defaultOpen={group.id === 'food' || group.id === 'housing'}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full gradient-income" />
          <h2 className="font-heading font-bold text-lg">תקציב הכנסות</h2>
        </div>
        <div className="space-y-2">
          {incomeGroups.map((group) => (
            <BudgetGroup
              key={group.id}
              group={group}
              plannedMap={plannedMap}
              actualMap={actualMap}
              onSave={saveBudgetItem}
              defaultOpen={group.id === 'salary'}
            />
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-5 border border-primary/20 shadow-luxe">
        <div className="absolute -top-8 -left-8 w-24 h-24 bg-accent/10 rounded-full" />
        <div className="relative flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl gradient-gold flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-heading font-bold text-lg">ייעוץ חכם אישי</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          ניתוח מותאם אישית של הנתונים שלך, עם המלצות לחיסכון, הגדלת הכנסות ובניית קרן חירום.
        </p>
        <Button onClick={getAdvice} disabled={loadingAdvice} className="w-full gradient-primary border-0 shadow-luxe" size="lg">
          {loadingAdvice ? (
            <Loader2 className="w-4 h-4 animate-spin ml-2" />
          ) : (
            <Lightbulb className="w-4 h-4 ml-2" />
          )}
          {loadingAdvice ? 'מכין ייעוץ...' : 'קבל ייעוץ חכם'}
        </Button>
        {advice && (
          <div className="mt-4 pt-4 border-t border-primary/10 text-sm leading-relaxed space-y-2">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h2 className="text-lg font-heading font-bold mt-3 mb-1" {...props} />,
                h2: ({ node, ...props }) => <h3 className="text-base font-semibold mt-3 mb-1" {...props} />,
                h3: ({ node, ...props }) => <h4 className="text-sm font-semibold mt-2 mb-1" {...props} />,
                p: ({ node, ...props }) => <p className="leading-relaxed mb-2" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pr-5 mb-2 space-y-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pr-5 mb-2 space-y-1" {...props} />,
                li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
              }}
            >
              {advice}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden bg-card rounded-2xl border border-border shadow-luxe">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center gap-3 p-4 hover:bg-accent/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="flex-1 text-right font-bold text-sm">מדריך פעמונים לשמירה על יציבות כלכלית</span>
          {guideOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {guideOpen && (
          <div className="px-4 pb-4 text-sm leading-relaxed">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h2 className="text-base font-heading font-bold mt-4 mb-2 text-primary" {...props} />,
                h2: ({ node, ...props }) => <h3 className="text-sm font-bold mt-4 mb-2 text-foreground" {...props} />,
                p: ({ node, ...props }) => <p className="leading-relaxed mb-3 text-muted-foreground" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-none space-y-2 mb-3" {...props} />,
                li: ({ node, ...props }) => <li className="leading-relaxed text-sm text-foreground/80 pr-1" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                hr: () => <hr className="my-4 border-border/60" />,
              }}
            >
              {GUIDE_CONTENT}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}