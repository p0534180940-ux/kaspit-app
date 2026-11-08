import { Printer } from 'lucide-react';
import { FAX_INBOX_NUMBER } from '@/lib/faxConfig';

export default function FaxInstructionsCard({ code }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-luxe p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
          <Printer className="w-4 h-4 text-primary-foreground" />
        </div>
        <h2 className="font-heading font-bold text-base">שליחת חשבונות בפקס</h2>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        אפשר לשלוח חשבונות וקבלות בפקס, והמערכת תזהה מהם את התנועות אוטומטית.
        יש לכתוב בראש הדף, בכתב יד גדול וברור, את הקוד האישי שלכם:
      </p>

      <div className="mt-4 flex items-center justify-center rounded-xl bg-muted/60 border border-border py-4">
        <span className="font-mono font-bold text-3xl tracking-[0.3em]">{code || '—'}</span>
      </div>

      <p className="text-sm mt-4">
        {FAX_INBOX_NUMBER ? (
          <>
            מספר הפקס לשליחה: <span className="font-mono font-bold">{FAX_INBOX_NUMBER}</span>
          </>
        ) : (
          <span className="text-muted-foreground">מספר הפקס לשליחה יוגדר בהמשך ההקמה.</span>
        )}
      </p>

      <p className="text-xs text-muted-foreground mt-2">
        לאחר קליטת הפקס נשמעו התנועות גם בשיחה הטלפונית לאישור, וגם יופיעו כאן.
      </p>
    </div>
  );
}