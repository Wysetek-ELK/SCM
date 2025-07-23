const express = require("express");
const ldap = require("ldapjs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");


const router = express.Router();

const User = require("../models/User");
const Role = require("../models/Role");

const LDAP_CONFIG_FILE = path.join(__dirname, "../ldapConfig.json");

// Local authentication
async function localAuthenticate(username, password) {
  const user = await User.findOne({ username, source: "local" });
  if (!user) return false;
  const match = await bcrypt.compare(password, user.password);
  return match ? user : false;
}

// LDAP authentication
async function ldapAuthenticate(username, password) {
  try {
    const config = JSON.parse(fs.readFileSync(LDAP_CONFIG_FILE, "utf8"));
    if (!config.url || !config.bindDN || !config.bindCredentials || !config.searchBase) {
      console.warn("⚠️ LDAP config incomplete");
      return false;
    }

    const ldapUrl = config.useTLS
      ? `ldaps://${config.url}:${config.port || 636}`
      : `ldap://${config.url}:${config.port || 389}`;

    const client = ldap.createClient({ url: ldapUrl });

    return new Promise((resolve) => {
      client.bind(config.bindDN, config.bindCredentials, (err) => {
        if (err) return resolve(false);

        const searchOptions = {
          scope: "sub",
          filter: config.searchFilter.replace("{{username}}", username),
        };

        client.search(config.searchBase, searchOptions, (err, res) => {
          if (err) return resolve(false);

          let userDN = null;
          res.on("searchEntry", (entry) => {
            userDN = entry.object?.dn;
          });

          res.on("end", () => {
            if (!userDN) return resolve(false);
            const userClient = ldap.createClient({ url: ldapUrl });
            userClient.bind(userDN, password, (err) => {
              userClient.unbind();
              client.unbind();
              resolve(!err);
            });
          });
        });
      });
    });
  } catch (err) {
    console.error("🔥 LDAP error:", err.message);
    return false;
  }
}

// POST /login
router.post("/login", async (req, res) => {
  const { username, password, authType } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing credentials" });
  }

  let user = null;

  if (authType === "domain") {
    const success = await ldapAuthenticate(username, password);
    if (success) user = { username, source: "ldap" };
  } else if (authType === "local") {
    user = await localAuthenticate(username, password);
  } else {
    const success = await ldapAuthenticate(username, password);
    if (success) user = { username, source: "ldap" };
    else user = await localAuthenticate(username, password);
  }

  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid username or password" });
  }

});

// GET /local
router.get("/local", async (req, res) => {
  try {
    const users = await User.find({ source: "local" });
    res.json({ users });
  } catch (err) {
    console.error("❌ Failed to fetch local users:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /ldap
router.get("/ldap/scan", async (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(LDAP_CONFIG_FILE, "utf8"));
    const ldapUrl = config.useTLS
      ? `ldaps://${config.url}:${config.port || 636}`
      : `ldap://${config.url}:${config.port || 389}`;

    const client = ldap.createClient({ url: ldapUrl });

    client.bind(config.bindDN, config.bindCredentials, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "LDAP bind failed" });
      }

      const searchOptions = {
        scope: "sub",
        filter: config.userListFilter || "(objectClass=person)",
      };

      const ldapUsers = [];

      client.search(config.searchBase, searchOptions, (err, searchRes) => {
        if (err) {
          return res.status(500).json({ success: false, message: "LDAP search failed" });
        }

        searchRes.on("searchEntry", (entry) => {
          const obj = entry.object;
          if (!obj) return;

          ldapUsers.push({
            username: obj.sAMAccountName || obj.cn || "unknown",
            email: obj.mail || "",
          });
        });

        searchRes.on("end", () => {
          client.unbind();
          res.json({ users: ldapUsers });
        });
      });
    });
  } catch (err) {
    console.error("🔥 LDAP scan error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

// ✅ UPDATED: POST /ldap/save (supports bulk import)
router.post("/ldap/save", async (req, res) => {
  try {
    const { users } = req.body;

    if (Array.isArray(users)) {
      const inserted = [];
      const skipped = [];

      for (const user of users) {
        const { username, email } = user;
        if (!username) continue;

        const exists = await User.findOne({ username, source: "ldap" });
        if (exists) {
          skipped.push(username);
          continue;
        }

        const newUser = new User({
          username,
          email,
          source: "ldap",
        });

        await newUser.save();
        inserted.push(username);
      }

      return res.json({
        success: true,
        message: `Imported ${inserted.length} LDAP users. Skipped ${skipped.length}.`,
        inserted,
        skipped,
      });
    }

    // fallback to single user creation (original logic)
    const {
      username,
      email,
      wysehawk_Role = false,
      allCustomer,
      allCustomerRole,
      allCustomerMode
    } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    const existing = await User.findOne({ username, source: "ldap" });
    if (existing) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const newUserData = {
      username,
      email,
      source: "ldap",
      wysehawk_Role,
    };

    if (wysehawk_Role) {
      const isAllCustomerMode = allCustomerMode === true || allCustomerMode === "true";
      let customerList = Array.isArray(allCustomer) ? allCustomer : [];

      if (isAllCustomerMode) {
        if (!allCustomerRole) {
          return res.status(400).json({ success: false, message: "All customer role is required" });
        }

        const roleExists = await Role.findOne({ name: allCustomerRole });
        if (!roleExists) {
          return res.status(400).json({ success: false, message: `Role "${allCustomerRole}" does not exist` });
        }

        customerList = customerList.map(c => ({
          ...c,
          Role: allCustomerRole,
        }));
      }

      const customersWithRole = customerList.filter(r => r.Role && r.Role.trim() !== "");
      for (const { Role: roleName } of customersWithRole) {
        const roleExists = await Role.findOne({ name: roleName });
        if (!roleExists) {
          return res.status(400).json({ success: false, message: `Role "${roleName}" does not exist` });
        }
      }

      newUserData.allCustomer = customerList;
      newUserData.allCustomerRole = allCustomerRole || null;
      newUserData.allCustomerMode = isAllCustomerMode;
    }

    const newUser = new User(newUserData);
    await newUser.save();

    res.json({ success: true, message: "LDAP user saved successfully" });
  } catch (err) {
    console.error("❌ Error saving LDAP user(s):", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /ldap - Saved LDAP users from MongoDB
router.get("/ldap", async (req, res) => {
  try {
    const savedLdapUsers = await User.find({ source: "ldap" });
    res.json({ success: true, users: savedLdapUsers });
  } catch (err) {
    console.error("❌ Error fetching saved LDAP users:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /create (local users)
router.post("/create", async (req, res) => {
  const {
    username,
    password,
    email,
    wysehawk_Role = false,
    allCustomer,
    allCustomerRole,
    allCustomerMode
  } = req.body;

  let customerList = Array.isArray(allCustomer) ? allCustomer : [];

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  const newUserData = {
    username,
    email,
    source: "local",
    wysehawk_Role,
  };

  if (wysehawk_Role) {
    // Ensure allCustomerMode is boolean
    const isAllCustomerMode = allCustomerMode === true || allCustomerMode === "true";

    // Log for debugging
    console.log("⚙️ allCustomerMode:", allCustomerMode);
    console.log("📦 isAllCustomerMode:", isAllCustomerMode);

    if (isAllCustomerMode && Array.isArray(customerList)) {
      if (!allCustomerRole) {
        return res.status(400).json({ success: false, message: "All customer role is required" });
      }

      const roleExists = await Role.findOne({ name: allCustomerRole });
      if (!roleExists) {
        return res.status(400).json({ success: false, message: `Role "${allCustomerRole}" does not exist` });
      }

      // Apply common role to each customer
      customerList = customerList.map(c => ({
        ...c,
        Role: allCustomerRole,
      }));
    }

    // Check if all specified roles exist
    const customersWithRole = customerList.filter(r => r.Role && r.Role.trim() !== "");
    for (const { Role: roleName } of customersWithRole) {
      const roleExists = await Role.findOne({ name: roleName });
      if (!roleExists) {
        return res.status(400).json({ success: false, message: `Role "${roleName}" does not exist` });
      }
    }

    newUserData.allCustomer = customerList;
    newUserData.allCustomerRole = allCustomerRole || null;
    newUserData.allCustomerMode = isAllCustomerMode; // <-- ✅ properly store this
  }

  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ success: false, message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    newUserData.password = hashedPassword;

    const newUser = new User(newUserData);
    await newUser.save();
    res.json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.error("❌ Error creating user:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// PUT /:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    username,
    password,
    email,
    wysehawk_Role = false,
    allCustomer,
    allCustomerRole,
    allCustomerMode
  } = req.body;

  let customerList = Array.isArray(allCustomer) ? allCustomer : [];

  const updateData = {
    username,
    email,
    wysehawk_Role,
  };

  if (wysehawk_Role) {
    const isAllCustomerMode = allCustomerMode === true || allCustomerMode === "true";

    if (isAllCustomerMode && Array.isArray(customerList)) {
      if (!allCustomerRole) {
        return res.status(400).json({ success: false, message: "All customer role is required" });
      }

      const roleExists = await Role.findOne({ name: allCustomerRole });
      if (!roleExists) {
        return res.status(400).json({ success: false, message: `Role "${allCustomerRole}" does not exist` });
      }

      customerList = customerList.map(c => ({
        ...c,
        Role: allCustomerRole,
      }));
    }

    const customersWithRole = customerList.filter(r => r.Role && r.Role.trim() !== "");
    for (const { Role: roleName } of customersWithRole) {
      const roleExists = await Role.findOne({ name: roleName });
      if (!roleExists) {
        return res.status(400).json({ success: false, message: `Role "${roleName}" does not exist` });
      }
    }

    updateData.allCustomer = customerList;
    updateData.allCustomerRole = allCustomerRole || null;
    updateData.allCustomerMode = isAllCustomerMode;
  }

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateData.password = hashedPassword;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    console.error("❌ Error updating user:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting user:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/bulk-delete", async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: "No user IDs provided" });
  }

  try {
    // Filter out admin users here (optional if handled in frontend)
    const usersToDelete = await User.find({
      _id: { $in: userIds },
      username: { $ne: "admin" }  // Exclude admin
    });

    const deleteIds = usersToDelete.map(user => user._id);
    const deleted = await User.deleteMany({ _id: { $in: deleteIds } });

    res.json({
      success: true,
      message: `${deleted.deletedCount} user(s) deleted successfully.`,
      deletedCount: deleted.deletedCount
    });
  } catch (err) {
    console.error("❌ Error in bulk delete:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
