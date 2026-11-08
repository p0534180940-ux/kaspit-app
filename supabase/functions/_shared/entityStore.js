// שכבת ישויות בסגנון Base44 מעל טבלת records ב-Supabase.
// משמשת גם את האתר וגם את פונקציות השרת (עותק זהה ב-supabase/functions/_shared).

const TOP = new Set(['id', 'created_date', 'updated_date', 'created_by_id']);

export function rowToObj(r) {
  if (!r) return r;
  return {
    ...(r.data || {}),
    id: r.id,
    created_date: r.created_date,
    updated_date: r.updated_date,
    created_by_id: r.created_by_id,
    created_by: r.created_by || undefined,
  };
}

function splitPayload(obj) {
  const data = { ...(obj || {}) };
  const top = {};
  for (const k of ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by']) {
    if (data[k] !== undefined) top[k] = data[k];
    delete data[k];
  }
  return { data, top };
}

function col(field) {
  return TOP.has(field) ? field : `data->>${field}`;
}

function applyFilter(q, query) {
  for (const [k, v] of Object.entries(query || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [op, val] of Object.entries(v)) {
        const c = col(k);
        if (op === '$gte') q = q.gte(c, val);
        else if (op === '$gt') q = q.gt(c, val);
        else if (op === '$lte') q = q.lte(c, val);
        else if (op === '$lt') q = q.lt(c, val);
        else if (op === '$ne') q = q.neq(c, val);
        else if (op === '$in') q = q.in(c, (val || []).map((x) => (TOP.has(k) ? x : String(x))));
        else if (op === '$nin') q = q.not(c, 'in', `(${(val || []).map((x) => JSON.stringify(String(x))).join(',')})`);
      }
    } else if (TOP.has(k)) {
      q = q.eq(k, v);
    } else if (v === null || v === undefined) {
      q = q.is(`data->${k}`, null);
    } else {
      q = q.contains('data', { [k]: v });
    }
  }
  return q;
}

function parseOpts(sort, limit, skip) {
  if (sort && typeof sort === 'object') return { sort: sort.sort, limit: sort.limit, skip: sort.skip };
  return { sort, limit, skip };
}

function applySort(q, sort) {
  if (!sort) return q.order('created_date', { ascending: false });
  const desc = sort.startsWith('-');
  const f = desc ? sort.slice(1) : sort;
  if (TOP.has(f)) return q.order(f, { ascending: !desc });
  return q.order(`data->${f}`, { ascending: !desc, nullsFirst: false });
}

const PAGE = 1000;

async function fetchAll(build, limit, skip = 0) {
  const want = limit && limit > 0 ? limit : 5000;
  let out = [];
  let from = skip || 0;
  while (out.length < want) {
    const n = Math.min(PAGE, want - out.length);
    const { data, error } = await build().range(from, from + n - 1);
    if (error) throw error;
    out = out.concat(data || []);
    if (!data || data.length < n) break;
    from += n;
  }
  return out;
}

export function makeEntities(supabase, defaults = {}, { onUser } = {}) {
  const channels = new Map();

  function entity(name) {
    const base = () => supabase.from('records').select('*').eq('entity', name);
    const withDefaults = (obj) => ({ ...(defaults[name] || {}), ...obj });

    const api = {
      async filter(query = {}, sort, limit, skip) {
        const o = parseOpts(sort, limit, skip);
        const rows = await fetchAll(() => applySort(applyFilter(base(), query), o.sort), o.limit, o.skip);
        return rows.map(rowToObj);
      },
      async list(sort, limit, skip) {
        return api.filter({}, sort, limit, skip);
      },
      async get(id) {
        const { data, error } = await base().eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) {
          const e = new Error('Not found');
          e.status = 404;
          throw e;
        }
        return rowToObj(data);
      },
      async count(query = {}) {
        let q = supabase.from('records').select('id', { count: 'exact', head: true }).eq('entity', name);
        q = applyFilter(q, query);
        const { count, error } = await q;
        if (error) throw error;
        return count || 0;
      },
      async create(obj) {
        const { data, top } = splitPayload(withDefaults(obj));
        const row = { entity: name, data, ...top };
        const { data: res, error } = await supabase.from('records').insert(row).select('*').single();
        if (error) throw error;
        return rowToObj(res);
      },
      async bulkCreate(list) {
        if (!list?.length) return [];
        const rows = list.map((o) => {
          const { data, top } = splitPayload(withDefaults(o));
          return { entity: name, data, ...top };
        });
        const out = [];
        for (let i = 0; i < rows.length; i += 500) {
          const { data, error } = await supabase.from('records').insert(rows.slice(i, i + 500)).select('*');
          if (error) throw error;
          out.push(...data);
        }
        return out.map(rowToObj);
      },
      async update(id, patch) {
        const { data: cur, error: e1 } = await supabase.from('records').select('data').eq('entity', name).eq('id', id).maybeSingle();
        if (e1) throw e1;
        if (!cur) {
          const e = new Error('Not found');
          e.status = 404;
          throw e;
        }
        const { data } = splitPayload(patch);
        const merged = { ...(cur.data || {}), ...data };
        const { data: res, error } = await supabase.from('records').update({ data: merged }).eq('id', id).select('*').single();
        if (error) throw error;
        return rowToObj(res);
      },
      async bulkUpdate(list) {
        const out = [];
        for (const item of list || []) {
          const { id, ...patch } = item;
          out.push(await api.update(id, patch));
        }
        return out;
      },
      async delete(id) {
        const { error } = await supabase.from('records').delete().eq('entity', name).eq('id', id);
        if (error) throw error;
        return { success: true };
      },
      async deleteMany(query = {}) {
        let q = supabase.from('records').delete({ count: 'exact' }).eq('entity', name);
        q = applyFilter(q, query);
        const { count, error } = await q;
        if (error) throw error;
        return { deleted: count || 0 };
      },
      subscribe(cb) {
        const key = `rec-${name}-${Math.random().toString(36).slice(2)}`;
        const ch = supabase
          .channel(key)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `entity=eq.${name}` }, (p) => {
            const type = p.eventType === 'INSERT' ? 'create' : p.eventType === 'UPDATE' ? 'update' : 'delete';
            const row = p.new && Object.keys(p.new).length ? p.new : p.old;
            const obj = rowToObj(row);
            try {
              cb({ type, id: obj?.id, data: obj });
            } catch (e) {
              console.error(e);
            }
          })
          .subscribe();
        channels.set(key, ch);
        return () => {
          supabase.removeChannel(ch);
          channels.delete(key);
        };
      },
    };
    return api;
  }

  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (typeof prop !== 'string') return undefined;
        if (prop === 'User' && onUser) return onUser;
        return entity(prop);
      },
    }
  );
}
