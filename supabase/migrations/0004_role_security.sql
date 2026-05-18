-- ============================================================================
-- Role security — close two self-promotion paths
-- ============================================================================
-- 1. handle_new_user() previously trusted raw_user_meta_data->>'role'. A
--    malicious sign-up could pass role='admin' via the SDK options.data
--    block. Clamp to ('customer','driver') so admin can only be granted
--    by direct SQL (the documented Phase 4 bootstrap path).
--
-- 2. profiles_update RLS allows the user to update their own row. Without
--    column-level restrictions, a user can flip their own role to 'admin'.
--    Postgres RLS WITH CHECK can't reference OLD, so we install a BEFORE
--    UPDATE trigger that throws when a non-admin tries to change role.
-- ============================================================================

-- Re-create the signup trigger with a clamp on role
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, phone, full_name, role)
  values (
    new.id,
    coalesce(new.phone, ''),
    coalesce(new.raw_user_meta_data->>'full_name', null),
    case
      when new.raw_user_meta_data->>'role' in ('customer','driver')
        then new.raw_user_meta_data->>'role'
      else 'customer'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Guard role changes on profile updates
create or replace function public.guard_profile_role() returns trigger as $$
begin
  if OLD.role is distinct from NEW.role then
    -- Allow service_role (admin route handlers) and is_admin() callers.
    -- public.is_admin() returns false for the service_role implicitly because
    -- there is no auth.uid(), so we also accept current_setting('role') =
    -- 'service_role' for completeness when called from the admin client.
    if not (public.is_admin() or current_setting('role', true) = 'service_role') then
      raise exception 'Only admins can change profile.role';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();
