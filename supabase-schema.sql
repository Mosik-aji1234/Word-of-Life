-- Word of Life growth dashboard schema for Supabase.
-- Run this in Supabase Dashboard -> SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  focus text not null default 'Bible consistency',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reading jsonb not null default '{}'::jsonb,
  devotional_dates text[] not null default '{}',
  quiz jsonb not null default '{"attempts": 0, "correct": 0}'::jsonb,
  activity jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.prayer_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.prayer_entries enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own progress" on public.user_progress;
create policy "Users can view their own progress"
on public.user_progress for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own progress" on public.user_progress;
create policy "Users can insert their own progress"
on public.user_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own progress" on public.user_progress;
create policy "Users can update their own progress"
on public.user_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own prayer entries" on public.prayer_entries;
create policy "Users can view their own prayer entries"
on public.prayer_entries for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own prayer entries" on public.prayer_entries;
create policy "Users can insert their own prayer entries"
on public.prayer_entries for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own prayer entries" on public.prayer_entries;
create policy "Users can delete their own prayer entries"
on public.prayer_entries for delete
to authenticated
using ((select auth.uid()) = user_id);
