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
