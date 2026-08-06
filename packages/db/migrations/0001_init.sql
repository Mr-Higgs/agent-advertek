CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending-payment',
  fulfillment_input jsonb,
  payment_signature text,
  payment_amount_base_units numeric(78, 0),
  payment_slot bigint,
  vendor_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_status_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id),
  status text NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_status_events_order_id_idx ON order_status_events(order_id);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id text PRIMARY KEY,
  internal_order_id text NOT NULL REFERENCES orders(id),
  target_url text NOT NULL,
  signing_secret_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_subscriptions_order_id_idx ON webhook_subscriptions(internal_order_id);

CREATE TABLE IF NOT EXISTS processed_deliveries (
  source text NOT NULL,
  delivery_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, delivery_id)
);

CREATE TABLE IF NOT EXISTS sweeps (
  sweep_id text PRIMARY KEY,
  initiated_at timestamptz NOT NULL,
  covered_amount_base_units numeric(78, 0) NOT NULL,
  newest_covered_signature text NOT NULL,
  deposit_transaction_signature text NOT NULL,
  okx_quote_id text NOT NULL,
  okx_trade_id text NOT NULL,
  estimated_fiat_amount_minor_units numeric(78, 0) NOT NULL,
  actual_fiat_amount_minor_units numeric(78, 0) NOT NULL,
  fiat_currency text NOT NULL
);

CREATE TABLE IF NOT EXISTS sweep_covered_transfers (
  sweep_id text NOT NULL REFERENCES sweeps(sweep_id),
  signature text NOT NULL,
  order_id text NOT NULL,
  amount_base_units numeric(78, 0) NOT NULL,
  PRIMARY KEY (sweep_id, signature)
);
