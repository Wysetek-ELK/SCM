const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const router = express.Router();
const SMTP_FILE = path.join(__dirname, '..', 'smtpConfig.json');

// ✅ Utility: Load SMTP Config Safely
function loadSmtpConfig() {
  if (!fs.existsSync(SMTP_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(SMTP_FILE, 'utf-8'));
  } catch (err) {
    console.error('❌ Invalid SMTP config JSON:', err.message);
    return null; // Return null if corrupted
  }
}

// ✅ GET saved SMTP config
router.get('/', (req, res) => {
  const smtpConfig = loadSmtpConfig();
  if (smtpConfig) {
    res.json(smtpConfig);
  } else {
    res.status(404).json({ message: 'No valid SMTP configuration found.' });
  }
});

// ✅ POST save SMTP config
router.post('/', (req, res) => {
  try {
    // Include replyTo if provided, fallback to empty string
    const configToSave = {
      host: req.body.host,
      port: req.body.port,
      username: req.body.username,
      password: req.body.password,
      useTLS: req.body.useTLS,
      replyTo: req.body.replyTo || "" // 👈 Added Reply-To support
    };

    fs.writeFileSync(SMTP_FILE, JSON.stringify(configToSave, null, 2));
    console.log('✅ SMTP configuration saved!');
    res.json({ success: true, message: 'SMTP configuration saved!' });
  } catch (err) {
    console.error('❌ Failed to save SMTP config:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ POST test SMTP connection
router.post('/test', async (req, res) => {
  const { host, port, username, password, useTLS } = req.body;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: useTLS || port === 465, // SSL for port 465
    auth: { user: username, pass: password },
    tls: { rejectUnauthorized: false }, // allow self-signed for testing
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Test successful!');
    res.json({ success: true, message: '✅ SMTP Test successful!' });
  } catch (err) {
    console.error('❌ SMTP Test failed:', err.message);
    res.status(500).json({ success: false, message: `❌ SMTP Test failed: ${err.message}` });
  }
});

// ✅ POST send email
router.post('/send', async (req, res) => {
  const { to, subject, html, replyTo } = req.body; // 👈 Include replyTo from frontend

  // 🔥 Validate fields
  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, message: 'Missing required fields: to, subject, html' });
  }

  // 🔥 Limit email body size (50KB)
  if (Buffer.byteLength(html, 'utf-8') > 50 * 1024) {
    console.warn('⚠️ Email body too large.');
    return res.status(400).json({ success: false, message: 'Email body exceeds 50KB limit.' });
  }

  const smtpConfig = loadSmtpConfig();
  if (!smtpConfig) {
    return res.status(500).json({ success: false, message: 'SMTP configuration not found or invalid.' });
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.useTLS || smtpConfig.port === 465, // SSL for port 465
    auth: {
      user: smtpConfig.username,
      pass: smtpConfig.password,
    },
    tls: {
      rejectUnauthorized: false, // allow self-signed certs
    },
  });

  const mailOptions = {
    from: `"SOC Team" <${smtpConfig.username}>`,
    replyTo: replyTo || smtpConfig.replyTo || smtpConfig.username, // 👈 Use frontend Reply-To first
    to,
    subject,
    html,
  };

  console.log('📧 Sending email to:', to);
  console.log('📧 Reply-To being used:', mailOptions.replyTo);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    res.json({ success: true, message: '✅ Email sent successfully!', messageId: info.messageId });
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    res.status(500).json({ success: false, message: `❌ Failed to send email: ${err.message}` });
  }
});

module.exports = router;
