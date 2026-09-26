-- Repair customer account provisioning for Bhatti Electric Store.
-- Restores the auth.users -> profiles trigger and backfills existing users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profiles(id, full_name)
  values(new.id, nullif(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
insert into public.profiles(id, full_name)
select u.id, nullif(u.raw_user_meta_data->>'full_name','')
from auth.users u
left join public.profiles p on p.id=u.id
where p.id is null
on conflict (id) do nothing;
