import { useEffect, useState } from "react";
import fetchAPI from "../utils/api";

export default function MTTDPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetchAPI("/metrics/mttd-mttr");
        setMetrics(res);
      } catch (err) {
        console.error("Failed to fetch MTTD/MTTR:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <p className="p-4">Loading metrics...</p>;
  if (!metrics?.success) return <p className="p-4 text-red-600">Failed to load metrics.</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📊 MTTD & MTTR Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-700">🕒 MTTD</h3>
          <p className="text-3xl text-blue-600">{metrics.mttdHours} hrs</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-700">🛠️ MTTR</h3>
          <p className="text-3xl text-green-600">{metrics.mttrHours} hrs</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-700">📦 Total Cases</h3>
          <p className="text-2xl">{metrics.totalCases}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-700">✅ Closed Cases</h3>
          <p className="text-2xl">{metrics.mttrCount}</p>
        </div>
      </div>
    </div>
  );
}
