import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "login" 
  | "logout" 
  | "export" 
  | "bulk_action"
  | "send_notification"
  | "void_redemption"
  | "send_bonus";

export type AuditResourceType = 
  | "venue" 
  | "user" 
  | "promotion" 
  | "notification" 
  | "reward" 
  | "brand" 
  | "redemption"
  | "report_schedule"
  | "settings";

interface AuditEventOptions {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Log an admin action to the audit trail
 * This should be called after successful operations to track admin activity
 */
export async function logAuditEvent(options: AuditEventOptions): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.warn("No session available for audit logging");
      return false;
    }

    const response = await supabase.functions.invoke("log-audit-event", {
      body: {
        action: options.action,
        resource_type: options.resourceType,
        resource_id: options.resourceId,
        old_value: options.oldValue,
        new_value: options.newValue,
        metadata: options.metadata,
      },
    });

    if (response.error) {
      console.error("Failed to log audit event:", response.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Audit logging error:", error);
    return false;
  }
}

/**
 * Helper to extract changed fields between old and new values
 */
export function getChangedFields(
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  
  for (const key of allKeys) {
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
      changes.push({
        field: key,
        oldValue: oldValue[key],
        newValue: newValue[key],
      });
    }
  }
  
  return changes;
}

/**
 * Format audit action for display in Hungarian
 */
export function formatAuditAction(action: string): string {
  const actionLabels: Record<string, string> = {
    create: "Létrehozás",
    update: "Módosítás",
    delete: "Törlés",
    login: "Bejelentkezés",
    logout: "Kijelentkezés",
    export: "Exportálás",
    bulk_action: "Tömeges művelet",
    send_notification: "Értesítés küldés",
    void_redemption: "Beváltás sztornó",
    send_bonus: "Bónusz küldés",
  };
  return actionLabels[action] || action;
}

/**
 * Format resource type for display in Hungarian
 */
export function formatResourceType(resourceType: string): string {
  const resourceLabels: Record<string, string> = {
    venue: "Helyszín",
    user: "Felhasználó",
    promotion: "Promóció",
    notification: "Értesítés",
    reward: "Jutalom",
    brand: "Márka",
    redemption: "Beváltás",
    report_schedule: "Jelentés ütemezés",
    settings: "Beállítások",
  };
  return resourceLabels[resourceType] || resourceType;
}
