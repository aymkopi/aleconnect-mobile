-- Maps account number to auth email for account-number login flows.
-- Apply this migration to your Supabase project before using sign-in.
create or replace function public.resolve_consumer_email_by_account_number(
  p_account_number text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select u.email
  into v_email
  from public.v_consumer_details as c
  join auth.users as u on u.id = c.profile_id
  where c.account_number = p_account_number
  and c.is_active = true
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_consumer_email_by_account_number(text) from public;
grant execute on function public.resolve_consumer_email_by_account_number(text) to anon;
grant execute on function public.resolve_consumer_email_by_account_number(text) to authenticated;
