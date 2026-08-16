-- organization_members' own SELECT policy queries organization_members
-- from inside itself (an EXISTS subquery against the same table), so
-- every read of the table re-triggers its own RLS policy: Postgres
-- error 42P17 "infinite recursion detected in policy for relation
-- organization_members".
--
-- This breaks every anon/authenticated (non-service-role) query that
-- touches organization_members directly OR transitively through
-- another table's policy — sessions, polls, votes, questions and
-- organizations all JOIN organization_members inside their own
-- policies. In particular it breaks VoteInterface's and DisplayScreen's
-- client-side realtime resync (useSessionSync's onFirstConnect), which
-- queries `polls`/`sessions` directly with the browser's anon-key
-- client: the resync silently receives no data and overwrites the
-- correct server-rendered state with null, which reads as "the
-- projector/participant screen reverted to the default join screen" —
-- reproduced locally 2026-08-06 via a seeded test session, confirmed by
-- the exact 42P17 error on the failing `polls`/`sessions` REST calls.
--
-- Fix: move the membership check into a SECURITY DEFINER function. Such
-- a function runs as its owner (whoever applies this migration — the
-- Supabase SQL editor runs as `postgres`), and the table owner bypasses
-- RLS on tables it owns, so the function's internal SELECT does not
-- re-trigger the policy it's used inside of.

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = p_org_id
      and user_id = auth.uid()
      and accepted_at is not null
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated, anon;

drop policy "Члены видят состав своей org" on public.organization_members;
create policy "Члены видят состав своей org"
  on public.organization_members for select
  using (public.is_org_member(organization_id));
