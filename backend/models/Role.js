const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  uiPermissions: { type: Object, default: {} },
  nonDeletable: { type: Boolean, default: false },
});

module.exports = mongoose.model('Role', roleSchema);
