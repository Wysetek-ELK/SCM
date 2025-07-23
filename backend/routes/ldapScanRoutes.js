const express = require("express");
const ldap = require("ldapjs");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const LDAP_CONFIG_FILE = path.join(__dirname, "../ldapConfig.json");

// Load LDAP Config from File
function loadLdapConfig() {
  if (fs.existsSync(LDAP_CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(LDAP_CONFIG_FILE, "utf-8"));
  }
  return null;
}

// 🔁 Sync LDAP Users Route (Fetch & list)
router.post("/sync", async (req, res) => {
  const config = loadLdapConfig();
  if (!config) {
    return res.status(500).json({ success: false, message: "LDAP not configured" });
  }

  const ldapUrl = `${config.useTLS ? "ldaps" : "ldap"}://${config.url}:${config.port}`;
  const client = ldap.createClient({ url: ldapUrl });

  client.bind(config.bindDN, config.bindCredentials, (err) => {
    if (err) {
      console.error("❌ Bind error:", err.message);
      return res.status(500).json({ success: false, message: "Bind error: " + err.message });
    }

    const usernames = req.body.usernames || [];
    const results = [];

    const fetchUsers = (userList) => {
      if (userList.length === 0) {
        return new Promise((resolve, reject) => {
          const searchOptions = {
            scope: "sub",
            filter: "(&(objectClass=user)(objectCategory=person))",
            attributes: ["cn", "mail", "sAMAccountName"]
          };

          client.search(config.searchBase, searchOptions, (err, searchRes) => {
            if (err) return reject(err);
            searchRes.on("searchEntry", (entry) => processEntry(entry, results));
            searchRes.on("error", reject);
            searchRes.on("end", () => resolve());
          });
        });
      }

      return Promise.all(userList.map((username) => {
        return new Promise((resolve, reject) => {
          const rawFilter = config.searchFilter || "(&(objectClass=user)(objectCategory=person)(sAMAccountName={{username}}))";
          const searchFilter = rawFilter.replace("{{username}}", username);

          const searchOptions = {
            scope: "sub",
            filter: searchFilter,
            attributes: ["cn", "mail", "sAMAccountName"]
          };

          client.search(config.searchBase, searchOptions, (err, searchRes) => {
            if (err) return reject(err);
            searchRes.on("searchEntry", (entry) => processEntry(entry, results));
            searchRes.on("error", reject);
            searchRes.on("end", () => resolve());
          });
        });
      }));
    };

    fetchUsers(usernames)
      .then(() => {
        client.unbind();
        res.json({ success: true, users: results });
      })
      .catch((err) => {
        console.error("❌ LDAP sync error:", err.message);
        client.unbind();
        res.status(500).json({ success: false, message: "LDAP sync error: " + err.message });
      });
  });
});

// ✅ Helper: Extract fields from LDAP result
function processEntry(entry, results) {
  try {
    const raw = entry.pojo || entry.json || entry.toObject?.();
    if (!raw || typeof raw !== "object") return;

    const attrs = raw.attributes || [];
    const output = {};

    for (const attr of attrs) {
      if (attr.type === "sAMAccountName" && attr.values?.[0]) {
        output.sAMAccountName = attr.values[0];
      } else if (attr.type === "mail" && attr.values?.[0]) {
        output.mail = attr.values[0];
      } else if (attr.type === "cn" && attr.values?.[0]) {
        output.cn = attr.values[0];
      }
    }

    if (output.sAMAccountName && output.mail) {
      results.push(output);
    }
  } catch (e) {
    console.error("❌ Error processing entry:", e.message);
  }
}

// ✅ Import scanned LDAP users into MongoDB in final structure
router.post("/import", async (req, res) => {
  const { users } = req.body;

  if (!Array.isArray(users)) {
    return res.status(400).json({ success: false, message: "Invalid user data" });
  }

  try {
    const db = require("../utils/db").getDb();
    const collection = db.collection("users");

    const inserts = users.map(user => ({
      username: user.sAMAccountName,
      email: user.mail,
      source: "ldap",               // ✅ required field
      wysehawk_Role: false,         // ✅ default
      allCustomer: false,           // ✅ default
      allCustomerRole: null,        // ✅ optional
      allCustomerMode: false        // ✅ optional
      // 🚫 NO createdAt
    }));

    const result = await collection.insertMany(inserts, { ordered: false });
    console.log("✅ Inserted LDAP users:", result.insertedCount);

    res.json({ success: true, insertedCount: result.insertedCount });
  } catch (err) {
    if (err.code === 11000 || err.name === "MongoBulkWriteError") {
      console.warn("⚠️ Duplicate LDAP users skipped");
      res.json({
        success: true,
        insertedCount: err.result?.insertedCount || 0,
        message: "Some users already existed and were skipped"
      });
    } else {
      console.error("❌ Unexpected error importing LDAP users:", err);
      res.status(500).json({ success: false, message: "Failed to import users" });
    }
  }
});

module.exports = router;
