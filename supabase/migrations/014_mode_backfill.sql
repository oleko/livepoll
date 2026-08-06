-- Backfills sessions.mode for rows where it has drifted from
-- settings->championship->enabled — the flag QuizTab (now HostPanel)
-- actually reads/writes today via saveChampionshipSettings, which never
-- touched the mode column. createSession sets both consistently at
-- creation time, but toggling championship on/off afterwards only ever
-- updated settings, not mode.
--
-- Purely additive: only touches sessions where mode says 'conference' but
-- settings says championship is enabled. Nothing reads sessions.mode for
-- behavior yet, so this is safe to run on its own — it just makes mode an
-- honest source of truth so a future change can start reading it.
UPDATE sessions
SET mode = 'quiz'
WHERE mode = 'conference'
  AND settings -> 'championship' ->> 'enabled' = 'true';
