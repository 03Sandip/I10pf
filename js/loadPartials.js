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

    const computedPrefix = (() => {
      if (siteBase) {
        return siteBase.endsWith('/') ? siteBase : siteBase + '/';
      }
      return inPagesFolder ? '../' : '';
    })();

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

    // images
    container.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (!src) return;
      if (shouldPrefix(src)) img.setAttribute('src', computedPrefix + src);
    });

    // anchors
    container.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (shouldPrefix(href)) a.setAttribute('href', computedPrefix + href);
    });

    // css links
    container.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      if (shouldPrefix(href)) link.setAttribute('href', computedPrefix + href);
    });

    // scripts
    container.querySelectorAll('script').forEach((s) => {
      const src = s.getAttribute('src');
      if (!src) return;
      if (shouldPrefix(src)) {
        const newSrc = computedPrefix + src;
        const newScript = document.createElement('script');
        Array.from(s.attributes).forEach((attr) => {
          if (attr.name === 'src') return;
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.src = newSrc;
        s.parentNode.replaceChild(newScript, s);
      }
    });

    // dynamic logo
    const logo = container.querySelector('#appLogo');
    if (logo) {
      const dataLogo = logo.getAttribute('data-logo') || 'images/gonotes.png';
      let resolved;
      if (dataLogo.startsWith('/')) {
        resolved = siteBase
          ? (siteBase.endsWith('/') ? siteBase.slice(0, -1) : siteBase) +
            dataLogo
          : dataLogo;
      } else if (/^(?:[a-z]+:)?\/\//i.test(dataLogo)) {
        resolved = dataLogo;
      } else {
        resolved = computedPrefix + dataLogo;
      }
      logo.setAttribute('src', resolved);
    }

    // optional data-init hooks
    container.querySelectorAll('[data-init]').forEach((el) => {
      const fnName = el.getAttribute('data-init');
      try {
        if (fnName && typeof window[fnName] === 'function') window[fnName](el);
      } catch (e) {
        console.warn('data-init callback error', fnName, e);
      }
    });
  } catch (err) {
    console.error('Error loading partial:', partialPath, err);
  }
}

// Load partials
window.addEventListener('DOMContentLoaded', () => {
  loadPartial('header', 'header.html');
  loadPartial('hero', 'hero.html');
  loadPartial('benefits', 'benefits.html');
  loadPartial('other_product', 'other_product.html');
  loadPartial('featured', 'featured.html');
  loadPartial('spotlight', 'spotlight.html');
  loadPartial('popular', 'popular.html');
  loadPartial('quote', 'quote.html');
  loadPartial('offers', 'offers.html');
  loadPartial('newsletter', 'newsletter.html');
  loadPartial('articles', 'articles.html');
  loadPartial('footer', 'footer.html');
});

/* =========================
   AUTH + HEADER UI HANDLING
   ========================= */

function setupAuthAndHeaderUI() {
  const token = localStorage.getItem('gn_token');
  let user = null;
  const rawUser = localStorage.getItem('gn_user');
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = null;
    }
  }

  const currentPage = window.location.pathname.toLowerCase();
  const isInPages = currentPage.includes('/pages/');
  const publicPages = ['login.html', 'signup.html', 'index.html'];
  const isPublic = publicPages.some((p) => currentPage.includes(p));

  // Protect non-public pages (optional)
  if (!token && !isPublic) {
    console.log('Redirecting to login (no token)');
    const target = isInPages ? './login.html' : '/pages/login.html';
    window.location.href = target;
    return;
  }

  // Desktop header elements
  const loginLink = document.getElementById('loginLink');
  const myNotesLink = document.getElementById('myNotesLink');
  const userMenu = document.getElementById('userMenu');
  const userMenuToggle = document.getElementById('userMenuToggle');
  const userDropdown = document.getElementById('userDropdown');
  const userInitial = document.getElementById('userInitial');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const logoutBtn = document.getElementById('logoutBtn');

  // Mobile header elements
  const myNotesItemMobile = document.getElementById('myNotesItemMobile');
  const loginItemMobile = document.getElementById('loginItemMobile');

  if (token && user) {
    // ---- LOGGED IN STATE ----
    if (loginLink) loginLink.style.display = 'none';
    if (loginItemMobile) loginItemMobile.style.display = 'none';

    if (myNotesLink) myNotesLink.style.display = 'inline-flex';
    if (myNotesItemMobile) myNotesItemMobile.style.display = 'block';
    if (userMenu) userMenu.style.display = 'inline-flex';

    const name = user.name || user.email || 'User';
    const email = user.email || '';
    const initial = name.trim().charAt(0).toUpperCase() || 'U';

    if (userInitial) userInitial.textContent = initial;
    if (userNameDisplay) userNameDisplay.textContent = name;
    if (userEmailDisplay) userEmailDisplay.textContent = email;

    // Dropdown toggle
    if (userMenuToggle && userDropdown) {
      userMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.style.display =
          userDropdown.style.display === 'block' ? 'none' : 'block';
      });

      document.addEventListener('click', () => {
        userDropdown.style.display = 'none';
      });
    }

    // Logout logic
    if (logoutBtn) {
      const API_BASE =
        (window.SERVER_URL && String(window.SERVER_URL).replace(/\/+$/, '')) ||
        (window.API_BASE && String(window.API_BASE).replace(/\/+$/, '')) ||
        'http://localhost:5000';

      logoutBtn.addEventListener('click', async () => {
        try {
          await fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + token,
            },
          });
        } catch (e) {
          console.warn('Logout request failed, clearing token anyway.');
        }

        localStorage.removeItem('gn_token');
        localStorage.removeItem('gn_user');

        const target = isInPages ? './login.html' : '/pages/login.html';
        window.location.href = target;
      });
    }
  } else {
    // ---- LOGGED OUT STATE ----
    if (loginLink) loginLink.style.display = 'inline-flex';
    if (loginItemMobile) loginItemMobile.style.display = 'block';

    if (myNotesLink) myNotesLink.style.display = 'none';
    if (myNotesItemMobile) myNotesItemMobile.style.display = 'none';
    if (userMenu) userMenu.style.display = 'none';
  }
}

// Execute auth + header logic after partials have (likely) loaded
setTimeout(setupAuthAndHeaderUI, 600);
