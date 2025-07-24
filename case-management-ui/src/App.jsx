import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

function App() {
  return (
    <Router future={{ v7_startTransition: true }}>
      <Routes>
        {/* Public Routes */}
        {/* ✅ Login Routes */}
        <Route path="/login/:loginType" element={<Login />} />

        {/* ✅ Optional redirect for legacy /login */}
        <Route path="/login" element={<Login />} />
        <Route path="/login/:loginType" element={<Login />} />

        {/* Customer Dashboard */}
        <Route
          path="/customer"
          element={
            <PrivateRoute customerOnly={true}>
              <CustomerDashboard />
            </PrivateRoute>
          }
        />

        {/* ✅ Standalone CaseDetails for Customer */}
        <Route
          path="/customer/cases/:id"
          element={
            <PrivateRoute customerOnly={true}>
              <CaseDetails standalone />
            </PrivateRoute>
          }
        />

        {/* ✅ Standalone CustomerCaseEdit */}
        <Route
          path="/customer/cases/:id/edit"
          element={
            <PrivateRoute customerOnly={true}>
              <CustomerCaseEdit />
            </PrivateRoute>
          }
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Main Layout */}
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

          {/* ✅ Protected Settings Route */}
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
    </Router>
  );
}

export default App;
