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
