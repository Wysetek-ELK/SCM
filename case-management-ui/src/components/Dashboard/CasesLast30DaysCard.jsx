import React, { useEffect, useState } from "react";
import fetchAPI from "../../utils/api";
import { FiLoader, FiAlertCircle } from "react-icons/fi"; // ✅ react-icons

export default function CasesLast30DaysCard() {
  const [counts, setCounts] = useState({ open: 0, close: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLast30DaysCount = async () => {
      try {
        const res = await fetchAPI("/dashboard/last-30-days-count");
        setCounts({
          open: res.last30DaysCount.open || 0,
          close: res.last30DaysCount.close || 0,
          pending: res.last30DaysCount.pending || 0,
        });
      } catch (err) {
        console.error("❌ Error fetching last 30 days count:", err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchLast30DaysCount();
  }, []);

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-gray-800/60 shadow-lg p-6 backdrop-blur-lg transition-transform hover:-translate-y-1">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
        🚨 Cases 30 Days
      </h3>

      <div className="text-center mb-4">
        <p className="text-4xl font-extrabold text-gray-900 dark:text-white">1</p>
        <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Cases</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="flex flex-col items-center">
          <span className="w-3 h-3 rounded-full bg-green-500 mb-1"></span>
          <p className="text-sm text-gray-700 dark:text-gray-300">Open</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{counts.open}</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="w-3 h-3 rounded-full bg-red-500 mb-1"></span>
          <p className="text-sm text-gray-700 dark:text-gray-300">Closed</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{counts.close}</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="w-3 h-3 rounded-full bg-yellow-400 mb-1"></span>
          <p className="text-sm text-gray-700 dark:text-gray-300">Pending</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{counts.pending}</p>
        </div>
      </div>
    </div>
  );
}
