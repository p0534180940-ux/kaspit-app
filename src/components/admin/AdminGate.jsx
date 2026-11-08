import { Lock, Loader2 } from 'lucide-react';
import useAppUser from '@/lib/useAppUser';
// (ללא סיסמה בקוד: ההרשאה היא תפקיד המשתמש בלבד)

// אזור הניהול פתוח רק למשתמש עם תפקיד admin. ההרשאה נקבעת בשרת, לא בסיסמה בקוד.
export default function AdminGate({ children }) {
  const user = useAppUser();

  if (!user) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (user.role !== 'admin') {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-card border border-border rounded-2xl p-6 shadow-luxe text-center space-y-3">
        <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-foreground" />
        </div>
        <h1 className="font-heading font-bold text-lg">אזור ניהול</h1>
        <p className="text-sm text-muted-foreground">האזור הזה פתוח למנהלי המערכת בלבד.</p>
      </div>
    );
  }
  return children;
}