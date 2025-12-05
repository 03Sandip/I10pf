(function () {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!form) return;

  /* =====================================================
     MODERN TOAST (with green tick on success)
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
    toastEl.className = "gn-toast";

    // base styles
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

    // background & icon per type
    let bg = "#1f2937"; // default dark
    let iconSvg = "";

    if (type === "success") {
      bg = "#16a34a"; // green
      iconSvg = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
    } else if (type === "error") {
      bg = "#dc2626"; // red
      iconSvg = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
    } else {
      bg = "#111827"; // info gray
    }

    toastEl.style.background = bg;

    // icon wrapper
    const iconWrap = document.createElement("div");
    iconWrap.style.width = "22px";
    iconWrap.style.height = "22px";
    iconWrap.style.display = "flex";
    iconWrap.style.alignItems = "center";
    iconWrap.style.justifyContent = "center";

    if (iconSvg) {
      iconWrap.innerHTML = iconSvg;
    }

    const textSpan = document.createElement("span");
    textSpan.textContent = message;

    toastEl.appendChild(iconWrap);
    toastEl.appendChild(textSpan);
    container.appendChild(toastEl);

    // slide in
    requestAnimationFrame(() => {
      toastEl.style.opacity = "1";
      toastEl.style.transform = "translateX(0)";
    });

    // auto dismiss
    setTimeout(() => {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translateX(20px)";
      setTimeout(() => toastEl.remove(), 250);
    }, 2600);
  }

  /* =====================================================
     LOGIN LOGIC (uses SERVER_URL from server.js)
     ===================================================== */

  if (!window.SERVER_URL) {
    alert("SERVER_URL missing — load js/server.js before login.js");
    throw new Error("SERVER_URL missing");
  }

  const ROOT_URL = window.SERVER_URL.replace(/\/+$/, "");
  const API_BASE = ROOT_URL + "/api"; // we call `${API_BASE}/auth/login`

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      toast("Please fill all fields", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        toast(data.message || "Invalid credentials", "error");
        return;
      }

      // ⭐⭐⭐ SAVE TOKEN + USER DATA WITH CONSISTENT KEYS ⭐⭐⭐
      // these MUST match what buynow.js and mynotes.js read
      localStorage.setItem("gonotes_token", data.token || "");
      localStorage.setItem("gonotes_user", JSON.stringify(data.user || {}));

      // green tick toast
      toast("Login successful!", "success");

      // redirect after toast
      setTimeout(() => {
        window.location.href = "./shop.html";
      }, 700);
    } catch (err) {
      console.error(err);
      toast("Server error. Try again later.", "error");
    }
  });
})();
