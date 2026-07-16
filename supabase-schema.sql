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

create table if not exists public.devotionals (
  id uuid primary key default gen_random_uuid(),
  devotional_date date not null unique,
  title text not null,
  memory_reference text not null,
  memory_verse text not null,
  message text not null,
  prayer_point text not null,
  source text not null default 'Word of Life',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.prayer_entries enable row level security;
alter table public.devotionals enable row level security;

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

drop policy if exists "Signed-in users can read devotionals" on public.devotionals;
create policy "Signed-in users can read devotionals"
on public.devotionals for select
to authenticated
using (true);

insert into public.devotionals (
  devotional_date,
  title,
  memory_reference,
  memory_verse,
  message,
  prayer_point,
  source
) values
  (
    '2026-07-16',
    'Strength for Today',
    'Philippians 4:13',
    'I can do all things through Christ which strengtheneth me.',
    'Spiritual growth is not built only in big moments. It is built when you choose faithfulness today. Let Christ be your strength for the next obedient step.',
    'Lord Jesus, strengthen my heart to obey You today and to keep growing with consistency.',
    'Word of Life'
  ),
  (
    '2026-07-17',
    'Led by the Word',
    'Psalm 119:105',
    'Thy word is a lamp unto my feet, and a light unto my path.',
    'God does not leave His children to walk in darkness. His Word gives direction for the step in front of you and wisdom for the road ahead.',
    'Father, open my understanding and guide my decisions through Your Word.',
    'Word of Life'
  )
on conflict (devotional_date) do update set
  title = excluded.title,
  memory_reference = excluded.memory_reference,
  memory_verse = excluded.memory_verse,
  message = excluded.message,
  prayer_point = excluded.prayer_point,
  source = excluded.source,
  updated_at = now();
