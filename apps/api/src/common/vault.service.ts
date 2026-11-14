/**
 * Vault Service
 * High-level API for encrypted PHI storage.
 * Put and get plaintext items; encryption/decryption handled transparently.
 * All vault operations are scoped to a subject_id (RLS enforced by caller).
 */

import { Injectable, Logger } from '@nestjs/common';
import { VaultCrypto, wrapDEK, unwrapDEK, encrypt, decrypt, generateDEK, CryptoUtils } from './crypto';
import { Errors } from './errors';

export interface VaultGetOptions {
  subjectId: string;
  itemKey: string;
}

export interface VaultPutOptions {
  subjectId: string;
  itemKey: string;
  data: Record<string, unknown>;
}

@Injectable()
export class VaultService {
  private readonly logger = new Logger('VaultService');

  /**
   * Initialize vault for a new subject.
   * Generates a random DEK and wraps it with the KEK.
   * Called during subject creation (B1.3 onboarding).
   *
   * @param subjectId Subject's UUID
   * @param db Database connection/pool
   * @returns { wrappedDek, dekNonce } for storage
   */
  async initializeVault(
    subjectId: string,
    db: any, // TypeORM connection or pool
  ): Promise<{ wrappedDek: Buffer; dekNonce: Buffer }> {
    const dek = CryptoUtils.generateDEK();
    const { wrappedDek, nonce } = wrapDEK(dek);

    // Store in vaults table (RLS policy enforced by db transaction context)
    await db.query(
      `INSERT INTO vaults (subject_id, wrapped_dek, dek_nonce, kek_version, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [subjectId, wrappedDek, nonce, 1],
    );

    return { wrappedDek, dekNonce: nonce };
  }

  /**
   * Put an encrypted item into the vault.
   * Creates or updates a vault_item row.
   *
   * @param options { subjectId, itemKey, data }
   * @param db Database connection/pool
   */
  async put(options: VaultPutOptions, db: any): Promise<void> {
    const { subjectId, itemKey, data } = options;

    // Retrieve the wrapped DEK from vaults table
    const vaultRow = await db.query(
      `SELECT wrapped_dek, dek_nonce FROM vaults
       WHERE subject_id = $1`,
      [subjectId],
    );

    if (!vaultRow || vaultRow.length === 0) {
      throw Errors.validationFailed(`Vault not initialized for subject ${subjectId}`);
    }

    const { wrapped_dek: wrappedDek, dek_nonce: dekNonce } = vaultRow[0];
    let dek: Buffer;

    try {
      dek = unwrapDEK(wrappedDek, dekNonce);
    } catch (err) {
      this.logger.error('DEK unwrap failed', { subjectId });
      throw Errors.internalServerError();
    }

    const vaultCrypto = new VaultCrypto(dek);
    const encrypted = vaultCrypto.encrypt(itemKey, data, subjectId);

    // Upsert into vault_items (unique constraint on subject_id, item_key)
    await db.query(
      `INSERT INTO vault_items (subject_id, item_key, ciphertext, nonce, dek_version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (subject_id, item_key) DO UPDATE SET
         ciphertext = EXCLUDED.ciphertext,
         nonce = EXCLUDED.nonce,
         dek_version = EXCLUDED.dek_version,
         updated_at = NOW()`,
      [subjectId, itemKey, encrypted.ciphertext, encrypted.nonce, 1],
    );
  }

  /**
   * Get a decrypted item from the vault.
   * Returns plaintext JSON.
   *
   * @param options { subjectId, itemKey }
   * @param db Database connection/pool
   * @returns Decrypted JSON object
   */
  async get(options: VaultGetOptions, db: any): Promise<Record<string, unknown>> {
    const { subjectId, itemKey } = options;

    // Retrieve wrapped DEK
    const vaultRow = await db.query(
      `SELECT wrapped_dek, dek_nonce FROM vaults WHERE subject_id = $1`,
      [subjectId],
    );

    if (!vaultRow || vaultRow.length === 0) {
      throw Errors.validationFailed(`Vault not initialized for subject ${subjectId}`);
    }

    const { wrapped_dek: wrappedDek, dek_nonce: dekNonce } = vaultRow[0];
    let dek: Buffer;

    try {
      dek = unwrapDEK(wrappedDek, dekNonce);
    } catch (err) {
      this.logger.error('DEK unwrap failed', { subjectId });
      throw Errors.internalServerError();
    }

    // Retrieve vault item
    const itemRow = await db.query(
      `SELECT ciphertext, nonce FROM vault_items
       WHERE subject_id = $1 AND item_key = $2`,
      [subjectId, itemKey],
    );

    if (!itemRow || itemRow.length === 0) {
      throw Errors.notFound(`Vault item '${itemKey}' not found`);
    }

    const { ciphertext, nonce } = itemRow[0];
    const vaultCrypto = new VaultCrypto(dek);

    try {
      return vaultCrypto.decrypt(itemKey, ciphertext, nonce, subjectId);
    } catch (err) {
      this.logger.error('Vault item decrypt failed', { subjectId, itemKey });
      throw Errors.validationFailed('VAULT_DECRYPT_FAILED');
    }
  }

  /**
   * Delete a vault item (for data retention or user request).
   *
   * @param subjectId Subject's UUID
   * @param itemKey Item key to delete
   * @param db Database connection/pool
   */
  async delete(subjectId: string, itemKey: string, db: any): Promise<void> {
    await db.query(
      `DELETE FROM vault_items WHERE subject_id = $1 AND item_key = $2`,
      [subjectId, itemKey],
    );
  }

  /**
   * Get all item keys for a subject (for administration/deletion).
   * Returns only the keys, not the decrypted data.
   *
   * @param subjectId Subject's UUID
   * @param db Database connection/pool
   * @returns List of item keys
   */
  async listKeys(subjectId: string, db: any): Promise<string[]> {
    const rows = await db.query(
      `SELECT item_key FROM vault_items WHERE subject_id = $1`,
      [subjectId],
    );

    return rows.map((r) => r.item_key);
  }
}
