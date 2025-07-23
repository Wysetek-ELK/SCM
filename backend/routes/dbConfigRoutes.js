const express = require('express');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const CONFIG_FILE = path.join(__dirname, '../dbConfig.json');

// ✅ Load DB Configuration from file
function loadDbConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return null;
}

// ✅ Test MongoDB connection
router.post('/test-connection', async (req, res) => {
  const { host, port, dbName, username, password } = req.body;

  const uri = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}?authSource=${dbName}`;

  try {
    const tempClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await tempClient.connect();
    await tempClient.db(dbName).command({ ping: 1 });
    await tempClient.close();
    console.log('✅ DB connection test successful');
    res.json({ success: true, message: '✅ Connected successfully!' });
  } catch (err) {
    console.error('❌ DB connection test failed:', err.message);
    res.status(500).json({ success: false, message: '❌ MongoDB Auth Failed: ' + err.message });
  }
});

// ✅ Save DB Configuration to file
router.post('/save-config', (req, res) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2));
    console.log('💾 DB configuration saved');
    res.json({ success: true, message: '💾 DB configuration saved!' });
  } catch (err) {
    console.error('❌ Failed to save DB config:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Load DB Configuration
router.get('/load-config', (req, res) => {
  try {
    const config = loadDbConfig();
    if (config) {
      console.log('📥 DB configuration loaded');
      res.json({ success: true, config });
    } else {
      res.json({ success: false, message: 'No configuration saved yet' });
    }
  } catch (err) {
    console.error('❌ Failed to load DB config:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
