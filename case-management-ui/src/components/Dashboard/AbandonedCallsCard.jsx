import React from "react";

export default function AbandonedCallsCard() {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 text-center border-t-4 border-red-600">
      <h2 className="text-xl font-bold text-blue-600 mb-3">
        📦 Abandoned Today
      </h2>
      <p className="text-4xl font-extrabold text-red-600">29</p>
      <p className="text-sm text-gray-500 mt-1">
        4.9% Abandonment rate
      </p>
    </div>
  );
}
