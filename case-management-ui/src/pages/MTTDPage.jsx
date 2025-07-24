import { useEffect, useState } from "react";
import fetchAPI from "../utils/api";

export default function MTTDPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const [orgFilter, setOrgFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  const exportCSV = () => {
    const headers = ["Case ID", "Organization", "Summary", "MTTD", "MTTR"];
    const rows = sortedCases.map(c => [
      c.caseId, c.organization, `"${c.summary}"`, c.mttd ?? "N/A", c.mttr ?? "N/A"
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case-metrics.csv";
    a.click();
  };

  const filteredCases = (metrics.caseMetrics || []).filter((c) => {
    if (orgFilter && c.organization !== orgFilter) return false;

    if (startDate || endDate) {
      const createdMatch = c.createdAt?.match(/\((.*?)\)/);
      const createdDate = createdMatch ? new Date(createdMatch[1]) : null;
      if (startDate && createdDate && createdDate < new Date(startDate)) return false;
      if (endDate && createdDate && createdDate > new Date(endDate)) return false;
    }

    return true;
  });

  const sortedCases = [...filteredCases].sort((a, b) => {
    if (!sortBy) return 0;
    const aVal = a[sortBy] ?? 0;
    const bVal = b[sortBy] ?? 0;
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  const uniqueOrgs = [...new Set(metrics.caseMetrics?.map(c => c.organization))];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        📊 MTTD & MTTR Metrics
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">🕒 MTTD</div>
          <div className="text-3xl font-bold text-blue-600">{metrics.mttdHours} hrs</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">🛠️ MTTR</div>
          <div className="text-3xl font-bold text-green-600">{metrics.mttrHours} hrs</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">📦 Total Cases</div>
          <div className="text-2xl font-bold">{metrics.totalCases}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">✅ Closed Cases</div>
          <div className="text-2xl font-bold">{metrics.mttrCount}</div>
        </div>
      </div>

      {/* Filter & Export Controls */}
      <div className="flex flex-wrap gap-4 items-center mb-4">
        <select
          onChange={(e) => setOrgFilter(e.target.value)}
          className="p-2 border rounded"
          defaultValue=""
        >
          <option value="">All Organizations</option>
          {uniqueOrgs.map(org => (
            <option key={org} value={org}>{org}</option>
          ))}
        </select>
        <input
          type="date"
          className="p-2 border rounded"
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="p-2 border rounded"
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button
          onClick={exportCSV}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Table */}
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">📄 Case-wise MTTD & MTTR</h3>
      <div className="overflow-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700 text-xs uppercase">
            <tr>
              <th className="p-4">Case ID</th>
              <th className="p-4">Organization</th>
              <th className="p-4">Summary</th>
              <th
                className="p-4 cursor-pointer"
                onClick={() => {
                  setSortBy("mttd");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}
              >
                MTTD (hrs) {sortBy === "mttd" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
              <th
                className="p-4 cursor-pointer"
                onClick={() => {
                  setSortBy("mttr");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}
              >
                MTTR (hrs) {sortBy === "mttr" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCases.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-400">
                  No case data available.
                </td>
              </tr>
            ) : (
              sortedCases.map((c, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-mono">{c.caseId}</td>
                  <td className="p-4">{c.organization}</td>
                  <td className="p-4">{c.summary.slice(0, 60)}...</td>
                  <td className="p-4 text-blue-600">{c.mttd ?? "N/A"}</td>
                  <td className="p-4 text-green-600">{c.mttr ?? "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
