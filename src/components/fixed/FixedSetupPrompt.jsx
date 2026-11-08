import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Repeat } from 'lucide-react';

// מוצג בכניסה הראשונה, ואם דילגו — שוב בכניסה הרביעית
function bumpVisits(identity) {
  const key = `kaspit_visits_${identity}`;
  let n = 0;
  try {
    n = Number(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(n));
  } catch {}
  return n;
}

export default function FixedSetupPrompt() {
  const { identity } = useUserIdentity();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!identity) return;
    const visits = bumpVisits(identity);
    if (visits !== 1 && visits !== 4) return;

    let cancelled = false;
    Promise.all([
      base44.entities.UserSettings.filter({ owner_id: identity }).catch(() => []),
      base44.entities.FixedItem.filter({ owner_id: identity }, '-created_date', 1).catch(() => []),
    ]).then(([settings, items]) => {
      if (cancelled) return;
      if (settings[0]?.fixed_entered || items.length) return;
      setOpen(true);
    });
    return () => { cancelled = true; };
  }, [identity]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center mb-1">
            <Repeat className="w-5 h-5 text-primary-foreground" />
          </div>
          <DialogTitle className="font-heading">נתחיל מההוצאות הקבועות</DialogTitle>
          <DialogDescription className="text-right leading-relaxed">
            לפי שיטת מסילה, ניהול מתחיל מתמונת מצב מלאה: קודם מזינים את ההוצאות וההכנסות הקבועות (שכר דירה, חשמל, לימודים, משכורת) והשנתיות, והמערכת תשריין אותן בתקציב בכל חודש.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1 h-11 font-semibold"
            onClick={() => { setOpen(false); navigate('/fixed'); }}
          >
            להזנת הקבועות
          </Button>
          <Button variant="outline" className="h-11 px-5" onClick={() => setOpen(false)}>
            דלג
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}