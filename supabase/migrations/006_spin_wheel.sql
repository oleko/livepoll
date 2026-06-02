-- v0.8: add spin_wheel and announcement slide types

alter table session_slides
  drop constraint if exists session_slides_type_check;

alter table session_slides
  add constraint session_slides_type_check
    check (type in ('splash', 'speaker', 'schedule', 'quote', 'final', 'spin_wheel', 'announcement'));