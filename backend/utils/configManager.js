const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEY_FILE = path.join(__dirname, '../.config.key');

// 🔑 Load or generate encryption key
const getEncryptionKey = () => {
  if (process.env.CONFIG_KEY) {
    console.log('🔒 Using encryption key from ENV');
    return Buffer.from(process.env.CONFIG_KEY, 'hex');
  }
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE);
  }
  const key = crypto.randomBytes(32); // AES-256
  fs.writeFileSync(KEY_FILE, key);
  console.log('🔑 New encryption key generated and saved to .config.key');
  return key;
};

const algorithm = 'aes-256-gcm';
const key = getEncryptionKey();

const encrypt = (data) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    content: encrypted
  };
};

const decrypt = (encData) => {
  const iv = Buffer.from(encData.iv, 'hex');
  const tag = Buffer.from(encData.tag, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encData.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

// 🌟 Save config (auto-encrypt)
const saveConfig = (fileName, data) => {
  const filePath = path.join(__dirname, '../', fileName);
  const encrypted = encrypt(data);
  fs.writeFileSync(filePath, JSON.stringify(encrypted, null, 2));
  console.log(`💾 Saved encrypted ${fileName}`);
};

// 🌟 Load config (auto-decrypt)
const loadConfig = (fileName) => {
  const filePath = path.join(__dirname, '../', fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ${fileName} not found`);
    return null;
  }
  try {
    const encData = JSON.parse(fs.readFileSync(filePath));
    return decrypt(encData);
  } catch (err) {
    console.error(`❌ Failed to decrypt ${fileName}:`, err.message);
    return null;
  }
};

module.exports = { saveConfig, loadConfig };
