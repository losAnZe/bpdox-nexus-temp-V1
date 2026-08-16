import crypto from 'crypto';

// AES-256-GCM Encryption / Decryption Helper
const ALGORITHM = 'aes-256-gcm';

// Obtain 32-byte secret key from process.env or generate deterministic fallback
function getEncryptionKey(): Buffer {
  const secret = process.env.VAULT_SECRET || process.env.JWT_SECRET || 'bpdoxs_default_vault_secret_key_2026';
  return crypto.createHash('sha256').update(secret).digest();
}

export class VaultService {
  
  /**
   * Encrypt plain text password
   */
  static encrypt(text: string): string {
    if (!text) return '';
    
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt encrypted password hash
   */
  static decrypt(encryptedHash: string): string {
    if (!encryptedHash) return '';
    
    try {
      const parts = encryptedHash.split(':');
      if (parts.length !== 3) {
        // Unencrypted legacy fallback
        return encryptedHash;
      }
      
      const [ivHex, authTagHex, encryptedText] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = getEncryptionKey();
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error("[VaultService] Decryption failed:", error);
      return '••••••••';
    }
  }

  /**
   * Encrypt binary file Buffer (AES-256-GCM)
   * Header: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
   */
  static encryptBuffer(buffer: Buffer): Buffer {
    if (!buffer || buffer.length === 0) return Buffer.alloc(0);
    
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt binary file Buffer (AES-256-GCM)
   */
  static decryptBuffer(encryptedBuffer: Buffer): Buffer {
    if (!encryptedBuffer || encryptedBuffer.length <= 32) {
      throw new Error("Invalid or corrupted encrypted file data.");
    }
    
    const iv = encryptedBuffer.subarray(0, 16);
    const authTag = encryptedBuffer.subarray(16, 32);
    const ciphertext = encryptedBuffer.subarray(32);
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

