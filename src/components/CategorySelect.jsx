import { getGroupedCategories, getCategory } from '@/lib/categories';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CategorySelect({ type, value, onChange, className = '' }) {
  const groups = getGroupedCategories(type);
  const current = getCategory(value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-11 ${className}`}>
        <SelectValue>
          <span className="flex items-center gap-2">
            <current.icon className="w-4 h-4" style={{ color: current.color }} />
            {current.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {groups.map((g) => (
          <SelectGroup key={g.id}>
            <SelectLabel>{g.label}</SelectLabel>
            {g.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <c.icon className="w-4 h-4" style={{ color: c.color }} />
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}