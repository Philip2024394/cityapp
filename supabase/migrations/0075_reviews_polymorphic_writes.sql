-- ============================================================================
-- 0075 — Reviews: polymorphic writes + WhatsApp field + rating triggers
-- ----------------------------------------------------------------------------
-- mig 0072 relaxed the reviews table to a polymorphic shape (provider_type +
-- provider_id) but left `driver_user_id NOT NULL`, so beautician /
-- massage / etc reviews can't actually be inserted. This migration:
--
--   • Drops the NOT NULL on driver_user_id
--   • Adds a CHECK enforcing exactly-one identity (legacy driver row OR
--     polymorphic provider row, never both, never neither)
--   • Adds reviewer_whatsapp (text, nullable, simple e164 check) so a
--     provider can follow up with the reviewer
--   • AFTER-INSERT/UPDATE/DELETE trigger maintains rating + rating_count
--     on the source provider row (covers all 8 verticals)
-- ============================================================================

alter table public.reviews
  alter column driver_user_id drop not null;

alter table public.reviews
  drop constraint if exists reviews_identity_check,
  add  constraint reviews_identity_check check (
    (driver_user_id is not null and provider_type is null and provider_id is null)
    or
    (driver_user_id is null and provider_type is not null and provider_id is not null)
  );

alter table public.reviews
  add column if not exists reviewer_whatsapp text;

alter table public.reviews
  drop constraint if exists reviews_reviewer_whatsapp_check,
  add  constraint reviews_reviewer_whatsapp_check check (
    reviewer_whatsapp is null
    or reviewer_whatsapp ~ '^\+?\d{8,15}$'
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Rating aggregation — recomputes rating + rating_count on the source
-- provider row whenever a review is added, edited (rating changed), or
-- deleted. Covers every vertical via a CASE on provider_type.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public._recompute_provider_rating(
  p_provider_type text,
  p_provider_id   uuid
) returns void
language plpgsql
as $$
declare
  v_avg numeric;
  v_cnt int;
begin
  if p_provider_type is null or p_provider_id is null then return; end if;

  select round(avg(rating)::numeric, 2), count(*)
    into v_avg, v_cnt
  from public.reviews
  where provider_type = p_provider_type
    and provider_id   = p_provider_id
    and status        = 'visible';

  case p_provider_type
    when 'massage'    then update public.massage_providers    set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'beautician' then update public.beautician_providers set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'laundry'    then update public.laundry_providers    set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'handyman'   then update public.handyman_providers   set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'home_clean' then update public.home_clean_providers set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

create or replace function public._reviews_rating_bump() returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    perform public._recompute_provider_rating(old.provider_type, old.provider_id);
    return old;
  end if;
  perform public._recompute_provider_rating(new.provider_type, new.provider_id);
  if (tg_op = 'UPDATE' and (old.provider_type is distinct from new.provider_type
                            or old.provider_id is distinct from new.provider_id)) then
    -- Review moved between providers — recompute the old side too.
    perform public._recompute_provider_rating(old.provider_type, old.provider_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_rating_bump on public.reviews;
create trigger trg_reviews_rating_bump
after insert or update or delete on public.reviews
for each row execute function public._reviews_rating_bump();
