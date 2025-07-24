const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { verify, sign } = require('./utils/jwtHelper');
require('dotenv').config();

const smtpRoutes = require('./routes/smtpRoutes');
const imapRoutes = require('./routes/imapRoutes');
const ldapRoutes = require('./routes/ldapRoutes');
const ldapScanRoutes = require('./routes/ldapScanRoutes');
const dbConfigRoutes = require('./routes/dbConfigRoutes');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const casesRoutes = require('./routes/casesRoutes');
const customersRoutes = require('./routes/customersRoutes');
const customerCasesRoutes = require('./routes/customerCasesRoutes');
const { connectToMongo, getDb, ensureDb } = require('./utils/db');
const ensureAdminRole = require('./utils/initRoles');

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/smtp', smtpRoutes);
app.use('/api/imap', imapRoutes);
app.use('/api/ldap', ldapRoutes);
app.use('/api/ldap-scan', ldapScanRoutes);
app.use('/api/db', dbConfigRoutes);
app.use('/api/users', userRoutes);
app.use('/api', healthRoutes);

// 🔐 JWT middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.warn('⚠️ No Authorization header found');
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('📦 Incoming Token:', token);

  try {
    const decoded = verify(token);
    console.log('✅ Decoded JWT Payload:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ JWT verification failed:', err.message);
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

// 🔐 Customer middleware
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

app.get('/api/auth/me', verifyToken, (req, res) => {
  console.log('🚀 /auth/me response:', {
    success: true,
    user: req.user
  });
  res.json({ success: true, user: req.user });
});

// 🔌 MongoDB Config
const configPath = path.join(__dirname, 'dbConfig.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ dbConfig.json not found.');
  process.exit(1);
}

const dbConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { host, port, dbName, username, password } = dbConfig;
const uri = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}?authSource=${dbName}`;

// ✅ Connect with Mongoose
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('✅ Mongoose connected');

    const db = mongoose.connection.db;
    await ensureAdminRole(db);

    // ✅ DB-dependent routes
    app.use('/api/roles', require('./routes/roleRoutes'));
    app.use('/api/dashboard', require('./routes/dashboardroutes')(db, ensureDb));
    app.use('/api/metrics', require('./routes/metrics')(db)); // ✅ Now mounted after db is available
  })
  .catch((err) => {
    console.error('❌ Failed to connect to Mongoose:', err.message);
    process.exit(1);
  });

// ✅ Connect legacy MongoDB client
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

// 📬 Start mail listener
require('./mail/mailListener');

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
