import React from "react";

export default function CallMetricsCard() {
  return (
    <div className="card">
      <h2>Call Metrics</h2>
      <p style={{ fontSize: "24px", fontWeight: "bold" }}>4 min Avg. call time</p>
      <p style={{ color: "red" }}>▲ 8.1% vs yesterday</p>
      <p style={{ fontSize: "18px", marginTop: "10px" }}>75% Calls Resolved</p>
    </div>
  );
}
