-- 0008 — the wall.
--
-- Every table in one file, so the whole access posture reads at a glance instead of being
-- scattered across seven migrations.
--
-- The posture is deny-all with zero policies. The mobile app never queries these tables — it
-- goes through the API (AGENTS.md 4.1), and the API connects with a role that bypasses RLS.
-- So RLS is not the gatekeeper here; it is the second wall behind the API for the day an anon
-- key leaks. With no policy and no grant, a leaked key opens a closed door rather than a
-- database. AGENTS.md 5.2: a new table without an RLS policy is an incomplete table — this
-- file is where a new table gets finished.
--
-- Adding a read policy later is a deliberate act that shows up in review. Removing one that
-- was added for convenience is not, because nobody notices convenience.

set search_path = public, extensions;

-- Supabase ships these roles; the local container does not. Created here so the same file
-- applies in both places and the wall can actually be tested locally.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'parcels', 'listings', 'verification_requests',
    'verification_results', 'escrow_transactions', 'audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    -- FORCE also subjects the table owner to RLS. Roles with BYPASSRLS (the service role the
    -- API uses) are unaffected, so this closes the owner loophole without closing the API.
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end
$$;

-- Supabase grants table privileges to anon and authenticated by default for anything created
-- later. Revoke the default so the next migration cannot silently re-open what this one shut.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

revoke all on all sequences in schema public from anon, authenticated;
-- Schema usage is left in place: removing it breaks Supabase's own introspection for no extra
-- protection, since there is nothing left in the schema either role is allowed to touch.
