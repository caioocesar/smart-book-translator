import crypto from 'crypto';

// Security: Encrypt API keys before storing in database
class Encryption {
  constructor() {
    // Use environment variable or generate a key
    // In production, this should be stored securely (e.g., environment variable)
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY || this.generateKey();
  }

  generateKey() {
    // Generate a consistent key based on machine ID or use default
    // In production, use a proper secret management system
    const machineId = process.env.MACHINE_ID || 'default-key-change-in-production';
    return crypto.createHash('sha256').update(machineId).digest();
  }

  encrypt(text) {
    if (!text) return null;
    
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return IV + encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash for one-way encryption (e.g., for verification)
  hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}

export default new Encryption();



