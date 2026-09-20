-- Demo data. NOT part of the migration chain.
--
-- Kept outside backend/db/migrations/ on purpose: a migration runs everywhere the chain runs,
-- including production, and demo parcels in production are exactly the kind of thing that ends
-- up in a screenshot of a real listing. This file is applied explicitly, by a person, with
-- `npm run db:seed`.
--
-- Districts and coordinates are real Uganda. The boundaries are plausible rectangles, not
-- survey data — parcels.boundary_source is 'demo' for every row here, and nothing in the UI
-- may describe any of them as surveyed. AGENTS.md 5.3.
--
-- Idempotent: fixed ids and `on conflict do nothing`, so running it twice changes nothing.

set search_path = public, extensions;

insert into public.parcels
  (id, title_number, district, county, subcounty, tenure, boundary, boundary_source)
values
  -- Wakiso — Kira, along the Kampala northern fringe.
  ('a1000000-0000-4000-8000-000000000001', 'FRV 1234 FOL 5', 'Wakiso', 'Kyadondo', 'Kira',
   'mailo',
   st_geomfromtext('POLYGON((32.6410 0.4020, 32.6417 0.4020, 32.6417 0.4027, 32.6410 0.4027, 32.6410 0.4020))', 4326),
   'demo'),

  -- Wakiso — Nansana, a smaller residential plot.
  ('a1000000-0000-4000-8000-000000000002', 'FRV 2201 FOL 12', 'Wakiso', 'Kyadondo', 'Nansana',
   'mailo',
   st_geomfromtext('POLYGON((32.5190 0.3660, 32.5195 0.3660, 32.5195 0.3665, 32.5190 0.3665, 32.5190 0.3660))', 4326),
   'demo'),

  -- Mukono — Goma, larger and held under freehold.
  ('a1000000-0000-4000-8000-000000000003', 'FRV 7788 FOL 3', 'Mukono', 'Mukono', 'Goma',
   'freehold',
   st_geomfromtext('POLYGON((32.7540 0.3510, 32.7556 0.3510, 32.7556 0.3526, 32.7540 0.3526, 32.7540 0.3510))', 4326),
   'demo'),

  -- Kampala — Nakawa. Leasehold, the usual tenure for urban commercial land here.
  ('a1000000-0000-4000-8000-000000000004', 'LRV 990 FOL 21', 'Kampala', 'Nakawa', 'Nakawa',
   'leasehold',
   st_geomfromtext('POLYGON((32.6110 0.3340, 32.6114 0.3340, 32.6114 0.3344, 32.6110 0.3344, 32.6110 0.3340))', 4326),
   'demo'),

  -- Jinja — Walukuba.
  ('a1000000-0000-4000-8000-000000000005', 'FRV 4410 FOL 8', 'Jinja', 'Jinja', 'Walukuba',
   'freehold',
   st_geomfromtext('POLYGON((33.2020 0.4300, 33.2029 0.4300, 33.2029 0.4309, 33.2020 0.4309, 33.2020 0.4300))', 4326),
   'demo'),

  -- Mbarara — Kakoba. Note the negative latitude: south of the equator, and a real source of
  -- sign errors in map code.
  ('a1000000-0000-4000-8000-000000000006', 'FRV 5502 FOL 17', 'Mbarara', 'Kashari', 'Kakoba',
   'freehold',
   st_geomfromtext('POLYGON((30.6540 -0.6140, 30.6551 -0.6140, 30.6551 -0.6129, 30.6540 -0.6129, 30.6540 -0.6140))', 4326),
   'demo'),

  -- Customary land in Gulu with no title number at all. The most important demo row: a buyer
  -- looking at untitled land is the case the app must be clearest about.
  ('a1000000-0000-4000-8000-000000000007', null, 'Gulu', 'Omoro', 'Bobi',
   'customary',
   st_geomfromtext('POLYGON((32.3000 2.7700, 32.3019 2.7700, 32.3019 2.7719, 32.3000 2.7719, 32.3000 2.7700))', 4326),
   'demo')
on conflict (id) do nothing;

-- The stated area is derived from the polygon rather than typed alongside it. A listing whose
-- written size disagrees with the shape drawn on the map is precisely the discrepancy this app
-- exists to surface, so the demo data must not contain one of its own making.
update public.parcels
   set area_hectares = round((st_area(boundary::geography) / 10000.0)::numeric, 4)
 where boundary_source = 'demo'
   and (area_hectares is null
        or abs(area_hectares - round((st_area(boundary::geography) / 10000.0)::numeric, 4)) > 0.0001);

-- Profiles and listings need a person, and on Supabase a profile id must exist in auth.users.
-- Rather than fabricate auth rows, this half of the seed runs only where that foreign key is
-- absent — the local container. On the hosted project the parcels above are seeded and the
-- listings arrive once real sign-ins exist (Step 5).
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'profiles_id_fkey') then
    raise notice 'auth.users foreign key present: skipping demo profiles and listings';
    return;
  end if;

  insert into public.profiles (id, phone_e164, display_name, identity_status)
  values
    ('b1000000-0000-4000-8000-000000000001', '+256700000001', 'Demo Seller', 'unverified'),
    ('b1000000-0000-4000-8000-000000000002', '+256700000002', 'Demo Buyer', 'unverified')
  on conflict (id) do nothing;

  -- Prices in UGX minor units: 120,000,000 UGX is 12_000_000_000 minor. Integers, never floats.
  insert into public.listings
    (id, parcel_id, seller_id, title, description, price_minor, status, published_at)
  values
    ('c1000000-0000-4000-8000-000000000001',
     'a1000000-0000-4000-8000-000000000001',
     'b1000000-0000-4000-8000-000000000001',
     '50x100ft plot in Kira', 'Fenced, on a murram access road.',
     12000000000, 'active', now()),
    ('c1000000-0000-4000-8000-000000000002',
     'a1000000-0000-4000-8000-000000000003',
     'b1000000-0000-4000-8000-000000000001',
     '2.47 hectares in Goma, Mukono', 'Freehold, road frontage.',
     48000000000, 'active', now()),
    ('c1000000-0000-4000-8000-000000000003',
     'a1000000-0000-4000-8000-000000000007',
     'b1000000-0000-4000-8000-000000000001',
     'Customary land in Bobi, Gulu', 'No title. Sold on customary terms.',
     9000000000, 'draft', null)
  on conflict (id) do nothing;
end
$$;
