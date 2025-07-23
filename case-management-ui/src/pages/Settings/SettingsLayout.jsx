import { Outlet, NavLink } from "react-router-dom";

export default function SettingsLayout() {
  const activeClass = "bg-blue-600 text-white rounded px-3 py-2";
  const normalClass = "text-gray-700 hover:bg-gray-100 rounded px-3 py-2";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <div className="flex gap-4 mb-6">
        <NavLink to="db" className={({ isActive }) => isActive ? activeClass : normalClass}>
          🗄 Database
        </NavLink>
        <NavLink to="email" className={({ isActive }) => isActive ? activeClass : normalClass}>
          📧 Email
        </NavLink>
        <NavLink to="customers" className={({ isActive }) => isActive ? activeClass : normalClass}>
          👥 Customers
        </NavLink>
        <NavLink to="auth" className={({ isActive }) => isActive ? activeClass : normalClass}>
          🔒 Authentication
        </NavLink>
        <NavLink to="users" className={({ isActive }) => isActive ? activeClass : normalClass}>
          👤 Users
        </NavLink>
        <NavLink to="roles" className={({ isActive }) => isActive ? activeClass : normalClass}>
          🛡 Roles
        </NavLink> {/* 🆕 Added Roles Tab */}
      </div>
      <div className="border rounded p-4 bg-white shadow">
        <Outlet /> {/* renders selected subpage */}
      </div>
    </div>
  );
}
