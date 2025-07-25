const express = require("express");
const ldap = require("ldapjs");
const bcrypt = require("bcrypt");
const { sign } = require("../utils/jwtHelper");
const fs = require("fs");
const path = require("path");
const Role = require("../models/Role");
const User = require("../models/User");

//test

const router = express.Router();
const LDAP_CONFIG_FILE = path.join(__dirname, "../ldapConfig.json");

const localUsers = [
  {
    username: "sadmin",
    password: "$2b$10$ECPlfSFd4XrOvGLyNLYOIOMGa8d4GGZgOVg/2.uAtKZsErUXTF0IC", // 'admin123'
    role: "Admin",
    email: "admin@wysehawk.local",
    organizations: ["WyseHawk", "CustomerA", "CustomerB"],
  },
  {
    username: "support",
    password: "$2b$10$dEM5H8N8VgY3dYr6PoyMUOr0Pl3OF1f7LR9SRIkKUX3R8RJ6EmN7u", // 'support123'
    role: "Support",
    email: "support@wysehawk.local",
  },
];

async function ldapAuthenticate(username, password, source = "user") {
  
  console.log("🔍 Starting LDAP authentication");
  console.log("👤 Username:", username);
  console.log("🔧 Source:", source);
  console.log("📁 LDAP Config file exists?", fs.existsSync(LDAP_CONFIG_FILE));

  if (fs.existsSync(LDAP_CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(LDAP_CONFIG_FILE, "utf8"));
    console.log("📄 LDAP Config loaded:", config);
  }

  if (!fs.existsSync(LDAP_CONFIG_FILE)) {
    console.warn("⚠️ LDAP config file not found");
    return false;
  }

  const config = JSON.parse(fs.readFileSync(LDAP_CONFIG_FILE, "utf8"));
  const { allowedOUs } = loadOUFilterConfig(source);
  console.log("📚 Loaded OU filters:", allowedOUs);

  const ldapUrl = config.useTLS
    ? `ldaps://${config.url}:${config.port || 636}`
    : `ldap://${config.url}:${config.port || 389}`;

  const client = ldap.createClient({ url: ldapUrl });

  return new Promise((resolve) => {
    client.bind(config.bindDN, config.bindCredentials, (err) => {
      if (err) {
        console.error("❌ LDAP service bind failed:", err.message);
        client.unbind();
        return resolve(false);
      }

      const searchOptions = {
        scope: "sub",
        filter: config.searchFilter.replace("{{username}}", username),
      };

      client.search(config.searchBase, searchOptions, (err, res) => {
        if (err) {
          console.error("❌ LDAP search error:", err.message);
          client.unbind();
          return resolve(false);
        }

        let userDN = null;
        let userOUs = [];

        res.on("searchEntry", (entry) => {
          userDN = entry.dn?.toString?.();
          userOUs = [...userDN.matchAll(/OU=([^,]+)/gi)].map((m) => m[1]);
        });

        res.on("end", () => {
          client.unbind();
          if (!userDN) {
            console.warn("⚠️ User not found in LDAP");
            return resolve(false);
          }

          const isAllowedOU = allowedOUs.length === 0 || userOUs.some((ou) =>
            allowedOUs.some((allowed) => ou.includes(allowed))
          );

          if (!isAllowedOU) {
            console.warn("❌ User found, but OU not allowed:", userOUs);
            return resolve(false);
          }

          const userClient = ldap.createClient({ url: ldapUrl });
          userClient.bind(userDN, password, (err) => {
            userClient.unbind();
            if (err) {
              console.error("❌ User bind failed:", err.message);
              return resolve(false);
            }
            resolve(true);
          });
        });
      });
    });
  });
}


function loadOUFilterConfig(source) {
  const fileName = source === "customer" ? "ldapOUConfig.customer.json" : "ldapOUConfig.user.json";
  const filePath = path.join(__dirname, "../" + fileName);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return { allowedOUs: [] };
}

async function localAuthenticate(username, password) {
  const dbUser = await User.findOne({ username });
  if (!dbUser || !dbUser.password) return false;

  const match = await bcrypt.compare(password, dbUser.password);
  return match ? dbUser : false;  // return user object if matched
}

router.post("/login", async (req, res) => {
  const { username, password, authType, organization } = req.body;

  console.log("🌐 Incoming login request:");
  console.log("🔸 Username:", username);
  console.log("🔸 AuthType:", authType);
  console.log("🔸 Organization:", organization);

  if (!username || !password) {
    console.warn("⚠️ Missing username or password in request");
    return res.status(400).json({ success: false, message: "Missing credentials" });
  }

  let authenticated = false;

  const isCustomer = await Customer.findOne({ name: username });
  console.log("🔍 isCustomer check:", !!isCustomer);

  if (authType === "domain") {
    console.log("🔐 Using DOMAIN (LDAP) authentication");
    authenticated = await ldapAuthenticate(username, password, isCustomer ? "customer" : "user");
  } else if (authType === "local") {
    console.log("🔐 Using LOCAL authentication");
    authenticated = await localAuthenticate(username, password);
  } else {
    console.log("🔐 Using HYBRID authentication (try LDAP, then fallback to local)");
    authenticated = await ldapAuthenticate(username, password, isCustomer ? "customer" : "user");
    if (!authenticated) {
      console.log("🔁 LDAP failed, trying local...");
      authenticated = await localAuthenticate(username, password);
    }
  }

  if (!authenticated) {
    console.warn("❌ Authentication failed for:", username);
    return res.status(401).json({ success: false, message: "Invalid username or password" });
  }

  console.log("✅ Authentication successful");

  // =============================
  // User or Local Fallback logic
  // =============================
  let dbUser = await User.findOne({ username });

  if (dbUser) {
    console.log("🧠 Found DB user:", dbUser.username);

    if (!dbUser.wysehawk_Role) {
      console.warn("⛔ Wysehawk role is disabled for this user");
      return res.status(403).json({
        success: false,
        message: "Access denied: Wysehawk role is disabled",
      });
    }

    const hasValidOrg = Array.isArray(dbUser.allCustomer)
      ? dbUser.allCustomer.some((org) => {
          const isEnabled = org.Enabled === true || org.Enabled === "true" || org.Enabled === "True";
          return isEnabled && org.Role;
        })
      : false;

    if (!hasValidOrg) {
      console.warn("⛔ User has no valid enabled org with a role");
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const payload = {
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.allCustomerRole || dbUser.role,
      organization: organization || null,
      permissions: [],
    };

    const orgPermissions = {};

    if (Array.isArray(dbUser.allCustomer)) {
      for (const entry of dbUser.allCustomer) {
        const isEnabled = entry.Enabled === true || entry.Enabled === "true" || entry.Enabled === "True";
        if (!isEnabled || !entry.Role || !entry.Customer) continue;

        const roleDoc = await Role.findOne({ name: entry.Role });
        if (!roleDoc || !roleDoc.uiPermissions) continue;

        orgPermissions[entry.Customer] = roleDoc.uiPermissions;
      }
    }

    payload.orgPermissions = orgPermissions;

    const roleDoc = await Role.findOne({ name: payload.role });
    payload.uiPermissions = roleDoc?.uiPermissions || {};

    const token = sign(payload);
    console.log("🎫 Token issued for:", payload.username);
    console.log("🔐 Final JWT Payload:", payload);

    return res.json({ success: true, token, user: payload });
  }

  if (isCustomer) {
    console.log("🧾 Logging in as CUSTOMER:", username);

    const payload = {
      username: username,
      email: `${username}@customer.local`,
      role: 'customer', // no role needed
      organization: isCustomer.name,
      permissions: [],
    };

    const token = sign(payload);
    console.log("🎫 Token issued for customer:", payload.username);
    return res.json({ success: true, token, user: payload });
  }

  // Local fallback users
  const localUser = localUsers.find((u) => u.username === username);
  if (!localUser) {
    console.warn("⚠️ User not found in DB or localUsers list");
    return res.status(404).json({ success: false, message: "User not found" });
  }

  console.log("🧠 Using fallback local user:", localUser.username);

  const payload = {
    username: localUser.username,
    email: localUser.email,
    role: localUser.role,
    organization: organization || null,
    permissions: [],
  };

  const roleDoc = await Role.findOne({ name: localUser.role });
  payload.permissions = roleDoc?.permissions || [];

  const token = sign(payload);
  console.log("🎫 Token issued for local user:", payload.username);
  return res.json({ success: true, token, user: payload });
});

const Customer = require("../models/Customer");

router.get("/check-username", async (req, res) => {
  const { username, name } = req.query;
  if (!username) return res.status(400).json({ message: "Missing username" });

  const user = await User.findOne({ username });                 // ✅ correct for User
  const customer = await Customer.findOne({ name: name || username });
  console.log("Customer: ", customer);   // ✅ correct for Customer

  if (user) {
    return res.json({ type: "user" });
  } else if (customer) {
    console.log("✅ Customer found:", customer);
    return res.json({ type: "customer" });  // ✅ This line MUST exist
  } else {
    return res.status(404).json({ message: "Username not found" });
  }
});

module.exports = router;
