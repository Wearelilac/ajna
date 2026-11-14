import { encrypt, decrypt, wrapDEK, unwrapDEK, VaultCrypto, CryptoUtils } from './crypto';

describe('Crypto Module', () => {
  let dek: Buffer;

  beforeEach(() => {
    // Set required env var for KEK
    process.env.AJNA_KEK_BASE64 = Buffer.from('x'.repeat(32)).toString('base64');
    dek = CryptoUtils.generateDEK();
  });

  describe('encrypt/decrypt round trip', () => {
    it('should encrypt and decrypt JSON data', () => {
      const plaintext = { user_id: 'test', email: 'test@example.com' };
      const encrypted = encrypt(plaintext, dek);

      expect(encrypted.ciphertext).toBeInstanceOf(Buffer);
      expect(encrypted.nonce).toHaveLength(CryptoUtils.NONCE_LENGTH);
      expect(encrypted.tag).toHaveLength(CryptoUtils.TAG_LENGTH);

      const decrypted = decrypt(encrypted.ciphertext, encrypted.nonce, encrypted.tag, dek);
      expect(decrypted).toEqual(plaintext);
    });

    it('should encrypt 1000 random payloads without collision', () => {
      const payloads = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `payload_${i}`,
      }));

      const results = payloads.map((p) => {
        const encrypted = encrypt(p, dek);
        const decrypted = decrypt(encrypted.ciphertext, encrypted.nonce, encrypted.tag, dek);
        return { original: p, decrypted };
      });

      results.forEach(({ original, decrypted }) => {
        expect(decrypted).toEqual(original);
      });

      console.log(`✓ 1000 round-trips successful`);
    });

    it('should enforce AAD (Additional Authenticated Data)', () => {
      const plaintext = { secret: 'data' };
      const aad = Buffer.from('subject-id-123', 'utf8');

      const encrypted = encrypt(plaintext, dek, aad);

      // Correct AAD: should decrypt
      const decrypted = decrypt(encrypted.ciphertext, encrypted.nonce, encrypted.tag, dek, aad);
      expect(decrypted).toEqual(plaintext);

      // Wrong AAD: should fail
      const wrongAad = Buffer.from('wrong-subject-id', 'utf8');
      expect(() => {
        decrypt(encrypted.ciphertext, encrypted.nonce, encrypted.tag, dek, wrongAad);
      }).toThrow();
    });

    it('should fail if ciphertext is tampered', () => {
      const plaintext = { data: 'test' };
      const encrypted = encrypt(plaintext, dek);

      // Tamper with one byte
      encrypted.ciphertext[0] ^= 0xff;

      expect(() => {
        decrypt(encrypted.ciphertext, encrypted.nonce, encrypted.tag, dek);
      }).toThrow();
    });

    it('should fail if tag is tampered', () => {
      const plaintext = { data: 'test' };
      const encrypted = encrypt(plaintext, dek);

      // Tamper with tag
      encrypted.tag[0] ^= 0xff;

      expect(() => {
        decrypt(encrypted.ciphertext, encrypted.nonce, encrypted.tag, dek);
      }).toThrow();
    });
  });

  describe('Nonce uniqueness', () => {
    it('should generate unique nonces for 100k samples', () => {
      const nonces = new Set<string>();

      for (let i = 0; i < 100000; i++) {
        const nonce = CryptoUtils.generateNonce();
        const nonce_hex = nonce.toString('hex');
        expect(nonces.has(nonce_hex)).toBe(false);
        nonces.add(nonce_hex);
      }

      console.log(`✓ ${nonces.size} unique nonces generated, zero collisions`);
    });
  });

  describe('DEK wrap/unwrap', () => {
    it('should wrap and unwrap DEK', () => {
      const testDek = CryptoUtils.generateDEK();
      const { wrappedDek, nonce } = wrapDEK(testDek);

      const unwrapped = unwrapDEK(wrappedDek, nonce);
      expect(unwrapped).toEqual(testDek);
    });

    it('should fail on invalid wrappedDek', () => {
      const invalidWrappedDek = Buffer.from('invalid', 'utf8');
      const invalidNonce = Buffer.from('nonce', 'utf8');

      expect(() => {
        unwrapDEK(invalidWrappedDek, invalidNonce);
      }).toThrow();
    });
  });

  describe('VaultCrypto', () => {
    it('should encrypt and decrypt vault items with AAD', () => {
      const vault = new VaultCrypto(dek);
      const subjectId = '550e8400-e29b-41d4-a716-446655440000';
      const itemKey = 'identity';
      const data = {
        name: 'Alice',
        email: 'alice@example.com',
      };

      const encrypted = vault.encrypt(itemKey, data, subjectId);
      const decrypted = vault.decrypt(itemKey, encrypted.ciphertext, encrypted.nonce, subjectId);

      expect(decrypted).toEqual(data);
    });

    it('should fail decryption with wrong item key', () => {
      const vault = new VaultCrypto(dek);
      const subjectId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { sensitive: 'information' };

      const encrypted = vault.encrypt('identity', data, subjectId);

      // Try to decrypt with wrong key
      expect(() => {
        vault.decrypt('wrong_key', encrypted.ciphertext, encrypted.nonce, subjectId);
      }).toThrow();
    });

    it('should fail decryption with wrong subject ID', () => {
      const vault = new VaultCrypto(dek);
      const subjectId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { sensitive: 'information' };

      const encrypted = vault.encrypt('identity', data, subjectId);

      // Try to decrypt with wrong subject ID
      expect(() => {
        const wrongSubjectId = '550e8400-e29b-41d4-a716-446655440001';
        vault.decrypt('identity', encrypted.ciphertext, encrypted.nonce, wrongSubjectId);
      }).toThrow();
    });
  });

  describe('Error handling', () => {
    it('should reject invalid DEK size', () => {
      const invalidDek = Buffer.from('too-short', 'utf8');
      expect(() => {
        encrypt({ data: 'test' }, invalidDek);
      }).toThrow('DEK must be exactly');
    });

    it('should reject invalid nonce size on decrypt', () => {
      const plaintext = { data: 'test' };
      const encrypted = encrypt(plaintext, dek);

      const invalidNonce = Buffer.from('short', 'utf8');
      expect(() => {
        decrypt(encrypted.ciphertext, invalidNonce, encrypted.tag, dek);
      }).toThrow('Nonce must be exactly');
    });
  });
});
