// ============================================================
// Quro — Stateless Audit Hook
// HIPAA-compliant PII access tracking (Firebase/Firestore)
// ============================================================
import { db, auth } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type AuditAction = 'view' | 'create' | 'update' | 'delete' | 'print' | 'export' | 'fax';
type ResourceType = 'patient' | 'medication' | 'mar' | 'order' | 'vital' | 'fall_report' | 'handover' | 'family_log';

interface AuditEntry {
  action: AuditAction;
  resource_type: ResourceType;
  resource_id?: string;
  description?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}

/**
 * Stateless audit hook — fires and forgets an audit log entry to Firestore.
 * Called manually for view/print/export actions from the client.
 */
export async function logAudit(orgId: string, entry: AuditEntry): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user || !orgId) return;

    const auditRef = collection(db, 'organizations', orgId, 'audit_log');
    await addDoc(auditRef, {
      user_id: user.uid,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      description: entry.description ?? null,
      old_values: entry.old_values ?? null,
      new_values: entry.new_values ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    // Audit logging should never block the UI
    console.error('[Quro Audit] Failed to log:', err);
  }
}

/**
 * Hook wrapper for React components
 */
export function useAudit(orgId: string) {
  return {
    logView: (resourceType: ResourceType, resourceId: string, description?: string) =>
      logAudit(orgId, { action: 'view', resource_type: resourceType, resource_id: resourceId, description }),
    logCreate: (resourceType: ResourceType, resourceId: string, newValues?: Record<string, unknown>) =>
      logAudit(orgId, { action: 'create', resource_type: resourceType, resource_id: resourceId, new_values: newValues }),
    logUpdate: (resourceType: ResourceType, resourceId: string, oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>) =>
      logAudit(orgId, { action: 'update', resource_type: resourceType, resource_id: resourceId, old_values: oldValues, new_values: newValues }),
    logDelete: (resourceType: ResourceType, resourceId: string) =>
      logAudit(orgId, { action: 'delete', resource_type: resourceType, resource_id: resourceId }),
    logPrint: (resourceType: ResourceType, resourceId: string, description?: string) =>
      logAudit(orgId, { action: 'print', resource_type: resourceType, resource_id: resourceId, description }),
    logExport: (resourceType: ResourceType, resourceId: string) =>
      logAudit(orgId, { action: 'export', resource_type: resourceType, resource_id: resourceId }),
    logFax: (resourceType: ResourceType, resourceId: string, faxNumber?: string) =>
      logAudit(orgId, { action: 'fax', resource_type: resourceType, resource_id: resourceId, description: `Faxed to ${faxNumber}` }),
  };
}
