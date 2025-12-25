// js/loadPartials.js
// Robust partial loader + asset-path fixer + header auth handling (PRODUCTION SAFE)

// ------------------------
// Utility helpers
// ------------------------
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

// ✅ Only prefix real ASSETS, never page navigation
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
  // Allow override if needed
  if (typeof window.__SITE_BASE__ === "string" && window.__SITE_BASE__) {
    return window.__SITE_BASE__.endsWith("/")
      ? window.__SITE_BASE__
      : window.__SITE_BASE__ + "/";
  }

  // If inside /pages/, assets live one level up
  return window.location.pathname.includes("/pages/") ? "../" : "";
}

function injectStylesheetHref(href) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

// ------------------------
// Script loaders
// ------------------------
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

// ------------------------
// Partial loader
// ------------------------
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

      // ------------------------
      // Stylesheets (LINK + STYLE) ✅ FIX
      // ------------------------
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();

        // <link rel="stylesheet">
        if (tag === "link" && (node.getAttribute("rel") || "").toLowerCase() === "stylesheet") {
          const href = node.getAttribute("href");
          if (href) {
            injectStylesheetHref(
              shouldPrefixPath(href) ? assetPrefix + href : href
            );
          }
          return;
        }

        // ✅ <style> blocks (REQUIRED for footer card)
        if (tag === "style") {
          const style = document.createElement("style");
          style.textContent = node.textContent || "";
          document.head.appendChild(style);
          return;
        }
      }

      // ------------------------
      // Scripts
      // ------------------------
      if (node.nodeType === 1 && node.tagName.toLowerCase() === "script") {
        scriptsToHandle.push(node);
        return;
      }

      // ------------------------
      // Asset fixing
      // ------------------------
      if (node.nodeType === 1) {
        // Images / logos
        node.querySelectorAll("img").forEach((img) => {
          const dataLogo = img.getAttribute("data-logo");
          if (dataLogo) {
            img.src = shouldPrefixPath(dataLogo)
              ? assetPrefix + dataLogo
              : dataLogo;
            return;
          }

          const s = img.getAttribute("src");
          if (s && shouldPrefixPath(s)) {
            img.src = assetPrefix + s;
          }
        });

        // ✅ Anchor links — DO NOT break navigation
        node.querySelectorAll("a").forEach((a) => {
          const h = a.getAttribute("href");
          if (!h) return;

          if (h.startsWith("/") || h.startsWith("#") || h.startsWith("http")) {
            a.href = h;
            return;
          }

          a.href = h;
        });
      }

      container.appendChild(node);
    });

    // ------------------------
    // Execute scripts
    // ------------------------
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

    // ------------------------
    // data-init hooks
    // ------------------------
    container.querySelectorAll("[data-init]").forEach((el) => {
      const fn = el.getAttribute("data-init");
      if (fn && typeof window[fn] === "function") {
        window[fn](el);
      }
    });
// ✅ Dark mode toggle init (IMPORTANT)
if (fileName === "header.html" && typeof initThemeToggle === "function") {
  initThemeToggle();
}
  } catch (e) {
    console.error("[loadPartials] error:", e);
  }
}

// ------------------------
// Bulk load partials
// ------------------------
window.addEventListener("DOMContentLoaded", () => {
  [
    ["header", "header.html"],
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

// ------------------------
// AUTH + HEADER UI (UNCHANGED)
// ------------------------
function setupAuthAndHeaderUI() {
  const token = localStorage.getItem("gonotes_token");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("gonotes_user") || "{}");
  } catch {
    user = null;
  }

  const currentPage = window.location.pathname.toLowerCase();
  const isInPages = currentPage.includes("/pages/");

  const protectedPages = [
    "my-notes.html",
    "checkout.html",
    "orders.html",
    "payment.html",
  ];

  const isProtected = protectedPages.some((p) =>
    currentPage.includes(p)
  );

  if (!token && isProtected) {
    window.location.href = isInPages
      ? "./login.html"
      : "/pages/login.html";
    return;
  }

  const loginLink = document.getElementById("loginLink");
  const myNotesLink = document.getElementById("myNotesLink");
  const userMenu = document.getElementById("userMenu");
  const userMenuToggle = document.getElementById("userMenuToggle");
  const userDropdown = document.getElementById("userDropdown");
  const userInitial = document.getElementById("userInitial");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const userEmailDisplay = document.getElementById("userEmailDisplay");
  const logoutBtn = document.getElementById("logoutBtn");

  const myNotesItemMobile =
    document.getElementById("myNotesItemMobile");
  const loginItemMobile =
    document.getElementById("loginItemMobile");

  if (token && user) {
    if (loginLink) loginLink.style.display = "none";
    if (loginItemMobile) loginItemMobile.style.display = "none";

    if (myNotesLink) myNotesLink.style.display = "inline-flex";
    if (myNotesItemMobile) myNotesItemMobile.style.display = "block";
    if (userMenu) userMenu.style.display = "inline-flex";

    const name = user.name || user.email || "User";
    const email = user.email || "";
    const initial = name.charAt(0).toUpperCase();

    if (userInitial) userInitial.textContent = initial;
    if (userNameDisplay) userNameDisplay.textContent = name;
    if (userEmailDisplay) userEmailDisplay.textContent = email;

    if (userMenuToggle && userDropdown) {
      userMenuToggle.onclick = (e) => {
        e.stopPropagation();
        userDropdown.style.display =
          userDropdown.style.display === "block" ? "none" : "block";
      };

      document.addEventListener("click", () => {
        userDropdown.style.display = "none";
      });
    }

    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem("gonotes_token");
        localStorage.removeItem("gonotes_user");
        window.location.href = isInPages
          ? "./login.html"
          : "/pages/login.html";
      };
    }
  } else {
    if (loginLink) loginLink.style.display = "inline-flex";
    if (loginItemMobile) loginItemMobile.style.display = "block";

    if (myNotesLink) myNotesLink.style.display = "none";
    if (myNotesItemMobile) myNotesItemMobile.style.display = "none";
    if (userMenu) userMenu.style.display = "none";
  }
}
