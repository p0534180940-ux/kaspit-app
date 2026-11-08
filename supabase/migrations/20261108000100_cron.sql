-- משימות מתוזמנות (מחליף את ה-Workflows של Base44)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- מפתח פנימי למשימות המתוזמנות. נוצר אקראית בתוך המסד, אף אחד לא צריך להעתיק אותו.
create table if not exists public.private_settings (key text primary key, value text not null);
alter table public.private_settings enable row level security;
insert into public.private_settings (key, value)
values ('cron_key', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

create or replace function public.call_fn(fn text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := '__SUPABASE_URL__/functions/v1/' || fn,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('cron_key', (select value from public.private_settings where key = 'cron_key'))
  );
end $$;
revoke all on function public.call_fn(text) from public, anon, authenticated;

do $$ begin perform cron.unschedule('kaspit-phone-sync'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('kaspit-daily'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('kaspit-monthly-fixed'); exception when others then null; end $$;

-- כל 10 דקות: הקלטות מהקו שלא טופלו בשיחה
select cron.schedule('kaspit-phone-sync', '*/10 * * * *', $$select public.call_fn('syncPhoneCalls')$$);
-- כל בוקר 08:00 שעון ישראל (06:00 UTC בחורף)
select cron.schedule('kaspit-daily', '0 6 * * *', $$select public.call_fn('dailyNotifications')$$);
-- ב-1 לכל חודש: סנכרון הוצאות קבועות לתקציב
select cron.schedule('kaspit-monthly-fixed', '0 0 1 * *', $$select public.call_fn('syncFixedItems')$$);
