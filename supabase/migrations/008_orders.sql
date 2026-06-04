-- Orders table for payment tracking
CREATE TABLE IF NOT EXISTS orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan            TEXT        NOT NULL,
  amount_kopecks  INTEGER     NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending | paid | failed | cancelled
  payment_id      TEXT        UNIQUE,          -- YooKassa payment UUID
  payment_url     TEXT,                        -- checkout redirect URL
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orders_org_id_idx      ON orders(org_id);
CREATE INDEX IF NOT EXISTS orders_payment_id_idx  ON orders(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_status_idx      ON orders(status);

-- RLS: only service role can read/write orders (no public access)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
