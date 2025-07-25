import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import AddCase from "./pages/AddCase";
import CaseDetails from "./pages/CaseDetails";
import CaseEdit from "./pages/CaseEdit";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import SettingsLayout from "./pages/Settings/SettingsLayout";
import DbSettings from "./pages/Settings/DbSettings";
import EmailSettings from "./pages/Settings/EmailSettings";
import CustomerSettings from "./pages/Settings/CustomerSettings";
import AuthSettings from "./pages/Settings/AuthSettings";
import UserSettings from "./pages/Settings/UserSettings";
import RoleManagement from "./pages/Settings/RoleManagement";
import PrivateRoute from "./components/PrivateRoute";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerCaseEdit from "./pages/CustomerCaseEdit"; // ✅ New
import ProtectedRoute from "./components/ProtectedRoute";
import MTTDPage from "./pages/MTTDPage"; // ✅ New import for MTTD/MTTR page


// 🔄 Full-screen loader component
function FullPageLoader() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "1.5rem",
        fontWeight: "bold",
      }}
    >
      Loading...
    </div>
  );
}

// 🚦 Guard that redirects and shows loading on "/"
function CustomerRedirectGuard({ onComplete }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    const checkAndRedirect = () => {
      if (location.pathname === "/") {
        if (token) {
          try {
            const decoded = jwtDecode(token);
            if (decoded?.role === "customer") {
              navigate("/customer", { replace: true });
              return;
            }
          } catch (err) {
            console.error("❌ Invalid token:", err);
          }
        }
      }

      onComplete(); // No redirect needed
    };

    checkAndRedirect();
  }, [location.pathname, navigate]);

  return null;
}

function App() {
  const [checked, setChecked] = useState(false);
  const location = useLocation();

  const showLoaderForRootPath = location.pathname === "/" && !checked;

  return (
    <>
      {!checked && <CustomerRedirectGuard onComplete={() => setChecked(true)} />}
      {showLoaderForRootPath ? (
        <FullPageLoader />
      ) : (
        <Routes>
          {/* ✅ Login Routes */}
          <Route path="/login/:loginType" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* ✅ Customer Routes */}
          <Route
            path="/customer"
            element={
              <PrivateRoute customerOnly={true}>
                <CustomerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/cases/:id"
            element={
              <PrivateRoute customerOnly={true}>
                <CaseDetails standalone />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/cases/:id/edit"
            element={
              <PrivateRoute customerOnly={true}>
                <CustomerCaseEdit />
              </PrivateRoute>
            }
          />

          {/* ✅ Admin/Internal Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="cases/:id/edit" element={<CaseEdit />} />
            <Route path="cases/:id" element={<CaseDetails />} />
            <Route path="cases" element={<Cases />} />
            <Route path="add-case" element={<AddCase />} />
            <Route path="metrics" element={<MTTDPage />} />
            <Route path="settings" element={<ProtectedRoute permissionKey="Settings" />}>
              <Route element={<SettingsLayout />}>
                <Route index element={<div>Please select a settings tab from above.</div>} />
                <Route path="db" element={<DbSettings />} />
                <Route path="email" element={<EmailSettings />} />
                <Route path="customers" element={<CustomerSettings />} />
                <Route path="auth" element={<AuthSettings />} />
                <Route path="users" element={<UserSettings />} />
                <Route path="roles" element={<RoleManagement />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      )}
    </>
  );
}

// Wrap App with Router
function AppWithRouter() {
  return (
    <Router future={{ v7_startTransition: true }}>
      <App />
    </Router>
  );
}

export default AppWithRouter;
