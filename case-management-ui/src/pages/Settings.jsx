import { useState, useEffect } from "react";
import fetchAPI from "../utils/api";

export default function Settings() {
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "" });
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
    useTLS: true,
  });
  const [dbConfig, setDbConfig] = useState({
    host: "",
    port: 27017,
    dbName: "",
    username: "",
    password: "",
  });
  const [dbStatus, setDbStatus] = useState("");
  const [isEditingDb, setIsEditingDb] = useState(false);
  const [openSection, setOpenSection] = useState("db");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const customersRes = await fetchAPI("/customers");
        setCustomers(customersRes);

        const smtpRes = await fetchAPI("/smtp");
        if (smtpRes) setSmtpConfig(smtpRes);

        const dbRes = await fetchAPI("/db/load-config");
        if (dbRes.success && dbRes.config) {
          setDbConfig(dbRes.config);
          setIsEditingDb(false);
        } else {
          setIsEditingDb(true);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };

    fetchSettings();
  }, []);

  const toggleSection = (section) =>
    setOpenSection(openSection === section ? null : section);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.email) return;
    try {
      await fetchAPI("/customers", {
        method: "POST",
        body: JSON.stringify(newCustomer),
      });
      setCustomers([...customers, newCustomer]);
      setNewCustomer({ name: "", email: "" });
    } catch (err) {
      console.error("Failed to add customer:", err);
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await fetchAPI(`/customers/${id}`, { method: "DELETE" });
      setCustomers(customers.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Failed to delete customer:", err);
    }
  };

  const handleSmtpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSmtpConfig({ ...smtpConfig, [name]: type === "checkbox" ? checked : value });
  };

  const handleSaveSmtp = async () => {
    try {
      await fetchAPI("/smtp", {
        method: "POST",
        body: JSON.stringify(smtpConfig),
      });
      alert("✅ SMTP configuration saved!");
    } catch (err) {
      console.error("Failed to save SMTP config:", err);
      alert("❌ Failed to save SMTP configuration.");
    }
  };

  const handleDbChange = (e) => {
    const { name, value } = e.target;
    setDbConfig({ ...dbConfig, [name]: value });
  };

  const handleTestDb = async () => {
    setDbStatus("🔄 Testing connection...");
    try {
      const result = await fetchAPI("/db/test-connection", {
        method: "POST",
        body: JSON.stringify(dbConfig),
      });
      setDbStatus(result.success ? "✅ Connected successfully!" : `❌ Failed: ${result.message}`);
    } catch (err) {
      console.error("DB Test failed:", err);
      setDbStatus(`❌ Error: ${err.message}`);
    }
  };

  const handleSaveDb = async () => {
    try {
      await fetchAPI("/db/save-config", {
        method: "POST",
        body: JSON.stringify(dbConfig),
      });
      alert("✅ DB configuration saved!");
      setIsEditingDb(false);
    } catch (err) {
      console.error("Failed to save DB config:", err);
      alert("❌ Failed to save DB configuration.");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">⚙️ Settings</h2>

      {/* 🗄 Database Configuration */}
      <div className="rounded-lg shadow bg-white">
        <div
          onClick={() => toggleSection("db")}
          className="cursor-pointer p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-t-lg"
        >
          <span className="font-semibold text-lg">🗄 Database Configuration</span>
          <span>{openSection === "db" ? "▲" : "▼"}</span>
        </div>
        {openSection === "db" && (
          <div className="p-6 space-y-4">
            {["host", "port", "dbName", "username", "password"].map((field) => (
              <div key={field}>
                <label className="block mb-1 font-medium capitalize">{field}</label>
                <input
                  type={field === "password" ? "password" : "text"}
                  name={field}
                  value={dbConfig[field]}
                  onChange={handleDbChange}
                  disabled={!isEditingDb}
                  className={`w-full p-2 border rounded-lg ${
                    !isEditingDb ? "bg-gray-100" : ""
                  }`}
                />
              </div>
            ))}
            <div className="flex gap-3">
              {isEditingDb ? (
                <>
                  <button
                    onClick={handleTestDb}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Test
                  </button>
                  <button
                    onClick={handleSaveDb}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingDb(true)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Edit
                </button>
              )}
            </div>
            {dbStatus && <p className="text-sm text-gray-600">{dbStatus}</p>}
          </div>
        )}
      </div>

      {/* 📧 Email Settings */}
      <div className="rounded-lg shadow bg-white">
        <div
          onClick={() => toggleSection("email")}
          className="cursor-pointer p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-t-lg"
        >
          <span className="font-semibold text-lg">📧 Email (SMTP) Settings</span>
          <span>{openSection === "email" ? "▲" : "▼"}</span>
        </div>
        {openSection === "email" && (
          <div className="p-6 space-y-4">
            {["host", "port", "username", "password"].map((field) => (
              <div key={field}>
                <label className="block mb-1 font-medium capitalize">{field}</label>
                <input
                  type={field === "password" ? "password" : "text"}
                  name={field}
                  value={smtpConfig[field]}
                  onChange={handleSmtpChange}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="useTLS"
                checked={smtpConfig.useTLS}
                onChange={handleSmtpChange}
              />
              <label className="font-medium">Use TLS/SSL</label>
            </div>
            <button
              onClick={handleSaveSmtp}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save SMTP Config
            </button>
          </div>
        )}
      </div>

      {/* 👥 Customer Management */}
      <div className="rounded-lg shadow bg-white">
        <div
          onClick={() => toggleSection("customers")}
          className="cursor-pointer p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-t-lg"
        >
          <span className="font-semibold text-lg">👥 Customer Management</span>
          <span>{openSection === "customers" ? "▲" : "▼"}</span>
        </div>
        {openSection === "customers" && (
          <div className="p-6 space-y-4">
            <form onSubmit={handleAddCustomer} className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Customer Name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="p-2 border rounded-lg flex-1"
              />
              <input
                type="email"
                placeholder="Customer Email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className="p-2 border rounded-lg flex-1"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </form>
            <ul className="divide-y divide-gray-200">
              {customers.map((c) => (
                <li key={c._id} className="flex justify-between py-2">
                  <span>{c.name} - {c.email}</span>
                  <button
                    onClick={() => handleDeleteCustomer(c._id)}
                    className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 🔒 Authentication (Coming Soon) */}
      <div className="rounded-lg shadow bg-white">
        <div
          onClick={() => toggleSection("auth")}
          className="cursor-pointer p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-t-lg"
        >
          <span className="font-semibold text-lg">🔒 Authentication</span>
          <span>{openSection === "auth" ? "▲" : "▼"}</span>
        </div>
        {openSection === "auth" && (
          <div className="p-6 text-gray-600">
            LDAP / SSO authentication settings will appear here soon.
          </div>
        )}
      </div>
    </div>
  );
}
