import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { monthKey } from '@/lib/format';
import { getCategory } from '@/lib/categories';
import { ChevronRight, ChevronLeft, Check, Loader2, Home, Zap, Phone, Wallet, PiggyBank } from 'lucide-react';

const STEPS = [
  {
    title: 'הוצאות דיור ומגורים',
    subtitle: 'ההוצאות הקבועות של הבית',
    icon: Home,
    color: '#B8893A',
    items: [
      { category: 'rent', label: 'שכר דירה' },
      { category: 'mortgage', label: 'משכנתה' },
      { category: 'municipal_tax', label: 'ארנונה' },
      { category: 'building_committee', label: 'ועד בית / מיסי ישוב' },
    ],
  },
  {
    title: 'חשמל, מים וגז',
    subtitle: 'שירותים ציבוריים',
    icon: Zap,
    color: '#B8893A',
    items: [
      { category: 'electricity', label: 'חשמל' },
      { category: 'water_sewage', label: 'מים וביוב' },
      { category: 'gas', label: 'גז' },
    ],
  },
  {
    title: 'תקשורת',
    subtitle: 'טלפון ואינטרנט',
    icon: Phone,
    color: '#65A30D',
    items: [
      { category: 'tv_internet', label: 'טלוויזיה ואינטרנט' },
      { category: 'phone_mobile_landline', label: 'טלפון נייד ונייח' },
      { category: 'content_services', label: 'שירותי תוכן (נטפליקס וכו\')' },
    ],
  },
  {
    title: 'חיסכון וביטוחים',
    subtitle: 'הגנה על העתיד',
    icon: PiggyBank,
    color: '#475569',
    items: [
      { category: 'savings_deposits', label: 'הפקדה לחיסכון' },
      { category: 'life_insurance', label: 'ביטוח חיים / פנסיה' },
      { category: 'national_insurance', label: 'ביטוח לאומי' },
      { category: 'health_fund', label: 'קופ"ח (תשלום קבוע)' },
    ],
  },
  {
    title: 'הכנסות קבועות',
    subtitle: 'הכסף שנכנס כל חודש',
    icon: Wallet,
    color: '#2D8659',
    items: [
      { category: 'salary_general', label: 'משכורת' },
      { category: 'child_benefit', label: 'קצבת ילדים' },
      { category: 'benefits_general', label: 'קצבאות / סיוע' },
      { category: 'business_income', label: 'הכנסה מעסק' },
    ],
  },
];

export default function Onboarding() {
  const { identity, setOnboarded } = useUserIdentity();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleChange = (category, val) => {
    const num = val.replace(/[^\d]/g, '');
    setValues((prev) => ({ ...prev, [category]: num }));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const month = monthKey();
      const records = [];
      STEPS.forEach((s, sIdx) => {
        s.items.forEach((item) => {
          const val = Number(values[item.category]);
          if (val > 0) {
            records.push({
              owner_id: identity,
              month,
              category: item.category,
              type: sIdx === STEPS.length - 1 ? 'income' : 'expense',
              planned_amount: val,
            });
          }
        });
      });
      if (records.length > 0) {
        await base44.entities.Budget.bulkCreate(records);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      setOnboarded(true);
    }
  };

  const StepIcon = current.icon;
  const filledCount = current.items.filter((i) => Number(values[i.category]) > 0).length;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">שלב {step + 1} מתוך {STEPS.length}</span>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4" />
              חזרה
            </button>
          )}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: current.color + '18' }}>
            <StepIcon className="w-6 h-6" style={{ color: current.color }} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl">{current.title}</h2>
            <p className="text-sm text-muted-foreground">{current.subtitle}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 mb-4">
          מלאו את הסכומים החודשיים הקבועים שלכם. ניתן להשאיר ריק מה שלא רלוונטי.
        </p>

        <div className="space-y-3">
          {current.items.map((item) => {
            const cat = getCategory(item.category);
            const CatIcon = cat.icon;
            return (
              <div key={item.category} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (cat.color || current.color) + '18' }}>
                  <CatIcon className="w-5 h-5" style={{ color: cat.color || current.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.label}</p>
                </div>
                <div className="relative w-32">
                  <Input
                    type="tel"
                    inputMode="numeric"
                    value={values[item.category] || ''}
                    onChange={(e) => handleChange(item.category, e.target.value)}
                    placeholder="0"
                    className="h-10 text-left font-semibold pl-8"
                    dir="ltr"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">₪</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">{filledCount} מתוך {current.items.length} מולאו</span>
        </div>
        {isLast ? (
          <Button
            onClick={handleFinish}
            disabled={saving}
            className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base rounded-xl"
            size="lg"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {saving ? 'שומר...' : 'סיום והתחלה'}
          </Button>
        ) : (
          <Button
            onClick={() => setStep(step + 1)}
            className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base rounded-xl"
            size="lg"
          >
            המשך
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        {step === 0 && (
          <button onClick={() => setOnboarded(true)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-2 py-1">
            דלגו עכשיו, אמלא אחר כך
          </button>
        )}
      </div>
    </div>
  );
}