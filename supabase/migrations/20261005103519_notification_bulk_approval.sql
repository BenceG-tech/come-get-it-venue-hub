-- Successful redemption history is evidence of a past choice, not a declared
-- preference or a promise of currently available/free drinks.
create function public.notification_segment_recipients(p_user_ids uuid[], p_segment text)
returns uuid[] language plpgsql stable security invoker set search_path = '' as $$
declare v_categories text[];
begin
  if cardinality(p_user_ids) > 500 then raise exception 'SEGMENT_BATCH_TOO_LARGE'; end if;
  if p_segment = 'all' then return coalesce(p_user_ids, '{}'); end if;
  v_categories := case p_segment
    when 'beer' then array['beer'] when 'coffee' then array['coffee']
    when 'wine' then array['wine'] when 'cocktail' then array['cocktail']
    when 'non_alcoholic' then array['non-alcoholic','soft'] else null end;
  if v_categories is null then raise exception 'INVALID_DRINK_SEGMENT'; end if;
  return array(select distinct r.user_id from public.redemptions r
    join public.venue_drinks d on d.id = r.drink_id
    where r.user_id = any(p_user_ids) and r.status = 'success'
      and r.redeemed_at between now() - interval '180 days' and now()
      and d.category = any(v_categories));
end;
$$;
revoke all on function public.notification_segment_recipients(uuid[],text) from public, anon, authenticated;
grant execute on function public.notification_segment_recipients(uuid[],text) to service_role;

-- The batch row lock serializes approvals across browser tabs/retries/admins.
-- Previously approved drafts reserve their audience even when absent from this
-- selection. Recipient assignment follows stored display order, discovery last.
create function public.approve_notification_recommendations(p_batch_id uuid, p_admin_id uuid, p_selections jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_batch public.ai_notification_suggestions;
  v_existing public.notification_templates;
  v_item record;
  v_selection jsonb;
  v_suggestion jsonb;
  v_id uuid;
  v_ids uuid[];
  v_eligible uuid[];
  v_assigned uuid[] := '{}';
  v_response_ids uuid[] := '{}';
  v_segment_ids uuid[];
  v_segment text;
  v_scope text;
  v_scoped_id uuid;
  v_kind text;
  v_time timestamptz;
  v_results jsonb := '[]';
  v_success integer := 0;
  v_failed integer := 0;
  v_overlap integer;
  v_now timestamptz := now();
begin
  if not coalesce(public.is_admin(p_admin_id),false) then raise exception 'ADMIN_REQUIRED'; end if;
  if jsonb_typeof(p_selections) is distinct from 'array' or jsonb_array_length(p_selections) not between 1 and 4 then
    raise exception 'INVALID_SELECTION';
  end if;
  if (select count(distinct value ->> 'suggestion_id') from jsonb_array_elements(p_selections)) <> jsonb_array_length(p_selections) then
    raise exception 'DUPLICATE_SELECTION';
  end if;
  if not exists(select 1 from public.notification_scheduler_credentials where id='primary' and enabled and endpoint_url is not null) then
    raise exception 'SCHEDULER_UNAVAILABLE';
  end if;
  select * into v_batch from public.ai_notification_suggestions where id=p_batch_id for update;
  if not found then raise exception 'BATCH_NOT_FOUND'; end if;
  if exists(select 1 from jsonb_array_elements(p_selections) choice where not exists(
      select 1 from jsonb_array_elements(v_batch.suggestions) draft where draft ->> 'id' = choice ->> 'suggestion_id')) then
    raise exception 'UNKNOWN_SUGGESTION';
  end if;
  v_scope := coalesce(v_batch.context ->> 'scope','campaign');
  if v_scope not in ('user','campaign') then raise exception 'INVALID_SCOPE'; end if;
  if v_scope='user' then v_scoped_id := coalesce((v_batch.context ->> 'scoped_user_id')::uuid,v_batch.user_id); end if;
  v_segment := coalesce(v_batch.context ->> 'drink_segment','all');

  select coalesce(array_agg(distinct recipient::uuid),'{}') into v_assigned
    from public.notification_templates t
    join jsonb_array_elements(v_batch.suggestions) d on t.id::text = d ->> 'id'
    cross join lateral jsonb_array_elements_text(t.targeting -> 'user_ids') recipient;

  for v_item in select drafts.value as draft from jsonb_array_elements(v_batch.suggestions) with ordinality as drafts(value,ordinality)
    where exists(select 1 from jsonb_array_elements(p_selections) choice where choice ->> 'suggestion_id' = drafts.value ->> 'id')
    order by case when drafts.value ->> 'type' = 'discovery' then 1 else 0 end, drafts.ordinality
  loop
    v_suggestion := v_item.draft;
    v_id := (v_suggestion ->> 'id')::uuid;
    select * into v_existing from public.notification_templates where id=v_id;
    if found then
      v_ids := array(select value::uuid from jsonb_array_elements_text(v_existing.targeting -> 'user_ids'));
      v_results := v_results || jsonb_build_array(jsonb_build_object('suggestion_id',v_id,'template_id',v_id,
        'status','already_scheduled','recipient_count',cardinality(v_ids),'scheduled_at',v_existing.scheduled_at,
        'dispatch_status',v_existing.dispatch_status,'is_active',v_existing.is_active));
      v_success := v_success + 1;
      v_response_ids := v_response_ids || v_ids;
      continue;
    end if;
    begin
      if v_batch.generated_at is null or v_batch.generated_at > v_now or v_batch.generated_at < v_now - interval '24 hours' then raise exception 'EXPIRED_DRAFT'; end if;
      select value into v_selection from jsonb_array_elements(p_selections) where value ->> 'suggestion_id' = v_id::text;
      v_time := coalesce(v_selection ->> 'scheduled_at',v_suggestion ->> 'scheduled_at')::timestamptz;
      if v_time is null or v_time < v_now + interval '1 minute' or v_time > v_now + interval '7 days'
        or (v_time at time zone 'Europe/Budapest')::time < time '08:00'
        or (v_time at time zone 'Europe/Budapest')::time >= time '22:00' then raise exception 'INVALID_TIME'; end if;
      v_kind := v_suggestion ->> 'type';
      v_segment := coalesce(v_suggestion ->> 'drink_segment',v_batch.context ->> 'drink_segment','all');
      if v_kind not in ('points','welcome','reactivation','discovery') then raise exception 'INVALID_KIND'; end if;
      if length(btrim(v_suggestion ->> 'title_hu')) not between 1 and 80
        or length(btrim(v_suggestion ->> 'body_hu')) not between 1 and 240
        or coalesce(v_suggestion ->> 'title_hu','') || coalesce(v_suggestion ->> 'body_hu','') ~ '[{}]' then raise exception 'INVALID_MESSAGE'; end if;
      if coalesce(v_suggestion ->> 'deep_link','') not in ('/(tabs)/home','/(tabs)/rewards','/map') then raise exception 'INVALID_LINK'; end if;
      v_ids := array(select distinct value::uuid from jsonb_array_elements_text(v_suggestion -> 'user_ids'));
      if cardinality(v_ids) > 100 then raise exception 'TOO_MANY_RECIPIENTS'; end if;
      v_segment_ids := public.notification_segment_recipients(v_ids,v_segment);
      select coalesce(array_agg(p.id order by p.id),'{}') into v_eligible from public.profiles p
        left join public.user_points points on points.user_id=p.id
        where p.id=any(v_segment_ids) and (not p.is_admin or p.id=v_scoped_id)
          and (v_scoped_id is null or p.id=v_scoped_id)
          and (v_kind='discovery' or (v_kind='points' and points.balance > 0)
            or (v_kind='welcome' and p.created_at between v_now - interval '7 days' and v_now)
            or (v_kind='reactivation' and p.last_seen_at <= v_now - interval '14 days'))
          and exists(select 1 from public.push_tokens push where push.user_id=p.id and push.marketing_opt_in
            and push.token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$');
      v_ids := array(select x from unnest(v_eligible) x where not (x=any(v_assigned)));
      v_overlap := cardinality(v_eligible)-cardinality(v_ids);
      if cardinality(v_ids)=0 then
        v_results := v_results || jsonb_build_array(jsonb_build_object('suggestion_id',v_id,
          'status',case when v_overlap>0 then 'overlap_excluded' else 'empty_audience' end,
          'recipient_count',0,'excluded_overlap_count',v_overlap,
          'error',case when v_overlap>0 then 'A címzettek ebben a javaslatcsomagban már másik értesítést kapnak.' else 'Nincs ellenőrzött, marketingértesítéshez hozzájáruló címzett.' end));
        v_failed := v_failed + 1;
        continue;
      end if;
      insert into public.notification_templates(id,title_hu,body_hu,targeting,scheduled_at,send_mode,category,
        priority,deep_link,created_by,is_active,dispatch_status,dispatch_approved_at,quiet_hours,frequency_limit,ttl_hours)
      values(v_id,v_suggestion ->> 'title_hu',v_suggestion ->> 'body_hu',
        jsonb_strip_nulls(jsonb_build_object('user_ids',v_ids,'platform','all','recommendation_kind',v_kind,
          'evidence_checked_at',v_now,'scope',v_scope,'scoped_user_id',v_scoped_id,'drink_segment',v_segment)),
        v_time,'scheduled',case when v_kind='points' then 'points' else 'venue_status' end,
        case when v_kind='discovery' then 'low' else 'medium' end,v_suggestion ->> 'deep_link',p_admin_id,true,'pending',v_now,
        '{"enabled":true,"start":"22:00","end":"08:00"}','{"max_per_day":2,"per_user_hours":6}',24);
      v_assigned := v_assigned || v_ids;
      v_response_ids := v_response_ids || v_ids;
      v_success := v_success + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('suggestion_id',v_id,'template_id',v_id,
        'status','scheduled','recipient_count',cardinality(v_ids),'excluded_overlap_count',v_overlap,'scheduled_at',v_time));
    exception when others then
      v_failed := v_failed + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('suggestion_id',v_id,'status','failed','recipient_count',0,
        'error',case sqlerrm when 'INVALID_TIME' then 'Válassz jövőbeli időpontot 7 napon belül, 08:00 és 22:00 között (Budapest).'
          when 'EXPIRED_DRAFT' then 'A javaslat lejárt. Kérj új javaslatokat.' else 'A javaslat ütemezése sikertelen. Próbáld újra.' end));
    end;
  end loop;
  return jsonb_build_object('success',v_failed=0,'results',v_results,'scheduled_count',v_success,'failed_count',v_failed,
    'unique_recipient_count',(select count(distinct x) from unnest(v_response_ids) x),'approval_order','display_order');
end;
$$;
revoke all on function public.approve_notification_recommendations(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.approve_notification_recommendations(uuid,uuid,jsonb) to service_role;
