import { useState, useEffect } from "react";
import Button from "../../components/ui/Button"; // ✅ Import reusable Button

const uiModules = {
  Dashboard: null,
  Cases: null,
  "Add Case": null,
  "Case Details": null,
  Settings: ["DB", "Email", "Customers", "Auth", "Users", "Roles"],
};

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [uiPermissions, setUiPermissions] = useState({});

  useEffect(() => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => setRoles(data.roles || []));
  }, []);

  const handleOpenModal = (role = null, mode = "create") => {
    if (role) {
      setRoleName(role.name);
      setDescription(role.description);
      setUiPermissions(role.uiPermissions);
      setEditingRoleId(role._id || role.id);
      setIsEditing(mode === "edit");
      setReadOnly(mode === "view");
    } else {
      const defaultUIPerms = {};
      Object.entries(uiModules).forEach(([mod, subs]) => {
        if (subs === null) defaultUIPerms[mod] = "view";
        else {
          defaultUIPerms[mod] = subs.reduce((acc, sub) => {
            acc[sub] = "view";
            return acc;
          }, {});
        }
      });
      setUiPermissions(defaultUIPerms);
      setRoleName("");
      setDescription("");
      setIsEditing(false);
      setReadOnly(false);
    }
    setShowModal(true);
  };

  const updatePermission = (module, value) => {
    setUiPermissions((prev) => ({ ...prev, [module]: value }));
  };

  const updateSubPermission = (parent, sub, value) => {
    setUiPermissions((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [sub]: value,
      },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const newRole = {
      name: roleName,
      description,
      uiPermissions,
      nonDeletable: false,
    };

    let res, data;
    if (isEditing) {
      res = await fetch(`/api/roles/${editingRoleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      });
      data = await res.json();
      setRoles((prev) =>
        prev.map((r) =>
          r._id === editingRoleId || r.id === editingRoleId ? data : r
        )
      );
    } else {
      res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      });
      data = await res.json();
      setRoles((prev) => [...prev, data.role]);
    }

    setShowModal(false);
  };

  const deleteRole = async (id) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRoles((prev) => prev.filter((r) => r._id !== id && r.id !== id));
    } else {
      alert("Failed to delete role (maybe it's protected)");
    }
  };

  const renderPermissionSelector = (module, children) => {
    const value = uiPermissions[module];
    if (!children) {
      return (
        <div className="flex justify-between">
          <span className="w-40 font-medium">{module}</span>
          <div className="flex gap-4">
            {["view", "full", "hide"].map((opt) => (
              <label key={opt}>
                <input
                  type="radio"
                  name={`perm-${module}`}
                  checked={value === opt}
                  disabled={readOnly}
                  onChange={() => updatePermission(module, opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }

    const mainPerm = typeof value === "string" ? value : "custom";

    return (
      <div>
        <div className="flex justify-between">
          <span className="w-40 font-medium">{module}</span>
          <div className="flex gap-4">
            {["view", "full", "hide", "custom"].map((opt) => (
              <label key={opt}>
                <input
                  type="radio"
                  name={`perm-${module}`}
                  checked={mainPerm === opt}
                  disabled={readOnly}
                  onChange={() => {
                    if (opt !== "custom") updatePermission(module, opt);
                    else {
                      const childPerms = children.reduce((acc, c) => {
                        acc[c] = "view";
                        return acc;
                      }, {});
                      updatePermission(module, childPerms);
                    }
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
        {mainPerm === "custom" && (
          <div className="pl-4 mt-2 space-y-2">
            {children.map((c) => (
              <div key={c} className="flex justify-between">
                <span className="w-32">{c}</span>
                <div className="flex gap-4">
                  {["view", "full", "hide"].map((opt) => (
                    <label key={opt}>
                      <input
                        type="radio"
                        name={`subperm-${module}-${c}`}
                        checked={value?.[c] === opt}
                        disabled={readOnly}
                        onChange={() => updateSubPermission(module, c, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Role Management</h2>
        <Button
          onClick={() => handleOpenModal(null, "create")}
          variant="success"
          icon="➕"
          outline
        >
          Add Role
        </Button>
      </div>

      <div className="bg-white shadow rounded overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Scope</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role._id || role.id} className="border-t">
                <td className="px-4 py-2">
                  {role.name}
                  {role.name.toLowerCase() === "admin" &&
                    role.nonDeletable && (
                      <span className="ml-2 text-xs text-gray-500">
                        (default)
                      </span>
                    )}
                </td>
                <td className="px-4 py-2">{role.description}</td>
                <td className="px-4 py-2">
                  {role.nonDeletable ? "System" : "User"}
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <Button
                    onClick={() => handleOpenModal(role, "view")}
                    variant="primary"
                    outline
                    icon="👁️"
                  >
                    View
                  </Button>
                  {!role.nonDeletable && (
                    <>
                      <Button
                        onClick={() => handleOpenModal(role, "edit")}
                        variant="success"
                        outline
                        icon="✏️"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteRole(role._id || role.id)}
                        variant="danger"
                        outline
                        icon="🗑️"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-4">
              {readOnly
                ? "View Role"
                : isEditing
                ? "Edit Role"
                : "Add New Role"}
            </h3>
            <form onSubmit={handleSave}>
              <input
                type="text"
                placeholder="Role Name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full mb-2 px-3 py-2 border rounded"
                required
                disabled={readOnly}
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mb-4 px-3 py-2 border rounded"
                disabled={readOnly}
              />

              <div className="mb-6">
                <h4 className="font-medium text-lg mb-2">UI Permissions</h4>
                <div className="space-y-4">
                  {Object.entries(uiModules).map(([module, children]) => (
                    <div key={module} className="border-b pb-3">
                      {renderPermissionSelector(module, children)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="secondary"
                  outline
                  icon="↩️"
                >
                  Close
                </Button>
                {!readOnly && (
                  <Button type="submit" icon="💾">
                    {isEditing ? "Update Role" : "Save Role"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
