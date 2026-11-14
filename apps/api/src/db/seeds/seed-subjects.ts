/**
 * Seed script: Create 20 synthetic subjects for testing.
 * Run after migrations: ts-node src/db/seeds/seed-subjects.ts
 */

import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { wrapDEK, generateDEK } from '../../common/crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const AGE_BANDS = ['0-5', '6-12', '13-18', '19-30', '31-50', '51-65', '66+'];
const REGIONS = ['US-CA', 'US-TX', 'US-NY', 'US-FL', 'US-IL'];

async function seedSubjects(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Seeding 20 subjects...');

    const subjects: string[] = [];

    for (let i = 0; i < 20; i++) {
      const subjectId = uuid();
      const ageBand = AGE_BANDS[Math.floor(Math.random() * AGE_BANDS.length)];
      const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

      // Insert subject
      await client.query(
        `INSERT INTO subjects (subject_id, age_band, region_code, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [subjectId, ageBand, region],
      );

      // Generate and wrap DEK
      const dek = generateDEK();
      const { wrappedDek, nonce } = wrapDEK(dek);

      // Insert vault
      await client.query(
        `INSERT INTO vaults (subject_id, wrapped_dek, dek_nonce, kek_version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [subjectId, wrappedDek, nonce, 1],
      );

      // Insert sample vault items (identity, contact - encrypted)
      const identityData = {
        name: `User_${i + 1}`,
        email: `user${i + 1}@example.com`,
        phone: `555-${String(1000 + i).padStart(4, '0')}`,
      };

      // Note: In production, use VaultCrypto.encrypt()
      // For seed, we'll skip actual encryption and just store placeholder data
      await client.query(
        `INSERT INTO vault_items (subject_id, item_key, ciphertext, nonce, dek_version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (subject_id, item_key) DO NOTHING`,
        [subjectId, 'identity', Buffer.from(JSON.stringify(identityData)), nonce, 1],
      );

      subjects.push(subjectId);
      console.log(`✓ Subject ${i + 1}/20: ${subjectId} (${ageBand}, ${region})`);
    }

    // Insert default consents (all granted for testing)
    for (const subjectId of subjects) {
      await client.query(
        `INSERT INTO consents (subject_id, scope, granted_at, consent_text_version, created_at)
         VALUES ($1, $2, NOW(), $3, NOW())
         ON CONFLICT (subject_id, scope) DO NOTHING`,
        [subjectId, 'wearable', '1.0'],
      );

      await client.query(
        `INSERT INTO consents (subject_id, scope, granted_at, consent_text_version, created_at)
         VALUES ($1, $2, NOW(), $3, NOW())
         ON CONFLICT (subject_id, scope) DO NOTHING`,
        [subjectId, 'monitor_me', '1.0'],
      );

      await client.query(
        `INSERT INTO consents (subject_id, scope, granted_at, consent_text_version, created_at)
         VALUES ($1, $2, NOW(), $3, NOW())
         ON CONFLICT (subject_id, scope) DO NOTHING`,
        [subjectId, 'population_use', '1.0'],
      );
    }

    await client.query('COMMIT');
    console.log(`\n✅ Seeded 20 subjects with vaults and consents`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedSubjects();
