-- Defence in depth for Supabase / any PostgreSQL that exposes tables through an API layer.
--
-- This application talks to the database ONLY through the server's own connection (DATABASE_URL, a privileged role), never
-- through Supabase's auto-generated REST/GraphQL API. Supabase still publishes every table in the `public` schema through that
-- API unless row-level security is on, and the anon key is public by design — so without this migration anyone holding the
-- anon key could read admin password hashes, session hashes and every customer enquiry.
--
-- Enabling RLS with NO policies denies everything to roles that are subject to RLS (anon, authenticated). The role that owns
-- the tables (Supabase's `postgres`, which the server connects as) bypasses RLS, so the application is unaffected.
-- IMPORTANT: run the application with the same database role that ran the migrations. A different, non-owner role would be denied.
--
-- Any table you add later must also run:  ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  r text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  -- Belt and braces: also remove table/sequence/function privileges from the API roles where they exist (Supabase).
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END $$;
