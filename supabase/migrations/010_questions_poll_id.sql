-- Add poll_id to questions so qa and idea_wall entries can be separated
alter table public.questions
  add column poll_id uuid references public.polls(id) on delete set null;

create index questions_poll_idx on public.questions(poll_id);
