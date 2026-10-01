-- ============================================================
-- Вся схема LivePoll одним файлом, для ЧИСТОГО staging-проекта.
-- Собрано из 21 миграций в порядке номеров.
-- Вставить целиком в Supabase Dashboard -> SQL Editor -> Run.
-- НЕ запускать на боевом проекте: часть операций не повторяется.
-- ============================================================


-- ######################################################
-- 001_initial_schema.sql
-- ######################################################

-- =============================================
-- LivePoll AI — Initial Schema
-- Запустить в: Supabase Dashboard → SQL Editor
-- =============================================


-- =============================================
-- PROFILES
-- Расширение auth.users, создаётся автоматически
-- =============================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  platform_role text not null default 'user'
    check (platform_role in ('user', 'platform_admin')),
  created_at  timestamptz not null default now()
);

-- Trigger: создать profile при регистрации пользователя
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================
-- ORGANIZATIONS
-- Аккаунт (тенант) на платформе
-- =============================================
create table public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  plan            text not null default 'free'
    check (plan in ('free', 'pro', 'team')),
  plan_expires_at timestamptz,
  created_at      timestamptz not null default now()
);

-- Индекс для быстрого поиска по slug (используется в URL)
create index organizations_slug_idx on public.organizations(slug);


-- =============================================
-- ORGANIZATION_MEMBERS
-- Участники организации с ролями
-- =============================================
create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null check (role in ('owner', 'host')),
  invited_by      uuid references public.profiles(id),
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index org_members_org_idx on public.organization_members(organization_id);
create index org_members_user_idx on public.organization_members(user_id);


-- =============================================
-- SESSIONS
-- Мероприятие внутри организации
-- =============================================
create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by      uuid not null references public.profiles(id),
  title           text not null,
  join_code       text not null unique,
  status          text not null default 'draft'
    check (status in ('draft', 'active', 'ended')),
  settings        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  ended_at        timestamptz
);

create index sessions_org_idx on public.sessions(organization_id);
create index sessions_join_code_idx on public.sessions(join_code);

-- Функция генерации уникального join_code (6 символов, только буквы и цифры)
create or replace function public.generate_join_code()
returns text
language plpgsql
as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i      int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;


-- =============================================
-- POLLS
-- Опрос внутри сессии
-- =============================================
create table public.polls (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  created_by  uuid not null references public.profiles(id),
  title       text not null,
  type        text not null
    check (type in (
      'multiple_choice', 'temperature', 'qa',
      'like_dislike', 'word_cloud', 'emoji_cloud', 'planning_poker'
    )),
  options     jsonb not null default '[]',
  status      text not null default 'draft'
    check (status in ('draft', 'active', 'closed')),
  settings    jsonb not null default '{}',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);

create index polls_session_idx on public.polls(session_id);
create index polls_status_idx on public.polls(session_id, status);


-- =============================================
-- VOTES
-- Голос участника
-- =============================================
create table public.votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references public.polls(id) on delete cascade,
  voter_token text not null,
  value       text not null,
  created_at  timestamptz not null default now(),
  unique (poll_id, voter_token)
);

create index votes_poll_idx on public.votes(poll_id);


-- =============================================
-- QUESTIONS
-- Вопросы от аудитории (Q&A режим)
-- =============================================
create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  voter_token text not null,
  text        text not null,
  status      text not null default 'pending'
    check (status in ('pending', 'answered', 'hidden')),
  upvotes     int not null default 0,
  created_at  timestamptz not null default now()
);

create index questions_session_idx on public.questions(session_id);


-- =============================================
-- QUESTION_UPVOTES
-- Лайки на вопросы (защита от дублей)
-- =============================================
create table public.question_upvotes (
  question_id uuid not null references public.questions(id) on delete cascade,
  voter_token text not null,
  primary key (question_id, voter_token)
);


-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table public.profiles             enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.sessions             enable row level security;
alter table public.polls                enable row level security;
alter table public.votes                enable row level security;
alter table public.questions            enable row level security;
alter table public.question_upvotes     enable row level security;


-- PROFILES
create policy "Пользователь видит свой профиль"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Пользователь обновляет свой профиль"
  on public.profiles for update
  using (auth.uid() = id);


-- ORGANIZATIONS
create policy "Члены видят свою организацию"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
        and accepted_at is not null
    )
  );

create policy "Авторизованный создаёт организацию"
  on public.organizations for insert
  with check (auth.uid() is not null);

create policy "Owner обновляет организацию"
  on public.organizations for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
        and role = 'owner'
        and accepted_at is not null
    )
  );


-- ORGANIZATION_MEMBERS
create policy "Члены видят состав своей org"
  on public.organization_members for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
        and om.accepted_at is not null
    )
  );

create policy "Owner управляет составом"
  on public.organization_members for insert
  with check (
    exists (
      select 1 from public.organization_members
      where organization_id = organization_members.organization_id
        and user_id = auth.uid()
        and role = 'owner'
        and accepted_at is not null
    )
  );

create policy "Owner удаляет или пользователь удаляет себя"
  on public.organization_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.organization_members
      where organization_id = organization_members.organization_id
        and user_id = auth.uid()
        and role = 'owner'
        and accepted_at is not null
    )
  );


-- SESSIONS
create policy "Члены org видят сессии"
  on public.sessions for select
  using (
    -- Для org-членов
    exists (
      select 1 from public.organization_members
      where organization_id = sessions.organization_id
        and user_id = auth.uid()
        and accepted_at is not null
    )
    or
    -- Для анонимных участников — только активные, по join_code (проверяется в API)
    status = 'active'
  );

create policy "Host и owner создают сессии"
  on public.sessions for insert
  with check (
    exists (
      select 1 from public.organization_members
      where organization_id = sessions.organization_id
        and user_id = auth.uid()
        and role in ('owner', 'host')
        and accepted_at is not null
    )
  );

create policy "Host и owner управляют своими сессиями"
  on public.sessions for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = sessions.organization_id
        and user_id = auth.uid()
        and role in ('owner', 'host')
        and accepted_at is not null
    )
  );


-- POLLS
create policy "Видят опросы члены org или участники активной сессии"
  on public.polls for select
  using (
    exists (
      select 1 from public.sessions s
      join public.organization_members om on om.organization_id = s.organization_id
      where s.id = polls.session_id
        and om.user_id = auth.uid()
        and om.accepted_at is not null
    )
    or
    exists (
      select 1 from public.sessions s
      where s.id = polls.session_id and s.status = 'active'
    )
  );

create policy "Host и owner создают и управляют опросами"
  on public.polls for insert
  with check (
    exists (
      select 1 from public.sessions s
      join public.organization_members om on om.organization_id = s.organization_id
      where s.id = polls.session_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'host')
        and om.accepted_at is not null
    )
  );

create policy "Host и owner обновляют опросы"
  on public.polls for update
  using (
    exists (
      select 1 from public.sessions s
      join public.organization_members om on om.organization_id = s.organization_id
      where s.id = polls.session_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'host')
        and om.accepted_at is not null
    )
  );


-- VOTES
create policy "Host видит голоса в своих сессиях"
  on public.votes for select
  using (
    exists (
      select 1 from public.polls p
      join public.sessions s on s.id = p.session_id
      join public.organization_members om on om.organization_id = s.organization_id
      where p.id = votes.poll_id
        and om.user_id = auth.uid()
        and om.accepted_at is not null
    )
  );

create policy "Кто угодно голосует в активном опросе"
  on public.votes for insert
  with check (
    exists (
      select 1 from public.polls p
      join public.sessions s on s.id = p.session_id
      where p.id = votes.poll_id
        and p.status = 'active'
        and s.status = 'active'
    )
  );


-- QUESTIONS
create policy "Host видит вопросы в своих сессиях"
  on public.questions for select
  using (
    exists (
      select 1 from public.sessions s
      join public.organization_members om on om.organization_id = s.organization_id
      where s.id = questions.session_id
        and om.user_id = auth.uid()
        and om.accepted_at is not null
    )
    or voter_token = current_setting('request.headers', true)::json->>'x-voter-token'
  );

create policy "Кто угодно задаёт вопросы в активной сессии"
  on public.questions for insert
  with check (
    exists (
      select 1 from public.sessions
      where id = questions.session_id and status = 'active'
    )
  );

create policy "Host управляет статусом вопросов"
  on public.questions for update
  using (
    exists (
      select 1 from public.sessions s
      join public.organization_members om on om.organization_id = s.organization_id
      where s.id = questions.session_id
        and om.user_id = auth.uid()
        and om.accepted_at is not null
    )
  );


-- QUESTION_UPVOTES
create policy "Кто угодно видит и добавляет upvotes в активной сессии"
  on public.question_upvotes for select
  using (true);

create policy "Кто угодно ставит upvote в активной сессии"
  on public.question_upvotes for insert
  with check (
    exists (
      select 1 from public.questions q
      join public.sessions s on s.id = q.session_id
      where q.id = question_upvotes.question_id
        and s.status = 'active'
    )
  );

-- ######################################################
-- 002_realtime.sql
-- ######################################################

-- Phase 5.1: Supabase Realtime setup

-- Add tables to Supabase Realtime publication
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.questions;

-- Enable REPLICA IDENTITY FULL so update/delete events carry old row data
alter table public.polls replica identity full;
alter table public.votes replica identity full;
alter table public.sessions replica identity full;
alter table public.questions replica identity full;

-- Allow anonymous users to read votes in active sessions (display screen realtime)
create policy "Все видят голоса в активных сессиях"
  on public.votes for select
  using (
    exists (
      select 1 from public.polls p
      join public.sessions s on s.id = p.session_id
      where p.id = votes.poll_id
        and s.status = 'active'
    )
  );

-- Allow anonymous users to read questions in active sessions (Q&A display)
create policy "Все видят вопросы в активных сессиях"
  on public.questions for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = questions.session_id
        and s.status = 'active'
    )
  );

-- ######################################################
-- 003_realtime_rls_fix.sql
-- ######################################################

-- Проблема: Supabase Realtime не может вычислить сложные JOIN-политики
-- для анонимных пользователей при доставке событий.
-- Решение: заменить JOIN-политики на простые условия без JOIN.

-- VOTES: голоса анонимны (нет PII), безопасно открыть для чтения
DROP POLICY IF EXISTS "Все видят голоса в активных сессиях" ON public.votes;

CREATE POLICY "anon читает голоса"
  ON public.votes FOR SELECT TO anon
  USING (true);

-- QUESTIONS: только не скрытые вопросы (простая проверка без JOIN)
DROP POLICY IF EXISTS "Все видят вопросы в активных сессиях" ON public.questions;

CREATE POLICY "anon читает вопросы"
  ON public.questions FOR SELECT TO anon
  USING (status <> 'hidden');

-- POLLS: добавляем простую anon-политику (без JOIN по sessions)
-- Существующая политика остаётся для authenticated пользователей
CREATE POLICY "anon читает опросы"
  ON public.polls FOR SELECT TO anon
  USING (true);

-- ######################################################
-- 004_sections.sql
-- ######################################################

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

-- ######################################################
-- 005_slides.sql
-- ######################################################

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

-- ######################################################
-- 006_spin_wheel.sql
-- ######################################################

-- v0.8: add spin_wheel and announcement slide types

alter table session_slides
  drop constraint if exists session_slides_type_check;

alter table session_slides
  add constraint session_slides_type_check
    check (type in ('splash', 'speaker', 'schedule', 'quote', 'final', 'spin_wheel', 'announcement'));

-- ######################################################
-- 007_idea_wall.sql
-- ######################################################

-- v0.9: add idea_wall poll type

alter table polls
  drop constraint if exists polls_type_check;

alter table polls
  add constraint polls_type_check
    check (type in (
      'multiple_choice', 'temperature', 'qa',
      'like_dislike', 'word_cloud', 'emoji_cloud', 'planning_poker',
      'idea_wall'
    ));

-- ######################################################
-- 008_orders.sql
-- ######################################################

-- Orders table for payment tracking
CREATE TABLE IF NOT EXISTS orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan            TEXT        NOT NULL,
  amount_kopecks  INTEGER     NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending | paid | failed | cancelled
  payment_id      TEXT        UNIQUE,          -- YooKassa payment UUID
  payment_url     TEXT,                        -- checkout redirect URL
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orders_org_id_idx      ON orders(org_id);
CREATE INDEX IF NOT EXISTS orders_payment_id_idx  ON orders(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_status_idx      ON orders(status);

-- RLS: only service role can read/write orders (no public access)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ######################################################
-- 009_slides_sections.sql
-- ######################################################

-- Add section support to session_slides (so slides can be grouped like polls)
ALTER TABLE session_slides
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES session_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS session_slides_section_id_idx ON session_slides(section_id);

-- ######################################################
-- 010_questions_poll_id.sql
-- ######################################################

-- Add poll_id to questions so qa and idea_wall entries can be separated
alter table public.questions
  add column poll_id uuid references public.polls(id) on delete set null;

create index questions_poll_idx on public.questions(poll_id);

-- ######################################################
-- 011_quiz_participants.sql
-- ######################################################

-- Championship quiz mode: maps voter_token → participant name per session
CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  voter_token text NOT NULL,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, voter_token)
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Allow anon to read participants (for leaderboard display on join + display screens)
CREATE POLICY "anon read participants" ON participants
  FOR SELECT USING (true);

-- Allow anon to register as participant
CREATE POLICY "anon insert participants" ON participants
  FOR INSERT WITH CHECK (true);

-- ######################################################
-- 012_session_mode.sql
-- ######################################################

-- Session mode: 'conference' (default) or 'quiz'
ALTER TABLE sessions
  ADD COLUMN mode text NOT NULL DEFAULT 'conference'
  CHECK (mode IN ('conference', 'quiz'));

-- ######################################################
-- 013_fixes.sql
-- ######################################################

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

-- ######################################################
-- 014_mode_backfill.sql
-- ######################################################

-- Backfills sessions.mode for rows where it has drifted from
-- settings->championship->enabled — the flag QuizTab (now HostPanel)
-- actually reads/writes today via saveChampionshipSettings, which never
-- touched the mode column. createSession sets both consistently at
-- creation time, but toggling championship on/off afterwards only ever
-- updated settings, not mode.
--
-- Purely additive: only touches sessions where mode says 'conference' but
-- settings says championship is enabled. Nothing reads sessions.mode for
-- behavior yet, so this is safe to run on its own — it just makes mode an
-- honest source of truth so a future change can start reading it.
UPDATE sessions
SET mode = 'quiz'
WHERE mode = 'conference'
  AND settings -> 'championship' ->> 'enabled' = 'true';

-- ######################################################
-- 015_fix_org_members_rls_recursion.sql
-- ######################################################

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

-- ######################################################
-- 016_session_state_rpc.sql
-- ######################################################

-- ============================================================
-- Один RPC вместо прямых anon-запросов к таблицам.
--
-- Зачем:
--
-- 1. БЕЗОПАСНОСТЬ. Миграция 003 выдала anon право
--    `select ... using (true)` на polls и votes, чтобы клиентский
--    ресинк (useSessionSync → onFirstConnect) мог читать активный
--    опрос. Побочный эффект: публичным anon-ключом читаются ВСЕ
--    опросы и ВСЕ голоса всех организаций, включая
--    `polls.settings->>'correct_option'` — правильный ответ викторины
--    доступен участнику до раскрытия. Проверено запросом к REST API
--    прода 2026-09-29: вернулось 75 опросов, из них 9 с непустым
--    correct_option. Серверный `toPublicPoll()` (core/domain/poll.ts)
--    вычищает ответы на своём пути, но обходится прямым запросом к БД.
--
-- 2. КОРРЕКТНОСТЬ. Ресинк делал 3 последовательных запроса
--    (polls → sessions → session_slides) и трактовал любую ошибку как
--    «ничего не активно», затирая верное серверное состояние на null —
--    это и есть «проектор откатился к заставке с QR» (см. 015).
--    Один вызов вместо трёх: либо пришло состояние целиком, либо
--    пришла ошибка, которую клиент отличает от «пусто».
--
-- 3. НАГРУЗКА. joined_count считается здесь как count(distinct) в БД.
--    Приложение для этого выгружало все voter_token сессии в память и
--    строило Set — на каждый голос, дважды. Плюс PostgREST режет ответ
--    на 1000 строках, из-за чего счётчик молча занижался на больших
--    залах.
--
-- Эта миграция только ДОБАВЛЯЕТ функцию. Снятие anon-политик —
-- отдельная миграция 017, которую применяют ПОСЛЕ того, как клиент,
-- использующий RPC, уехал в прод. Порядок expand → deploy → contract
-- нужен, чтобы между применением SQL и деплоем кода прод не остался
-- без ресинка.
-- ============================================================

create or replace function public.get_session_state(p_join_code text)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_session record;
  v_poll    record;
  v_slide   json := null;
  v_votes   json := '[]'::json;
  v_questions json := '[]'::json;
  v_joined  int  := 0;
begin
  select s.id, s.status, s.total_attendees, s.active_slide_id
    into v_session
  from sessions s
  where s.join_code = upper(p_join_code);

  -- Несуществующий код — не ошибка, а пустое состояние: клиент
  -- отличает его от сбоя связи и не затирает то, что уже показано.
  if not found then
    return null;
  end if;

  select p.id, p.title, p.type, p.options, p.status, p.settings
    into v_poll
  from polls p
  where p.session_id = v_session.id
    and p.status = 'active'
  order by p.sort_order
  limit 1;

  if v_poll.id is not null then
    -- qa и idea_wall пишут в questions, а не в votes (storage в
    -- PollTypeModule) — голоса для них не выбираем.
    if v_poll.type not in ('qa', 'idea_wall') then
      select coalesce(json_agg(json_build_object('value', v.value)), '[]'::json)
        into v_votes
      from votes v
      where v.poll_id = v_poll.id;
    end if;

    select coalesce(json_agg(q order by q.upvotes desc), '[]'::json)
      into v_questions
    from (
      select qq.id, qq.text, qq.status, qq.upvotes, qq.poll_id
      from questions qq
      where qq.status <> 'hidden'
        and (
          case when v_poll.type in ('qa', 'idea_wall')
            then qq.poll_id = v_poll.id
            else qq.session_id = v_session.id
          end
        )
    ) q;
  else
    select coalesce(json_agg(q order by q.upvotes desc), '[]'::json)
      into v_questions
    from (
      select qq.id, qq.text, qq.status, qq.upvotes, qq.poll_id
      from questions qq
      where qq.session_id = v_session.id
        and qq.status <> 'hidden'
    ) q;
  end if;

  if v_session.active_slide_id is not null then
    select json_build_object('id', sl.id, 'type', sl.type, 'content', sl.content)
      into v_slide
    from session_slides sl
    where sl.id = v_session.active_slide_id;
  end if;

  select count(distinct v.voter_token)
    into v_joined
  from votes v
  join polls p on p.id = v.poll_id
  where p.session_id = v_session.id;

  return json_build_object(
    'session', json_build_object(
      'id', v_session.id,
      'status', v_session.status,
      'total_attendees', coalesce(v_session.total_attendees, 0)
    ),
    'poll', case
      when v_poll.id is null then null
      else json_build_object(
        'id', v_poll.id,
        'title', v_poll.title,
        'type', v_poll.type,
        'options', v_poll.options,
        'status', v_poll.status,
        -- Санитизация на уровне БД: ответы викторины не покидают сервер
        -- даже если вызвать функцию напрямую публичным ключом.
        'settings', coalesce(v_poll.settings, '{}'::jsonb) - 'correct_option' - 'explanation'
      )
    end,
    'votes', v_votes,
    'questions', v_questions,
    'slide', v_slide,
    'joined_count', v_joined
  );
end;
$$;

grant execute on function public.get_session_state(text) to anon, authenticated;

-- ######################################################
-- 017_lock_down_anon_access.sql
-- ######################################################

-- ============================================================
-- Contract-фаза к миграции 016. ПРИМЕНЯТЬ ТОЛЬКО ПОСЛЕ того, как
-- код, использующий get_session_state(), уехал в прод — до этого
-- клиентский ресинк ещё ходит в таблицы напрямую.
--
-- Что закрывается и почему это безопасно:
--
-- Единственный не-service-role доступ к БД во всём приложении — это
-- ресинк в браузере (DisplayScreen/VoteInterface). Проверено grep'ом
-- по всем "use client"-файлам: обращений .from() ровно шесть, все в
-- этих двух файлах, и после 016 они заменены одним rpc(). Все server
-- actions работают через createAdminClient() (service role), который
-- RLS не проверяет вообще. Значит перечисленные ниже политики не
-- обслуживают ни одного живого пути — они только открывают доступ
-- наружу.
--
-- 1. SELECT-политики с USING (true) на polls/votes/questions/
--    participants (миграции 003 и 011). Публичным anon-ключом читались
--    все опросы и голоса всех организаций, включая
--    settings->>'correct_option' — правильный ответ викторины до
--    раскрытия.
--
-- 2. Ветка «участники активной сессии» в polls-политике из 001:
--    тот же доступ к correct_option, только ограниченный активными
--    сессиями.
--
-- 3. INSERT-политики для anon на votes/questions/question_upvotes.
--    Голосование идёт через submitVote() — server action с проверкой
--    статуса опроса, rate limit'ом и лимитом участников по тарифу.
--    Прямая вставка в votes публичным ключом обходила ВСЁ это разом.
--    Ровно по этой причине миграция 013 уже сняла такую же политику с
--    participants.
--
-- 4. session_slides и session_sections: RLS на них не включался
--    никогда (001 включает его восьми таблицам, этих двух среди них
--    нет — они появились в 004 и 005). При выключенном RLS роль anon
--    работает по табличным грантам Supabase, то есть могла и читать, и
--    писать слайды и секции любого мероприятия. Политик не заводим:
--    пишет в них только service role, читает — get_session_state()
--    (security definer, RLS обходит).
--
-- ПЕРЕД ПРИМЕНЕНИЕМ полезно свериться с фактическим состоянием прода —
-- часть политик могла быть заведена вручную через SQL Editor и в
-- репозитории не отражена:
--
--   select tablename, policyname, roles, cmd, qual
--   from pg_policies where schemaname = 'public' order by tablename;
--
--   select relname, relrowsecurity from pg_class
--   where relnamespace = 'public'::regnamespace and relkind = 'r'
--   order by relname;
-- ============================================================

-- 1. Публичное чтение таблиц
drop policy if exists "anon читает опросы"  on public.polls;
drop policy if exists "anon читает голоса"  on public.votes;
drop policy if exists "anon читает вопросы" on public.questions;
drop policy if exists "anon read participants" on public.participants;
drop policy if exists "Кто угодно видит и добавляет upvotes в активной сессии" on public.question_upvotes;

-- 2. Ветка «любой в активной сессии» в polls-политике 001.
--    Пересоздаём политику, оставив только членов организации.
drop policy if exists "Видят опросы члены org или участники активной сессии" on public.polls;
drop policy if exists "Члены org видят опросы" on public.polls;
create policy "Члены org видят опросы"
  on public.polls for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = polls.session_id
        and public.is_org_member(s.organization_id)
    )
  );

-- 3. Прямая запись публичным ключом мимо server actions
drop policy if exists "Кто угодно голосует в активном опросе"      on public.votes;
drop policy if exists "Кто угодно задаёт вопросы в активной сессии" on public.questions;
drop policy if exists "Кто угодно ставит upvote в активной сессии"  on public.question_upvotes;

-- 4. Таблицы, оставшиеся без RLS
alter table public.session_slides   enable row level security;
alter table public.session_sections enable row level security;

-- ######################################################
-- 018_close_sessions_anon_read.sql
-- ######################################################

-- ============================================================
-- Хвост к 017. После её применения публичным anon-ключом перестали
-- читаться polls, votes, questions, participants, session_slides и
-- session_sections — проверено запросами к REST API прода 2026-09-29.
-- Но `sessions` продолжает отдаваться анониму целиком, хотя в
-- репозитории на неё есть ровно одна SELECT-политика — «Члены org
-- видят сессии», требующая членства в организации.
--
-- Значит на проде живёт политика, заведённая вручную через SQL Editor
-- и в миграции не попавшая. Это не мелочь: строка sessions несёт
-- join_code, то есть любой желающий может перебрать коды и войти в
-- чужое мероприятие, плюс title и settings всех организаций.
--
-- Имя такой политики из репозитория неизвестно, поэтому снимаем по
-- признаку, а не по имени: разрешительные SELECT-политики на sessions,
-- выданные ролям anon/public с условием «true». Политики с настоящим
-- условием (проверка членства) под это не подпадают и остаются.
--
-- Клиенту прямой доступ к sessions больше не нужен: всё, что нужно
-- экранам зала, отдаёт get_session_state() (миграция 016), а серверные
-- страницы ходят через service role.
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'sessions'
      and permissive = 'PERMISSIVE'
      and cmd in ('SELECT', 'ALL')
      and (roles @> array['anon']::name[] or roles @> array['public']::name[])
      and (qual is null or btrim(qual) = 'true')
  loop
    raise notice 'Снимаю публичную политику на sessions: %', r.policyname;
    execute format('drop policy %I on public.sessions', r.policyname);
  end loop;
end $$;

-- Контроль: должно вернуть только политики с реальным условием членства.
-- select policyname, roles, cmd, qual
-- from pg_policies where schemaname='public' and tablename='sessions';

-- ######################################################
-- 019_sessions_membership_only.sql
-- ######################################################

-- ============================================================
-- 018 не сработала: она искала политику с условием ровно «true», а
-- анониму на проде возвращается РОВНО ОДНА строка sessions при том, что
-- сессий в базе много. Значит условие там не «true», а какое-то
-- содержательное (почти наверняка status = 'active'). RLS на таблице
-- включён — проверено (relrowsecurity = true), так что дело именно в
-- политике, а не в отключённой защите.
--
-- Имя и текст политики из репозитория по-прежнему неизвестны: она
-- заводилась вручную через SQL Editor. Поэтому не угадываем во второй
-- раз, а приводим таблицу к нужному состоянию декларативно — снимаем
-- ВСЕ разрешительные SELECT-политики, выданные ролям anon/public, и
-- заводим ровно одну, по членству в организации.
--
-- Почему снести можно всё: прямого доступа к sessions из браузера
-- больше нет. Все обращения клиента к таблицам (их было шесть, все в
-- DisplayScreen и VoteInterface) заменены на get_session_state()
-- (миграция 016) — security definer, RLS обходит. Серверные страницы и
-- все server actions ходят через createAdminClient() (service role),
-- который RLS не проверяет вообще. Cookie-клиент используется только
-- для supabase.auth.getUser().
--
-- Почему это важно: даже с условием status = 'active' аноним получает
-- join_code всех идущих прямо сейчас мероприятий. Перебирать шесть
-- символов не требуется — коды просто перечисляются, и войти в чужой
-- зал можно без единого пароля именно в тот момент, когда там идёт
-- голосование.
--
-- Политики, выданные явно роли authenticated, не трогаем — под
-- «публичный доступ» они не подпадают.
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'sessions'
      and permissive = 'PERMISSIVE'
      and cmd in ('SELECT', 'ALL')
      and (roles @> array['anon']::name[] or roles @> array['public']::name[])
  loop
    raise notice 'Снимаю публичную SELECT-политику на sessions: %', r.policyname;
    execute format('drop policy %I on public.sessions', r.policyname);
  end loop;
end $$;

-- Ровно одна политика чтения — по членству в организации, через ту же
-- security definer функцию из 015, что разорвала рекурсию на
-- organization_members.
drop policy if exists "Члены org видят сессии" on public.sessions;
create policy "Члены org видят сессии"
  on public.sessions for select
  using (public.is_org_member(organization_id));

-- Контроль: должна остаться одна строка с qual по is_org_member.
-- select policyname, roles, cmd, qual
-- from pg_policies where schemaname='public' and tablename='sessions';

-- ######################################################
-- 020_session_voter_aggregates.sql
-- ######################################################

-- ============================================================
-- Счётчик уникальных участников считался в приложении, а не в БД.
--
-- На КАЖДЫЙ голос выполнялось дважды (в checkParticipantLimit и в
-- broadcastVoteEffects):
--   select voter_token from votes where poll_id in (<все опросы сессии>)
-- — то есть все голоса всей сессии выгружались в память Node и из них
-- строился Set. На зале в 500 человек и десятке опросов это тысячи
-- строк на каждое нажатие кнопки, в один PM2-процесс на VPS с 1.6 ГБ.
--
-- Хуже, чем нагрузка: PostgREST по умолчанию отдаёт максимум 1000
-- строк. После тысячного голоса в сессии выборка молча обрезалась,
-- uniqueCount становился заниженным — и лимит участников по тарифу
-- переставал срабатывать вообще, а счётчик «N участников» на проекторе
-- замирал. Ошибки при этом никакой: просто неверное число.
--
-- Обе функции считают в БД и возвращают одно число / один булев ответ.
-- ============================================================

create or replace function public.count_session_voters(p_session_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(distinct v.voter_token)::int
  from votes v
  join polls p on p.id = v.poll_id
  where p.session_id = p_session_id;
$$;

-- Вернувшийся участник (уже голосовал в этой сессии) не расходует лимит
-- повторно — это условие раньше проверялось отдельным запросом с
-- «poll_id in (...)» по всему списку опросов.
create or replace function public.has_voted_in_session(p_session_id uuid, p_voter_token text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from votes v
    join polls p on p.id = v.poll_id
    where p.session_id = p_session_id
      and v.voter_token = p_voter_token
  );
$$;

-- Вызываются только серверным кодом под service role; anon доступ не нужен.
grant execute on function public.count_session_voters(uuid) to service_role;
grant execute on function public.has_voted_in_session(uuid, text) to service_role;

-- Индексы под эти запросы и под остальные горячие пути, которых не было.
-- votes(poll_id) уже есть (001), но votes(voter_token) отдельно нет —
-- нужен для джойна по токену без привязки к конкретному опросу.
create index if not exists votes_voter_token_idx      on public.votes(voter_token);
create index if not exists questions_voter_token_idx  on public.questions(voter_token);
create index if not exists session_slides_session_idx on public.session_slides(session_id);
create index if not exists session_sections_session_idx on public.session_sections(session_id);
-- Список сессий организации и подсчёт «сессий в месяц» для лимита тарифа.
create index if not exists sessions_org_created_idx   on public.sessions(organization_id, created_at);

-- ######################################################
-- 021_revoke_public_execute.sql
-- ######################################################

-- ============================================================
-- Ошибка в 020: там написано «вызываются только серверным кодом под
-- service role; anon доступ не нужен» и выдан grant execute роли
-- service_role — но EXECUTE на новую функцию в Postgres по умолчанию
-- уже принадлежит PUBLIC. Грант ничего не сузил, а REVOKE сделан не
-- был. Проверено запросом публичным anon-ключом сразу после
-- применения 020: count_session_voters вернула число, а
-- has_voted_in_session — false, то есть обе доступны кому угодно.
--
-- Что это давало:
--   count_session_voters  — число участников чужого мероприятия по его
--                           uuid;
--   has_voted_in_session  — проверку «голосовал ли вот этот токен».
-- Оба требуют знания uuid сессии, который больше не перечисляется
-- (019), поэтому риск умеренный — но заявленного в комментарии
-- поведения не было, и это надо привести в соответствие.
--
-- Та же проблема у increment_question_upvotes из 013, и там она
-- серьёзнее: функция security definer, то есть аноним мог звать её
-- напрямую и накручивать счётчик любому вопросу по его id — в обход
-- уникального ключа question_upvotes(question_id, voter_token), в
-- обход upvoteQuestion() и в обход добавленного там rate limit'а.
--
-- get_session_state остаётся доступной anon: это единственный
-- легитимный способ экранам зала прочитать своё состояние, и она сама
-- вычищает ответы викторины.
--
-- is_org_member тоже остаётся: она вызывается ВНУТРИ RLS-политик,
-- которые выполняются от имени запрашивающей роли, так что без
-- execute у anon/authenticated политики перестанут работать.
-- ============================================================

revoke execute on function public.count_session_voters(uuid) from public, anon;
revoke execute on function public.has_voted_in_session(uuid, text) from public, anon;
revoke execute on function public.increment_question_upvotes(uuid) from public, anon;

grant execute on function public.count_session_voters(uuid)        to service_role;
grant execute on function public.has_voted_in_session(uuid, text)  to service_role;
grant execute on function public.increment_question_upvotes(uuid)  to service_role;

-- Контроль: перечислить всё, что PUBLIC/anon может исполнять в public.
-- Ожидаемо остаются только get_session_state, is_org_member и
-- generate_join_code (последняя лишь возвращает случайную строку).
--   select p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
--          has_function_privilege('anon', p.oid, 'execute') as anon_can_execute
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--   order by p.proname;
