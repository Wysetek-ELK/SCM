// models/Customer.js
const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({
  name: String,
  email: String,
  fullName: String,
});

module.exports = mongoose.model("Customer", CustomerSchema);
