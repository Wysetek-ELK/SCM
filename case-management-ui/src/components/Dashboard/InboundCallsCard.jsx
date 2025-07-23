import React from "react";

export default function InboundCallsCard() {
  return (
    <div className="card">
      <h2>Inbound Calls Today</h2>
      <p style={{ fontSize: "32px", fontWeight: "bold" }}>596 Total</p>
      <p style={{ fontSize: "18px", color: "#aaa" }}>58 sec Avg. wait time</p>
    </div>
  );
}
