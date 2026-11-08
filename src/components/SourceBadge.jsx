import { Phone, Printer } from 'lucide-react';

const REASONS = {
  unregistered: 'המספר לא היה רשום באתר',
  uncertain: 'הקטגוריה לא זוהתה בוודאות',
  unconfirmed_call: 'הדיווח הוקלט ולא אושר בשיחה',
};

// סימון מקור התנועה (טלפון / פקס), ובממתינות גם הסיבה
export default function SourceBadge({ transaction, showReason }) {
  const src = transaction.source;
  if (src !== 'ivr' && src !== 'fax') return null;
  const Icon = src === 'ivr' ? Phone : Printer;
  const reason = showReason ? REASONS[transaction.pending_reason] : '';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-1.5 py-0.5 mt-0.5">
      <Icon className="w-3 h-3" />
      מקור: {src === 'ivr' ? 'טלפון' : 'פקס'}
      {reason && <span className="text-muted-foreground">· {reason}</span>}
    </span>
  );
}