import { Navigate, useLocation } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  // Future-ready: validate token here if needed

  if (!token) {
    console.warn("🔒 No token found. Redirecting to login...");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
