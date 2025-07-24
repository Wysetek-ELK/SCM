import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaHome,
  FaFolderOpen,
  FaPlusCircle,
  FaCog,
  FaBars,
  FaChartLine, // ✅ Added for MTTD tab
} from 'react-icons/fa';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const orgPermissions = user.orgPermissions || {};
  const isAdmin = user.role === 'admin';

  const canShowTab = (tabKey) => {
    const allOrgPerms = Object.values(orgPermissions);
    if (allOrgPerms.length === 0) return false;
    const allHide = allOrgPerms.every(orgPerm => orgPerm[tabKey] === 'hide' || orgPerm[tabKey] === undefined);
    return !allHide;
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <FaHome />, show: canShowTab('Dashboard') },
    { name: 'Cases', path: '/cases', icon: <FaFolderOpen />, show: canShowTab('Cases') },
    { name: 'Add New Case', path: '/add-case', icon: <FaPlusCircle />, show: canShowTab('Add Case') },
    { name: 'MTTD & MTTR', path: '/metrics', icon: <FaChartLine />, show: isAdmin }, // ✅ NEW TAB
    { name: 'Settings', path: '/settings', icon: <FaCog />, show: isAdmin },
  ].filter(item => item.show);

  const togglePin = () => setPinned(!pinned);

  return (
    <aside
      className={`bg-gray-900 text-gray-100 h-screen shadow-xl flex flex-col transition-all duration-300
        ${collapsed && !pinned ? 'w-16' : 'w-64'}`}
      onMouseEnter={() => !pinned && setCollapsed(false)}
      onMouseLeave={() => !pinned && setCollapsed(true)}
    >
      {/* Header / Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && (
          <span className="text-xl font-extrabold text-red-400">📊 WyseHawk</span>
        )}
        <button
          onClick={togglePin}
          className="text-gray-400 hover:text-white transition-colors"
          title={pinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
        >
          <FaBars />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer
              ${
                isActive
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <div className="text-xl">{item.icon}</div>
            {!collapsed && <span className="text-base">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        {!collapsed && (
          <div className="text-xs text-gray-400 text-center">
            WyseHawk © 2025
          </div>
        )}
      </div>
    </aside>
  );
}
