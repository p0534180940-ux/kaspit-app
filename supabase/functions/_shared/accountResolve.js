// זיהוי חשבון לפי מספר טלפון, כולל טלפונים נוספים שקושרו לאותו חשבון
export function normalizePhone(raw) {
  let p = String(raw || '').replace(/\D/g, '');
  if (p.startsWith('972')) p = '0' + p.slice(3);
  return p;
}

export async function resolveAccount(db, phone) {
  const p = normalizePhone(phone);
  if (!p) return { ownerId: '', ownerIds: [], settings: null };

  const direct = await db.UserSettings.filter({ owner_id: p });
  if (direct[0]) {
    return { ownerId: p, ownerIds: [p, ...(direct[0].linked_phones || [])], settings: direct[0] };
  }

  const all = await db.UserSettings.list('-updated_date', 500);
  const linked = all.find((s) => (s.linked_phones || []).includes(p));
  if (linked) {
    return {
      ownerId: linked.owner_id,
      ownerIds: [linked.owner_id, ...(linked.linked_phones || [])],
      settings: linked,
    };
  }

  return { ownerId: p, ownerIds: [p], settings: null };
}

export async function ensureSettings(db, ownerId) {
  const rows = await db.UserSettings.filter({ owner_id: ownerId });
  if (rows[0]) return rows[0];
  return await db.UserSettings.create({ owner_id: ownerId, identify_mode: 'phone', linked_phones: [] });
}