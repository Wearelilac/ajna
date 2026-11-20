/**
 * KEK Rotation Script
 * Re-wraps all subject DEKs with a new KEK.
 * For production, rotate to a new KEK in a KMS.
 *
 * Usage: KEK_VERSION=2 ts-node src/db/kek-rotation.ts
 */

import { Pool } from 'pg';
import { unwrapDEK, wrapDEK } from '../common/crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('KEKRotation');

export async function rotateKEK(
  connectionString: string,
  newKekVersion: number = 2,
): Promise<{ rotatedCount: number; failedCount: number }> {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  let rotatedCount = 0;
  let failedCount = 0;

  try {
    logger.log(`Starting KEK rotation to version ${newKekVersion}...`);

    // Get all vaults
    const vaults = await client.query('SELECT subject_id, wrapped_dek, dek_nonce FROM vaults');

    logger.log(`Found ${vaults.rows.length} vaults to rotate`);

    for (const vault of vaults.rows) {
      const { subject_id, wrapped_dek, dek_nonce } = vault;

      try {
        // Unwrap with old KEK
        const dek = unwrapDEK(wrapped_dek, dek_nonce);

        // Wrap with new KEK
        const { wrappedDek: newWrappedDek, nonce: newNonce } = wrapDEK(dek);

        // Update vault
        await client.query(
          `UPDATE vaults SET wrapped_dek = $1, dek_nonce = $2, kek_version = $3, updated_at = NOW()
           WHERE subject_id = $4`,
          [newWrappedDek, newNonce, newKekVersion, subject_id],
        );

        rotatedCount++;
        logger.debug(`✓ Rotated subject ${subject_id}`);
      } catch (err) {
        failedCount++;
        logger.error(`✗ Failed to rotate subject ${subject_id}: ${err}`);
      }
    }

    logger.log(`✅ KEK rotation complete: ${rotatedCount} succeeded, ${failedCount} failed`);

    return { rotatedCount, failedCount };
  } catch (err) {
    logger.error('KEK rotation failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// If run directly
if (require.main === module) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    logger.error('DATABASE_URL not set');
    process.exit(1);
  }

  const newVersion = parseInt(process.env.KEK_VERSION || '2', 10);

  rotateKEK(connectionString, newVersion)
    .then((result) => {
      logger.log(`Result: ${JSON.stringify(result)}`);
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Fatal error:', err);
      process.exit(1);
    });
}
