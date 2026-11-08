// האם המספר (או הקוד) רשום באתר? רשום = משתמש שקישר אותו לחשבון שלו (linkIdentity)
export async function isRegisteredOwner(db, ownerId) {
  if (!ownerId) return false;
  const users = await db.User.filter({ owner_identity: String(ownerId) }).catch(() => []);
  return users.length > 0;
}

// החלטה על סטטוס תנועה שנוצרה בטלפון
const UNSURE_CATEGORIES = ['other_expense', 'misc_income_general', 'to_clarify'];

export function phoneTxnState(registered, category) {
  if (!registered) return { status: 'pending', pending_reason: 'unregistered' };
  if (UNSURE_CATEGORIES.includes(category)) return { status: 'pending', pending_reason: 'uncertain' };
  return { status: 'confirmed' };
}