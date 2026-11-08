import { Link } from 'react-router-dom';

export default function LegalPage({ title, updated, sections }) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-5">
        <Link to="/" className="text-sm text-primary underline">חזרה לאפליקציה</Link>
        <h1>{title}</h1>
        <p className="text-xs text-muted-foreground">עודכן לאחרונה: {updated}</p>
        {sections.map((s) => (
          <section key={s.title} className="space-y-1.5">
            <h2>{s.title}</h2>
            {s.paragraphs.map((p) => <p key={p} className="text-sm leading-relaxed">{p}</p>)}
            {s.list && (
              <ul className="list-disc pr-5 text-sm space-y-1">
                {s.list.map((li) => <li key={li}>{li}</li>)}
              </ul>
            )}
          </section>
        ))}
        <div className="flex gap-4 text-sm pt-4 border-t border-border">
          <Link to="/privacy" className="text-primary underline">מדיניות פרטיות</Link>
          <Link to="/terms" className="text-primary underline">תנאי שימוש</Link>
        </div>
      </div>
    </div>
  );
}