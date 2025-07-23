const express = require('express');
const router = express.Router();
const Role = require('../models/Role');

// ✅ Get all roles
router.get('/', async (req, res) => {
  try {
    const roles = await Role.find().sort({ nonDeletable: -1, name: 1 });
    res.json({ roles }); // 🆕 Changed to object format
  } catch (err) {
    res.status(500).json({ error: 'Failed to load roles' });
  }
});

// ✅ Create a new role
router.post('/', async (req, res) => {
  try {
    const { name, description, uiPermissions } = req.body;
    const newRole = new Role({
      name,
      description,
      uiPermissions,
      nonDeletable: false // user-created roles are deletable
    });
    await newRole.save();
    res.status(201).json({ role: newRole });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// ✅ Delete a role
router.delete('/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role not found' });

    if (role.nonDeletable) {
      return res.status(403).json({ error: 'Cannot delete a system role' });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// ✅ Get role details (for View/Edit)
router.get('/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// ✅ Update a role (Edit)
router.put('/:id', async (req, res) => {
  try {
    const { name, description, uiPermissions } = req.body;
    const updated = await Role.findByIdAndUpdate(
      req.params.id,
      { name, description, uiPermissions },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Role not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

module.exports = router;
