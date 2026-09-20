-- 0004 — listings.
--
-- A listing is an offer to sell a parcel. Many listings may point at one parcel over time,
-- and a parcel with no listing is normal, so the price and the sale state live here rather
-- than on the parcel.
--
-- Money is an integer in UGX minor units and never a float. AGENTS.md 5.4.

set search_path = public, extensions;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  -- restrict, not cascade: deleting land out from under a live listing should fail loudly.
  parcel_id uuid not null references public.parcels (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text,
  price_minor bigint not null,
  currency char(3) not null default 'UGX',
  status listing_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint listings_price_non_negative check (price_minor >= 0),
  -- Single-currency by design. Multi-currency is not a column change, it is an exchange-rate
  -- policy, and this app moves no money it cannot explain.
  constraint listings_currency_ugx check (currency = 'UGX'),
  constraint listings_title_not_blank check (length(btrim(title)) > 0),
  -- Anything a buyer can see must record when it became visible.
  constraint listings_published_at_present
    check (status in ('draft', 'withdrawn') or published_at is not null)
);

-- Foreign keys are not indexed automatically, and both of these are joined on every screen.
create index if not exists listings_parcel_id_idx on public.listings (parcel_id);
create index if not exists listings_seller_id_idx on public.listings (seller_id);
-- The browse query is "active listings, newest first". A partial index keeps it to the rows
-- anyone actually browses rather than every draft and withdrawn row ever written.
create index if not exists listings_active_recent_idx
  on public.listings (published_at desc)
  where status = 'active';

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();
