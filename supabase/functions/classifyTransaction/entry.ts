import { createClientFromRequest } from '../_shared/b44.ts';
import { parseTransaction, categoryLabel } from '../_shared/ivrParse.js';
import { classifyWithAI } from '../_shared/aiClassify.js';
import { labelOf } from '../_shared/categoryList.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch(() => null);
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const text = String(body.text || '').trim();
    if (!text) return Response.json({ error: 'missing text' }, { status: 400 });

    const forcedType = body.type === 'income' || body.type === 'expense' ? body.type : undefined;
    const parsed = parseTransaction(text, forcedType);
    if (!parsed) return Response.json({ ok: false, reason: 'no_amount' });

    let source = 'local';
    let confidence = 0.9;

    // סיווג מקומי לא הצליח — פונים לבינה מלאכותית
    if (parsed.category === 'other_expense' || parsed.category === 'misc_income_general') {
      const ai = await classifyWithAI(base44, parsed.description || text, parsed.type).catch(() => null);
      if (ai && ai.category) {
        parsed.category = ai.category;
        source = 'ai';
        confidence = ai.confidence;
        // לומדים את הסיווג לכל המשתמשים, כדי שלא נצטרך לשאול שוב
        const pattern = (ai.merchant || parsed.description || '').trim();
        if (pattern.length >= 2) {
          const db = base44.asServiceRole.entities;
          const existing = await db.GlobalCategoryRule.filter({ pattern, type: parsed.type });
          if (existing[0]) {
            await db.GlobalCategoryRule.update(existing[0].id, {
              category: ai.category,
              confirmations: (existing[0].confirmations || 1) + 1,
            });
          } else {
            await db.GlobalCategoryRule.create({ pattern, category: ai.category, type: parsed.type, confirmations: 1 });
          }
        }
      }
    }

    return Response.json({
      ok: true,
      source,
      confidence,
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      category_label: labelOf(parsed.category, parsed.type) || categoryLabel(parsed.category, parsed.type),
      description: parsed.description,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}