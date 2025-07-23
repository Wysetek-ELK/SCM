import { useState, useEffect } from "react";
import fetchAPI from "../../utils/api";

export default function DbSettings() {
  const [dbConfig, setDbConfig] = useState({
    host: "",
    port: 27017,
    dbName: "",
    username: "",
    password: "",
  });
  const [dbStatus, setDbStatus] = useState("");
  const [isEditingDb, setIsEditingDb] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDbConfig = async () => {
      try {
        const res = await fetchAPI("/db/load-config");
        if (res && res.host) {
          setDbConfig(res);
          setIsEditingDb(false);
        } else {
          setIsEditingDb(true);
        }
      } catch (err) {
        console.error("❌ Failed to load DB config:", err);
        setIsEditingDb(true);
      }
    };
    loadDbConfig();
  }, []);

  const handleDbChange = (e) => {
    const { name, value } = e.target;
    setDbConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleTestDb = async () => {
    setDbStatus("🔄 Testing connection...");
    setLoading(true);
    try {
      const result = await fetchAPI("/db/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      setDbStatus(result.success ? "✅ Connected successfully!" : `❌ Failed: ${result.message}`);
    } catch (err) {
      console.error(err);
      setDbStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDb = async () => {
    setLoading(true);
    try {
      await fetchAPI("/db/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      alert("✅ DB configuration saved!");
      setIsEditingDb(false);
      setDbStatus(""); // Clear old status
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save DB configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditingDb(true);
    setDbStatus(""); // Clear any previous test results
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">🗄 Database Configuration</h3>
      {["host", "port", "dbName", "username", "password"].map((field) => (
        <div key={field} className="mb-3">
          <label className="block mb-1 capitalize">{field}</label>
          <input
            type={field === "password" ? "password" : "text"}
            name={field}
            value={dbConfig[field]}
            onChange={handleDbChange}
            disabled={!isEditingDb}
            className={`w-full p-2 border rounded ${!isEditingDb ? "bg-gray-100" : ""}`}
          />
        </div>
      ))}
      <div className="flex gap-3 mt-3">
        {isEditingDb ? (
          <>
            <button
              onClick={handleTestDb}
              disabled={loading}
              className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
            >
              {loading ? "Testing..." : "Test"}
            </button>
            <button
              onClick={handleSaveDb}
              disabled={loading}
              className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </>
        ) : (
          <button
            onClick={handleEditClick}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
          >
            Edit
          </button>
        )}
      </div>
      {dbStatus && (
        <p className="mt-2 text-sm font-medium text-gray-700">{dbStatus}</p>
      )}
    </div>
  );
}
