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
