(function () {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!form) return;

  // 🔥 Centralized URL – comes from server.js
  const API_BASE = window.API_BASE;  

  // helper: safe toast or fallback to alert
  function notify(message, type = "info", title) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type, title ? { title } : {});
    } else {
      alert(message);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      notify("Please enter both email and password.", "error", "Missing fields");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        notify(data.message || "Login failed", "error", "Login failed");
        return;
      }

      if (data.token) localStorage.setItem("gn_token", data.token);
      if (data.user) localStorage.setItem("gn_user", JSON.stringify(data.user));

      notify("You are logged in!", "success", "Login successful");

      setTimeout(() => {
        window.location.href = "./shop.html";
      }, 800);
    } catch (err) {
      console.error("Login error:", err);
      notify("Could not connect to server. Try again later.", "error", "Server error");
    }
  });
})();
