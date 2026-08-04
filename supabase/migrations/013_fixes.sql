-- Phase 0 fixes from the core+modules architecture audit.

-- 1. `reveal` slide type exists in TS (slides.ts, SlideContent, revealAnswer,
--    the AddSlidePanel/SlidesPanel picker) but was never added to the DB
--    constraint (005 defined 5 types, 006 added spin_wheel+announcement = 7).
--    Creating a reveal slide currently fails at runtime.
alter table session_slides
  drop constraint if exists session_slides_type_check;

alter table session_slides
  add constraint session_slides_type_check
    check (type in ('splash', 'speaker', 'schedule', 'quote', 'final', 'spin_wheel', 'announcement', 'reveal'));

-- 2. organizations.plan CHECK still only allows ('free','pro','team') from 001,
--    but the app (types/database.ts, admin.ts setOrgPlan, the billing webhook)
--    has used 'starter' and 'unlimited' for a while — those writes violate
--    the constraint today.
alter table organizations
  drop constraint if exists organizations_plan_check;

alter table organizations
  add constraint organizations_plan_check
    check (plan in ('free', 'starter', 'pro', 'team', 'unlimited'));

-- 3. participants: registration goes through registerParticipant(), a server
--    action using the service-role client, which bypasses RLS entirely — the
--    anon INSERT policy adds no functionality and lets any anon client insert
--    a participant into any session.
drop policy if exists "anon insert participants" on participants;

-- 4. Atomic upvote — upvoteQuestion() previously did read-current-count then
--    write-count+1 as two round trips, racy under concurrent upvotes.
create or replace function public.increment_question_upvotes(p_question_id uuid)
returns public.questions
language sql
security definer set search_path = ''
as $$
  update public.questions
  set upvotes = upvotes + 1
  where id = p_question_id
  returning *;
$$;

-- 5. Dead realtime publication entries. All realtime in this app is Supabase
--    Broadcast over the REST endpoint — there is no `postgres_changes`
--    subscriber anywhere in the codebase, so these CDC publication entries
--    (added in 002/005) do nothing. Harmless to leave, but removing them
--    documents that CDC is not in use. REST reads via RLS are untouched —
--    those policies (003) stay, they're actively used by client resync.
-- ALTER PUBLICATION ... DROP TABLE has no IF EXISTS form in Postgres, so guard
-- each drop with a catalog check to keep this migration safely re-runnable.
do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'polls') then
    alter publication supabase_realtime drop table public.polls;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes') then
    alter publication supabase_realtime drop table public.votes;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions') then
    alter publication supabase_realtime drop table public.sessions;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'questions') then
    alter publication supabase_realtime drop table public.questions;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'session_slides') then
    alter publication supabase_realtime drop table public.session_slides;
  end if;
end $$;
