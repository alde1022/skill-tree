create table if not exists builds (
  id uuid primary key default gen_random_uuid(),
  short_id text unique not null,
  allocated text[] not null,
  points_total int not null default 25,
  title text,
  description text,
  created_at timestamptz not null default now(),
  view_count int not null default 0
);
create index if not exists builds_short_id_idx on builds (short_id);
