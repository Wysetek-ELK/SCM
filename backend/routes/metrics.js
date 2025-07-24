const router = require("express").Router();

module.exports = (db) => {
  router.get("/mttd-mttr", async (req, res) => {
    try {
      const cases = await db.collection("cases").find().toArray();

      let totalMTTD = 0;
      let totalMTTR = 0;
      let mttdCount = 0;
      let mttrCount = 0;

      const caseMetrics = [];

      for (const c of cases) {
        const createdMatch = c.Created?.match(/\((.*?)\)/);
        const createdAt = createdMatch ? new Date(createdMatch[1]) : null;

        const incidentTimeRaw = c.Incidents?.[0]?.Timestamp || "";
        const incidentTime = new Date(incidentTimeRaw);

        const closedTime = c.ClosedTime ? new Date(c.ClosedTime) : null;

        let caseMTTD = null;
        let caseMTTR = null;

        if (createdAt && !isNaN(incidentTime)) {
          const diff = createdAt - incidentTime;
          if (diff > 0) {
            caseMTTD = +(diff / 1000 / 60 / 60).toFixed(2);
            totalMTTD += diff;
            mttdCount++;
          }
        }

        if (createdAt && closedTime && !isNaN(closedTime)) {
          const diff = closedTime - createdAt;
          if (diff > 0) {
            caseMTTR = +(diff / 1000 / 60 / 60).toFixed(2);
            totalMTTR += diff;
            mttrCount++;
          }
        }

        caseMetrics.push({
          caseId: c["Case ID"] || "N/A",
          organization: c.Organization || "Unknown",
          summary: c.Summary || "-",
          mttd: caseMTTD,
          mttr: caseMTTR,
        });
      }

      res.json({
        success: true,
        mttdHours: mttdCount ? +(totalMTTD / mttdCount / 1000 / 60 / 60).toFixed(2) : 0,
        mttrHours: mttrCount ? +(totalMTTR / mttrCount / 1000 / 60 / 60).toFixed(2) : 0,
        totalCases: cases.length,
        mttdCount,
        mttrCount,
        caseMetrics, // ✅ This was missing in your original output
      });
    } catch (err) {
      console.error("❌ Error calculating metrics:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  return router;
};
