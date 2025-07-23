import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import fetchAPI from '../utils/api';
import Button from '../components/ui/Button';
import { FaHome, FaFolderOpen, FaCog, FaSignOutAlt } from 'react-icons/fa';

export default function Layout() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('Loading...');
  const [modules, setModules] = useState([]);

  const dummyModules = [
    { path: '/', title: 'Dashboard', icon: <FaHome /> },
    { path: '/cases', title: 'Cases', icon: <FaFolderOpen /> },
    { path: '/settings', title: 'Settings', icon: <FaCog /> },
  ];

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetchAPI('/auth/me');
        if (res.success && res.user?.username) {
          console.log('👤 Logged in as:', res.user.username);
          setUsername(res.user.username);

          if (res.user.role === 'Admin') {
            setModules([
              ...dummyModules,
              { path: '/admin', title: 'Admin Panel', icon: <FaCog /> },
            ]);
          } else {
            setModules(dummyModules);
          }
        } else {
          console.warn('⚠️ No username in /auth/me response');
          setUsername('Guest');
          setModules(dummyModules);
        }
      } catch (err) {
        console.error('❌ Failed to fetch user info:', err);
        setUsername('Guest');
        setModules(dummyModules);
      }
    };

    loadUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar modules={modules} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-red-600">WyseHawk</span>
            <span className="text-green-600 font-medium hidden sm:inline">| Case Management System</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-800 font-medium">
              👋 Hi, <strong>{username}</strong>
            </span>
            <Button
              onClick={handleLogout}
              variant="danger"
              icon={<FaSignOutAlt />}
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 flex-1 overflow-auto content-scroll">
          {/* 👆 Added content-scroll class for smooth scroll targeting */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
