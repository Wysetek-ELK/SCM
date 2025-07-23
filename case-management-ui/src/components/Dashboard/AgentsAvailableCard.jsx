import React from "react";

const agents = [
  { name: "Mark D", status: "available" },
  { name: "Pippa M", status: "engaged" },
  { name: "Russ N", status: "engaged" },
  { name: "Elif T", status: "engaged" },
  { name: "Jason B", status: "available" },
  { name: "Ella P", status: "offline" },
  { name: "Tom B", status: "offline" },
  { name: "Christine S", status: "engaged" },
  { name: "Trey B", status: "engaged" },
  { name: "Gabby T", status: "engaged" },
];

export default function AgentsAvailableCard() {
  return (
    <div className="card">
      <h2>Agents Available</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {agents.map((agent, idx) => (
          <li key={idx}>
            {agent.name} - <span style={{
              color: agent.status === "available" ? "green" :
                    agent.status === "engaged" ? "orange" : "gray"
            }}>{agent.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
