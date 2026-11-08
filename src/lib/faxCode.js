import { base44 } from '@/api/base44Client';

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// מחזיר את קוד הפקס האישי של המשתמש, ויוצר אותו בפעם הראשונה
export async function ensureFaxCode(ownerId) {
  if (!ownerId) return '';
  const rows = await base44.entities.UserSettings.filter({ owner_id: ownerId });
  const settings = rows[0];
  if (settings?.fax_code) return settings.fax_code;

  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const taken = await base44.entities.UserSettings.filter({ fax_code: code });
    if (!taken.length) break;
    code = randomCode();
  }

  if (settings) {
    await base44.entities.UserSettings.update(settings.id, { fax_code: code });
  } else {
    await base44.entities.UserSettings.create({
      owner_id: ownerId,
      fax_code: code,
      identify_mode: 'phone',
      linked_phones: [],
    });
  }
  return code;
}