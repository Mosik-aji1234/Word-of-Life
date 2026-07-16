-- Bible App Tables for Supabase
-- Run this in Supabase SQL Editor after the main auth schema.

create extension if not exists "pgcrypto";

create table if not exists public.favorite_verses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_reference text not null,
  verse_text text not null,
  created_at timestamptz not null default now(),
  unique(user_id, verse_reference)
);

create table if not exists public.verse_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_reference text not null,
  note_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.verse_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_reference text not null,
  verse_text text not null,
  color text not null default 'gold',
  created_at timestamptz not null default now(),
  unique(user_id, verse_reference)
);

alter table public.favorite_verses enable row level security;
alter table public.verse_notes enable row level security;
alter table public.verse_highlights enable row level security;

drop policy if exists "Users can view their own favorites" on public.favorite_verses;
create policy "Users can view their own favorites"
on public.favorite_verses for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own favorites" on public.favorite_verses;
create policy "Users can insert their own favorites"
on public.favorite_verses for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own favorites" on public.favorite_verses;
create policy "Users can update their own favorites"
on public.favorite_verses for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own favorites" on public.favorite_verses;
create policy "Users can delete their own favorites"
on public.favorite_verses for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own notes" on public.verse_notes;
create policy "Users can view their own notes"
on public.verse_notes for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own notes" on public.verse_notes;
create policy "Users can insert their own notes"
on public.verse_notes for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own notes" on public.verse_notes;
create policy "Users can delete their own notes"
on public.verse_notes for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own highlights" on public.verse_highlights;
create policy "Users can view their own highlights"
on public.verse_highlights for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own highlights" on public.verse_highlights;
create policy "Users can insert their own highlights"
on public.verse_highlights for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own highlights" on public.verse_highlights;
create policy "Users can delete their own highlights"
on public.verse_highlights for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists favorite_verses_user_id on public.favorite_verses(user_id);
create index if not exists verse_notes_user_id on public.verse_notes(user_id);
create index if not exists verse_highlights_user_id on public.verse_highlights(user_id);
