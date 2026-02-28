/**
 * AgriVision API Client
 * Centralized HTTP client for all backend API calls.
 * Handles auth tokens, error handling, and request formatting.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.theagrivision.com";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("agrivision_token");
}

async function request(method, path, body = null, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, config);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.detail || `HTTP ${res.status}`, res.status, data);
  }
  return data;
}

// ============================================================
// AUTH
// ============================================================
export const auth = {
  signup: (data) => request("POST", "/api/auth/signup", data),
  login: async (email, password) => {
    const formData = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.detail, res.status, data);
    localStorage.setItem("agrivision_token", data.access_token);
    return data;
  },
  me: () => request("GET", "/api/auth/me"),
  logout: () => { localStorage.removeItem("agrivision_token"); },
  forgotPassword: (email) => request("POST", "/api/auth/forgot-password", { email }),
};

// ============================================================
// FARMS
// ============================================================
export const farms = {
  list: () => request("GET", "/api/farms"),
  get: (id) => request("GET", `/api/farms/${id}`),
  create: (data) => request("POST", "/api/farms", data),
  update: (id, data) => request("PUT", `/api/farms/${id}`, data),
  delete: (id) => request("DELETE", `/api/farms/${id}`),
  stats: (id) => request("GET", `/api/farms/${id}/stats`),
};

// ============================================================
// CROPS
// ============================================================
export const crops = {
  list: (farmId) => request("GET", `/api/crops/farm/${farmId}`),
  create: (data) => request("POST", "/api/crops", data),
  update: (id, data) => request("PUT", `/api/crops/${id}`, data),
  delete: (id) => request("DELETE", `/api/crops/${id}`),
  database: () => request("GET", "/api/crops/database"),
};

// ============================================================
// CONFIGURATOR
// ============================================================
export const configurator = {
  calculate: (data) => request("POST", "/api/configurator/calculate", data),
  pricing: () => request("GET", "/api/configurator/pricing"),
  coverage: () => request("GET", "/api/configurator/coverage-specs"),
};

// ============================================================
// ORDERS
// ============================================================
export const orders = {
  create: (data) => request("POST", "/api/orders", data),
  list: () => request("GET", "/api/orders"),
  get: (id) => request("GET", `/api/orders/${id}`),
  createPaymentIntent: (id) => request("POST", `/api/orders/${id}/payment-intent`),
  confirm: (id) => request("POST", `/api/orders/${id}/confirm`),
};

// ============================================================
// DASHBOARD
// ============================================================
export const dashboard = {
  overview: () => request("GET", "/api/dashboard/overview"),
  detections: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/api/dashboard/detections?${qs}`);
  },
  sensors: (farmId, hours = 24) => request("GET", `/api/dashboard/sensors/${farmId}?hours=${hours}`),
  notifications: (unreadOnly = false) => request("GET", `/api/dashboard/notifications?unread_only=${unreadOnly}`),
  markRead: (id) => request("PUT", `/api/dashboard/notifications/${id}/read`),
};

// ============================================================
// FARMERS (profile)
// ============================================================
export const farmers = {
  profile: () => request("GET", "/api/farmers/profile"),
  updateProfile: (data) => request("PUT", "/api/farmers/profile", data),
  updateConsent: (data) => request("PUT", "/api/farmers/consent", data),
  deleteAccount: () => request("DELETE", "/api/farmers/account"),
};

// ============================================================
// ADMIN
// ============================================================
export const admin = {
  overview: () => request("GET", "/api/admin/overview"),
  farmers: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/api/admin/farmers?${qs}`);
  },
  cropMap: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/api/admin/crop-map?${qs}`);
  },
  marketIntelligence: () => request("GET", "/api/admin/market-intelligence"),
  updateOrderStatus: (id, data) => request("PUT", `/api/admin/orders/${id}/status`, data),
};

export default { auth, farms, crops, configurator, orders, dashboard, farmers, admin };
