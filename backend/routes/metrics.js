const router = require("express").Router();

module.exports = (db) => {
  router.get("/mttd-mttr", async (req, res) => {
    try {
      const cases = await db.collection("cases").find().toArray();

      let totalMTTD = 0;
      let totalMTTR = 0;
      let mttdCount = 0;
      let mttrCount = 0;

      for (const c of cases) {
        // Parse Created time from formatted string
        const createdMatch = c.Created?.match(/\((.*?)\)/);
        const createdAt = createdMatch ? new Date(createdMatch[1]) : null;

        // Parse Incident time
        const incidentTimeRaw = c.Incidents?.[0]?.Timestamp || "";
        const incidentTime = new Date(incidentTimeRaw);

        // MTTD
        if (createdAt && !isNaN(incidentTime)) {
          const diff = createdAt - incidentTime;
          if (diff > 0) {
            totalMTTD += diff;
            mttdCount++;
          }
        }

        // MTTR
        if (createdAt && c.ClosedTime) {
          const closedTime = new Date(c.ClosedTime);
          const diff = closedTime - createdAt;
          if (diff > 0) {
            totalMTTR += diff;
            mttrCount++;
          }
        }
      }

      res.json({
        success: true,
        mttdHours: mttdCount ? +(totalMTTD / mttdCount / 1000 / 60 / 60).toFixed(2) : 0,
        mttrHours: mttrCount ? +(totalMTTR / mttrCount / 1000 / 60 / 60).toFixed(2) : 0,
        totalCases: cases.length,
        mttdCount,
        mttrCount,
      });
    } catch (err) {
      console.error("❌ Error calculating metrics:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  return router;
};
