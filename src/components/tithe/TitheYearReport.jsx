import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { computeTithe } from '@/lib/tithe';
import { formatCurrency } from '@/lib/format';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export default function TitheYearReport({ open, onOpenChange, transactions, settings }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const { months } = computeTithe(transactions, settings, year);
  const sum = (k) => months.reduce((s, m) => s + m[k], 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle>דוח מעשרות שנתי</DialogTitle></DialogHeader>
        <div className="flex items-center justify-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => setYear(year - 1)}><ChevronRight className="w-4 h-4" /></Button>
          <span className="font-bold">{year}</span>
          <Button size="icon" variant="ghost" onClick={() => setYear(year + 1)}><ChevronLeft className="w-4 h-4" /></Button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-right py-1">חודש</th><th>הכנסות</th><th>מעשר</th><th>תרומות</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month} className="border-b border-border/50 text-center">
                <td className="text-right py-1">{MONTHS[m.month]}</td>
                <td>{m.income ? formatCurrency(m.income) : '-'}</td>
                <td>{m.owed ? formatCurrency(m.owed) : '-'}</td>
                <td>{m.given ? formatCurrency(m.given) : '-'}</td>
              </tr>
            ))}
            <tr className="font-bold text-center">
              <td className="text-right py-1">סה"כ</td>
              <td>{formatCurrency(sum('income'))}</td>
              <td>{formatCurrency(sum('owed'))}</td>
              <td>{formatCurrency(sum('given'))}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground">החישוב מתחיל מתאריך הפעלת החשבון. החישוב לפי ההגדרות שבחרת. לשאלות הלכתיות יש להתייעץ עם רב.</p>
      </DialogContent>
    </Dialog>
  );
}