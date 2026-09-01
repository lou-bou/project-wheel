-- ─────────────────────────────────────────────
-- Project Wheel — Supabase Schema
-- Run this in the Supabase SQL Editor (on a fresh project)
-- ─────────────────────────────────────────────

-- Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  owner_id uuid references auth.users(id) default auth.uid() not null,
  created_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  difficulty text check (difficulty in ('Easy', 'Medium', 'Hard', 'Expert')) not null default 'Medium',
  dev_type text check (dev_type in ('Manual', 'Assisted')) not null default 'Assisted',
  status text check (status in ('idea', 'doing', 'completed')) not null default 'idea',
  link text,
  owner_id uuid references auth.users(id) default auth.uid() not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Many-to-many: project ↔ category
create table project_categories (
  project_id uuid references projects(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  owner_id uuid references auth.users(id) default auth.uid() not null,
  primary key (project_id, category_id)
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- RLS: each account only sees and manages its own rows
alter table categories enable row level security;
alter table projects enable row level security;
alter table project_categories enable row level security;

create policy "owner full access" on categories for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner full access" on projects for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner full access" on project_categories for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);