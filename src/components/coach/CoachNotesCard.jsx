import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { MessageSquareText } from 'lucide-react';

// הערות המאמן, כפי שהמשפחה רואה אותן במסך הבית
export default function CoachNotesCard() {
  const { identity } = useUserIdentity();
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!identity) return;
    base44.entities.CoachNote.filter({ owner_id: identity }, '-created_date', 10).then((r) => setNotes(r.items || r));
  }, [identity]);

  if (!notes.length) return null;
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-luxe space-y-2">
      <div className="flex items-center gap-2"><MessageSquareText className="w-4 h-4" /><h2>הערות מהמאמן</h2></div>
      {notes.map((n) => (
        <div key={n.id} className="bg-muted/50 rounded-lg p-2 text-sm">
          <p className="whitespace-pre-wrap">{n.text}</p>
          <p className="text-[10px] text-muted-foreground">{n.coach_name} · {new Date(n.created_date).toLocaleDateString('he-IL')}</p>
        </div>
      ))}
    </div>
  );
}