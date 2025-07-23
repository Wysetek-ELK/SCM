const express = require('express');
const router = express.Router();

// ✅ Health Check
router.get('/ping', (req, res) => {
  res.json({ status: '🏓 Pong - Backend is alive!' });
});

module.exports = router;
