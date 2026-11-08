import { useState } from 'react';
import { useUserIdentity } from '@/lib/userIdentity';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, Mail, Hash, CheckCircle2, Loader2, Link as LinkIcon } from 'lucide-react';

function normalizePhone(phone) {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('972')) p = '0' + p.slice(3);
  if (p.startsWith('00972')) p = '0' + p.slice(5);
  return p;
}

function isPhoneLike(val) {
  return /^0\d{8,9}$/.test(val);
}

export default function PhoneRegistration() {
  const { identity } = useUserIdentity();
  const [phone, setPhone] = useState(isPhoneLike(identity) ? identity : '');
  const [idNumber, setIdNumber] = useState(!isPhoneLike(identity) ? identity : '');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState(null);

  const checkExisting = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) return;
    try {
      const results = await base44.entities.PhoneRegistration.filter({ phone: normalized });
      if (results[0]) {
        setExisting(results[0]);
        setIdNumber(results[0].id_number || '');
        setEmail(results[0].email || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) return;
    setLoading(true);
    setSaved(false);
    try {
      const data = { phone: normalized };
      if (idNumber.trim()) data.id_number = idNumber.trim();
      if (email.trim()) data.email = email.trim();

      if (existing) {
        await base44.entities.PhoneRegistration.update(existing.id, data);
      } else {
        await base44.entities.PhoneRegistration.create(data);
      }
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const phoneValid = normalizePhone(phone).length >= 9;

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-5 h-5 text-primary" />
          <h1 className="font-heading font-bold text-xl">רישום טלפון</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          הירשם עם מספר הטלפון שלך כדי לאפשר עדכון הוצאות והכנסות דרך שיחה טלפונית מטלפון כשר.
          אימייל אופציונלי — לשליחת דוחות חודשיים בלבד.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div>
          <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <Phone className="w-4 h-4 text-muted-foreground" />
            מספר טלפון
          </label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setExisting(null); setSaved(false); }}
            onBlur={checkExisting}
            placeholder="050-1234567"
            className="h-11"
            dir="ltr"
          />
          {existing && (
            <p className="text-xs text-primary mt-1">נמצא רישום קיים. ניתן לעדכן את הפרטים.</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <Hash className="w-4 h-4 text-muted-foreground" />
            מספר מזהה (אופציונלי)
          </label>
          <Input
            type="text"
            value={idNumber}
            onChange={(e) => { setIdNumber(e.target.value); setSaved(false); }}
            placeholder="מספר מזהה"
            className="h-11"
            dir="ltr"
          />
        </div>

        <div>
          <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <Mail className="w-4 h-4 text-muted-foreground" />
            אימייל (אופציונלי — לשליחת דוחות)
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSaved(false); }}
            placeholder="your@email.com"
            className="h-11"
            dir="ltr"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!phoneValid || loading}
          className="w-full h-12"
          size="lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'שמור רישום'}
        </Button>

        {saved && (
          <div className="flex items-center gap-2 text-income bg-income/5 rounded-xl p-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">הרישום נשמר בהצלחה!</p>
          </div>
        )}
      </div>

      <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5">
        <div className="flex items-center gap-2 mb-2">
          <LinkIcon className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-semibold">איך זה עובד?</h2>
        </div>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal pr-5">
          <li>הירשם כאן עם מספר הטלפון שלך</li>
          <li>צור קשר עם ימות המשיח לפתיחת קו טלפוני</li>
          <li>הגדר את השלוחה בימות המשיח להפנות לכתובת ה-webhook של המערכת</li>
          <li>חייג מהטלפון הכשר ועדכן הוצאות/הכנסות או בקש דוח</li>
        </ol>
      </div>
    </div>
  );
}