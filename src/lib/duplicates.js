import { base44 } from '@/api/base44Client';
import { breakdownKey } from '@/lib/categories';

const norm = (s) => String(s || '').toLowerCase().replace(/[^\u0590-\u05FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// תיאור דומה: זהה, מוכל אחד בשני, ריק באחד מהם, או חפיפת מילים של לפחות מחצית
export function similarDescription(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y || x === y || x.includes(y) || y.includes(x)) return true;
  const xs = new Set(x.split(' '));
  const ys = y.split(' ');
  const common = ys.filter((w) => xs.has(w)).length;
  return common / Math.max(xs.size, ys.length) >= 0.5;
}

// מחפש תנועה קיימת באותו יום, עם אותו סכום, אותה קטגוריה ותיאור דומה
export async function findDuplicateOf(tx) {
  if (!tx?.owner_id || !tx.date || !tx.amount) return null;
  const sameDay = await base44.entities.Transaction.filter({ owner_id: tx.owner_id, date: tx.date });
  return (
    sameDay.find(
      (o) =>
        o.id !== tx.id &&
        o.type === tx.type &&
        Number(o.amount) === Number(tx.amount) &&
        breakdownKey(o.category) === breakdownKey(tx.category) &&
        (o.status || 'confirmed') !== 'rejected' &&
        similarDescription(o.description, tx.description)
    ) || null
  );
}