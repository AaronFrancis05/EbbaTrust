-- 0006 — escrow transactions.
--
-- One buyer, one listing, one pot of money. The `state` column is the authoritative escrow
-- state: the app displays it and never computes it (AGENTS.md 4.6). The machine that moves it
-- lives in backend/api/src/domain/ and arrives in Step 8; the column exists now so that when
-- it does, there is exactly one place for it to write.
--
-- Amounts are integers in UGX minor units. AGENTS.md 5.4.

set search_path = public, extensions;

create table if not exists public.escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  amount_minor bigint not null,
  currency char(3) not null default 'UGX',
  state escrow_state not null default 'opened',
  -- Returned by the payments adapter. Nullable until money has actually been attempted.
  provider_transaction_id text,
  -- The caller's protection against its own retry. A retried collection that charges twice is
  -- the worst failure this system can have, and retries on a Ugandan mobile connection are
  -- routine. Unique, so the second attempt collides instead of charging.
  idempotency_key text not null unique,
  opened_at timestamptz not null default now(),
  funded_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint escrow_amount_positive check (amount_minor > 0),
  constraint escrow_currency_ugx check (currency = 'UGX'),
  -- Selling to yourself is the shape of a laundering flow, not a transaction.
  constraint escrow_parties_differ check (buyer_id <> seller_id),
  -- Terminal states must record when they became terminal.
  constraint escrow_released_at_present
    check (state <> 'released' or released_at is not null),
  constraint escrow_refunded_at_present
    check (state <> 'refunded' or refunded_at is not null),
  -- Money cannot be both released and refunded. The database says so as well as the domain.
  constraint escrow_not_both_released_and_refunded
    check (released_at is null or refunded_at is null)
);

-- At most one live escrow per listing. Two open pots against one piece of land means two
-- buyers each believe they are buying it — enforced here so no race in the API can create it.
create unique index if not exists escrow_one_live_per_listing
  on public.escrow_transactions (listing_id)
  where state in ('opened', 'funded', 'conditions_met', 'disputed');

create index if not exists escrow_buyer_idx on public.escrow_transactions (buyer_id, opened_at desc);
create index if not exists escrow_seller_idx on public.escrow_transactions (seller_id, opened_at desc);

drop trigger if exists escrow_set_updated_at on public.escrow_transactions;
create trigger escrow_set_updated_at
  before update on public.escrow_transactions
  for each row execute function public.set_updated_at();
