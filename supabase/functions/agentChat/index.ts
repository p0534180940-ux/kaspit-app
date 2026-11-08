// העוזר החכם: הוראות הסוכן מ-Base44 + נתוני המשתמש (קריאה בלבד) + Gemini
import { createClientFromRequest, gemini, serve } from '../_shared/b44.ts';
import budgetAdvisor from '../_shared/agents/budget_advisor.json' with { type: 'json' };
import transactionLogger from '../_shared/agents/transaction_logger.json' with { type: 'json' };

const AGENTS: Record<string, any> = { budget_advisor: budgetAdvisor, transaction_logger: transactionLogger };

function monthsBack(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { agent_name, messages } = await req.json().catch(() => ({}));
  const agent = AGENTS[agent_name];
  if (!agent) return Response.json({ error: 'unknown agent' }, { status: 400 });

  const identity = user.owner_identity;
  let context = 'אין נתונים זמינים.';
  if (identity) {
    const db = base44.asServiceRole.entities;
    const since = monthsBack(6);
    const txs = await db.Transaction.filter({ owner_id: identity, date: { $gte: since } }, '-date', 1500);
    const budgets = await db.Budget.filter({ owner_id: identity, month: { $gte: since.slice(0, 7) } }, '-month', 1000);
    const slimTx = txs
      .filter((t: any) => !t.status || t.status === 'confirmed')
      .map((t: any) => [t.date, t.type, t.category, t.amount, t.description || ''].join('|'));
    const slimB = budgets.map((b: any) => [b.month, b.type || 'expense', b.category, b.planned_amount].join('|'));
    context =
      `מזהה המשתמש: ${identity}\n` +
      `תנועות (תאריך|סוג|קטגוריה|סכום|תיאור), 6 חודשים אחרונים:\n${slimTx.join('\n')}\n\n` +
      `תקציב מתוכנן (חודש|סוג|קטגוריה|סכום):\n${slimB.join('\n')}`;
  }

  const system = `${agent.instructions}\n\n--- נתוני המשתמש (לקריאה בלבד) ---\n${context}\n\nהיום: ${new Date().toISOString().slice(0, 10)}`;
  const history = (messages || []).slice(-20).map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));
  const content = await gemini({ system, history });
  return Response.json({ content });
});
