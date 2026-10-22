-- PUB-002: one paid tier on the owner's own Stripe account. Mango stores Stripe
-- ids, states and the tax figures Stripe reports; never card data, never funds.
CREATE TABLE paid_tier (
  id INTEGER PRIMARY KEY CHECK(id=1),
  paid_topic TEXT NOT NULL,
  free_topic TEXT NOT NULL,
  price_id TEXT NOT NULL,
  automatic_tax INTEGER NOT NULL CHECK(automatic_tax=1),
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
-- A paid subscription never creates consent: paid-topic membership is read at
-- review time from an active row and the contact's own confirmed consent.
CREATE TABLE paid_subscriptions (
  subscription_id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  contact_id TEXT,
  state TEXT NOT NULL CHECK(state IN ('active','payment-failed','canceled')),
  stripe_status TEXT,
  tax_amount INTEGER,
  currency TEXT,
  state_event_id TEXT NOT NULL,
  state_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX paid_subscriptions_contact ON paid_subscriptions(contact_id, state);
