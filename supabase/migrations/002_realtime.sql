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
