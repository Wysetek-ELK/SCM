import { useState, useEffect } from "react";
import fetchAPI from "../../utils/api";

export default function CustomerSettings() {
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", emails: [""] });
  const [loading, setLoading] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editedCustomer, setEditedCustomer] = useState({ name: "", emails: [""] });

  // 🟢 Load all customers
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

  // 🟢 Add a new customer
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

  // 🟢 Delete a customer
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

  // 🟢 Edit a customer
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
                  <p className="text-sm text-gray-700">
                    {c.emails && c.emails.join(", ")}
                  </p>
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
