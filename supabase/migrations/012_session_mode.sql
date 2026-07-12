-- Session mode: 'conference' (default) or 'quiz'
ALTER TABLE sessions
  ADD COLUMN mode text NOT NULL DEFAULT 'conference'
  CHECK (mode IN ('conference', 'quiz'));
