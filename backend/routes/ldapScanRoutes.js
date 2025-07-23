const { handleCustomerImport } = require("./customersRoutes"); // ✅ Step 1
const express = require("express");
const ldap = require("ldapjs");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const LDAP_CONFIG_FILE = path.join(__dirname, "../ldapConfig.json");

// 🔄 Load LDAP main connection config
function loadLdapConfig() {
  if (fs.existsSync(LDAP_CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(LDAP_CONFIG_FILE, "utf-8"));
  }
  return null;
}

// 🔄 Load OU filter config for "user" or "customer"
function loadOUFilterConfig(source) {
  const fileName = source === "customer" ? "ldapOUConfig.customer.json" : "ldapOUConfig.user.json";
  const filePath = path.join(__dirname, "../" + fileName);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return { allowedOUs: [] };
}

// 🟢 Sync LDAP users route
router.post("/sync", async (req, res) => {
  const config = loadLdapConfig();
  if (!config) {
    return res.status(500).json({ success: false, message: "LDAP not configured" });
  }

  const source = req.query.source || "user"; // 👈 Get from query param
  const { allowedOUs } = loadOUFilterConfig(source);

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

        // ✅ Filter users based on allowed OUs
        const filteredUsers = results.filter((user) => {
          return user.ou && allowedOUs.some((allowed) => user.ou.includes(allowed));
        });

        console.log(`🔍 [${source}] Filtered ${filteredUsers.length} users based on allowed OUs:`, allowedOUs);
        res.json({ success: true, users: filteredUsers });
      })
      .catch((err) => {
        console.error("❌ LDAP sync error:", err.message);
        client.unbind();
        res.status(500).json({ success: false, message: "LDAP sync error: " + err.message });
      });
  });
});

// 🛠️ Helper to extract LDAP fields
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

    const dn = entry.dn?.toString?.();
    if (dn) {
      const ous = [...dn.matchAll(/OU=([^,]+)/gi)].map((m) => m[1]);
      if (ous.length > 0) {
        output.ou = ous.join("/"); // e.g. CSM-OU/SubOU
      }
    }

    if (output.sAMAccountName && output.mail) {
      console.log("✅ Valid LDAP Output:", output);
      results.push(output);
    } else {
      console.warn("⚠️ Skipping invalid or incomplete LDAP entry:", output);
    }
  } catch (e) {
    console.error("❌ Error processing entry:", e.message);
  }
}

// ✅ Import scanned LDAP users into MongoDB in final structure (customers)
router.post("/import", async (req, res) => {
  const { users, source } = req.body;

  console.log("📥 Incoming LDAP Import Request:");
  console.log("🔹 Source:", source);
  console.log("🔹 Users Payload:", JSON.stringify(users, null, 2));

  if (!Array.isArray(users) || !["user", "customer"].includes(source)) {
    return res.status(400).json({ success: false, message: "Invalid import request" });
  }

  const db = require("../utils/db").getDb();

  try {
    if (source === "customer") {
      // 👇 Forward to customerRoutes logic
      console.log("📨 handleCustomerImport received:", JSON.stringify(users, null, 2));

      const { handleCustomerImport } = require("./customersRoutes"); // ✅ LOCAL import (same folder)
      const insertedCount = await handleCustomerImport(users);
      console.log(`✅ Inserted ${insertedCount} customer(s)`);
      return res.json({ success: true, insertedCount });
    }

    // ✅ Default USER import logic
    const collection = db.collection("users");

    const inserts = users.map(user => ({
      username: user.sAMAccountName,
      email: user.mail,
      source: "ldap",
      wysehawk_Role: false,
      allCustomer: false,
      allCustomerRole: null,
      allCustomerMode: false
    }));

    const result = await collection.insertMany(inserts, { ordered: false });
    console.log("✅ Inserted LDAP users:", result.insertedCount);

    return res.json({ success: true, insertedCount: result.insertedCount });

  } catch (err) {
    if (err.code === 11000 || err.name === "MongoBulkWriteError") {
      console.warn("⚠️ Duplicate entries skipped");
      return res.json({
        success: true,
        insertedCount: err.result?.insertedCount || 0,
        message: "Some entries already existed and were skipped"
      });
    } else {
      console.error("❌ Unexpected error during import:", err);
      return res.status(500).json({ success: false, message: "Import failed" });
    }
  }
});




module.exports = router;
