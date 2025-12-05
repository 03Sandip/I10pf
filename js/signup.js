(function () {
  const form = document.getElementById("signupForm");
  if (!form) return;

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const collegeInput = document.getElementById("college");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  /* =====================================================
     BACKEND BASE URL (from server.js)
     ===================================================== */

  if (!window.SERVER_URL) {
    alert("SERVER_URL missing — load js/server.js before signup.js");
    throw new Error("SERVER_URL missing");
  }

  const ROOT_URL = window.SERVER_URL.replace(/\/+$/, "");
  const API_BASE = ROOT_URL + "/api"; // → e.g. http://3.110.219.41:5000/api

  /* =====================================================
     TOAST SYSTEM (same as login.js)
     ===================================================== */

  function getToastContainer() {
    let container = document.querySelector(".gn-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "gn-toast-container";
      container.style.position = "fixed";
      container.style.top = "16px";
      container.style.right = "16px";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "8px";
      container.style.zIndex = "99999";
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(message, type = "info") {
    const container = getToastContainer();

    const toastEl = document.createElement("div");

    toastEl.style.minWidth = "260px";
    toastEl.style.maxWidth = "320px";
    toastEl.style.padding = "10px 14px";
    toastEl.style.borderRadius = "14px";
    toastEl.style.display = "flex";
    toastEl.style.alignItems = "center";
    toastEl.style.gap = "10px";
    toastEl.style.boxShadow = "0 10px 25px rgba(15,23,42,0.2)";
    toastEl.style.color = "#f9fafb";
    toastEl.style.fontSize = "14px";
    toastEl.style.fontWeight = "500";
    toastEl.style.opacity = "0";
    toastEl.style.transform = "translateX(20px)";
    toastEl.style.transition =
      "opacity 0.25s ease-out, transform 0.25s ease-out";

    let bg = "#1f2937";
    let iconSvg = "";

    if (type === "success") {
      bg = "#16a34a";
      iconSvg = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
    } else if (type === "error") {
      bg = "#dc2626";
      iconSvg = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
    }

    toastEl.style.background = bg;

    const iconWrap = document.createElement("div");
    iconWrap.innerHTML = iconSvg;

    const msg = document.createElement("span");
    msg.textContent = message;

    toastEl.appendChild(iconWrap);
    toastEl.appendChild(msg);
    container.appendChild(toastEl);

    requestAnimationFrame(() => {
      toastEl.style.opacity = "1";
      toastEl.style.transform = "translateX(0)";
    });

    setTimeout(() => {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translateX(20px)";
      setTimeout(() => toastEl.remove(), 250);
    }, 2600);
  }

  /* =====================================================
     PASSWORD VISIBILITY TOGGLE
     ===================================================== */

  document.querySelectorAll(".toggle-password-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.textContent = isHidden ? "Hide" : "Show";
    });
  });

  /* =====================================================
     SIGNUP SUBMIT HANDLER
     ===================================================== */

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const college = collegeInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    // validation
    if (!name || !email || !phone || !college || !password || !confirmPassword) {
      toast("Please fill all fields", "error");
      return;
    }

    if (password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }

    if (password !== confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          college,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast(data.message || "Signup failed", "error");
        return;
      }

      // success
      toast("Account created successfully!", "success");

      setTimeout(() => {
        window.location.href = "./login.html";
      }, 700);
    } catch (err) {
      console.error("Signup error:", err);
      toast("Server error. Try again later.", "error");
    }
  });
})();
