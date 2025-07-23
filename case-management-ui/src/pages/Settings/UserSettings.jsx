import React, { useState, useEffect } from 'react';
import fetchAPI from '../../utils/api';
import Button from "../../components/ui/Button";

export default function UserSettings() {
  const [ldapUsers, setLdapUsers] = useState([]);
  const [localUsers, setLocalUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isWysehawk, setIsWysehawk] = useState(false);
  const [allCustomerChecked, setAllCustomerChecked] = useState(false);
  const [allCustomerRole, setAllCustomerRole] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showLdapModal, setShowLdapModal] = useState(false);
  const [scannedLdapUsers, setScannedLdapUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const ldapRes = await fetchAPI('/users/ldap');
      const localRes = await fetchAPI('/users/local');
      const roleRes = await fetchAPI('/roles');
      const customerRes = await fetchAPI('/customers');

      setLdapUsers(ldapRes.users || []);
      setLocalUsers(localRes.users || []);
      setRoles(roleRes.roles || []);
      setCustomers(customerRes || []);
      setStatus(null);
    } catch (err) {
      console.error('❌ Failed to load data:', err);
      setStatus({ type: 'error', message: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleLdapScan = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI('/ldap-scan/sync', { method: 'POST' });

      if (res.success) {
        setScannedLdapUsers(res.users || []);
        setShowLdapModal(true);
        setStatus({ type: 'success', message: 'LDAP users synced successfully' });
      } else {
        setStatus({ type: 'error', message: res.message || 'Failed to scan LDAP users' });
      }
    } catch (err) {
      console.error('❌ LDAP Scan Error:', err);
      setStatus({ type: 'error', message: 'Error occurred while scanning LDAP' });
    } finally {
      setLoading(false);
    }
  };

  const importScannedLdapUsers = async () => {
    if (scannedLdapUsers.length === 0) {
      setStatus({ type: 'error', message: 'No scanned users to import.' });
      return;
    }

    try {
      setLoading(true);
      const res = await fetchAPI('/ldap-scan/import', {
        method: 'POST',
        body: JSON.stringify({
          users: scannedLdapUsers,
          source: 'user'            // ✅ This is required
        }),
      });

      if (res.success) {
        setStatus({ type: 'success', message: res.message || 'Users imported successfully' });
        setShowLdapModal(false);
        loadUsers();
      } else {
        setStatus({ type: 'error', message: res.message || 'Failed to import users' });
      }
    } catch (err) {
      console.error('❌ Error importing users:', err);
      setStatus({ type: 'error', message: 'Error occurred while importing LDAP users' });
    } finally {
      setLoading(false);
    }
  };



  const handleCreateUser = async (e) => {
    e.preventDefault();
    const form = e.target;

    const username = form.username?.value?.trim() || '';
    const password = form.password?.value || '';
    const email = form.email?.value?.trim();
    const isWH = form.wysehawk?.checked;
    const isAllCustomerChecked = form.allCustomer?.checked;
    const selectedAllRole = form.allCustomerRole ? form.allCustomerRole.value : '';

    const data = { username };

    if (password && password.trim() !== '') {
      data.password = password;
    }

    if (!editingUser || (editingUser && editingUser.username !== 'admin')) {
      data.email = email;
    }

    if (!isWH) {
      data.wysehawk_Role = false;
    } else {
      data.wysehawk_Role = true;

      if (isAllCustomerChecked) {
        if (!selectedAllRole) {
          alert('Please select a role for All Customers or unselect Wysehawk Role');
          return;
        }

        const selectedCustomers = customers.map((customer) => {
          const enabled = form[`enable_${customer._id}`]?.checked;
          return {
            Enabled: enabled ? 'True' : 'False',
            Customer: customer.name,
            Role: selectedAllRole,
          };
        });

        data.allCustomer = selectedCustomers;
        data.allCustomerMode = true;
        data.allCustomerRole = selectedAllRole;
      } else {
        const selectedCustomers = [];

        customers.forEach((customer) => {
          const enabled = form[`enable_${customer._id}`]?.checked;
          const role = form[`role_${customer._id}`]?.value;
          selectedCustomers.push({
            Enabled: enabled ? 'True' : 'False',
            Customer: customer.name,
            Role: role || '',
          });
        });

        data.allCustomer = selectedCustomers;
        data.allCustomerMode = false;
        data.allCustomerRole = null;
      }
    }

    try {
      const url = editingUser ? `/users/${editingUser._id}` : '/users/create';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetchAPI(url, {
        method,
        body: JSON.stringify(data),
      });

      if (res.success) {
        setStatus({ type: 'success', message: res.message });
        form.reset();
        setIsWysehawk(false);
        setAllCustomerChecked(false);
        setAllCustomerRole('');
        setEditingUser(null);
        setShowModal(false);
        loadUsers();
      } else {
        setStatus({ type: 'error', message: res.message });
      }
    } catch (err) {
      console.error('❌ Error saving user:', err);
      setStatus({ type: 'error', message: 'Failed to save user' });
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    try {
      const res = await fetchAPI(`/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setStatus({ type: 'success', message: 'User deleted successfully.' });
        loadUsers();
      } else {
        setStatus({ type: 'error', message: res.message || 'Failed to delete user.' });
      }
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      setStatus({ type: 'error', message: 'Failed to delete user.' });
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const isAllSelectableUsersSelected = () => {
    const allUsers = [...localUsers, ...ldapUsers]
      .filter((u) => u.username !== 'admin')
      .map((u) => u._id);
    return allUsers.every((id) => selectedUsers.includes(id));
  };

  const toggleSelectAll = () => {
    const allUsers = [...localUsers, ...ldapUsers]
      .filter((u) => u.username !== 'admin')
      .map((u) => u._id);
    if (isAllSelectableUsersSelected()) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(allUsers);
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete selected users?");
    if (!confirmed || selectedUsers.length === 0) return;

    try {
      const res = await fetchAPI('/users/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (res.success) {
        setStatus({ type: 'success', message: 'Selected users deleted successfully.' });
        setSelectedUsers([]);
        loadUsers();
      } else {
        setStatus({ type: 'error', message: res.message || 'Failed to delete users.' });
      }
    } catch (err) {
      console.error('❌ Bulk delete error:', err);
      setStatus({ type: 'error', message: 'Failed to delete selected users.' });
    }
  };

  const prepareEditForm = (user) => {
    setEditingUser(user);
    setShowModal(true);
    setIsWysehawk(!!user.wysehawk_Role);
    setAllCustomerChecked(!!user.allCustomerMode);
    setAllCustomerRole(user.allCustomerMode ? (user.allCustomer[0]?.Role || '') : '');
  };

  const isDisabled = selectedUsers.length === 0;

  const renderRoleColumn = (user) => {
    if (!user.wysehawk_Role) return '—';

    if (Array.isArray(user.allCustomer)) {
      return (
        <ul className="list-disc ml-4">
          {user.allCustomer.map((entry, i) => (
            <li key={i}>
              {entry.Customer} ({entry.Role}) [{entry.Enabled === true || entry.Enabled === 'True' ? 'Enabled' : 'Disabled'}]
            </li>
          ))}
        </ul>
      );
    }

    return '—';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">👤 User Management</h2>

      {status && (
        <p className={`p-2 mb-4 rounded ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status.message}
        </p>
      )}

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setShowModal(true);
            setEditingUser(null);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Create New User
        </button>

        <button
          onClick={handleLdapScan}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          🔍 Scan LDAP
        </button>

        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // 👈 auto-search on typing
          className="p-2 border rounded flex-grow min-w-0"
        />
        
        <Button
          onClick={handleBulkDelete}
          variant="danger"
          disabled={selectedUsers.length === 0}
          outline
          icon="🗑️"
          style={
            selectedUsers.length === 0
              ? {
                  borderColor: "#dc2626", // Tailwind red-600
                  color: "#dc2626",
                  opacity: 0.5,
                  cursor: "not-allowed",
                }
              : {}
          }
        >
          Delete
        </Button>

      </div>

      {showLdapModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">

            {/* Modal Header */}
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

            {/* Scrollable Table Container */}
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
                        <td className="px-4 py-2 border">{user.sAMAccountName}</td>
                        <td className="px-4 py-2 border">{user.cn}</td>
                        <td className="px-4 py-2 border">{user.mail}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-white text-right flex justify-between items-center">
              <span className="text-sm text-gray-600">{scannedLdapUsers.length} users scanned</span>
              <div className="flex gap-2">
                <button
                  onClick={importScannedLdapUsers}
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


      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">{editingUser ? 'Edit User' : 'Create Local User'}</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <input
                type="text"
                name="username"
                placeholder="Username"
                className="w-full p-2 border rounded"
                required
                defaultValue={editingUser?.username || ''}
                disabled={editingUser?.username === 'admin' || editingUser?.source === 'LDAP'}
              />
              {editingUser?.source !== 'LDAP' && (
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="w-full p-2 border rounded"
                />
              )}
              {(!editingUser || (editingUser && editingUser.username !== 'admin' && editingUser?.source !== 'LDAP')) && (
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  className="w-full p-2 border rounded"
                  required={!editingUser}
                  defaultValue={editingUser?.email || ''}
              />
              )}

              <div className="flex items-center gap-2">
                <label className="font-medium">Wysehawk Role</label>
                <input type="checkbox" name="wysehawk" checked={isWysehawk} onChange={() => setIsWysehawk(!isWysehawk)} />
              </div>

              {isWysehawk && (
                <>
                  <div className="flex items-center gap-4">
                    <label className="font-medium">All Customer</label>
                    <input
                      type="checkbox"
                      name="allCustomer"
                      checked={allCustomerChecked}
                      onChange={(e) => {
                        setAllCustomerChecked(e.target.checked);
                        if (!e.target.checked) setAllCustomerRole('');
                      }}
                    />
                    {allCustomerChecked && (
                      <select
                        name="allCustomerRole"
                        className="p-2 border rounded"
                        value={allCustomerRole}
                        onChange={(e) => setAllCustomerRole(e.target.value)}
                      >
                        <option value="">Select Role</option>
                        {roles.map((r) => (
                          <option key={r._id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <table className="w-full mt-4 border text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-1">Enabled</th>
                        <th className="border px-2 py-1">Customer</th>
                        <th className="border px-2 py-1">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer) => {
                        const customerData = Array.isArray(editingUser?.allCustomer)
                          ? editingUser.allCustomer.find(c => c.Customer === customer.name)
                          : null;
                        return (
                          <tr key={customer._id}>
                            <td className="border px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                name={`enable_${customer._id}`}
                                defaultChecked={customerData?.Enabled === 'True' || customerData?.Enabled === true}
                              />
                            </td>
                            <td className="border px-2 py-1">{customer.name}</td>
                            <td className="border px-2 py-1">
                              {allCustomerChecked ? (
                                <input
                                  type="text"
                                  className="w-full p-1 border rounded bg-gray-100"
                                  value={allCustomerRole}
                                  readOnly
                                />
                              ) : (
                                <select
                                  name={`role_${customer._id}`}
                                  className="w-full p-1 border rounded"
                                  defaultValue={customerData?.Role || ''}
                                >
                                  <option value="">Select Role</option>
                                  {roles.map((r) => (
                                    <option key={r._id} value={r.name}>{r.name}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-2">📋 Existing Users</h3>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border-b">
                    <input
                      type="checkbox"
                      checked={isAllSelectableUsersSelected()}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-2 border-b">Username</th>
                  <th className="px-4 py-2 border-b">Email</th>
                  <th className="px-4 py-2 border-b">Wysehawk Role</th>
                  <th className="px-4 py-2 border-b">Assigned Roles</th>
                  <th className="px-4 py-2 border-b">Source</th>
                  <th className="px-4 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...localUsers.map((u) => ({ ...u, source: 'Local' })), ...ldapUsers.map((u) => ({ ...u, source: 'LDAP' }))]
                  .filter((u) =>
                    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map((u, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">
                      {u.username !== 'admin' && (
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u._id)}
                          onChange={() => toggleUserSelection(u._id)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 border-b">{u.username}</td>
                    <td className="px-4 py-2 border-b">{u.email || '—'}</td>
                    <td className="px-4 py-2 border-b">{String(u.wysehawk_Role)}</td>
                    <td className="px-4 py-2 border-b">{renderRoleColumn(u)}</td>
                    <td className="px-4 py-2 border-b">{u.source}</td>
                    <td className="px-4 py-2 border-b">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => prepareEditForm(u)}
                          variant="success"
                          outline
                          icon="✏️"
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
