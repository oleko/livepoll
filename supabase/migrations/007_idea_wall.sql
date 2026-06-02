-- v0.9: add idea_wall poll type

alter table polls
  drop constraint if exists polls_type_check;

alter table polls
  add constraint polls_type_check
    check (type in (
      'multiple_choice', 'temperature', 'qa',
      'like_dislike', 'word_cloud', 'emoji_cloud', 'planning_poker',
      'idea_wall'
    ));