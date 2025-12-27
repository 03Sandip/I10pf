// js/loadPartials.js
// Robust partial loader + asset-path fixer + clean header init (DARK + AUTH)

/* =========================
   Utility helpers
   ========================= */

function isRelativeAsset(url) {
  if (!url) return false;
  const t = String(url).trim();
  return (
    !/^(?:[a-z]+:)?\/\//i.test(t) &&
    !t.startsWith("/") &&
    !t.startsWith("#") &&
    !t.startsWith("data:") &&
    !t.startsWith("mailto:")
  );
}

// Only prefix real ASSETS, never page navigation
function shouldPrefixPath(url) {
  return (
    isRelativeAsset(url) &&
    !url.startsWith("pages/") &&
    !url.startsWith("css/") &&
    !url.startsWith("js/") &&
    !url.startsWith("images/")
  );
}

function computeAssetPrefix() {
  if (typeof window.__SITE_BASE__ === "string" && window.__SITE_BASE__) {
    return window.__SITE_BASE__.endsWith("/")
      ? window.__SITE_BASE__
      : window.__SITE_BASE__ + "/";
  }
  return window.location.pathname.includes("/pages/") ? "../" : "";
}

function injectStylesheetHref(href) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/* =========================
   Script loaders
   ========================= */

function loadScriptsSequentially(urls) {
  return urls.reduce((p, url) => {
    return p.then(
      () =>
        new Promise((resolve) => {
          const s = document.createElement("script");
          s.src = url;
          s.async = false;
          s.onload = () => resolve(true);
          s.onerror = () => resolve(false);
          document.head.appendChild(s);
        })
    );
  }, Promise.resolve());
}

function executeInlineScript(jsText) {
  if (!jsText) return;
  const s = document.createElement("script");
  s.type = "text/javascript";
  s.text = jsText;
  document.head.appendChild(s);
}

/* =========================
   Partial loader
   ========================= */

async function loadPartial(targetId, fileName) {
  const container = document.getElementById(targetId);
  if (!container) return;

  const inPagesFolder = window.location.pathname.includes("/pages/");
  const partialsBase = inPagesFolder ? "../partials/" : "partials/";
  const partialPath = partialsBase + fileName;
  const assetPrefix = computeAssetPrefix();

  try {
    const resp = await fetch(partialPath, { cache: "no-cache" });
    if (!resp.ok) return;

    const rawHtml = await resp.text();
    const parsed = new DOMParser().parseFromString(rawHtml, "text/html");

    container.innerHTML = "";
    const scriptsToHandle = [];

    Array.from(parsed.body.childNodes).forEach((node) => {
      // Stylesheets
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();

        if (tag === "link" && node.rel === "stylesheet") {
          const href = node.getAttribute("href");
          if (href) {
            injectStylesheetHref(
              shouldPrefixPath(href) ? assetPrefix + href : href
            );
          }
          return;
        }

        if (tag === "style") {
          const style = document.createElement("style");
          style.textContent = node.textContent || "";
          document.head.appendChild(style);
          return;
        }
      }

      // Scripts
      if (node.nodeType === 1 && node.tagName.toLowerCase() === "script") {
        scriptsToHandle.push(node);
        return;
      }

      // Assets
      if (node.nodeType === 1) {
        node.querySelectorAll("img").forEach((img) => {
          const dataLogo = img.getAttribute("data-logo");
          if (dataLogo) {
            img.src = shouldPrefixPath(dataLogo)
              ? assetPrefix + dataLogo
              : dataLogo;
            return;
          }
          const src = img.getAttribute("src");
          if (src && shouldPrefixPath(src)) {
            img.src = assetPrefix + src;
          }
        });

        node.querySelectorAll("a").forEach((a) => {
          const h = a.getAttribute("href");
          if (!h) return;
          if (h.startsWith("/") || h.startsWith("#") || h.startsWith("http")) {
            a.href = h;
          }
        });
      }

      container.appendChild(node);
    });

    // Execute scripts
    const external = [];
    const inline = [];

    scriptsToHandle.forEach((s) => {
      const src = s.getAttribute("src");
      if (src) {
        external.push(shouldPrefixPath(src) ? assetPrefix + src : src);
      } else {
        inline.push(s.textContent || "");
      }
    });

    if (external.length) await loadScriptsSequentially(external);
    inline.forEach(executeInlineScript);
  } catch (e) {
    console.error("[loadPartials] error:", e);
  }
}

/* =========================
   HEADER INIT (DARK + AUTH)
   ========================= */

function initHeaderUI() {
  initTheme();
  setupAuthAndHeaderUI();
}

/* 🌙 Dark Mode — FINAL FIX */
function initTheme() {
  const html = document.documentElement;
  const body = document.body;
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  // Apply saved theme
  const isDark = localStorage.getItem("theme") === "dark";

  html.classList.toggle("dark", isDark);
  body.classList.toggle("dark", isDark);

  toggle.onclick = () => {
    const nowDark = !body.classList.contains("dark");

    html.classList.toggle("dark", nowDark);
    body.classList.toggle("dark", nowDark);

    localStorage.setItem("theme", nowDark ? "dark" : "light");
  };
}

/* =========================
   AUTH + HEADER UI
   ========================= */

function setupAuthAndHeaderUI() {
  const token = localStorage.getItem("gonotes_token");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("gonotes_user") || "{}");
  } catch {}

  const isInPages = window.location.pathname.includes("/pages/");

  const loginLink = document.getElementById("loginLink");
  const myNotesLink = document.getElementById("myNotesLink");
  const userMenu = document.getElementById("userMenu");
  const userMenuToggle = document.getElementById("userMenuToggle");
  const userDropdown = document.getElementById("userDropdown");
  const userInitial = document.getElementById("userInitial");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const userEmailDisplay = document.getElementById("userEmailDisplay");
  const logoutBtn = document.getElementById("logoutBtn");

  if (token && user && user.email) {
    loginLink && (loginLink.style.display = "none");
    myNotesLink && (myNotesLink.style.display = "inline-flex");
    userMenu && (userMenu.style.display = "inline-flex");

    const name = user.name || user.email;

    userInitial && (userInitial.textContent = name.charAt(0).toUpperCase());
    userNameDisplay && (userNameDisplay.textContent = name);
    userEmailDisplay && (userEmailDisplay.textContent = user.email);

    if (userMenuToggle && userDropdown && userMenu) {
      userMenuToggle.onclick = (e) => {
        e.stopPropagation();
        userDropdown.style.display =
          userDropdown.style.display === "block" ? "none" : "block";
      };

      document.addEventListener("click", (e) => {
        if (!userMenu.contains(e.target)) {
          userDropdown.style.display = "none";
        }
      });
    }

    logoutBtn &&
      (logoutBtn.onclick = () => {
        localStorage.removeItem("gonotes_token");
        localStorage.removeItem("gonotes_user");
        window.location.href = isInPages
          ? "./login.html"
          : "/pages/login.html";
      });
  } else {
    loginLink && (loginLink.style.display = "inline-flex");
    myNotesLink && (myNotesLink.style.display = "none");
    userMenu && (userMenu.style.display = "none");
  }
}

/* =========================
   Bulk load partials
   ========================= */

window.addEventListener("DOMContentLoaded", async () => {
  // Load HEADER first
  await loadPartial("header", "header.html");

  // Init header logic AFTER header exists
  initHeaderUI();

  // Load remaining partials
  [
    ["hero", "hero.html"],
    ["benefits", "benefits.html"],
    ["other_product", "other_product.html"],
    ["featured", "featured.html"],
    ["spotlight", "spotlight.html"],
    ["popular", "popular.html"],
    ["motivation", "motivation.html"],
    ["quote", "quote.html"],
    ["offers", "offers.html"],
    ["newsletter", "newsletter.html"],
    ["tools", "pdf.html"],
    ["articles", "articles.html"],
    ["footer", "footer.html"],
  ].forEach(([id, file]) => loadPartial(id, file));
});
