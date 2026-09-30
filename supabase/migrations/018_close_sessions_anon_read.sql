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
