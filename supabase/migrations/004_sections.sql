-- v0.5: session sections and poll grouping

create table if not exists session_sections (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  title       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table polls
  add column if not exists section_id uuid references session_sections(id) on delete set null;

-- org-level settings (white label, branding)
alter table organizations
  add column if not exists settings jsonb;

-- attendance counter on sessions
alter table sessions
  add column if not exists total_attendees integer not null default 0;

-- realtime replication for new tables
alter publication supabase_realtime add table session_sections;
