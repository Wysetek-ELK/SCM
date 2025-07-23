import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { day: "M", csat: 90 },
  { day: "T", csat: 85 },
  { day: "W", csat: 88 },
  { day: "T", csat: 91 },
  { day: "F", csat: 92 },
  { day: "S", csat: 86 },
  { day: "S", csat: 89 },
];

export default function CSAT7DaysChart() {
  return (
    <div className="card">
      <h2>CSAT (Past 7 Days)</h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="day" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="csat" fill="#4cafef" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
