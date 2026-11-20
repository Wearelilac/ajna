/**
 * Cryptography module (00-data-protection-model.md, section 2).
 * AES-256-GCM envelope encryption with per-user DEKs.
 * KEK access isolated here only.
 * No PHI plaintext anywhere else in codebase.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const NONCE_LENGTH = 12; // 96 bits
const TAG_LENGTH = 16;
const DEK_LENGTH = 32; // 256 bits
const KEK_LENGTH = 32; // 256 bits

export interface EncryptedData {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
}

export interface VaultItem {
  ciphertext: Buffer;
  nonce: Buffer;
}

/**
 * Get KEK from environment.
 * Throws if missing or invalid.
 * KEK comes from AJNA_KEK_BASE64 only (never logged).
 */
function getKEK(): Buffer {
  const kekBase64 = process.env.AJNA_KEK_BASE64;
  if (!kekBase64) {
    throw new Error('AJNA_KEK_BASE64 not set');
  }
  const kek = Buffer.from(kekBase64, 'base64');
  if (kek.length !== KEK_LENGTH) {
    throw new Error(`KEK must be exactly ${KEK_LENGTH} bytes (${KEK_LENGTH * 8} bits)`);
  }
  return kek;
}

/**
 * Generate a random 96-bit nonce.
 * Never reused with the same DEK (enforced by tests).
 */
function generateNonce(): Buffer {
  return randomBytes(NONCE_LENGTH);
}

/**
 * Generate a random 256-bit DEK (Data Encryption Key).
 */
export function generateDEK(): Buffer {
  return randomBytes(DEK_LENGTH);
}

/**
 * Encrypt data with AES-256-GCM.
 * - Plain object JSON → JSON string → encrypt
 * - Uses fresh nonce each time
 * - AAD (Additional Authenticated Data) binds encryption to subject_id
 *
 * @param plaintext JSON object to encrypt
 * @param dek Data Encryption Key (32 bytes)
 * @param aad Additional Authenticated Data (e.g., subject_id)
 * @returns { ciphertext, nonce, tag }
 */
export function encrypt(
  plaintext: Record<string, unknown>,
  dek: Buffer,
  aad?: Buffer,
): EncryptedData {
  if (dek.length !== DEK_LENGTH) {
    throw new Error(`DEK must be exactly ${DEK_LENGTH} bytes`);
  }

  const nonce = generateNonce();
  const plaintext_str = JSON.stringify(plaintext);
  const plaintext_buf = Buffer.from(plaintext_str, 'utf8');

  const cipher = createCipheriv(ALGORITHM, dek, nonce);

  if (aad) {
    cipher.setAAD(aad);
  }

  const ciphertext = Buffer.concat([
    cipher.update(plaintext_buf),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return { ciphertext, nonce, tag };
}

/**
 * Decrypt data with AES-256-GCM.
 * Throws if AAD doesn't match or ciphertext is tampered.
 *
 * @param ciphertext Encrypted data
 * @param nonce Random nonce used during encryption
 * @param tag Authentication tag
 * @param dek Data Encryption Key (32 bytes)
 * @param aad Additional Authenticated Data (must match encryption AAD)
 * @returns Decrypted JSON object
 */
export function decrypt(
  ciphertext: Buffer,
  nonce: Buffer,
  tag: Buffer,
  dek: Buffer,
  aad?: Buffer,
): Record<string, unknown> {
  if (dek.length !== DEK_LENGTH) {
    throw new Error(`DEK must be exactly ${DEK_LENGTH} bytes`);
  }

  if (nonce.length !== NONCE_LENGTH) {
    throw new Error(`Nonce must be exactly ${NONCE_LENGTH} bytes`);
  }

  const decipher = createDecipheriv(ALGORITHM, dek, nonce);
  decipher.setAuthTag(tag);

  if (aad) {
    decipher.setAAD(aad);
  }

  try {
    const plaintext_buf = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    const plaintext_str = plaintext_buf.toString('utf8');
    return JSON.parse(plaintext_str);
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Decryption failed: ${err.message}`);
    }
    throw new Error('Decryption failed: unknown error');
  }
}

/**
 * Wrap a DEK with the KEK (envelope encryption).
 * Stores the wrapped result for later unwrapping.
 *
 * @param dek Data Encryption Key to wrap
 * @returns { wrappedDek, nonce }
 */
export function wrapDEK(dek: Buffer): { wrappedDek: Buffer; nonce: Buffer } {
  const kek = getKEK();
  const encrypted = encrypt({ key: dek.toString('base64') }, kek);
  return {
    wrappedDek: Buffer.concat([encrypted.ciphertext, encrypted.tag]),
    nonce: encrypted.nonce,
  };
}

/**
 * Unwrap a DEK with the KEK.
 *
 * @param wrappedDek Ciphertext from wrapDEK
 * @param nonce Nonce from wrapDEK
 * @returns Unwrapped DEK
 */
export function unwrapDEK(wrappedDek: Buffer, nonce: Buffer): Buffer {
  const kek = getKEK();

  // Split ciphertext and tag (tag is last 16 bytes)
  const ciphertext = wrappedDek.slice(0, -TAG_LENGTH);
  const tag = wrappedDek.slice(-TAG_LENGTH);

  const decrypted = decrypt(ciphertext, nonce, tag, kek);
  const keyBase64 = (decrypted as { key?: string }).key;

  if (!keyBase64) {
    throw new Error('Wrapped DEK missing key field');
  }

  return Buffer.from(keyBase64, 'base64');
}

/**
 * Compute hash chain entry.
 * Hash = SHA-256(previous_hash || canonical_row)
 *
 * @param previousHash Previous row's hash (null for first row)
 * @param canonicalData Row data (serialized)
 * @returns SHA-256 hash
 */
export function hashChainEntry(
  previousHash: Buffer | null,
  canonicalData: Buffer,
): Buffer {
  const hash = createHmac('sha256', Buffer.alloc(0));

  if (previousHash) {
    hash.update(previousHash);
  }

  hash.update(canonicalData);
  return hash.digest();
}

/**
 * Vault: encrypt/decrypt user data (PHI).
 * All access goes through here.
 */
export class VaultCrypto {
  constructor(private dek: Buffer) {
    if (dek.length !== DEK_LENGTH) {
      throw new Error(`DEK must be exactly ${DEK_LENGTH} bytes`);
    }
  }

  /**
   * Encrypt a vault item.
   * @param key Item key (e.g., "identity", "contact")
   * @param data JSON object to store encrypted
   * @param subjectId Subject's UUID (used as AAD)
   * @returns { ciphertext, nonce }
   */
  encrypt(key: string, data: Record<string, unknown>, subjectId: string): VaultItem {
    // AAD includes both the item key and subject ID to prevent cross-contamination
    const aad = Buffer.from(`${subjectId}:${key}`, 'utf8');
    const encrypted = encrypt(data, this.dek, aad);

    return {
      ciphertext: Buffer.concat([encrypted.ciphertext, encrypted.tag]),
      nonce: encrypted.nonce,
    };
  }

  /**
   * Decrypt a vault item.
   * @param key Item key (e.g., "identity", "contact")
   * @param ciphertext Encrypted data (includes tag in last 16 bytes)
   * @param nonce Nonce from storage
   * @param subjectId Subject's UUID (used as AAD, must match encryption)
   * @returns Decrypted JSON object
   */
  decrypt(
    key: string,
    ciphertext: Buffer,
    nonce: Buffer,
    subjectId: string,
  ): Record<string, unknown> {
    const aad = Buffer.from(`${subjectId}:${key}`, 'utf8');
    const ct = ciphertext.slice(0, -TAG_LENGTH);
    const tag = ciphertext.slice(-TAG_LENGTH);

    return decrypt(ct, nonce, tag, this.dek, aad);
  }
}

/**
 * Export functions for testing and key generation.
 */
export const CryptoUtils = {
  generateDEK,
  generateNonce,
  getKEK,
  ALGORITHM,
  NONCE_LENGTH,
  TAG_LENGTH,
  DEK_LENGTH,
  KEK_LENGTH,
};
