// toast.js
// Reusable centered interactive toast (BIGGER VERSION)

(function (global) {
  function getToastContainer() {
  let container = document.querySelector(".gn-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "gn-toast-container";

    container.style.position = "fixed";
    container.style.left = "50%";
    container.style.top = "50%";
    container.style.transform = "translate(-50%, -50%)";  // FULL CENTER
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "18px";
    container.style.zIndex = "999999999";
    container.style.pointerEvents = "none"; // Allows clicking behind

    document.body.appendChild(container);
  }
  return container;
}


  function showInteractiveToast({
    title = "",
    message = "",
    type = "info",
    primaryText = "",
    onPrimary = null,
    secondaryText = "",
    onSecondary = null,
    autoCloseMs = 0,
    autoRedirect = null
  }) {
    const container = getToastContainer();

    const toast = document.createElement("div");
    toast.className = "gn-toast-interactive";

    /* 🔥 Bigger & premium styling */
    toast.style.width = "520px";                  // bigger width
    toast.style.padding = "28px 32px";            // bigger padding
    toast.style.borderRadius = "22px";            // rounded
    toast.style.backdropFilter = "blur(14px)";    // stronger glass blur
    toast.style.background = "rgba(22,163,74,0.92)";
    toast.style.boxShadow =
      "0 18px 50px rgba(0,0,0,0.45), 0 0 14px rgba(0,0,0,0.25)";
    toast.style.color = "#fff";
    toast.style.fontSize = "17px"; // bigger text
    toast.style.fontWeight = "500";
    toast.style.pointerEvents = "auto";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(35px) scale(0.92)";
    toast.style.transition =
      "opacity 0.35s ease-out, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)";

    if (type === "error") toast.style.background = "rgba(220,38,38,0.92)";
    if (type === "info") toast.style.background = "rgba(17,24,39,0.92)";

    // Title
    const titleEl = document.createElement("div");
    titleEl.style.fontWeight = "800";
    titleEl.style.fontSize = "20px";      // larger title
    titleEl.style.letterSpacing = "0.3px";
    titleEl.textContent = title || "Notification";

    // Message
    const msgEl = document.createElement("div");
    msgEl.style.marginTop = "12px";
    msgEl.style.opacity = "0.95";
    msgEl.style.fontSize = "16px";       // bigger message
    msgEl.style.lineHeight = "1.5";
    msgEl.textContent = message || "";

    // Actions
    const actions = document.createElement("div");
    actions.style.marginTop = "18px";
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "14px";

    if (secondaryText) {
      const btn = document.createElement("button");
      btn.textContent = secondaryText;
      btn.style.border = "0";
      btn.style.background = "transparent";
      btn.style.color = "#e5e7eb";
      btn.style.fontSize = "15px";
      btn.style.cursor = "pointer";
      btn.style.padding = "6px 10px";
      btn.onclick = () => {
        if (onSecondary) onSecondary();
        closeToast();
      };
      actions.appendChild(btn);
    }

    if (primaryText) {
      const btn = document.createElement("button");
      btn.textContent = primaryText;
      btn.style.border = "0";
      btn.style.padding = "10px 22px";
      btn.style.borderRadius = "10px";
      btn.style.background = "#fff";
      btn.style.color = "#111827";
      btn.style.fontSize = "15px";
      btn.style.fontWeight = "600";
      btn.style.cursor = "pointer";
      btn.onclick = () => {
        if (onPrimary) onPrimary();
        closeToast();
      };
      actions.appendChild(btn);
    }

    toast.appendChild(titleEl);
    toast.appendChild(msgEl);
    toast.appendChild(actions);
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0) scale(1)";
    });

    function closeToast() {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(35px) scale(0.92)";
      setTimeout(() => toast.remove(), 350);
    }

    if (autoRedirect && autoCloseMs) {
      setTimeout(() => {
        autoRedirect();
        closeToast();
      }, autoCloseMs);
    }
  }

  global.showInteractiveToast = showInteractiveToast;
})(window);
