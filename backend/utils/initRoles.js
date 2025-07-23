const bcrypt = require('bcrypt');

async function ensureAdminRole(db) {
  const rolesCollection = db.collection('roles');
  const usersCollection = db.collection('users');
  const customersCollection = db.collection('customers');

  // Ensure 'admin' role exists
  let adminRole = await rolesCollection.findOne({ name: 'admin' });

  if (!adminRole) {
    adminRole = {
      name: 'admin',
      description: 'Full access to all modules',
      system: true,
      nonDeletable: true,
      uiPermissions: {
        Dashboard: 'full',
        Cases: 'full',
        'Add Case': 'full',
        'Case Details': 'full',
        Settings: {
          DB: 'full',
          Email: 'full',
          Customers: 'full',
          Auth: 'full',
          Users: 'full',
          Roles: 'full',
        },
      },
    };
    await rolesCollection.insertOne(adminRole);
    console.log('✅ Default admin role created');
  }

  const allCustomers = await customersCollection.find().toArray();
  const allCustomerNames = allCustomers.map(c => c.name);

  const existingAdmin = await usersCollection.findOne({ username: 'admin' });

  const newCustomerAccess = allCustomerNames.map(name => ({
    Customer: name,
    Role: 'admin',
    Enabled: true,
  }));

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const newAdminUser = {
      username: 'admin',
      password: hashedPassword,
      email: null,
      role: 'admin',
      source: 'local',
      wysehawk_Role: true,
      allCustomer: newCustomerAccess,
      allCustomerRole: 'admin',
      allCustomerMode: true, // ✅ This is the new flag required to track "All Customer" checkbox
    };

    await usersCollection.insertOne(newAdminUser);
    console.log('✅ Admin user created with full customer access');
  } else {
    const existingAccess = existingAdmin.allCustomer || [];
    const existingCustomerNames = existingAccess.map(c => c.Customer);

    const missingCustomers = allCustomerNames.filter(
      name => !existingCustomerNames.includes(name)
    );

    if (missingCustomers.length > 0) {
      const updatedAccess = [
        ...existingAccess,
        ...missingCustomers.map(name => ({
          Customer: name,
          Role: 'admin',
          Enabled: true,
        })),
      ];

      await usersCollection.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            wysehawk_Role: true,
            allCustomer: updatedAccess,
            allCustomerRole: 'admin',
            allCustomerMode: true, // ✅ make sure this is always true for admin
          },
        }
      );

      console.log('✅ Admin user updated — added missing customers');
    } else {
      // Ensure even if no update, admin has the correct mode/role
      await usersCollection.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            wysehawk_Role: true,
            allCustomerRole: 'admin',
            allCustomerMode: true,
          },
        }
      );

      console.log('✅ Admin user already has all customer access — ensured flags');
    }
  }
}

module.exports = ensureAdminRole;
