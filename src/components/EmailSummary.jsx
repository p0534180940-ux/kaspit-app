import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserIdentity } from '@/lib/userIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, monthLabelBoth } from '@/lib/format';
import { getCategory, EXPENSE_CATEGORIES, INCOME_CATEGORIES, isSpend } from '@/lib/categories';
import { Mail, Loader2, Check, AlertCircle } from 'lucide-react';

export default function EmailSummary({ transactions, month }) {
  const { identity } = useUserIdentity();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const monthTxns = transactions.filter((t) => t.date && t.date.startsWith(month));
  const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = monthTxns.filter(isSpend).reduce((s, t) => s + (t.amount || 0), 0);
  const balance = income - expense;

  const send = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    setStatus(null);
    try {
      const monthLabelStr = monthLabelBoth(month);

      const expenseByCat = {};
      monthTxns.filter(isSpend).forEach((t) => {
        expenseByCat[t.category] = (expenseByCat[t.category] || 0) + (t.amount || 0);
      });

      const incomeByCat = {};
      monthTxns.filter((t) => t.type === 'income').forEach((t) => {
        incomeByCat[t.category] = (incomeByCat[t.category] || 0) + (t.amount || 0);
      });

      let html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0F4C4A, #0F6E6B); color: white; padding: 30px; border-radius: 16px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">סיכום חודשי — ${monthLabelStr}</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">דוח הוצאות והכנסות אישי</p>
          </div>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-top: 20px;">
            <h2 style="color: #0F4C4A; margin: 0 0 15px; font-size: 18px;">סיכום כללי</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #2D8659; font-weight: bold;">סך הכנסות:</td>
                <td style="padding: 8px 0; text-align: left; color: #2D8659; font-weight: bold;">${formatCurrency(income)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #DC2626; font-weight: bold;">סך הוצאות:</td>
                <td style="padding: 8px 0; text-align: left; color: #DC2626; font-weight: bold;">${formatCurrency(expense)}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 0 4px; font-weight: bold; font-size: 16px; color: ${balance >= 0 ? '#2D8659' : '#DC2626'};">מאזן:</td>
                <td style="padding: 12px 0 4px; text-align: left; font-weight: bold; font-size: 16px; color: ${balance >= 0 ? '#2D8659' : '#DC2626'};">${formatCurrency(balance)}</td>
              </tr>
            </table>
          </div>
      `;

      const topExpenses = Object.entries(expenseByCat)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      if (topExpenses.length > 0) {
        html += `
          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-top: 16px;">
            <h2 style="color: #0F4C4A; margin: 0 0 15px; font-size: 18px;">פילוח הוצאות מובילות</h2>
            <table style="width: 100%; border-collapse: collapse;">
        `;
        topExpenses.forEach(([catId, amount], i) => {
          const cat = getCategory(catId);
          const pct = expense > 0 ? ((amount / expense) * 100).toFixed(0) : 0;
          html += `
              <tr>
                <td style="padding: 6px 0; color: #374151;">${i + 1}. ${cat.label}</td>
                <td style="padding: 6px 0; text-align: left; color: #374151;">${formatCurrency(amount)} (${pct}%)</td>
              </tr>
          `;
        });
        html += `</table></div>`;
      }

      const incomeList = Object.entries(incomeByCat).sort(([, a], [, b]) => b - a);
      if (incomeList.length > 0) {
        html += `
          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-top: 16px;">
            <h2 style="color: #0F4C4A; margin: 0 0 15px; font-size: 18px;">מקורות הכנסה</h2>
            <table style="width: 100%; border-collapse: collapse;">
        `;
        incomeList.forEach(([catId, amount]) => {
          const cat = getCategory(catId);
          html += `
              <tr>
                <td style="padding: 6px 0; color: #374151;">${cat.label}</td>
                <td style="padding: 6px 0; text-align: left; color: #2D8659; font-weight: bold;">${formatCurrency(amount)}</td>
              </tr>
          `;
        });
        html += `</table></div>`;
      }

      html += `
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px; margin-top: 16px;">
            <p>דוח זה נשלח אוטומטית ממערכת כספית</p>
          </div>
        </div>
      `;

      await base44.integrations.Core.SendEmail({
        to: email.trim(),
        subject: `סיכום חודשי — ${monthLabelStr}`,
        body: html,
      });

      setStatus('success');
    } catch (e) {
      console.error('Email error:', e);
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  if (monthTxns.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm">שליחת סיכום חודשי למייל</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        קבלו דוח מפורט של כל ההכנסות וההוצאות ישירות לתיבת המייל שלכם
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus(null); }}
          placeholder="האימייל שלך"
          className="h-11 flex-1"
          dir="ltr"
          disabled={sending}
        />
        <Button
          onClick={send}
          disabled={!email.trim() || sending}
          className="h-11 px-4"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
        </Button>
      </div>
      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-income">
          <Check className="w-4 h-4" />
          <span>הדוח נשלח בהצלחה ל-{email}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>שליחת המייל נכשלה. נסה שנית מאוחר יותר.</span>
        </div>
      )}
    </div>
  );
}