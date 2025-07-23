const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { verify, sign } = require('./utils/jwtHelper'); // ✅ Centralized JWT helper
require('dotenv').config(); // 🔥 Load .env for secrets

// DB-independent routes
const smtpRoutes = require('./routes/smtpRoutes');
const imapRoutes = require('./routes/imapRoutes');
const ldapRoutes = require('./routes/ldapRoutes');
const ldapScanRoutes = require('./routes/ldapScanRoutes');
const dbConfigRoutes = require('./routes/dbConfigRoutes');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// DB-dependent routes (delayed mounting)
const casesRoutes = require('./routes/casesRoutes');
const customersRoutes = require('./routes/customersRoutes');
const customerCasesRoutes = require('./routes/customerCasesRoutes'); // ✅ NEW Customer Cases route
const { connectToMongo, getDb, ensureDb } = require('./utils/db');
const ensureAdminRole = require('./utils/initRoles');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS config
const corsOptions = {
  origin: "http://localhost:5173", // 🔥 Adjust if needed
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Mount DB-independent routes
app.use('/api/auth', authRoutes);
app.use('/api/smtp', smtpRoutes);
app.use('/api/imap', imapRoutes);
app.use('/api/ldap', ldapRoutes);
app.use('/api/ldap-scan', ldapScanRoutes);
app.use('/api/db', dbConfigRoutes);
app.use('/api/users', userRoutes);
app.use('/api', healthRoutes);

// 🔥 JWT middleware with debug logs
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.warn('⚠️ No Authorization header found');
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('📦 Incoming Token:', token);

  try {
    const decoded = verify(token); // ✅ Use centralized verify
    console.log('✅ Decoded JWT Payload:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ JWT verification failed:', err.message);
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

// 🔥 Customer auth middleware (patched to allow admin)
function verifyCustomer(req, res, next) {
  verifyToken(req, res, () => {
    const role = req.user.role?.toLowerCase();
    if (role === 'customer' || role === 'admin') {
      console.log(`✅ Access granted for ${role}`);
      return next();
    } else {
      console.warn('🚫 Unauthorized - Not a customer or admin');
      return res.status(403).json({ success: false, message: 'Access restricted to customers' });
    }
  });
}

// 🔥 Updated /auth/me route
app.get('/api/auth/me', verifyToken, (req, res) => {
  console.log('🚀 /auth/me response:', {
    success: true,
    user: req.user
  });
  res.json({
    success: true,
    user: req.user
  });
});

// ✅ Read MongoDB config and connect Mongoose
const configPath = path.join(__dirname, 'dbConfig.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ dbConfig.json not found.');
  process.exit(1);
}

const dbConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { host, port, dbName, username, password } = dbConfig;

const uri = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}?authSource=${dbName}`;

// ✅ Connect Mongoose
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('✅ Mongoose connected');

    const db = mongoose.connection.db;
    await ensureAdminRole(db);

    // ✅ Mount DB-dependent routes after DB is ready
    app.use('/api/roles', require('./routes/roleRoutes'));
    app.use('/api/dashboard', require('./routes/dashboardroutes')(db, ensureDb));
  })
  .catch((err) => {
    console.error('❌ Failed to connect to Mongoose:', err.message);
    process.exit(1);
  });

// ✅ Connect legacy MongoDB client for cases and customers
(async () => {
  try {
    await connectToMongo();
    console.log('📡 MongoDB (client) connected');

    app.use('/api/cases', casesRoutes(getDb(), ensureDb));
    app.use('/api/customers', customersRoutes(getDb(), ensureDb));
    app.use('/api/customer/cases', verifyCustomer, customerCasesRoutes);
  } catch (err) {
    console.error('❌ MongoDB client failed:', err.message);
  }
})();

// ✅ Start mail listener (auto updates cases on incoming emails)
require('./mail/mailListener');

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
