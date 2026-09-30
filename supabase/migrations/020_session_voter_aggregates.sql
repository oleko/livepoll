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
