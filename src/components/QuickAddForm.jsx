import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { getGroupedCategories } from '@/lib/categories';
import { Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';

export default function QuickAddForm({ open, onOpenChange, type = 'expense', onSaved }) {
  const { identity } = useUserIdentity();
  const [categoryId, setCategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const grouped = useMemo(() => getGroupedCategories(type), [type]);
  const isExpense = type === 'expense';

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.trim();
    return grouped.map((g) => ({
      ...g,
      categories: g.categories.filter((c) => c.label.includes(q) || c.keywords?.some((k) => k.includes(q))),
    })).filter((g) => g.categories.length > 0);
  }, [grouped, search]);

  const handleSave = async () => {
    if (!categoryId || !amount || Number(amount) <= 0 || saving) return;
    setSaving(true);
    try {
      await base44.entities.Transaction.create({
        type,
        amount: Number(amount),
        category: categoryId,
        description: description.trim(),
        date: new Date().toISOString().split('T')[0],
        owner_id: identity,
      });
      onOpenChange(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const reset = () => {
    setCategoryId(null);
    setAmount('');
    setDescription('');
    setSearch('');
    setCollapsedGroups({});
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isExpense ? 'הוספת הוצאה' : 'הוספת הכנסה'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש קטגוריה..."
              className="h-10 pr-9"
            />
          </div>

          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="0"
              className="text-2xl font-bold h-14 text-center pl-10"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground pointer-events-none">₪</span>
          </div>

          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            placeholder="תיאור (אופציונלי)"
            className="h-11"
          />

          <div className="space-y-2">
            {filteredGroups.map((group) => {
              const GroupIcon = group.icon;
              const isCollapsed = collapsedGroups[group.id] && !search;
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-muted-foreground"
                  >
                    <GroupIcon className="w-4 h-4" style={{ color: group.color }} />
                    <span className="flex-1 text-right">{group.label}</span>
                    {search ? null : (isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-3 gap-1.5 pb-1">
                      {group.categories.map((cat) => {
                        const Icon = cat.icon;
                        const selected = categoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryId(cat.id)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                              selected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/30'
                            }`}
                          >
                            <Icon className="w-5 h-5" style={{ color: cat.color }} />
                            <span className="text-[10px] text-center leading-tight line-clamp-2">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleSave}
            disabled={!categoryId || !amount || saving}
            className="w-full h-12 text-base gradient-primary border-0 shadow-luxe"
            size="lg"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'שמור'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}