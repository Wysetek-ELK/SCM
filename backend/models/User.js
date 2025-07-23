const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String },
  email: { type: String },
  role: { type: String },
  source: { type: String, enum: ["local", "ldap"], default: "local" },

  wysehawk_Role: { type: Boolean, default: false },
  allCustomer: { type: mongoose.Schema.Types.Mixed, default: false }, // Can be "True", "false", or an array
  allCustomerRole: { type: String },

  allCustomerMode: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);
