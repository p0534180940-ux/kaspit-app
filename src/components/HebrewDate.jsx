const partsFormat = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
const weekdayFormat = new Intl.DateTimeFormat('he-IL', { weekday: 'long' });
const gregorianFormat = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת'];

function gematria(n) {
  let s = '';
  let h = Math.floor(n / 100);
  while (h > 4) { s += 'ת'; h -= 4; }
  s += HUNDREDS[h];
  const rest = n % 100;
  if (rest === 15) s += 'טו';
  else if (rest === 16) s += 'טז';
  else s += TENS[Math.floor(rest / 10)] + ONES[rest % 10];
  if (s.length === 1) return s + "׳";
  return s.slice(0, -1) + '״' + s.slice(-1);
}

function hebrewDateText(date) {
  const parts = Object.fromEntries(partsFormat.formatToParts(date).map((p) => [p.type, p.value]));
  const year = gematria(Number(parts.year) % 1000);
  return `${gematria(Number(parts.day))} ${parts.month} ${year}`;
}

export default function HebrewDate() {
  const now = new Date();
  return (
    <div className="text-center py-1 bg-muted/40 border-b border-border">
      <p className="text-sm font-semibold text-foreground">
        יום {weekdayFormat.format(now).replace(/^יום\s*/, '')} · {hebrewDateText(now)}
      </p>
      <p className="text-xs text-muted-foreground">{gregorianFormat.format(now)}</p>
    </div>
  );
}