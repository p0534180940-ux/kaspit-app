// מחליף את ה-SDK של Base44: אותו ממשק (base44.entities / auth / functions / integrations / agents)
// אבל כל הנתונים נשמרים ב-Supabase.
import { createClient } from '@supabase/supabase-js';
import { makeEntities, rowToObj } from './entityStore';
import defaults from './entityDefaults.json';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

const appUrl = () => window.location.origin + window.location.pathname;

function authError(message, status = 401) {
  const e = new Error(message);
  e.status = status;
  e.response = { status, data: { message } };
  return e;
}

function profileToUser(p, authUser) {
  if (!p) return null;
  return {
    ...(p.data || {}),
    id: p.id,
    email: p.email || authUser?.email,
    full_name: p.full_name,
    role: p.role,
    owner_identity: p.owner_identity,
    is_coach: p.is_coach,
    created_date: p.created_date,
    updated_date: p.updated_date,
  };
}

async function loadProfile() {
  const { data: s } = await supabase.auth.getSession();
  const authUser = s?.session?.user;
  if (!authUser) throw authError('Not authenticated');
  let { data: p } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (!p) {
    // הפרופיל נוצר בטריגר; אם עדיין לא קיים מחכים רגע
    await new Promise((r) => setTimeout(r, 800));
    ({ data: p } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle());
  }
  if (!p) throw authError('Profile missing');
  return profileToUser(p, authUser);
}

const PROFILE_COLS = ['email', 'full_name', 'role', 'owner_identity', 'is_coach'];
function splitProfilePatch(patch) {
  const top = {};
  const data = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === 'id') continue;
    if (PROFILE_COLS.includes(k)) top[k] = v;
    else data[k] = v;
  }
  return { top, data };
}

// ישות User ממופה לטבלת profiles
const userEntity = {
  async filter(query = {}) {
    let q = supabase.from('profiles').select('*');
    for (const [k, v] of Object.entries(query)) q = PROFILE_COLS.includes(k) || k === 'id' ? q.eq(k, v) : q.contains('data', { [k]: v });
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((p) => profileToUser(p));
  },
  async list() {
    return userEntity.filter({});
  },
  async get(id) {
    const r = await userEntity.filter({ id });
    if (!r[0]) throw authError('Not found', 404);
    return r[0];
  },
  async update(id, patch) {
    const { top, data } = splitProfilePatch(patch);
    if (Object.keys(data).length) {
      const { data: cur } = await supabase.from('profiles').select('data').eq('id', id).maybeSingle();
      top.data = { ...(cur?.data || {}), ...data };
    }
    const { data: res, error } = await supabase.from('profiles').update(top).eq('id', id).select('*').single();
    if (error) throw error;
    return profileToUser(res);
  },
  async count() {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    return count || 0;
  },
  subscribe() {
    return () => {};
  },
};

const entities = makeEntities(supabase, defaults, { onUser: userEntity });

const auth = {
  async me() {
    return loadProfile();
  },
  async updateMe(patch) {
    const me = await loadProfile();
    return userEntity.update(me.id, patch);
  },
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data?.session;
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw authError(error.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : error.message);
    return { access_token: data.session?.access_token, user: data.user };
  },
  async register({ email, password, full_name }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: full_name || '' }, emailRedirectTo: appUrl() },
    });
    if (error) throw authError(error.message, 400);
    return data;
  },
  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw authError(error.message, 400);
    return { access_token: data.session?.access_token, user: data.user };
  },
  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw authError(error.message, 400);
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() + '#/reset-password' });
    if (error) throw authError(error.message, 400);
  },
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw authError(error.message, 400);
  },
  async loginWithProvider(provider = 'google') {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: appUrl() } });
    if (error) throw authError(error.message, 400);
  },
  setToken() {},
  async logout(redirectUrl) {
    await supabase.auth.signOut().catch(() => {});
    if (redirectUrl !== undefined) window.location.href = appUrl() + '#/login';
  },
  redirectToLogin() {
    window.location.href = appUrl() + '#/login';
  },
};

async function invokeFn(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body: body || {} });
  if (error) {
    let payload = null;
    try {
      payload = await error.context?.json?.();
    } catch {}
    const e = new Error(payload?.error || payload?.reason || error.message);
    e.status = error.context?.status;
    e.response = { status: e.status, data: payload };
    throw e;
  }
  return { data, status: 200 };
}

async function upload(file, bucket) {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}-${(file.name || 'file').replace(/[^\w.-]/g, '_')}`;
  const { error } = await supabase.storage.from(bucket).upload(name, file, { contentType: file.type || undefined });
  if (error) throw error;
  return name;
}

const Core = {
  async UploadFile({ file }) {
    const path = await upload(file, 'public');
    return { file_url: supabase.storage.from('public').getPublicUrl(path).data.publicUrl };
  },
  async UploadPrivateFile({ file }) {
    const path = await upload(file, 'private');
    return { file_uri: path };
  },
  async CreateFileSignedUrl({ file_uri, expires_in = 600 }) {
    const { data, error } = await supabase.storage.from('private').createSignedUrl(file_uri, expires_in);
    if (error) throw error;
    return { signed_url: data.signedUrl };
  },
  async InvokeLLM(params) {
    return (await invokeFn('core', { op: 'InvokeLLM', params })).data;
  },
  async TranscribeAudio(params) {
    return (await invokeFn('core', { op: 'TranscribeAudio', params })).data;
  },
  async ExtractDataFromUploadedFile(params) {
    return (await invokeFn('core', { op: 'ExtractDataFromUploadedFile', params })).data;
  },
  async SendEmail(params) {
    return (await invokeFn('core', { op: 'SendEmail', params })).data;
  },
};

// סוכני AI (העוזר החכם): השיחה נשמרת מקומית, התשובה מגיעה מפונקציית agentChat
const conversations = new Map();
const agents = {
  async createConversation({ agent_name }) {
    const id = `${agent_name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    conversations.set(id, { id, agent_name, messages: [], listeners: new Set() });
    return { id, agent_name, messages: [] };
  },
  async getConversation(id) {
    const c = conversations.get(id);
    if (!c) throw authError('Not found', 404);
    return { id, messages: c.messages };
  },
  subscribeToConversation(id, cb) {
    const c = conversations.get(id);
    if (!c) return () => {};
    c.listeners.add(cb);
    return () => c.listeners.delete(cb);
  },
  async addMessage({ id }, message) {
    const c = conversations.get(id);
    if (!c) throw authError('Not found', 404);
    const emit = () => c.listeners.forEach((fn) => fn({ messages: [...c.messages] }));
    c.messages.push({ id: `u${Date.now()}`, role: 'user', content: message.content });
    emit();
    try {
      const { data } = await invokeFn('agentChat', {
        agent_name: c.agent_name,
        messages: c.messages.map(({ role, content }) => ({ role, content })),
      });
      c.messages.push({ id: `a${Date.now()}`, role: 'assistant', content: data?.content || 'לא התקבלה תשובה.' });
    } catch (e) {
      c.messages.push({ id: `a${Date.now()}`, role: 'assistant', content: 'שגיאה בעוזר: ' + (e.message || '') });
    }
    emit();
  },
};

export const base44 = {
  entities,
  auth,
  functions: { invoke: invokeFn },
  integrations: { Core },
  agents,
  app: { id: 'kaspit' },
  supabase,
  rowToObj,
};

export default base44;
