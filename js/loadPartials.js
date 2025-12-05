// js/loadPartials.js
// Dynamic partial loader + asset-path fixer + dynamic logo handling

async function loadPartial(targetId, fileName) {
  const container = document.getElementById(targetId);
  if (!container) return;

  const inPagesFolder = window.location.pathname.includes('/pages/');
  const siteBase =
    (typeof window.__SITE_BASE__ === 'string' && window.__SITE_BASE__) || '';

  const partialsBase = inPagesFolder ? '../partials/' : 'partials/';
  const partialPath = partialsBase + fileName;

  try {
    const response = await fetch(partialPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    container.innerHTML = html;

    const computedPrefix = siteBase
      ? (siteBase.endsWith('/') ? siteBase : siteBase + '/')
      : (inPagesFolder ? '../' : '');

    const shouldPrefix = (url) => {
      if (!url) return false;
      const t = url.trim();
      return (
        !/^(?:[a-z]+:)?\/\//i.test(t) &&
        !t.startsWith('/') &&
        !t.startsWith('data:') &&
        !t.startsWith('mailto:')
      );
    };

    // Fix <img>
    container.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && shouldPrefix(src)) img.src = computedPrefix + src;
    });

    // Fix <a>
    container.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href && shouldPrefix(href)) a.href = computedPrefix + href;
    });

    // Fix CSS
    container.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && shouldPrefix(href)) link.href = computedPrefix + href;
    });

    // Fix scripts
    container.querySelectorAll('script').forEach((s) => {
      const src = s.getAttribute('src');
      if (src && shouldPrefix(src)) {
        const newScript = document.createElement('script');
        Array.from(s.attributes).forEach((attr) => {
          if (attr.name !== 'src') newScript.setAttribute(attr.name, attr.value);
        });
        newScript.src = computedPrefix + src;
        s.parentNode.replaceChild(newScript, s);
      }
    });

    // Fix logo
    const logo = container.querySelector('#appLogo');
    if (logo) {
      const dataLogo = logo.getAttribute('data-logo') || 'images/gonotes.png';
      let resolved;

      if (dataLogo.startsWith('/')) resolved = dataLogo;
      else if (/^(?:[a-z]+:)?\/\//i.test(dataLogo)) resolved = dataLogo;
      else resolved = computedPrefix + dataLogo;

      logo.src = resolved;
    }

    // Hooks: data-init
    container.querySelectorAll('[data-init]').forEach((el) => {
      const fnName = el.getAttribute('data-init');
      if (fnName && typeof window[fnName] === 'function') {
        try {
          window[fnName](el);
        } catch (e) {}
      }
    });

  } catch (err) {
    console.error('Error loading partial:', partialPath, err);
  }
}

// Load all partials
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

/* =========================
   AUTH + HEADER UI HANDLING
   ========================= */

function setupAuthAndHeaderUI() {
  // ✅ use the same keys as login.js / buynow.js / mynotes.js
  const token = localStorage.getItem('gonotes_token');
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem('gonotes_user') || '{}');
  } catch {
    user = null;
  }

  const currentPage = window.location.pathname.toLowerCase();
  const isInPages = currentPage.includes('/pages/');

  const publicPages = [
    'index.html',
    'login.html',
    'signup.html',
    'shop.html',
    'cart.html'
  ];

  const isRoot = currentPage === '/' || currentPage === '';
  const isPublic = isRoot || publicPages.some((p) => currentPage.includes(p));

  // If not logged in and page is not public → redirect to login
  if (!token && !isPublic) {
    const target = isInPages ? './login.html' : '/pages/login.html';
    window.location.href = target;
    return;
  }

  const loginLink = document.getElementById('loginLink');
  const myNotesLink = document.getElementById('myNotesLink');
  const userMenu = document.getElementById('userMenu');
  const userMenuToggle = document.getElementById('userMenuToggle');
  const userDropdown = document.getElementById('userDropdown');
  const userInitial = document.getElementById('userInitial');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const logoutBtn = document.getElementById('logoutBtn');

  const myNotesItemMobile = document.getElementById('myNotesItemMobile');
  const loginItemMobile = document.getElementById('loginItemMobile');

  if (token && user) {
    // ===== LOGGED IN STATE =====

    // Hide login, show My Notes + user menu
    if (loginLink) loginLink.style.display = 'none';
    if (loginItemMobile) loginItemMobile.style.display = 'none';

    if (myNotesLink) myNotesLink.style.display = 'inline-flex';
    if (myNotesItemMobile) myNotesItemMobile.style.display = 'block';
    if (userMenu) userMenu.style.display = 'inline-flex';

    const name = user.name || user.email || 'User';
    const email = user.email || '';
    const initial = name.charAt(0).toUpperCase();

    if (userInitial) userInitial.textContent = initial;
    if (userNameDisplay) userNameDisplay.textContent = name;
    if (userEmailDisplay) userEmailDisplay.textContent = email;

    // Toggle dropdown menu
    if (userMenuToggle && userDropdown) {
      userMenuToggle.onclick = (e) => {
        e.stopPropagation();
        userDropdown.style.display =
          userDropdown.style.display === 'block' ? 'none' : 'block';
      };
      document.addEventListener('click', () => {
        userDropdown.style.display = 'none';
      });
    }

    // ===== LOGOUT =====
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        // Build API base from SERVER_URL (used everywhere else)
        let AUTH_BASE = '/api';
        if (window.SERVER_URL) {
          const root = window.SERVER_URL.replace(/\/+$/, '');
          AUTH_BASE = root + '/api';
        }

        try {
          await fetch(`${AUTH_BASE}/auth/logout`, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
          });
        } catch (e) {
          // ignore network errors, we'll still clear localStorage
        }

        // Clear new keys
        localStorage.removeItem('gonotes_token');
        localStorage.removeItem('gonotes_user');

        const target = isInPages ? './login.html' : '/pages/login.html';
        window.location.href = target;
      };
    }
  } else {
    // ===== LOGGED OUT STATE =====
    if (loginLink) loginLink.style.display = 'inline-flex';
    if (loginItemMobile) loginItemMobile.style.display = 'block';

    if (myNotesLink) myNotesLink.style.display = 'none';
    if (myNotesItemMobile) myNotesItemMobile.style.display = 'none';
    if (userMenu) userMenu.style.display = 'none';
  }
}

// Run after partials & header HTML are injected
setTimeout(setupAuthAndHeaderUI, 600);
