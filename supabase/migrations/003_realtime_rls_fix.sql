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
