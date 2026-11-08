import jsPDF from 'jspdf';
import { getCategory, isSpend } from './categories';
import { formatCurrency } from './format';

function downloadBlob(content, filename, mime) {
  const blob = new Blob(['\ufeff' + content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsCSV(transactions, month) {
  const header = 'תאריך,תיאור,סוג,קטגוריה,סכום';
  const rows = transactions.map((t) => {
    const cat = getCategory(t.category);
    const typeLabel = t.type === 'income' ? 'הכנסה' : 'הוצאה';
    const sign = t.type === 'income' ? '' : '-';
    const desc = (t.description || '').replace(/"/g, '""');
    return `${t.date || ''},"${desc}",${typeLabel},"${cat.label}",${sign}${t.amount || 0}`;
  });
  const csv = [header, ...rows].join('\n');
  downloadBlob(csv, `תנועות_${month || 'ייצוא'}.csv`, 'text/csv');
}

export function exportTransactionsPDF(transactions, month) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Dvir - Teoudot', margin, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = transactions.filter(isSpend).reduce((s, t) => s + (t.amount || 0), 0);
  doc.text(`Hachnasot: ${income.toFixed(0)} | Hotzaot: ${expense.toFixed(0)} | Balance: ${(income - expense).toFixed(0)}`, margin, y);
  y += 10;

  // Table header
  doc.setFontSize(8);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
  doc.text('Date', margin + 2, y);
  doc.text('Description', margin + 30, y);
  doc.text('Category', margin + 95, y);
  doc.text('Type', margin + 140, y);
  doc.text('Amount', pageWidth - margin - 20, y);
  y += 6;

  const lineH = 5;
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);

  for (const t of transactions) {
    if (y > pageH - 15) {
      doc.addPage();
      y = 20;
    }
    const cat = getCategory(t.category);
    const desc = (t.description || '').slice(0, 45);
    const sign = t.type === 'income' ? '+' : '-';
    doc.text(String(t.date || ''), margin + 2, y);
    doc.text(desc, margin + 30, y);
    doc.text(String(cat.label).slice(0, 22), margin + 95, y);
    doc.text(t.type === 'income' ? 'Hachnasot' : 'Hotzaot', margin + 140, y);
    doc.text(`${sign}${(t.amount || 0).toFixed(0)}`, pageWidth - margin - 20, y);
    y += lineH;
  }

  doc.save(`teoudot_${month || 'export'}.pdf`);
}

export function exportTransactionsDoc(transactions, month) {
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = transactions.filter(isSpend).reduce((s, t) => s + (t.amount || 0), 0);
  const lines = [];
  lines.push('<!DOCTYPE html>');
  lines.push('<html dir="rtl" lang="he"><head><meta charset="utf-8"></head><body style="font-family:Arial; padding:24px;">');
  lines.push(`<h1 style="font-size:20px;">תנועות חודש ${month || ''}</h1>`);
  lines.push(`<p style="font-size:14px;">סה"כ הכנסות: ${formatCurrency(income)} | הוצאות: ${formatCurrency(expense)} | יתרה: ${formatCurrency(income - expense)}</p>`);
  lines.push('<table style="width:100%; border-collapse:collapse; font-size:12px;" border="1">');
  lines.push('<tr style="background:#f0f0f0;"><th style="padding:6px;">תאריך</th><th>תיאור</th><th>קטגוריה</th><th>סוג</th><th>סכום</th></tr>');
  for (const t of transactions) {
    const cat = getCategory(t.category);
    const typeLabel = t.type === 'income' ? 'הכנסה' : 'הוצאה';
    const sign = t.type === 'income' ? '+' : '-';
    lines.push(`<tr><td style="padding:6px;">${t.date || ''}</td><td>${t.description || ''}</td><td>${cat.label}</td><td>${typeLabel}</td><td>${sign}${formatCurrency(t.amount)}</td></tr>`);
  }
  lines.push('</table></body></html>');
  downloadBlob(lines.join('\n'), `תנועות_${month || 'ייצוא'}.doc`, 'application/msword');
}