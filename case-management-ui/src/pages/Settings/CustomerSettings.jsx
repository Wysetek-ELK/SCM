import { useState, useEffect } from "react";
import fetchAPI from "../../utils/api";

export default function CustomerSettings() {
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", emails: [""] });
  const [loading, setLoading] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editedCustomer, setEditedCustomer] = useState({ name: "", emails: [""] });
  const [showLdapModal, setShowLdapModal] = useState(false);
  const [scannedLdapUsers, setScannedLdapUsers] = useState([]);
  const [status, setStatus] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);


  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await fetchAPI("/customers");
        setCustomers(res);
      } catch (err) {
        console.error("❌ Failed to load customers:", err);
      }
    };
    loadCustomers();
  }, []);

  const handleLdapScan = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI("/ldap-scan/sync?source=customer", { method: "POST" });

      if (res.success) {
        setScannedLdapUsers(res.users || []);
        setShowLdapModal(true);
        setStatus({ type: "success", message: "LDAP users synced successfully" });
      } else {
        setStatus({ type: "error", message: res.message || "Failed to scan LDAP users" });
      }
    } catch (err) {
      console.error("❌ LDAP Scan Error:", err);
      setStatus({ type: "error", message: "Error occurred while scanning LDAP" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name || newCustomer.emails.some((email) => !email))
      return alert("⚠️ Name & at least one valid Email required");
    setLoading(true);
    try {
      const res = await fetchAPI("/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      setCustomers([...customers, { ...newCustomer, _id: res.id }]);
      setNewCustomer({ name: "", emails: [""] });
    } catch (err) {
      alert("❌ Failed to add customer.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await fetchAPI(`/customers/${id}`, { method: "DELETE" });
      setCustomers(customers.filter((c) => c._id !== id));
    } catch (err) {
      alert("❌ Failed to delete customer.");
      console.error(err);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomerId(customer._id);
    setEditedCustomer({ name: customer.name, emails: [...customer.emails] });
  };

  const handleSaveEdit = async (id) => {
    if (!editedCustomer.name || editedCustomer.emails.some((email) => !email))
      return alert("⚠️ Name & at least one valid Email required");

    try {
      await fetchAPI(`/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedCustomer),
      });
      setCustomers(customers.map((c) => (c._id === id ? { ...c, ...editedCustomer } : c)));
      setEditingCustomerId(null);
    } catch (err) {
      alert("❌ Failed to update customer.");
      console.error(err);
    }
  };

  const handleImportCustomers = async () => {
    if (selectedCustomers.length === 0) {
      return alert("Please select customers to import");
    }

    const transformed = selectedCustomers.map((u) => ({
      name: u.sAMAccountName,
      email: u.mail,
      fullName: u.cn,
    }));

    // ✅ Log the full transformed payload being sent
    console.log("📦 LDAP Customer Import Preview:\n", JSON.stringify(transformed, null, 2));

    try {
      const res = await fetchAPI("/ldap-scan/import?source=customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: transformed, source: "customer" }), // ✅ Sending here
      });

      if (res.success) {
        alert(`✅ Imported ${res.insertedCount} customers.`);
        setSelectedCustomers([]);
        setShowLdapModal(false);
      } else {
        alert("❌ Failed to import customers");
      }
    } catch (err) {
      console.error("❌ Import error:", err);
      alert("Error importing customers.");
    }
  };


  const handleCancelEdit = () => {
    setEditingCustomerId(null);
  };

  const handleEmailChange = (index, value, type = "new") => {
    const target = type === "new" ? [...newCustomer.emails] : [...editedCustomer.emails];
    target[index] = value;
    if (type === "new") {
      setNewCustomer({ ...newCustomer, emails: target });
    } else {
      setEditedCustomer({ ...editedCustomer, emails: target });
    }
  };

  const addEmailField = (type = "new") => {
    if (type === "new") {
      setNewCustomer({ ...newCustomer, emails: [...newCustomer.emails, ""] });
    } else {
      setEditedCustomer({ ...editedCustomer, emails: [...editedCustomer.emails, ""] });
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">👥 Customer Management</h3>

      {status && (
        <p className={`p-2 mb-4 rounded ${status.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {status.message}
        </p>
      )}

      {/* LDAP Scan Button */}
      <button
        onClick={handleLdapScan}
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        🔍 LDAP Scan
      </button>

      {/* Add Customer Form */}
      <form onSubmit={handleAddCustomer} className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          placeholder="Customer Name"
          value={newCustomer.name}
          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
          className="p-2 border rounded w-full"
        />
        {newCustomer.emails.map((email, idx) => (
          <input
            key={idx}
            type="email"
            placeholder={`Email ${idx + 1}`}
            value={email}
            onChange={(e) => handleEmailChange(idx, e.target.value, "new")}
            className="p-2 border rounded w-full"
          />
        ))}
        <button
          type="button"
          onClick={() => addEmailField("new")}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          + Add Email
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>

      {/* LDAP Modal */}
      {showLdapModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-20">
              <h2 className="text-lg font-semibold text-gray-800">
                🔍 LDAP Users Scan Results
              </h2>
              <button
                onClick={() => setShowLdapModal(false)}
                className="text-gray-500 hover:text-red-600 text-xl"
                title="Close"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              <table className="min-w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr>
                    <th className="px-4 py-2 border text-left font-medium text-gray-700">Username</th>
                    <th className="px-4 py-2 border text-left font-medium text-gray-700">Full Name</th>
                    <th className="px-4 py-2 border text-left font-medium text-gray-700">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {scannedLdapUsers.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-4 py-6 text-center text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    scannedLdapUsers.map((user, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.some((u) => u.sAMAccountName === user.sAMAccountName)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomers([...selectedCustomers, user]);
                              } else {
                                setSelectedCustomers(selectedCustomers.filter((u) => u.sAMAccountName !== user.sAMAccountName));
                              }
                            }}
                          />
                          <span className="ml-2">{user.sAMAccountName}</span>
                        </td>
                        <td className="px-4 py-2 border">{user.cn}</td>
                        <td className="px-4 py-2 border">{user.mail}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t bg-white text-right flex justify-between items-center">
              <span className="text-sm text-gray-600">{scannedLdapUsers.length} users scanned</span>
              <div className="flex gap-2">
                <button
                  onClick={handleImportCustomers}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Import to DB
                </button>
                <button
                  onClick={() => setShowLdapModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customers List */}
      {customers.length === 0 ? (
        <p>No customers yet.</p>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li
              key={c._id}
              className="p-3 bg-white border rounded shadow flex flex-col md:flex-row justify-between items-start md:items-center"
            >
              {editingCustomerId === c._id ? (
                <div className="w-full">
                  <input
                    type="text"
                    value={editedCustomer.name}
                    onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
                    className="p-2 border rounded w-full mb-2"
                  />
                  {editedCustomer.emails.map((email, idx) => (
                    <input
                      key={idx}
                      type="email"
                      placeholder={`Email ${idx + 1}`}
                      value={email}
                      onChange={(e) => handleEmailChange(idx, e.target.value, "edit")}
                      className="p-2 border rounded w-full mb-2"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => addEmailField("edit")}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 mb-2"
                  >
                    + Add Email
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(c._id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-gray-700">{Array.isArray(c.emails) ? c.emails.join(", ") : c.emails || "-"}</p>
                </div>
              )}
              {editingCustomerId !== c._id && (
                <div className="flex gap-2 mt-2 md:mt-0">
                  <button
                    onClick={() => handleEditCustomer(c)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(c._id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
