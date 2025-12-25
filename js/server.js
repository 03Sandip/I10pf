// server.js
// Central place to define your backend ROOT URL (without /api).
// Your new api.js generates BASE_URL = ROOT_URL + "/api"

(function (root) {

  // 👇 Backend root URL
   const SERVER_URL = "https://api.gonotes.shop";
  // const SERVER_URL = "http://localhost:5000";
  
  // Example production: "https://api.mygonotes.com"

  // Expose for browser (frontend)
  if (typeof window !== "undefined") {
    // Make ONLY the root URL available globally
    window.SERVER_URL = SERVER_URL;

    // ❌ DO NOT set window.API_BASE or window.GN_API_BASE here
    // api.js now handles BASE_URL = ROOT_URL + "/api"
  }

  // Optional: expose for Node.js if needed
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      SERVER_URL,
    };
  }

})(typeof globalThis !== "undefined" ? globalThis : this);
