-- v0.6: presentation slides for display screen

create table session_slides (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  type        text not null check (type in ('splash','speaker','schedule','quote','final')),
  content     jsonb not null default '{}',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table sessions
  add column if not exists active_slide_id uuid references session_slides(id) on delete set null;

alter publication supabase_realtime add table session_slides;
