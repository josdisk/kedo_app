-- Non-bypass app role for RLS enforcement (DAT / SEC).
-- Migrations run as the bootstrap superuser; the API must connect as kedov_app.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kedov_app') THEN
    CREATE ROLE kedov_app LOGIN PASSWORD 'kedov_app_dev_only';
  END IF;
END
$$;

ALTER ROLE kedov_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

GRANT USAGE ON SCHEMA public TO kedov_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kedov_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kedov_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kedov_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO kedov_app;
