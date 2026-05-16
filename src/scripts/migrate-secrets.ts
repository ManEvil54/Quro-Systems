import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Quro — Secret Migration Utility
// Objective: Transition from .env.local to Google Secret Manager
// ============================================================

const PROJECT_ID = 'quro-13d98';
const client = new SecretManagerServiceClient();

async function migrate() {
  console.log('🛡️  STARTING SECRET MIGRATION TO GOOGLE CLOUD...');
  
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found. Migration aborted.');
    return;
  }

  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  console.log(`📂 Found ${Object.keys(envConfig).length} variables in .env.local\n`);

  for (const [key, value] of Object.entries(envConfig)) {
    // We only migrate sensitive keys. NEXT_PUBLIC keys are usually fine in .env
    // but for institutional posture, we can migrate all or just the private ones.
    const isPublic = key.startsWith('NEXT_PUBLIC_');
    console.log(`🚀 Migrating: ${key} [${isPublic ? 'PUBLIC' : 'SENSITIVE'}]`);

    const secretId = key; // Using the same key name in GSM
    const parent = `projects/${PROJECT_ID}`;

    try {
      // 1. Create the secret if it doesn't exist
      try {
        await client.createSecret({
          parent,
          secretId,
          secret: {
            replication: {
              automatic: {},
            },
          },
        });
        console.log(`   ✅ Secret created.`);
      } catch (err) {
        const error = err as { code?: number };
        if (error.code === 6) { // ALREADY_EXISTS
          console.log(`   ℹ️  Secret already exists. Updating version...`);
        } else {
          throw err;
        }
      }

      // 2. Add a new secret version
      const payload = Buffer.from(value, 'utf8');
      await client.addSecretVersion({
        parent: `${parent}/secrets/${secretId}`,
        payload: {
          data: payload,
        },
      });
      console.log(`   ✨ New version uploaded successfully.\n`);
    } catch (err) {
      const error = err as Error;
      console.error(`   ❌ Failed to migrate ${key}: ${error.message}\n`);
    }
  }

  console.log('--------------------------------------------------');
  console.log('🏁 MIGRATION COMPLETE');
  console.log('👉 Next Steps:');
  console.log('   1. Grant "Secret Manager Secret Accessor" to your Cloud Run service account.');
  console.log('   2. Link these secrets in your Cloud Run deployment configuration.');
  console.log('--------------------------------------------------');
}

migrate().catch(console.error);
