// סיווג עסקה בעזרת בינה מלאכותית — נקרא רק כשהסיווג המקומי לא הצליח
import { labelsFor } from './categoryList.js';

export async function classifyWithAI(base44, text, type) {
  const labels = labelsFor(type);
  const options = Object.keys(labels).map((id) => `${id} = ${labels[id]}`).join(', ');

  const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `אתה מסווג עסקאות פיננסיות של משפחה חרדית בישראל.
התיאור: "${text}"
סוג העסקה: ${type === 'income' ? 'הכנסה' : 'הוצאה'}

זהה את בית העסק או סוג התשלום (גם אם מדובר בשם מקוצר של חנות, ספק, מוסד או שירות בישראל) ובחר את הקטגוריה המתאימה ביותר מתוך הרשימה.
דוגמאות: "רב קו" הוא כרטיס נסיעות בתחבורה ציבורית ולכן public_transport, "טמבור" היא חנות צבעים וחומרי בניין ולכן home_repairs.
אם באמת אין התאמה סבירה, החזר other_expense.

רשימת הקטגוריות המותרות (מזהה = תווית): ${options}

החזר אך ורק מזהה קטגוריה מהרשימה, ורמת ביטחון בין 0 ל-1.`,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        confidence: { type: 'number' },
        merchant: { type: 'string' },
      },
      required: ['category'],
    },
  });

  const category = res && labels[res.category] ? res.category : null;
  if (!category) return null;
  return { category, confidence: res.confidence ?? 0.7, merchant: res.merchant || '' };
}