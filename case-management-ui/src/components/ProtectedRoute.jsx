import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ permissionKey }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || !user.uiPermissions) {
    return <Navigate to="/login" replace />;
  }

  const permission = user.uiPermissions[permissionKey];

  const hasAccess =
    typeof permission === "string"
      ? permission !== "hide"
      : typeof permission === "object"
        ? Object.values(permission).some((p) => p !== "hide")
        : false;

  if (!hasAccess) {
    return (
      <div className="text-center text-gray-500 mt-10 text-lg">
        🚫 You do not have access to this page.
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
