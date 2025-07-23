export default async function fetchAPI(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(`http://localhost:5000/api${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      console.error("❌ API error: Unauthorized or token expired");
      throw new Error("Invalid or expired token");
    }
    const error = await response.text();
    console.error(`❌ API error: ${response.status} - ${error}`);
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response.json();
}
