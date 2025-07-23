import { useState, useEffect } from "react";
import fetchAPI from "../../utils/api";

export default function EmailSettings() {
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
    useTLS: true,
  });

  const [imapConfig, setImapConfig] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
    useTLS: true,
    checkInterval: 60000,
  });

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const smtpRes = await fetchAPI("/smtp");
        if (smtpRes) setSmtpConfig(smtpRes);

        const imapRes = await fetchAPI("/imap");
        if (imapRes) setImapConfig(imapRes);
      } catch (err) {
        console.error("❌ Failed to load email configs:", err);
      }
    };
    loadConfigs();
  }, []);

  const handleSmtpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSmtpConfig({ ...smtpConfig, [name]: type === "checkbox" ? checked : value });
  };

  const handleImapChange = (e) => {
    const { name, value, type, checked } = e.target;
    setImapConfig({ ...imapConfig, [name]: type === "checkbox" ? checked : value });
  };

  const handleSaveSmtp = async () => {
    try {
      await fetchAPI("/smtp", {
        method: "POST",
        body: JSON.stringify(smtpConfig),
      });
      alert("✅ SMTP configuration saved!");
    } catch (err) {
      alert("❌ Failed to save SMTP configuration.");
    }
  };

  const handleSaveImap = async () => {
    try {
      await fetchAPI("/imap", {
        method: "POST",
        body: JSON.stringify(imapConfig),
      });
      alert("✅ IMAP configuration saved!");
    } catch (err) {
      alert("❌ Failed to save IMAP configuration.");
    }
  };

  const handleTestSmtp = async () => {
    try {
      const result = await fetchAPI("/smtp/test", {
        method: "POST",
        body: JSON.stringify(smtpConfig),
      });
      alert(result.success ? "✅ SMTP test successful!" : result.message);
    } catch (err) {
      alert("❌ Failed to test SMTP configuration.");
    }
  };

  const handleTestImap = async () => {
    try {
      const result = await fetchAPI("/imap/test", {
        method: "POST",
        body: JSON.stringify(imapConfig),
      });
      alert(result.success ? "✅ IMAP test successful!" : result.message);
    } catch (err) {
      alert("❌ Failed to test IMAP configuration.");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">📧 Email (SMTP) Settings</h3>
      {["host", "port", "username", "password"].map((field) => (
        <div key={field} className="mb-3">
          <label className="block mb-1 capitalize">{field}</label>
          <input
            type={field === "password" ? "password" : "text"}
            name={field}
            value={smtpConfig[field]}
            onChange={handleSmtpChange}
            className="w-full p-2 border rounded"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          name="useTLS"
          checked={smtpConfig.useTLS}
          onChange={handleSmtpChange}
        />
        <label className="font-medium">Use TLS/SSL</label>
      </div>
      <div className="flex gap-3 mb-8">
        <button onClick={handleTestSmtp} className="px-4 py-2 bg-green-600 text-white rounded">
          Test SMTP
        </button>
        <button onClick={handleSaveSmtp} className="px-4 py-2 bg-blue-600 text-white rounded">
          Save SMTP
        </button>
      </div>

      <h3 className="text-xl font-semibold mb-4">📥 Email (IMAP) Settings</h3>
      {["host", "port", "username", "password", "checkInterval"].map((field) => (
        <div key={field} className="mb-3">
          <label className="block mb-1 capitalize">{field}</label>
          <input
            type={field === "password" ? "password" : "text"}
            name={field}
            value={imapConfig[field]}
            onChange={handleImapChange}
            className="w-full p-2 border rounded"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          name="useTLS"
          checked={imapConfig.useTLS}
          onChange={handleImapChange}
        />
        <label className="font-medium">Use TLS/SSL</label>
      </div>
      <div className="flex gap-3">
        <button onClick={handleTestImap} className="px-4 py-2 bg-green-600 text-white rounded">
          Test IMAP
        </button>
        <button onClick={handleSaveImap} className="px-4 py-2 bg-blue-600 text-white rounded">
          Save IMAP
        </button>
      </div>
    </div>
  );
}
