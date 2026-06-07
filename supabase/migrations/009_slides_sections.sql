-- Add section support to session_slides (so slides can be grouped like polls)
ALTER TABLE session_slides
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES session_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS session_slides_section_id_idx ON session_slides(section_id);
