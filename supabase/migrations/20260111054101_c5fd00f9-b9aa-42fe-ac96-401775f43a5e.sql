-- Insert mentorship_plus_price setting (synced with current Stripe price of $30)
INSERT INTO platform_settings (setting_key, setting_value, created_at, updated_at)
VALUES (
  'mentorship_plus_price',
  '{"price_cents": 3000, "price_id": "price_1Smj0WJv3w1nJBLYn4uAQZ8g"}'::jsonb,
  now(),
  now()
)
ON CONFLICT (setting_key) DO NOTHING;