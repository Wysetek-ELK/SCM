import React from "react";
import { FaExclamationCircle } from "react-icons/fa";

export default function QueueCard() {
  return (
    <div className="card" style={{ border: "2px solid #e53935" }}>
      <h2>Queue</h2>
      <p style={{ fontSize: "32px", fontWeight: "bold" }}>26 Calls waiting</p>
      <FaExclamationCircle color="#e53935" size={24} />
    </div>
  );
}
