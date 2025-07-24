const express = require("express");
const ldap = require("ldapjs");
const bcrypt = require("bcrypt");
const { sign } = require("../utils/jwtHelper");
const fs = require("fs");
const path = require("path");
const Role = require("../models/Role");
const User = require("../models/User");
const Customer = require("../models/Customer"); 

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

async function ldapAuthenticate(username, password) {
  if (!fs.existsSync(LDAP_CONFIG_FILE)) {
    console.warn("⚠️ LDAP config file not found");
    return false;
  }

  const config = JSON.parse(fs.readFileSync(LDAP_CONFIG_FILE, "utf8"));
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

        res.on("searchEntry", (entry) => {
          userDN = entry.dn?.toString();
        });

        res.on("error", (err) => {
          console.error("❌ Search error:", err.message);
          client.unbind();
          resolve(false);
        });

        res.on("end", () => {
          client.unbind();
          if (!userDN) {
            console.warn("⚠️ User not found in LDAP");
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

async function localAuthenticate(username, password) {
  const dbUser = await User.findOne({ username });
  if (!dbUser || !dbUser.password) return false;

  const match = await bcrypt.compare(password, dbUser.password);
  return match ? dbUser : false;  // return user object if matched
}

router.post("/login", async (req, res) => {
  const { username, password, authType, organization } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing credentials" });
  }

  if (authType === "customer") {
    const ldapOk = await ldapAuthenticate(username, password);
    if (!ldapOk) {
      return res.status(401).json({ success: false, message: "Invalid LDAP credentials" });
    }

    const dbCustomer = await Customer.findOne({ name: username });
    if (!dbCustomer) {
      return res.status(404).json({ success: false, message: "Customer not found in system" });
    }

    const payload = {
      username: dbCustomer.name,
      email: dbCustomer.email,
      fullName: dbCustomer.fullName,
      role: "Customer",
    };

    const token = sign(payload);
    console.log("✅ Customer login:", payload);
    return res.json({ success: true, token, user: payload });
  }

  let authenticated = false;
  if (authType === "domain") {
    authenticated = await ldapAuthenticate(username, password);
  } else if (authType === "local") {
    authenticated = await localAuthenticate(username, password);
  } else {
    authenticated = await ldapAuthenticate(username, password);
    if (!authenticated) {
      authenticated = await localAuthenticate(username, password);
    }
  }

  if (!authenticated) {
    return res.status(401).json({ success: false, message: "Invalid username or password" });
  }

  let dbUser = await User.findOne({ username });

  if (dbUser) {
    if (!dbUser.wysehawk_Role) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Wysehawk role is disabled",
      });
    }

    const hasValidOrg = Array.isArray(dbUser.allCustomer)
      ? dbUser.allCustomer.some((org) => {
          const isEnabled =
            org.Enabled === true ||
            org.Enabled === "true" ||
            org.Enabled === "True";
          return isEnabled && org.Role;
        })
      : false;

    if (!hasValidOrg) {
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
    console.log("✅ Response sent to frontend:", { token, user: payload });
    return res.json({ success: true, token, user: payload });
  }

  const localUser = localUsers.find((u) => u.username === username);
  if (!localUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

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
  return res.json({ success: true, token, user: payload });
});

module.exports = router;
