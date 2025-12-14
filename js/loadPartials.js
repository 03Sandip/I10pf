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
    !t.startsWith('/') &&
    !t.startsWith('data:') &&
    !t.startsWith('mailto:')
  );
}

function computeAssetPrefix() {
  // Prefer explicit site base if provided
  const siteBase =
    (typeof window.__SITE_BASE__ === 'string' && window.__SITE_BASE__) || '';

  if (siteBase) {
    return siteBase.endsWith('/') ? siteBase : siteBase + '/';
  }

  // Fallback: detect /pages/
  const inPagesFolder = window.location.pathname.includes('/pages/');
  return inPagesFolder ? '../' : '';
}

function injectStylesheetHref(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.crossOrigin = 'anonymous';
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
          const s = document.createElement('script');
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
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.text = jsText;
  document.head.appendChild(s);
}

// ------------------------
// Partial loader
// ------------------------
async function loadPartial(targetId, fileName) {
  const container = document.getElementById(targetId);
  if (!container) return;

  const inPagesFolder = window.location.pathname.includes('/pages/');
  const partialsBase = inPagesFolder ? '../partials/' : 'partials/';
  const partialPath = partialsBase + fileName;

  const assetPrefix = computeAssetPrefix();

  try {
    const resp = await fetch(partialPath, { cache: 'no-cache' });
    if (!resp.ok) return;

    const rawHtml = await resp.text();
    const parsed = new DOMParser().parseFromString(rawHtml, 'text/html');

    container.innerHTML = '';
    const scriptsToHandle = [];

    Array.from(parsed.body.childNodes).forEach((node) => {
      // ------------------------
      // Stylesheets
      // ------------------------
      if (
        node.nodeType === 1 &&
        node.tagName.toLowerCase() === 'link' &&
        (node.getAttribute('rel') || '').toLowerCase() === 'stylesheet'
      ) {
        const href = node.getAttribute('href');
        if (href) {
          injectStylesheetHref(
            isRelativeAsset(href) ? assetPrefix + href : href
          );
        }
        return;
      }

      // ------------------------
      // Scripts (defer execution)
      // ------------------------
      if (node.nodeType === 1 && node.tagName.toLowerCase() === 'script') {
        scriptsToHandle.push(node);
        return;
      }

      // ------------------------
      // Asset fixing (IMPORTANT)
      // ------------------------
      if (node.nodeType === 1) {
        // 🔥 FIX LOGO + IMAGES
        node.querySelectorAll('img').forEach((img) => {
          // Prefer data-logo
          const dataLogo = img.getAttribute('data-logo');
          if (dataLogo) {
            img.src = isRelativeAsset(dataLogo)
              ? assetPrefix + dataLogo
              : dataLogo;
            return;
          }

          // Fallback to src
          const s = img.getAttribute('src');
          if (s && isRelativeAsset(s)) {
            img.src = assetPrefix + s;
          }
        });

        // Fix anchor links
        node.querySelectorAll('a').forEach((a) => {
          const h = a.getAttribute('href');
          if (h && isRelativeAsset(h)) {
            a.href = assetPrefix + h;
          }
        });
      }

      container.appendChild(document.importNode(node, true));
    });

    // ------------------------
    // Execute scripts
    // ------------------------
    const external = [];
    const inline = [];

    scriptsToHandle.forEach((s) => {
      const src = s.getAttribute('src');
      if (src) {
        external.push(isRelativeAsset(src) ? assetPrefix + src : src);
      } else {
        inline.push(s.textContent || '');
      }
    });

    if (external.length) await loadScriptsSequentially(external);
    inline.forEach(executeInlineScript);

    // ------------------------
    // data-init hooks
    // ------------------------
    container.querySelectorAll('[data-init]').forEach((el) => {
      const fn = el.getAttribute('data-init');
      if (fn && typeof window[fn] === 'function') {
        window[fn](el);
      }
    });
  } catch (e) {
    console.error('[loadPartials] error:', e);
  }
}

// ------------------------
// Bulk load partials
// ------------------------
window.addEventListener('DOMContentLoaded', () => {
  [
    ['header', 'header.html'],
    ['hero', 'hero.html'],
    ['benefits', 'benefits.html'],
    ['other_product', 'other_product.html'],
    ['featured', 'featured.html'],
    ['spotlight', 'spotlight.html'],
    ['popular', 'popular.html'],
    ['quote', 'quote.html'],
    ['offers', 'offers.html'],
    ['newsletter', 'newsletter.html'],
    ['articles', 'articles.html'],
    ['footer', 'footer.html'],
  ].forEach(([id, file]) => loadPartial(id, file));
});

// ------------------------
// AUTH + HEADER UI
// ------------------------
function setupAuthAndHeaderUI() {
  const token = localStorage.getItem('gonotes_token');
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem('gonotes_user') || '{}');
  } catch {
    user = null;
  }

  const currentPage = window.location.pathname.toLowerCase();
  const isInPages = currentPage.includes('/pages/');

  // 🔒 Only these pages need login
  const protectedPages = [
    'my-notes.html',
    'checkout.html',
    'orders.html',
    'payment.html',
  ];

  const isProtected = protectedPages.some((p) =>
    currentPage.includes(p)
  );

  // Redirect unauthenticated users
  if (!token && isProtected) {
    window.location.href = isInPages
      ? './login.html'
      : '/pages/login.html';
    return;
  }

  // Header elements
  const loginLink = document.getElementById('loginLink');
  const myNotesLink = document.getElementById('myNotesLink');
  const userMenu = document.getElementById('userMenu');
  const userMenuToggle = document.getElementById('userMenuToggle');
  const userDropdown = document.getElementById('userDropdown');
  const userInitial = document.getElementById('userInitial');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const logoutBtn = document.getElementById('logoutBtn');

  const myNotesItemMobile =
    document.getElementById('myNotesItemMobile');
  const loginItemMobile =
    document.getElementById('loginItemMobile');

  if (token && user) {
    if (loginLink) loginLink.style.display = 'none';
    if (loginItemMobile) loginItemMobile.style.display = 'none';

    if (myNotesLink) myNotesLink.style.display = 'inline-flex';
    if (myNotesItemMobile)
      myNotesItemMobile.style.display = 'block';
    if (userMenu) userMenu.style.display = 'inline-flex';

    const name = user.name || user.email || 'User';
    const email = user.email || '';
    const initial = name.charAt(0).toUpperCase();

    if (userInitial) userInitial.textContent = initial;
    if (userNameDisplay) userNameDisplay.textContent = name;
    if (userEmailDisplay) userEmailDisplay.textContent = email;

    if (userMenuToggle && userDropdown) {
      userMenuToggle.onclick = (e) => {
        e.stopPropagation();
        userDropdown.style.display =
          userDropdown.style.display === 'block'
            ? 'none'
            : 'block';
      };
      document.addEventListener(
        'click',
        () => (userDropdown.style.display = 'none')
      );
    }

    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem('gonotes_token');
        localStorage.removeItem('gonotes_user');
        window.location.href = isInPages
          ? './login.html'
          : '/pages/login.html';
      };
    }
  } else {
    if (loginLink) loginLink.style.display = 'inline-flex';
    if (loginItemMobile)
      loginItemMobile.style.display = 'block';

    if (myNotesLink) myNotesLink.style.display = 'none';
    if (myNotesItemMobile)
      myNotesItemMobile.style.display = 'none';
    if (userMenu) userMenu.style.display = 'none';
  }
}
