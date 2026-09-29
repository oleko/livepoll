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
