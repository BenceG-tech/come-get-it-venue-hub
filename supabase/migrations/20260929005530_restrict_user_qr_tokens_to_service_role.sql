-- QR tokens are created and consumed only by Edge Functions using the
-- service-role client. RLS already denies direct client access; revoke the
-- inherited Data API grants as defense in depth (including TRUNCATE).
revoke all privileges on table public.user_qr_tokens from anon, authenticated;

grant select, insert, update, delete on table public.user_qr_tokens to service_role;
