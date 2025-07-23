const API_BASE_URL = (import.meta.env.VITE_API_URL || window.location.origin.replace(':5173', ':5000')).replace(/\/$/, '');

const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  console.log(`📡 Fetching: ${url}`);

  const token = localStorage.getItem('token'); // 🔑 Get JWT token

  // Default headers
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), // Skip Content-Type for FormData
    ...(token && { Authorization: `Bearer ${token}` }), // 🔥 Attach Authorization header
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      headers,
      credentials: 'include', // 🆕 Send cookies if needed (CORS)
      ...options,
    });

    // Handle unauthorized (token expired or invalid)
    if (response.status === 401) {
      console.warn('🔒 Unauthorized response received');

      let errorMsg = "Unauthorized";
      try {
        const errorData = await response.json();
        if (errorData.message) errorMsg = errorData.message;
      } catch {
        // fallback if not JSON
      }

      return {
        success: false,
        message: errorMsg,
        status: 401,
      };
    }


    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMsg = errorData.message;
      } catch {
        // fallback if response is not JSON
      }

      return {
        success: false,
        message: errorMsg,
        status: response.status,
      };
    }

    // Parse JSON if possible
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return response; // For non-JSON (like file downloads)
  } catch (err) {
    console.error('🔥 API request failed:', err.message);
    throw err;
  }
};

export default fetchAPI;
