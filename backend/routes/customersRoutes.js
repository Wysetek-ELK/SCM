const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db, ensureDb) => {
  router.use(ensureDb);

  // ✅ Get all customers
  router.get('/', async (req, res) => {
    try {
      const customers = await db.collection('customers').find().toArray();
      res.json(customers);
    } catch (err) {
      console.error('❌ Failed to fetch customers:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch customers' });
    }
  });

  // ✅ Add new customer
  router.post('/', async (req, res) => {
    try {
      const result = await db.collection('customers').insertOne(req.body);
      const newCustomerName = req.body.name;

      const Users = db.collection('users');

      // 🔒 Admin logic (unchanged)
      const adminUser = await Users.findOne({ username: 'admin' });
      if (adminUser && adminUser.wysehawk_Role) {
        const existingAllCustomer = Array.isArray(adminUser.allCustomer) ? adminUser.allCustomer : [];
        const alreadyExists = existingAllCustomer.some(c => c.Customer === newCustomerName);

        if (!alreadyExists) {
          const updatedAllCustomer = [
            ...existingAllCustomer,
            { Enabled: 'True', Customer: newCustomerName, Role: 'admin' },
          ];
          await Users.updateOne(
            { _id: adminUser._id },
            { $set: { allCustomer: updatedAllCustomer } }
          );
          console.log(`✅ Admin user granted access to new customer: ${newCustomerName}`);
        }
      }

      // 🔄 Logic for other users
      const otherUsers = await Users.find({ username: { $ne: 'admin' } }).toArray();

      for (const user of otherUsers) {
        const { wysehawk_Role = false, allCustomerMode = false } = user;

        if (!wysehawk_Role) {
          continue; // 🚫 Skip if user is not Wysehawk
        }

        const existingAllCustomer = Array.isArray(user.allCustomer) ? user.allCustomer : [];
        const alreadyExists = existingAllCustomer.some(
          c => c.Customer?.toLowerCase?.() === newCustomerName.toLowerCase()
        );

        if (alreadyExists) {
          continue; // 🚫 Skip if customer already exists for user
        }

        let role = '';
        if (allCustomerMode) {
          if (typeof user.allCustomerRole === "string" && user.allCustomerRole.trim() !== "") {
              role = user.allCustomerRole.trim();
            }else {
            // 🌀 Fallback to first enabled customer's role if allCustomerRole is missing
            const firstEnabled = existingAllCustomer.find(c => c.Enabled === true || c.Enabled === 'True');
            if (firstEnabled && firstEnabled.Role) {
              role = firstEnabled.Role;
            }
          }
        }

        const updatedAllCustomer = [
          ...existingAllCustomer,
          { Enabled: false, Customer: newCustomerName, Role: role },
        ];

        await Users.updateOne(
          { _id: user._id },
          { $set: { allCustomer: updatedAllCustomer } }
        );

        console.log(`👤 ${user.username} → added new customer "${newCustomerName}" with role: "${role}"`);
      }

      res.json({ success: true, id: result.insertedId });
    } catch (err) {
      console.error('❌ Failed to add customer:', err.message);
      res.status(500).json({ success: false, message: 'Failed to add customer' });
    }
  });

  // ✅ Update customer
  router.put('/:id', async (req, res) => {
    try {
      const { name, emails } = req.body;

      if (!name || !emails || !Array.isArray(emails)) {
        return res.status(400).json({ success: false, message: 'Name and emails (array) are required' });
      }

      const result = await db.collection('customers').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name, emails } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      res.json({ success: true, updated: result.modifiedCount });
    } catch (err) {
      console.error('❌ Failed to update customer:', err.message);
      res.status(500).json({ success: false, message: 'Failed to update customer' });
    }
  });

  // ✅ Delete customer and clean up from all users
  router.delete('/:id', async (req, res) => {
    try {
      const customer = await db.collection('customers').findOne({ _id: new ObjectId(req.params.id) });
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const deleted = await db.collection('customers').deleteOne({ _id: new ObjectId(req.params.id) });

      const Users = db.collection('users');
      await Users.updateMany(
        {},
        { $pull: { allCustomer: { Customer: customer.name } } }
      );

      console.log(`🗑️ Deleted customer "${customer.name}" from DB and removed from all users`);

      res.json({ success: true, deleted: deleted.deletedCount });
    } catch (err) {
      console.error('❌ Failed to delete customer:', err.message);
      res.status(500).json({ success: false, message: 'Failed to delete customer' });
    }
  });

  return router;
};

async function handleCustomerImport(users) {
  const db = require("../utils/db").getDb();
  const collection = db.collection("customers");

  const inserts = users.map(user => ({
      name: user.name,
      emails: Array.isArray(user.email) ? user.email : [user.email],
      fullName: user.fullName
    }));

  const result = await collection.insertMany(inserts, { ordered: false });
  console.log("📦 LDAP Customer Import Preview:\n", inserts);
  return result.insertedCount;
}


module.exports.handleCustomerImport = handleCustomerImport;