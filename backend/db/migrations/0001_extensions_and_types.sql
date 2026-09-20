-- 0001 — extensions and shared types.
--
-- The enum types here are deliberately the same closed sets as the adapter interfaces in
-- backend/api/src/adapters/. A value that exists in the database but not in the interface (or
-- the reverse) is a silent divergence between what we store and what we can report, and in
-- this product that divergence ends up on a card telling someone a title is fine.
--
-- Written to apply unchanged to both the local postgis container and the hosted Supabase
-- project. Every construct below is guarded so a second run is a no-op.

set search_path = public, extensions;

-- Supabase keeps extensions out of public; the local postgis image installs into public.
-- Create it only if it is absent, so neither environment fights the other.
create schema if not exists extensions;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'postgis') then
    create extension postgis with schema extensions;
  end if;
end
$$;

-- Land tenure recognised in Uganda. Not an open text field: "mailo" and "freehold" carry
-- different transfer rules, and a typo here would put a parcel under the wrong rules.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tenure_type') then
    create type tenure_type as enum ('mailo', 'freehold', 'leasehold', 'customary');
  end if;

  -- Mirrors IdentityMatch in adapters/identity/index.ts, plus the two states that exist
  -- before an answer arrives.
  if not exists (select 1 from pg_type where typname = 'identity_status') then
    create type identity_status as enum ('unverified', 'pending', 'match', 'mismatch', 'not_found');
  end if;

  if not exists (select 1 from pg_type where typname = 'listing_status') then
    create type listing_status as enum ('draft', 'active', 'under_offer', 'sold', 'withdrawn');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_request_status') then
    create type verification_request_status as enum ('pending', 'completed', 'failed');
  end if;

  -- Mirrors TitleStatus in adapters/registry/index.ts. AGENTS.md 4.3 note there reads
  -- "never invent a fifth value" — this type is the database half of that promise.
  if not exists (select 1 from pg_type where typname = 'title_status') then
    create type title_status as enum ('valid', 'flagged', 'not_found');
  end if;

  -- The escrow state machine (PLAN.md step 8). The column exists from Step 4 so that the
  -- machine in backend/api/src/domain/ has somewhere authoritative to write.
  if not exists (select 1 from pg_type where typname = 'escrow_state') then
    create type escrow_state as enum (
      'opened', 'funded', 'conditions_met', 'released', 'disputed', 'refunded'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'audit_actor_type') then
    create type audit_actor_type as enum ('system', 'buyer', 'seller', 'admin');
  end if;
end
$$;

-- One updated_at trigger for the whole schema.
-- search_path is pinned empty: a function that resolves names through the caller's search_path
-- can be made to run someone else's now(). Everything it touches is in pg_catalog.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;
