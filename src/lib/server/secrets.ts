import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

/**
 * Quro — Institutional Secret Accessor
 * Ensures sensitive clinical keys are never exposed to the client.
 * Priority: process.env (Mounted) > GSM API (Fallback)
 */

const client = new SecretManagerServiceClient();
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'quro-13d98';

export async function getSecret(secretId: string): Promise<string | undefined> {
  // 1. Check if the secret is already in process.env (Standard Cloud Run behavior)
  if (process.env[secretId]) {
    return process.env[secretId];
  }

  // 2. If not, try to fetch it directly from GSM (Requires ADC)
  try {
    const [version] = await client.accessSecretVersion({
      name: `projects/${PROJECT_ID}/secrets/${secretId}/versions/latest`,
    });

    const payload = version.payload?.data?.toString();
    return payload;
  } catch {
    console.warn(`⚠️  Secret [${secretId}] not found in env or GSM. Ensure it is mounted.`);
    return undefined;
  }
}

// Pre-defined sensitive keys for type safety
export const SECRETS = {
  FIREBASE_ADMIN_KEY: 'FIREBASE_ADMIN_SDK_KEY',
  STRIPE_SECRET: 'STRIPE_SECRET_KEY',
  RESEND_API_KEY: 'RESEND_API_KEY'
} as const;
