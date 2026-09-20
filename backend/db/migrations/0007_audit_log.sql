-- 0007 — audit log.
--
-- Append-only history of everything that moved money or changed a verification outcome. In a
-- product whose whole promise is "you cannot lose your savings to a fake title", the ability
-- to say exactly what happened and when is part of the product, not an operational extra.
--
-- Append-only is enforced by a trigger, not by convention. A convention is a comment; a
-- trigger is a refusal.

set search_path = public, extensions;

create table if not exists public.audit_log (
  -- Sequential by design: this table is internal, never exposed by id, and written far more
  -- often than everything else. A random uuid here would fragment the index for no benefit.
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_type audit_actor_type not null,
  -- Intentionally not a foreign key. History must survive the deletion of the person it is
  -- about; a cascade here would erase the record of what they did.
  actor_id uuid,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  from_state text,
  to_state text,
  -- Context for the entry. Never a NIN, phone number, title number or document URL.
  -- AGENTS.md 5.2.
  detail jsonb not null default '{}'::jsonb,

  constraint audit_log_actor_id_present
    check (actor_type = 'system' or actor_id is not null),
  constraint audit_log_detail_is_object
    check (jsonb_typeof(detail) = 'object'),
  constraint audit_log_entity_not_blank
    check (length(btrim(entity_type)) > 0 and length(btrim(entity_id)) > 0)
);

comment on column public.audit_log.detail is
  'Context only. Never a NIN, phone number, title number or document URL. AGENTS.md 5.2.';

-- "What happened to this escrow?" is the question this table exists to answer.
create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id, occurred_at desc);
create index if not exists audit_log_occurred_at_idx
  on public.audit_log (occurred_at desc);

-- Statement-level: it fires once per attempt rather than once per row, and it fires even when
-- the statement would have matched nothing. An UPDATE or DELETE here is always a bug or an
-- attack, so it never needs to know which rows were targeted.
create or replace function public.audit_log_is_append_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only: % is not permitted', tg_op
    using errcode = 'restrict_violation';
end
$$;

drop trigger if exists audit_log_no_update on public.audit_log;
create trigger audit_log_no_update
  before update on public.audit_log
  for each statement execute function public.audit_log_is_append_only();

drop trigger if exists audit_log_no_delete on public.audit_log;
create trigger audit_log_no_delete
  before delete on public.audit_log
  for each statement execute function public.audit_log_is_append_only();
