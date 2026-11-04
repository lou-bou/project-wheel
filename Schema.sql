-- ─────────────────────────────────────────────
-- Whirl — Postgres Schema
-- Run once on a fresh database:  psql "$DATABASE_URL" -f Schema.sql
-- ─────────────────────────────────────────────

-- Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
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
  has_content boolean not null default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Many-to-many: project ↔ category
create table project_categories (
  project_id uuid references projects(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
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
