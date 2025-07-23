const express = require("express");
const fs = require("fs");
const path = require("path");
const Imap = require("imap");
const router = express.Router();

const IMAP_CONFIG_FILE = path.join(__dirname, "../imapConfig.json");

// 🔥 Load IMAP config
function loadImapConfig() {
  if (fs.existsSync(IMAP_CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(IMAP_CONFIG_FILE, "utf-8"));
  }
  return {
    host: "",
    port: 993,
    username: "",
    password: "",
    useTLS: true,
    checkInterval: 60000
  };
}

// 🔥 Save IMAP config
function saveImapConfig(config) {
  fs.writeFileSync(IMAP_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// ✅ GET /api/imap
router.get("/", (req, res) => {
  try {
    const config = loadImapConfig();
    res.json(config);
  } catch (err) {
    console.error("❌ Failed to load IMAP config:", err.message);
    res.status(500).json({ success: false, message: "Failed to load IMAP config", error: err.message });
  }
});

// ✅ POST /api/imap
router.post("/", (req, res) => {
  try {
    const newConfig = req.body;
    saveImapConfig(newConfig);
    console.log("✅ IMAP configuration saved");
    res.json({ success: true, message: "IMAP configuration saved successfully" });
  } catch (err) {
    console.error("❌ Failed to save IMAP config:", err.message);
    res.status(500).json({ success: false, message: "Failed to save IMAP config", error: err.message });
  }
});

// ✅ POST /api/imap/test
router.post("/test", (req, res) => {
  const { host, port, username, password, useTLS } = req.body;

  if (!host || !port || !username || !password) {
    return res.status(400).json({ success: false, message: "Incomplete IMAP settings" });
  }

  const imapConfig = {
    user: username,
    password: password,
    host: host,
    port: port,
    tls: useTLS,
    tlsOptions: {
      rejectUnauthorized: false // 🔥 Permanent fix: accept self-signed certs
    }
  };

  console.log("📡 Testing IMAP connection with config:", {
    host, port, username, useTLS
  });

  const imap = new Imap(imapConfig);

  // ✅ On successful connection
  imap.once("ready", () => {
    console.log("✅ IMAP test connection successful");
    imap.end();
    res.json({ success: true, message: "IMAP connection successful" });
  });

  // 🔥 On error: send full error message and stack trace
  imap.once("error", (err) => {
    console.error("❌ IMAP test connection failed:", err);
    res.status(500).json({
      success: false,
      message: "IMAP connection failed",
      error: err.message,
      stack: err.stack
    });
  });

  // ✅ Try to connect
  try {
    imap.connect();
  } catch (err) {
    console.error("❌ IMAP connection error (caught):", err);
    res.status(500).json({
      success: false,
      message: "Failed to connect IMAP",
      error: err.message,
      stack: err.stack
    });
  }
});

module.exports = router;
