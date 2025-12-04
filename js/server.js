// server.js
// Central place to define your backend URL.
// Change ONLY here when you move from localhost to production.

(function (root) {
  // 👇 Set your backend URL here
  const SERVER_URL = "http://localhost:5000"; 
  // e.g. "https://api.mygonotes.com" in production

  // Expose for browser (front-end)
  if (typeof window !== "undefined") {
    window.SERVER_URL = SERVER_URL;

    // For your existing code that already uses these:
    window.API_BASE = SERVER_URL;          // e.g. used by signup/login: `${API_BASE}/api/auth/...`
    window.GN_API_BASE = SERVER_URL + "/api"; // e.g. used by shop.js: NOTES_BASE, etc.
  }

  // Optional: expose for Node.js (backend) if needed
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      SERVER_URL,
      API_BASE: SERVER_URL,
      GN_API_BASE: SERVER_URL + "/api",
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
