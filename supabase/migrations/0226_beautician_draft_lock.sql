-- mig 0226 — beautician draft lock
--
-- Pro/Studio-tier moat: a beautician can flip their profile into "draft"
-- mode and set a password. The public /beautician/:slug page renders a
-- branded password prompt until the correct password is entered.
--
-- This is a casual share-with-team feature ("share a WIP with my
-- photographer for review"), not auth. Password is stored plain text by
-- design — see task 10/12 brief. Marketplace also filters draft rows out
-- so visitors don't stumble in.
alter table public.beautician_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;

-- Guard against accidentally enabling draft mode without a password.
-- When is_draft is true, draft_password must be non-empty.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where  conname = 'beautician_draft_password_required'
      and  conrelid = 'public.beautician_providers'::regclass
  ) then
    alter table public.beautician_providers
      add constraint beautician_draft_password_required
      check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));
  end if;
end $$;
