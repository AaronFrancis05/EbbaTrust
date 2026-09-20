-- 0003 — parcels.
--
-- A parcel is a physical piece of land with a boundary. It exists whether or not it is for
-- sale and whether or not anyone has verified its title, which is why it is its own table and
-- not a column on a listing.
--
-- The boundary is what the app draws on satellite imagery. It is NOT a survey and must never
-- be presented as one (AGENTS.md 5.3) — boundary_source records where the shape came from so
-- the UI can say so honestly.

set search_path = public, extensions;

create table if not exists public.parcels (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: unregistered and customary land is normal here, and a parcel with no title is
  -- exactly the case a buyer most needs the app to be clear about. Unique when present.
  title_number text unique,
  district text not null,
  county text,
  subcounty text,
  tenure tenure_type,
  area_hectares numeric(12, 4),
  boundary geometry(Polygon, 4326) not null,
  boundary_source text not null default 'demo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint parcels_area_positive
    check (area_hectares is null or area_hectares > 0),
  -- A self-intersecting polygon breaks every spatial predicate downstream and draws as
  -- nonsense on the map. Reject it at the door rather than discovering it in a query plan.
  constraint parcels_boundary_valid
    check (st_isvalid(boundary)),
  constraint parcels_boundary_source_known
    check (boundary_source in ('demo', 'user_drawn', 'registry', 'survey'))
);

comment on column public.parcels.boundary_source is
  'Where the shape came from. "survey" is the only value that may ever be described to a user as surveyed. AGENTS.md 5.3.';

-- The spatial index. Without it every map query degrades to a sequential scan over every
-- polygon in the country.
create index if not exists parcels_boundary_gix on public.parcels using gist (boundary);
-- Browsing is by district before anything else (PLAN.md step 6).
create index if not exists parcels_district_idx on public.parcels (district);

drop trigger if exists parcels_set_updated_at on public.parcels;
create trigger parcels_set_updated_at
  before update on public.parcels
  for each row execute function public.set_updated_at();
