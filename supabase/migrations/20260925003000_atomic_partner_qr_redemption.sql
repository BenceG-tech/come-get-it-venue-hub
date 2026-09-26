create unique index if not exists redemptions_token_id_unique
on public.redemptions (token_id)
where token_id is not null;

create or replace function public.consume_redemption_token_atomic(
  p_token_hash text,
  p_staff_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.redemption_tokens%rowtype;
  v_redemption public.redemptions%rowtype;
  v_drink_name text;
  v_drink_image_url text;
  v_venue_name text;
  v_is_admin boolean := false;
  v_is_authorized boolean := false;
  v_is_app_review boolean := false;
  v_now timestamptz := now();
begin
  select *
  into v_token
  from public.redemption_tokens
  where token_hash = p_token_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Token not found');
  end if;

  select coalesce(is_admin, false)
  into v_is_admin
  from public.profiles
  where id = p_staff_id;

  v_is_authorized := coalesce(v_is_admin, false)
    or exists (
      select 1
      from public.venue_memberships vm
      where vm.profile_id = p_staff_id
        and vm.venue_id = v_token.venue_id
    )
    or exists (
      select 1
      from public.venues v
      where v.id = v_token.venue_id
        and v.owner_profile_id = p_staff_id
    );

  if not v_is_authorized then
    return jsonb_build_object('success', false, 'code', 'VENUE_UNAUTHORIZED', 'error', 'Not authorized for this venue');
  end if;

  if v_token.status = 'consumed' then
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CONSUMED',
      'error', 'Token already consumed',
      'consumed_at', v_token.consumed_at
    );
  end if;

  if v_token.status <> 'issued' then
    return jsonb_build_object('success', false, 'code', 'INVALID_STATUS', 'error', 'Token is not active');
  end if;

  if v_token.expires_at <= v_now then
    update public.redemption_tokens
    set status = 'expired', updated_at = v_now
    where id = v_token.id;

    return jsonb_build_object('success', false, 'code', 'EXPIRED', 'error', 'Token has expired');
  end if;

  select vd.drink_name, vd.image_url
  into v_drink_name, v_drink_image_url
  from public.venue_drinks vd
  where vd.id = v_token.drink_id;

  select v.name
  into v_venue_name
  from public.venues v
  where v.id = v_token.venue_id;

  select exists (
    select 1
    from public.app_review_testers art
    where art.user_id = v_token.user_id
      and art.enabled = true
  )
  into v_is_app_review;

  begin
    insert into public.redemptions (
      venue_id,
      user_id,
      drink,
      drink_id,
      value,
      token_id,
      staff_id,
      redeemed_at,
      status,
      metadata
    )
    values (
      v_token.venue_id,
      coalesce(v_token.user_id, p_staff_id),
      coalesce(v_drink_name, 'Unknown Drink'),
      v_token.drink_id,
      0,
      v_token.id,
      p_staff_id,
      v_now,
      'success',
      case when v_is_app_review then jsonb_build_object('flow', 'app_review') else '{}'::jsonb end
    )
    returning * into v_redemption;
  exception
    when unique_violation then
      return jsonb_build_object(
        'success', false,
        'code', 'DAILY_LIMIT_OR_ALREADY_CONSUMED',
        'error', 'A successful redemption already exists for this token or user today'
      );
  end;

  update public.redemption_tokens
  set
    status = 'consumed',
    consumed_at = v_now,
    consumed_by_staff_id = p_staff_id,
    updated_at = v_now
  where id = v_token.id;

  return jsonb_build_object(
    'success', true,
    'redemption', jsonb_build_object(
      'id', v_redemption.id,
      'drink_name', coalesce(v_drink_name, 'Unknown Drink'),
      'drink_id', v_token.drink_id,
      'drink_image_url', v_drink_image_url,
      'venue_name', v_venue_name,
      'venue_id', v_token.venue_id,
      'token_prefix', v_token.token_prefix,
      'redeemed_at', v_now,
      'staff_id', p_staff_id
    )
  );
end;
$$;

revoke all on function public.consume_redemption_token_atomic(text, uuid) from public;
revoke all on function public.consume_redemption_token_atomic(text, uuid) from anon;
revoke all on function public.consume_redemption_token_atomic(text, uuid) from authenticated;
grant execute on function public.consume_redemption_token_atomic(text, uuid) to service_role;
