-- 0005 — verification requests and results.
--
-- Two tables, not one. A request is a buyer asking "is this title real?"; a result is what the
-- registry adapter answered. They are split because a request can be retried, and every answer
-- must be kept rather than overwritten: if the registry said "valid" on Monday and "flagged"
-- on Friday, both facts matter and the buyer is entitled to see that it changed.
--
-- AGENTS.md 5.3 is enforced here by is_demo_data being NOT NULL with no default. A result row
-- cannot be written without stating whether it came from a mock, so nothing downstream can
-- present demo output as a registry check by omission.

set search_path = public, extensions;

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete restrict,
  -- Both nullable: a buyer may check a title number typed off a document before any parcel or
  -- listing exists in our data at all. That is the most common real case.
  parcel_id uuid references public.parcels (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  title_number text not null,
  status verification_request_status not null default 'pending',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  -- Shown to a user, so it is a sentence and never a raw provider dump. AGENTS.md 4.5.
  failure_reason text,

  constraint verification_requests_title_not_blank
    check (length(btrim(title_number)) > 0),
  -- A finished request has a finish time; an unfinished one does not.
  constraint verification_requests_completed_at_matches_status
    check ((status = 'pending') = (completed_at is null)),
  -- A reason only accompanies a failure. A "completed" row carrying a failure reason would be
  -- read two different ways by two different screens.
  constraint verification_requests_failure_reason_only_on_failure
    check (failure_reason is null or status = 'failed')
);

create index if not exists verification_requests_requester_idx
  on public.verification_requests (requester_id, requested_at desc);
create index if not exists verification_requests_parcel_idx
  on public.verification_requests (parcel_id);
create index if not exists verification_requests_listing_idx
  on public.verification_requests (listing_id);
-- The worker queue: only rows still waiting for an adapter answer.
create index if not exists verification_requests_pending_idx
  on public.verification_requests (requested_at)
  where status = 'pending';

create table if not exists public.verification_results (
  id uuid primary key default gen_random_uuid(),
  -- The result has no meaning without its request, so it goes when the request goes.
  request_id uuid not null references public.verification_requests (id) on delete cascade,
  title_status title_status not null,
  registered_owner text,
  district text,
  tenure tenure_type,
  area_hectares numeric(12, 4),
  -- Shape matches Encumbrance[] in adapters/registry/index.ts. JSONB rather than a child
  -- table because the app never queries inside it — it renders the list the adapter returned.
  encumbrances jsonb not null default '[]'::jsonb,
  -- No default. Every result must declare its provenance out loud. AGENTS.md 5.3.
  is_demo_data boolean not null,
  checked_at timestamptz not null,
  created_at timestamptz not null default now(),

  constraint verification_results_encumbrances_is_array
    check (jsonb_typeof(encumbrances) = 'array'),
  constraint verification_results_owner_absent_when_not_found
    check (title_status <> 'not_found' or registered_owner is null)
);

comment on column public.verification_results.is_demo_data is
  'True whenever the answer came from a mock adapter. Travels to the result card the buyer reads. AGENTS.md 5.3.';

-- Latest answer for a request, which is what the result card shows.
create index if not exists verification_results_request_idx
  on public.verification_results (request_id, checked_at desc);
