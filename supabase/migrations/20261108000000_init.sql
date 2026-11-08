-- כספית: מבנה המסד (מחליף את Base44)
create extension if not exists pgcrypto;

-- פרופיל משתמש באתר (מחליף את ישות User של Base44)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user',
  owner_identity text unique,
  is_coach boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- כל הישויות בטבלה אחת: entity + data (JSON)
create table if not exists public.records (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  entity text not null,
  data jsonb not null default '{}'::jsonb,
  owner_id text generated always as (data->>'owner_id') stored,
  created_by_id uuid,
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists records_entity_owner on public.records(entity, owner_id);
create index if not exists records_entity_created on public.records(entity, created_date desc);
create index if not exists records_data_gin on public.records using gin (data jsonb_path_ops);

create or replace function public.touch_updated() returns trigger language plpgsql as $$
begin new.updated_date := now(); return new; end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before update on public.records for each row execute function public.touch_updated();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated();

-- פונקציות עזר להרשאות
create or replace function public.my_identity() returns text language sql stable security definer set search_path = public as $$
  select owner_identity from public.profiles where id = auth.uid()
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- פרופיל נוצר אוטומטית בהרשמה. בעל המערכת מקבל הרשאת מנהל.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, owner_identity)
  values (
    new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when lower(new.email) = 'p0534180940@gmail.com' then 'admin' else 'user' end,
    case when lower(new.email) = 'p0534180940@gmail.com' then '0534180940' else null end
  ) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.records enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for update using (public.is_admin());
-- משתמש מעדכן רק את השם שלו; שיוך מזהה/תפקיד נעשה בפונקציות השרת
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid())
              and is_coach = (select p.is_coach from public.profiles p where p.id = auth.uid())
              and owner_identity is not distinct from (select p.owner_identity from public.profiles p where p.id = auth.uid()));

-- ישויות שרק מנהל רואה ישירות (השאר עובר דרך פונקציות השרת)
create or replace function public.admin_only_entity(e text) returns boolean language sql immutable as $$
  select e in ('CallSession','PhoneLog','SttState','CoachProfile','IncomingFax')
$$;

drop policy if exists rec_read on public.records;
create policy rec_read on public.records for select using (
  public.is_admin()
  or (not public.admin_only_entity(entity) and (
        created_by_id = auth.uid()
     or (owner_id is not null and owner_id = public.my_identity())
     or (entity = 'GlobalCategoryRule' and auth.uid() is not null)))
);
drop policy if exists rec_insert on public.records;
create policy rec_insert on public.records for insert with check (
  public.is_admin()
  or (auth.uid() is not null and not public.admin_only_entity(entity)
      and entity not in ('CoachAccess','CoachNote')
      and (entity in ('GlobalCategoryRule','Feedback','PhoneRegistration')
           or owner_id = public.my_identity()))
);
drop policy if exists rec_update on public.records;
create policy rec_update on public.records for update using (
  public.is_admin()
  or (not public.admin_only_entity(entity) and entity not in ('CoachAccess','CoachNote') and (
        created_by_id = auth.uid()
     or (owner_id is not null and owner_id = public.my_identity())
     or (entity = 'GlobalCategoryRule' and auth.uid() is not null)))
) with check (
  public.is_admin()
  or owner_id is null or owner_id = public.my_identity() or entity = 'GlobalCategoryRule'
);
drop policy if exists rec_delete on public.records;
create policy rec_delete on public.records for delete using (
  public.is_admin()
  or (not public.admin_only_entity(entity) and entity not in ('CoachAccess','CoachNote','GlobalCategoryRule') and (
        created_by_id = auth.uid()
     or (owner_id is not null and owner_id = public.my_identity())))
);

-- created_by_id נקבע אוטומטית למשתמש המחובר
create or replace function public.set_creator() returns trigger language plpgsql as $$
begin
  if new.created_by_id is null then new.created_by_id := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists records_creator on public.records;
create trigger records_creator before insert on public.records for each row execute function public.set_creator();

-- עדכונים בזמן אמת לאתר
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when others then null; end $$;
alter table public.records replica identity full;

-- אחסון קבצים
insert into storage.buckets (id, name, public) values ('public', 'public', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('private', 'private', false) on conflict (id) do nothing;
drop policy if exists "auth upload public" on storage.objects;
create policy "auth upload public" on storage.objects for insert to authenticated with check (bucket_id in ('public','private'));
drop policy if exists "read own private" on storage.objects;
create policy "read own private" on storage.objects for select to authenticated using (bucket_id = 'private' and owner = auth.uid());
