const express = require('express');
const router = express.Router();

module.exports = (db, ensureDb) => {
  router.use(ensureDb);

  // 🛠 Helper: Parse string date from fields like "Created"
  const parseStringDate = (str) => {
    if (typeof str === 'string') {
      const match = str.match(/\(([^)]+)\)/); // Extract date inside parentheses
      if (match && match[1]) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed)) {
          console.log('📅 Parsed string date:', match[1], '➡️', parsed);
          return parsed;
        }
      }
    }
    return null;
  };

  // 🛠 Helper: Extract created date from any field
  const extractCaseDate = (c) => {
    return (
      (c.createdAt instanceof Date && c.createdAt) ||
      (c.created instanceof Date && c.created) ||
      parseStringDate(c.created) ||
      parseStringDate(c.Created) ||
      null
    );
  };

  // 🛠 Helper: Map raw statuses to grouped statuses
  const mapStatus = (rawStatus) => {
    const normalized = (rawStatus || "").toLowerCase().trim();
    console.log('📌 Raw status:', rawStatus, '| Normalized:', normalized);

    if (["open", "pending"].includes(normalized)) return "open";
    if (["closed", "resolved"].includes(normalized)) return "close";
    if (["in progress", "pending customer feedback"].includes(normalized)) return "pending";

    console.log('⚠️ Unrecognized or missing status:', rawStatus);
    return "unknown";
  };

  // 🛠 Helper: Increment counts
  const incrementStatusCount = (counts, status) => {
    const groupStatus = mapStatus(status);
    if (counts.hasOwnProperty(groupStatus)) {
      counts[groupStatus]++;
    } else {
      counts.unknown = (counts.unknown || 0) + 1;
    }
  };

  // ✅ Get total count of cases created today, grouped by status
  router.get('/today-count', async (req, res) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const cases = await db.collection('cases').find().toArray();
      console.log('📦 Total cases fetched for today count:', cases.length);

      let counts = { open: 0, close: 0, pending: 0, unknown: 0 };

      cases.forEach(c => {
        const caseDate = extractCaseDate(c);
        const rawStatus = c.status || c.Status || "unknown";

        if (caseDate && caseDate >= startOfDay && caseDate <= endOfDay) {
          incrementStatusCount(counts, rawStatus);
        }
      });

      console.log('✅ Today case counts:', counts);

      res.json({ success: true, counts });
    } catch (err) {
      console.error('❌ Failed to fetch today case counts:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch today case counts' });
    }
  });

  // ✅ Get total count of cases created in the last 30 days, grouped by status
  router.get('/last-30-days-count', async (req, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const cases = await db.collection('cases').find().toArray();
      console.log('📦 Total cases fetched for last 30 days count:', cases.length);

      let counts = { open: 0, close: 0, pending: 0, unknown: 0 };

      cases.forEach(c => {
        const caseDate = extractCaseDate(c);
        const rawStatus = c.status || c.Status || "unknown";

        if (caseDate && caseDate >= thirtyDaysAgo && caseDate <= now) {
          incrementStatusCount(counts, rawStatus);
        }
      });

      console.log('✅ Last 30 days case counts:', counts);

      res.json({ success: true, last30DaysCount: counts });
    } catch (err) {
      console.error('❌ Failed to fetch last 30 days case counts:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch last 30 days case counts' });
    }
  });

  return router;
};
