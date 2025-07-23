import React from "react";

const resolvers = [
  { name: "Tom B", calls: 63 },
  { name: "Ella P", calls: 58 },
  { name: "Mark D", calls: 56 },
  { name: "Gabby T", calls: 54 },
  { name: "Jason B", calls: 48 },
  { name: "Trey B", calls: 44 },
];

export default function TopResolversCard() {
  return (
    <div className="card">
      <h2>Most Calls Resolved</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {resolvers.map((resolver, idx) => (
          <li key={idx} style={{ marginBottom: "5px" }}>
            {resolver.name}: {resolver.calls}
          </li>
        ))}
      </ul>
    </div>
  );
}
