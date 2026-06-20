-- Championship quiz mode: maps voter_token → participant name per session
CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  voter_token text NOT NULL,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, voter_token)
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Allow anon to read participants (for leaderboard display on join + display screens)
CREATE POLICY "anon read participants" ON participants
  FOR SELECT USING (true);

-- Allow anon to register as participant
CREATE POLICY "anon insert participants" ON participants
  FOR INSERT WITH CHECK (true);
