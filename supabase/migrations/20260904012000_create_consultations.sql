create type public.app_role as enum ('student', 'admin');
create type public.consultation_status as enum (
  'scheduled',
  'completed',
  'cancelled'
);

create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  reason text not null,
  scheduled_at timestamptz not null,
  status public.consultation_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultations_first_name_length
    check (char_length(btrim(first_name)) between 1 and 100),
  constraint consultations_last_name_length
    check (char_length(btrim(last_name)) between 1 and 100),
  constraint consultations_reason_length
    check (char_length(btrim(reason)) between 1 and 1000)
);

create index consultations_student_schedule_idx
  on public.consultations (student_id, scheduled_at desc);

create index consultations_schedule_idx
  on public.consultations (scheduled_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger consultations_set_updated_at
before update on public.consultations
for each row execute function private.set_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.consultations enable row level security;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
);

create policy consultations_select_own_or_admin
on public.consultations
for select
to authenticated
using (
  student_id = (select auth.uid())
  or (select private.is_admin())
);

create policy consultations_insert_own
on public.consultations
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and status = 'scheduled'
);

create policy consultations_update_own_active
on public.consultations
for update
to authenticated
using (
  student_id = (select auth.uid())
  and status <> 'cancelled'
)
with check (student_id = (select auth.uid()));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.consultations from anon, authenticated;
revoke all on type public.app_role from public;
revoke all on type public.consultation_status from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.is_admin() from public;

grant usage on schema private to authenticated;
grant usage on type public.app_role to authenticated;
grant usage on type public.consultation_status to authenticated;
grant execute on function private.is_admin() to authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.consultations to authenticated;
grant insert (student_id, first_name, last_name, reason, scheduled_at)
  on table public.consultations to authenticated;
grant update (scheduled_at, status)
  on table public.consultations to authenticated;
