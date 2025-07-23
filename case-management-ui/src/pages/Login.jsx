import { useEffect, useState } from "react";
import fetchAPI from "../utils/api";
import { useNavigate, useParams } from "react-router-dom";
import Logo from "../components/Logo";

export default function Login() {
  const navigate = useNavigate();
  const { loginType } = useParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authType, setAuthType] = useState("local");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loginType === "customer") {
      setAuthType("domain");
    }
  }, [loginType]);


  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent form submission from reloading the page
    setError(""); // Reset previous error message
    setLoading(true); // Set loading state

    try {
      const response = await fetchAPI("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, authType }),
      });

      console.log("📬 Response from server:", response);

      if (response.success) {
        console.log("✅ Login successful");

        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));

        // ✅ Store per-organization UI permissions (used for RBAC on Dashboard/Cases/Add Case)
        if (response.user?.orgPermissions) {
          localStorage.setItem("orgPermissions", JSON.stringify(response.user.orgPermissions));
        } else {
          // fallback in case not returned (for safety)
          localStorage.removeItem("orgPermissions");
        }

        navigate("/");
      }else {
        // Handle specific error messages based on response status
        if (response.status === 403) {
          setError("Access denied");
        } else if (response.status === 401) {
          setError("Invalid Username or Password");
        } else {
          setError(response.message || "Login failed");
        }
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(err.message || "Server error. Please try again later.");
    } finally {
      setLoading(false); // Stop loading state
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-100 to-blue-200">
      <div className="relative bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-gray-900">
        <div className="flex justify-center mb-6">
          <Logo className="w-28 h-28" />
        </div>

        <h2 className="text-3xl font-semibold text-center mb-2">
          Welcome to Wysetek CMS
        </h2>
        <p className="text-center mb-6">Sign in to your account</p>

        {/* Show error if any */}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
              placeholder="Enter your username"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {loginType !== "customer" && (
            <div className="mb-6">
              <label className="block mb-1 font-medium">Login Type</label>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="local">Local</option>
                <option value="domain">Domain (LDAP)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 rounded-lg text-white text-lg font-medium transition-colors duration-300 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm">
          © 2025 Wysetek Systems Technologists Pvt. Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
