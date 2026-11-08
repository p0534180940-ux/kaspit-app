import { Outlet, NavLink } from 'react-router-dom';
import { Home as HomeIcon, BarChart3, Target, Wallet, Sparkles } from 'lucide-react';
import AccountMenu from '@/components/AccountMenu';
import ToolsMenu from '@/components/ToolsMenu';
import MailingButton from '@/components/MailingButton';
import HebrewDate from '@/components/HebrewDate';
import DuplicateWatcher from '@/components/DuplicateWatcher';

const navItems = [
  { to: '/', label: 'ראשי', icon: HomeIcon, end: true },
  { to: '/reports', label: 'דו"חות', icon: BarChart3, end: false },
  { to: '/budget', label: 'תקציב', icon: Target, end: false },
  { to: '/assistant', label: 'אימון', icon: Sparkles, end: false },
];

function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-glow-gold">
        <Wallet className="w-5 h-5 text-primary-foreground" />
      </div>
      <div>
        <h1 className="font-heading font-extrabold text-lg leading-tight">כספית</h1>
        <p className="text-[11px] text-muted-foreground leading-tight">המאמן הכלכלי שלך</p>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <AccountMenu />
            <MailingButton />
            <ToolsMenu />
          </div>
        </div>
      </header>

      <HebrewDate />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-24 pt-5">
        <Outlet />
      </main>

      <DuplicateWatcher />

      <nav className="fixed bottom-0 inset-x-0 z-30 glass border-t border-border">
        <div className="max-w-4xl mx-auto px-2 flex items-center justify-around pt-1 pb-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isActive ? 'bg-primary' : ''
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : ''}`} />
                  </div>
                  <span className="text-[11px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}