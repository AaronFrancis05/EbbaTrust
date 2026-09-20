-- 0002 — profiles.
--
-- One row per person who signs in. On Supabase the id is the auth.users id, so the identity
-- of a profile is owned by the auth system and not by us; locally there is no auth schema,
-- so the foreign key is added only where it can be.
--
-- The national ID is never stored in plaintext. We keep sha256(NIN + pepper) and the last
-- four digits for display. The pepper lives in the backend environment, never in the database
-- — a database dump alone therefore reveals no national IDs. The cost is real and accepted:
-- the plaintext cannot be re-sent to the identity adapter later without asking the user again.
-- AGENTS.md 5.2.

set search_path = public, extensions;

create table if not exists public.profiles (
  id uuid primary key,
  phone_e164 text not null unique,
  display_name text,
  nin_hash bytea,
  nin_last4 char(4),
  identity_status identity_status not null default 'unverified',
  identity_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_phone_e164_format
    check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint profiles_nin_last4_digits
    check (nin_last4 is null or nin_last4 ~ '^[0-9]{4}$'),
  -- Both halves of the NIN record or neither. Half a record is a record we cannot explain.
  constraint profiles_nin_pair
    check ((nin_hash is null) = (nin_last4 is null)),
  -- A decided identity status must say when it was decided. Without this, a stale "match"
  -- from a year ago is indistinguishable from one made this morning.
  constraint profiles_checked_at_present
    check (identity_status in ('unverified', 'pending') or identity_checked_at is not null)
);

comment on column public.profiles.nin_hash is
  'sha256(NIN + backend pepper). Never the NIN itself. AGENTS.md 5.2.';

-- On Supabase, a profile without a user is an orphan; delete the user and the profile goes.
-- The block is skipped on the local container, which has no auth schema.
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'auth' and tablename = 'users')
     and not exists (select 1 from pg_constraint where conname = 'profiles_id_fkey')
  then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
