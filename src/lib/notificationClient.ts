import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Local schema extension for the reviewed, not-yet-applied notification migration.
// Remove this overlay after regenerating shared types from the migrated schema.
type Fields = { dispatch_status: 'pending' | 'processing' | 'completed' | 'review'; dispatch_approved_at: string | null; dispatch_started_at: string | null; dispatch_summary: Database['public']['Tables']['notification_logs']['Row']['metadata'] };
type Template = Database['public']['Tables']['notification_templates'];
type NotificationDatabase = Omit<Database, 'public'> & { public: Omit<Database['public'], 'Tables'> & { Tables: Omit<Database['public']['Tables'], 'notification_templates'> & {
  notification_templates: Omit<Template, 'Row' | 'Insert' | 'Update'> & { Row: Template['Row'] & Fields; Insert: Template['Insert'] & Partial<Fields>; Update: Template['Update'] & Partial<Fields> };
} } };
export const notificationClient = supabase as unknown as SupabaseClient<NotificationDatabase>;
