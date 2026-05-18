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
