import { base44 } from '@/api/base44Client';

let rulesCache = null;
let cacheOwnerId = null;
let globalRulesCache = null;

export async function loadRules(ownerId) {
  if (!ownerId) return [];
  if (rulesCache && cacheOwnerId === ownerId) return rulesCache;
  try {
    const rules = await base44.entities.CategoryRule.filter({ owner_id: ownerId });
    rulesCache = rules;
    cacheOwnerId = ownerId;
    return rules;
  } catch {
    return rulesCache || [];
  }
}

// נרמול: גרשיים/גרש/מקפים לא משפיעים על ההתאמה (בימ"ק = בימ״ק, מוישל'ק = מוישלק)
export function norm(s) {
  return String(s || '').toLowerCase().replace(/["'`״׳’‘]/g, '').replace(/[-–־_]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchRule(description, rules) {
  if (!rules || !rules.length || !description) return null;
  const desc = norm(description);
  let best = null;
  let bestLen = 0;
  for (const rule of rules) {
    const pattern = norm(rule.pattern);
    if (pattern && desc.includes(pattern) && pattern.length > bestLen) {
      best = rule;
      bestLen = pattern.length;
    }
  }
  return best;
}

export async function saveRule(ownerId, pattern, category, type) {
  if (!ownerId || !pattern?.trim()) return null;
  try {
    const rule = await base44.entities.CategoryRule.create({
      owner_id: ownerId,
      pattern: pattern.trim(),
      category,
      type,
    });
    if (rulesCache && cacheOwnerId === ownerId) {
      rulesCache = [rule, ...rulesCache];
    }
    saveGlobalRule(pattern.trim(), category, type).catch(() => {});
    return rule;
  } catch {
    return null;
  }
}

export async function deleteRule(ruleId) {
  try {
    await base44.entities.CategoryRule.delete(ruleId);
    if (rulesCache) rulesCache = rulesCache.filter((r) => r.id !== ruleId);
  } catch {}
}

// --- למידה גלובלית על בסיס כלל המשתמשים ---
export async function loadGlobalRules() {
  if (globalRulesCache) return globalRulesCache;
  try {
    const rules = await base44.entities.GlobalCategoryRule.filter({}, '-confirmations', 500);
    globalRulesCache = rules;
    return rules;
  } catch {
    return [];
  }
}

export async function saveGlobalRule(pattern, category, type) {
  const p = pattern?.trim();
  if (!p) return null;
  try {
    const existing = await base44.entities.GlobalCategoryRule.filter({ pattern: p, category, type });
    if (existing.length) {
      const r = existing[0];
      const next = (r.confirmations || 1) + 1;
      await base44.entities.GlobalCategoryRule.update(r.id, { confirmations: next });
      if (globalRulesCache) {
        globalRulesCache = globalRulesCache.map((x) => (x.id === r.id ? { ...x, confirmations: next } : x));
      }
      return r;
    }
    const created = await base44.entities.GlobalCategoryRule.create({ pattern: p, category, type, confirmations: 1 });
    if (globalRulesCache) globalRulesCache = [created, ...globalRulesCache];
    else globalRulesCache = [created];
    return created;
  } catch {
    return null;
  }
}

export function matchRuleGlobal(description, personalRules, globalRules) {
  const personal = matchRule(description, personalRules);
  if (personal) return personal;
  return matchRule(description, globalRules || []);
}