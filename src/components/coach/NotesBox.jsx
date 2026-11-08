import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

// הערות המאמן למשפחה. המשפחה רואה את אותן הערות אצלה במסך הבית.
export default function NotesBox({ ownerId, notes, onChanged }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    await base44.functions.invoke('coachApi', { action: 'add_note', owner_id: ownerId, text });
    setText('');
    setBusy(false);
    onChanged();
  };
  const remove = async (id) => {
    await base44.functions.invoke('coachApi', { action: 'delete_note', owner_id: ownerId, note_id: id });
    onChanged();
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">הערות למשפחה (המשפחה רואה אותן)</p>
      {notes.map((n) => (
        <div key={n.id} className="bg-muted/50 rounded-lg p-2 text-sm flex items-start justify-between gap-2">
          <div>
            <p className="whitespace-pre-wrap">{n.text}</p>
            <p className="text-[10px] text-muted-foreground">{new Date(n.created_date).toLocaleDateString('he-IL')}</p>
          </div>
          <button onClick={() => remove(n.id)} aria-label="מחיקת הערה"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
        </div>
      ))}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} placeholder="כתבו הערה..."
        className="w-full rounded-lg border border-input bg-background p-2 text-sm" />
      <Button size="sm" disabled={busy || !text.trim()} onClick={add}>הוסף הערה</Button>
    </div>
  );
}