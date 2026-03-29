-- Growth session completions
create table if not exists public.growth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  block_id text not null,
  title text not null,
  target_minutes int4 not null,
  elapsed_minutes int4 not null,
  completed_at timestamptz not null default now()
);

-- Start/pause/progress/complete events
create table if not exists public.growth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  block_id text not null,
  title text not null,
  event_type text not null,
  elapsed_minutes int4 not null,
  occurred_at timestamptz not null default now()
);

-- Latest progress per block per user
create table if not exists public.growth_progress (
  user_id uuid not null,
  block_id text not null,
  elapsed_minutes int4 not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, block_id)
);

-- Add missing columns if tables already existed (safe for existing dev data)
alter table public.growth_sessions add column if not exists user_id uuid;
alter table public.growth_events add column if not exists user_id uuid;

alter table public.growth_sessions enable row level security;
alter table public.growth_events enable row level security;
alter table public.growth_progress enable row level security;

-- Authenticated users can insert their own rows
drop policy if exists "anon_insert_growth_sessions" on public.growth_sessions;
drop policy if exists "anon_insert_growth_events" on public.growth_events;
drop policy if exists "public_insert_growth_sessions" on public.growth_sessions;
drop policy if exists "public_insert_growth_events" on public.growth_events;

drop policy if exists "auth_insert_growth_sessions" on public.growth_sessions;
drop policy if exists "auth_insert_growth_events" on public.growth_events;
drop policy if exists "auth_select_growth_progress" on public.growth_progress;
drop policy if exists "auth_insert_growth_progress" on public.growth_progress;
drop policy if exists "auth_update_growth_progress" on public.growth_progress;

create policy "auth_insert_growth_sessions"
on public.growth_sessions
for insert
to authenticated
with check (user_id = auth.uid());

create policy "auth_insert_growth_events"
on public.growth_events
for insert
to authenticated
with check (user_id = auth.uid());

create policy "auth_select_growth_progress"
on public.growth_progress
for select
to authenticated
using (user_id = auth.uid());

create policy "auth_insert_growth_progress"
on public.growth_progress
for insert
to authenticated
with check (user_id = auth.uid());

create policy "auth_update_growth_progress"
on public.growth_progress
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant usage on schema public to authenticated;
grant insert on table public.growth_sessions to authenticated;
grant insert on table public.growth_events to authenticated;
grant insert, select, update on table public.growth_progress to authenticated;

-- User profiles (username / recovery email)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  recovery_email text,
  nickname text,
  status_message text,
  avatar_url text,
  profile_setup_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "auth_select_user_profiles" on public.user_profiles;
drop policy if exists "auth_insert_user_profiles" on public.user_profiles;
drop policy if exists "auth_update_user_profiles" on public.user_profiles;

create policy "auth_select_user_profiles"
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

create policy "auth_insert_user_profiles"
on public.user_profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "auth_update_user_profiles"
on public.user_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

grant select, insert, update on table public.user_profiles to authenticated;

create unique index if not exists user_profiles_nickname_key on public.user_profiles (nickname) where nickname is not null;

-- Auth helper functions (username/email lookup)
create or replace function public.check_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return not exists (
    select 1 from public.user_profiles where username = p_username
  );
end;
$$;

create or replace function public.check_email_available(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select not exists (
    select 1 from auth.users where email = p_email
  );
$$;

create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select u.email
  from auth.users u
  join public.user_profiles p on p.id = u.id
  where p.username = p_username
  limit 1;
$$;

create or replace function public.get_username_by_email(p_email text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select p.username
  from auth.users u
  join public.user_profiles p on p.id = u.id
  where u.email = p_email
  limit 1;
$$;
