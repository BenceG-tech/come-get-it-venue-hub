-- Restore EXECUTE on is_admin (needed by RLS policies evaluated as the calling user)
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_venue_ids(uuid) TO authenticated;

-- Ensure profile exists and is admin for gataibence@gmail.com (if the auth user exists)
INSERT INTO public.profiles (id, name, is_admin)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'name', u.email), TRUE
FROM auth.users u
WHERE u.email = 'gataibence@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_admin = TRUE;