import { base44 } from '@/api/base44Client';
import { getCategory } from '@/lib/categories';

// ייצוא כל הנתונים של המשתמש לקובץ אקסל אחד עם גיליון לכל סוג נתונים (פורמט XML של אקסל, בלי ספריות חיצוניות)
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const catLabel = (v) => getCategory(v)?.label || v;
const typeLabel = (v) => (v === 'income' ? 'הכנסה' : v === 'expense' ? 'הוצאה' : v);

const SHEETS = [
  { entity: 'Transaction', name: 'תנועות', cols: [['date', 'תאריך'], ['type', 'סוג', typeLabel], ['category', 'קטגוריה', catLabel], ['amount', 'סכום'], ['description', 'תיאור'], ['source', 'מקור'], ['status', 'סטטוס']] },
  { entity: 'Budget', name: 'תקציב', cols: [['month', 'חודש'], ['type', 'סוג', typeLabel], ['category', 'קטגוריה', catLabel], ['planned_amount', 'סכום מתוכנן']] },
  { entity: 'FixedItem', name: 'קבועות', cols: [['type', 'סוג', typeLabel], ['category', 'קטגוריה', catLabel], ['amount', 'סכום'], ['description', 'תיאור'], ['day_of_month', 'יום בחודש']] },
  { entity: 'AnnualExpense', name: 'שנתיות', cols: [['category', 'קטגוריה', catLabel], ['amount', 'סכום'], ['description', 'תיאור'], ['months', 'חודשים', (v) => (v || []).join(', ')]] },
  { entity: 'Debt', name: 'חובות', cols: [['person', 'שם'], ['debt_type', 'סוג'], ['original_amount', 'סכום מקורי'], ['amount', 'יתרה'], ['monthly_payment', 'החזר חודשי'], ['next_payment_date', 'החזר הבא'], ['settled', 'נסגר', (v) => (v ? 'כן' : 'לא')]] },
  { entity: 'SavingsGoal', name: 'חיסכון', cols: [['name', 'יעד'], ['target_amount', 'סכום יעד'], ['saved_amount', 'נחסך'], ['target_date', 'תאריך יעד']] },
  { entity: 'UserSettings', name: 'הגדרות', cols: [['email', 'מייל'], ['fax', 'פקס'], ['tithe_enabled', 'מעשרות', (v) => (v ? 'כן' : 'לא')], ['tithe_percent', 'אחוז מעשרות']] },
  { entity: 'CustomCategory', name: 'קטגוריות שלי', cols: [['label', 'שם'], ['type', 'סוג', typeLabel]] },
];

function cell(v) {
  if (typeof v === 'number') return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
  return `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
}

function sheetXml(def, rows) {
  const head = `<Row>${def.cols.map(([, label]) => cell(label)).join('')}</Row>`;
  const body = rows.map((r) => `<Row>${def.cols.map(([key, , fmt]) => cell(fmt ? fmt(r[key]) : r[key] ?? '')).join('')}</Row>`).join('');
  return `<Worksheet ss:Name="${esc(def.name)}"><Table>${head}${body}</Table></Worksheet>`;
}

export async function exportAllData(ownerId) {
  const results = await Promise.all(
    SHEETS.map((def) => base44.entities[def.entity].filter({ owner_id: ownerId }, '-created_date', 5000).then((r) => r.items || r)),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${SHEETS.map((d, i) => sheetXml(d, results[i])).join('')}</Workbook>`;
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `הנתונים_שלי_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}