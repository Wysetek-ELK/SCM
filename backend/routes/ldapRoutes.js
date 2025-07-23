const express = require("express");
const ldap = require("ldapjs");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const LDAP_CONFIG_FILE = path.join(__dirname, "../ldapConfig.json");

// ✅ Load LDAP Config from file
function loadLdapConfig() {
  if (fs.existsSync(LDAP_CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(LDAP_CONFIG_FILE, "utf-8"));
  }
  return null;
}

// ✅ Save LDAP Config
router.post("/save-config", (req, res) => {
  try {
    fs.writeFileSync(LDAP_CONFIG_FILE, JSON.stringify(req.body, null, 2));
    console.log("💾 LDAP config saved");
    res.json({ success: true, message: "LDAP configuration saved" });
  } catch (err) {
    console.error("❌ Failed to save LDAP config:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Load LDAP Config
router.get("/load-config", (req, res) => {
  const config = loadLdapConfig();
  if (config) {
    res.json({ success: true, config });
  } else {
    res.status(404).json({ success: false, message: "No LDAP config found" });
  }
});

// ✅ Test Service Bind
router.post("/test-connection", (req, res) => {
  const { url, port, useTLS, bindDN, bindCredentials } = req.body;
  const ldapUrl = `${useTLS ? "ldaps" : "ldap"}://${url}:${port}`;

  const client = ldap.createClient({ url: ldapUrl });

  client.bind(bindDN, bindCredentials, (err) => {
    if (err) {
      console.error("❌ Service bind failed:", err.message);
      return res.json({ success: false, message: "Service bind failed: " + err.message });
    }
    console.log("✅ Service bind successful");
    client.unbind();
    res.json({ success: true, message: "Service bind successful" });
  });
});

// ✅ Full LDAP Login Test
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const config = loadLdapConfig();

  if (!config) {
    return res.status(500).json({ success: false, message: "LDAP not configured" });
  }

  const ldapUrl = `${config.useTLS ? "ldaps" : "ldap"}://${config.url}:${config.port}`;
  const client = ldap.createClient({ url: ldapUrl });

  client.bind(config.bindDN, config.bindCredentials, (err) => {
    if (err) {
      console.error("❌ Service bind failed:", err.message);
      return res.json({ success: false, message: "Service bind failed: " + err.message });
    }

    const searchOptions = {
      scope: "sub",
      filter: config.searchFilter.replace("{{username}}", username),
    };

    client.search(config.searchBase, searchOptions, (err, searchRes) => {
      if (err) {
        console.error("❌ Search error:", err.message);
        return res.json({ success: false, message: "Search error: " + err.message });
      }

      let userDN = null;

      searchRes.on("searchEntry", (entry) => {
        userDN = entry.object.dn;
        console.log("🔍 Found user DN:", userDN);
      });

      searchRes.on("end", () => {
        client.unbind();

        if (!userDN) {
          return res.json({ success: false, message: "User not found in LDAP" });
        }

        const userClient = ldap.createClient({ url: ldapUrl });
        userClient.bind(userDN, password, (err) => {
          userClient.unbind();
          if (err) {
            console.error("❌ User bind failed:", err.message);
            return res.json({ success: false, message: "Invalid username or password" });
          }
          console.log("✅ LDAP login successful for user:", username);
          res.json({ success: true, message: "LDAP login successful" });
        });
});
    });
  });
});

// ✅ New: LDAP Sync Route
router.post("/sync", (req, res) => {
  const config = loadLdapConfig();

  if (!config) {
    return res.status(500).json({ success: false, message: "LDAP not configured" });
  }

  const ldapUrl = `${config.useTLS ? "ldaps" : "ldap"}://${config.url}:${config.port}`;
  const client = ldap.createClient({ url: ldapUrl });

  client.bind(config.bindDN, config.bindCredentials, (err) => {
    if (err) {
      console.error("❌ Service bind failed:", err.message);
      return res.status(500).json({ success: false, message: "Service bind failed: " + err.message });
    }

    const searchOptions = {
      scope: "sub",
      filter: "(objectClass=person)", // Fetch all person objects
      attributes: ["sAMAccountName", "cn", "mail"],
    };

    const users = [];

    client.search(config.searchBase, searchOptions, (err, searchRes) => {
      if (err) {
        console.error("❌ Search error:", err.message);
        return res.status(500).json({ success: false, message: "Search error: " + err.message });
      }

      searchRes.on("searchEntry", (entry) => {
        const user = {
          sAMAccountName: entry.object.sAMAccountName || "",
          cn: entry.object.cn || "",
          mail: entry.object.mail || "",
        };
        users.push(user);
      });

      searchRes.on("end", () => {
        client.unbind();
        console.log(`✅ LDAP sync completed. Found ${users.length} users.`);
        res.json({ success: true, users });
      });

      searchRes.on("error", (err) => {
        console.error("❌ Search error during sync:", err.message);
        client.unbind();
        res.status(500).json({ success: false, message: "Search failed: " + err.message });
      });
    });
  });
});

module.exports = router;
