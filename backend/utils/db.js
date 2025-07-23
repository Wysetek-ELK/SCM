const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../dbConfig.json');
let db = null;

function loadDbConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
  console.error('❌ No DB config found.');
  return null;
}

async function connectToMongo() {
  const config = loadDbConfig();
  if (!config) return;

  const uri = `mongodb://${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${config.dbName}?authSource=${config.dbName}`;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    db = client.db(config.dbName);
    console.log(`✅ Connected to MongoDB: ${config.dbName}`);

    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name);
    if (!names.includes('cases')) await db.createCollection('cases');
    if (!names.includes('customers')) await db.createCollection('customers');
    console.log('📁 Ensured collections: cases, customers');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    db = null;
  }
}

function getDb() {
  return db;
}

async function ensureDb(req, res, next) {
  if (!db) {
    console.warn('⚠️ DB not connected. Attempting reconnect...');
    await connectToMongo();
    if (!db) return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  next();
}

module.exports = { connectToMongo, getDb, ensureDb };
