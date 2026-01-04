-- Insert default 1:1 mentorship session price ($50)
INSERT INTO platform_settings (setting_key, setting_value)
VALUES ('mentorship_session_price', '{"price_cents": 5000, "enabled": true}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;