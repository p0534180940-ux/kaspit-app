// זיהוי מי קורא לפונקציה: מערכת הטלפון (מפתח פנימי) או משתמש מחובר
import { normalizePhone } from './accountResolve.js';
import { isCronCall } from './b44.ts';

export async function getCaller(base44, body, internalKey) {
  if (internalKey && body.internal_key === internalKey) return { internal: true };
  if (await isCronCall(body)) return { internal: true };
  const user = await base44.auth.me().catch(() => null);
  return { internal: false, user, identity: user?.owner_identity || '', isAdmin: user?.role === 'admin' };
}

export function ownsIdentity(caller, ownerId) {
  if (caller.internal || caller.isAdmin) return true;
  if (!caller.identity || !ownerId) return false;
  return normalizePhone(caller.identity) === normalizePhone(ownerId) || caller.identity === String(ownerId);
}