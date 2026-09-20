-- 0009 — two gaps found by /review on Step 4.
--
-- 1. escrow_transactions.funded_at had no constraint tying it to the state, while released_at
--    and refunded_at both did. An escrow sitting in `funded` with no record of when money
--    arrived is a row nobody can reconcile against a payment provider.
-- 2. The search_path. PostGIS lives in the `extensions` schema — that is where Supabase puts
--    it, and 0001 does the same locally. Nothing resolves st_* without `extensions` on the
--    path. The API pins it per connection, but a connection made by anything else (psql, a
--    GUI client, a pooler that drops startup options) would not have it. Setting it on the
--    database makes it true for every connection regardless of who opened it.

set search_path = public, extensions;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'escrow_funded_at_present'
  ) then
    alter table public.escrow_transactions
      add constraint escrow_funded_at_present
      -- Money must have arrived before conditions can be met or funds released. `disputed`
      -- and `refunded` are deliberately absent: a dispute can start before funding, and an
      -- escrow abandoned at `opened` is refunded without money ever having moved.
      check (state not in ('funded', 'conditions_met', 'released') or funded_at is not null);
  end if;
end
$$;

-- "$user" is kept first so the setting matches the Postgres default with extensions appended,
-- rather than quietly removing per-user schema resolution from every session on the database.
do $$
begin
  execute format(
    'alter database %I set search_path to %s',
    current_database(),
    '"$user", public, extensions'
  );
end
$$;
