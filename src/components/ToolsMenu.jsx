import { useNavigate } from 'react-router-dom';
import { Menu, ShieldCheck, Sparkles, Repeat, Keyboard, PiggyBank, Landmark, GraduationCap, FileText, Lock } from 'lucide-react';
import useAppUser from '@/lib/useAppUser';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TOOLS = [
  { to: '/debts', label: 'חובות והלוואות', icon: Landmark },
  { to: '/fixed', label: 'הוצאות קבועות ושנתיות', icon: Repeat },
  { to: '/savings', label: 'קופות חיסכון', icon: PiggyBank },
  { to: '/assistant', label: 'אימון וייעוץ', icon: Sparkles },
  { to: '/t9-guide', label: 'מדריך הקשות T9', icon: Keyboard },
];

const ADMIN_TOOL = { to: '/admin', label: 'ניהול', icon: ShieldCheck };
const COACH_TOOL = { to: '/coach', label: 'אזור מאמן', icon: GraduationCap };
const LEGAL = [
  { to: '/privacy', label: 'מדיניות פרטיות', icon: Lock },
  { to: '/terms', label: 'תנאי שימוש', icon: FileText },
];

export default function ToolsMenu() {
  const navigate = useNavigate();
  const user = useAppUser();
  const tools = [...TOOLS];
  if (user?.is_coach) tools.push(COACH_TOOL);
  if (user?.role === 'admin') tools.push(ADMIN_TOOL);

  const item = (tool) => (
    <DropdownMenuItem key={tool.to} onClick={() => navigate(tool.to)} className="gap-2 cursor-pointer">
      <tool.icon className="w-4 h-4" />
      <span>{tool.label}</span>
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors outline-none"
        aria-label="תפריט כלים"
      >
        <Menu className="w-5 h-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>כלים והגדרות</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tools.map(item)}
        <DropdownMenuSeparator />
        {LEGAL.map(item)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}