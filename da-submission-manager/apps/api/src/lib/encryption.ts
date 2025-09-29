import crypto from 'node:crypto';

/**
 * Utility functions for encrypting and decrypting sensitive data like API keys
 * Uses AES-256-GCM encryption with a key derived from environment variable
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set for data encryption');
  }
  
  // Use PBKDF2 to derive a consistent key from the secret
  return crypto.pbkdf2Sync(secret, 'action-network-keys', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a plaintext string (like an API key) for secure database storage
 */
export function encryptApiKey(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Format: iv:tag:encrypted (all hex encoded)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted API key from database storage
 */
export function decryptApiKey(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty string');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Safe test function to verify encryption/decryption works
 */
export function testEncryption() {
  const testKey = 'test-api-key-12345';
  const encrypted = encryptApiKey(testKey);
  const decrypted = decryptApiKey(encrypted);
  
  if (decrypted !== testKey) {
    throw new Error('Encryption test failed');
  }
  
  return true;
}
