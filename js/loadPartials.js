// js/loadPartials.js
// Robust partial loader + asset-path fixer + header auth handling via data-init

// ------------------------
// Utility helpers
// ------------------------
function isRelativeAsset(url) {
  if (!url) return false;
  const t = String(url).trim();
  return (
    !/^(?:[a-z]+:)?\/\//i.test(t) && // not protocol-relative or absolute
    !t.startsWith('/') &&
    !t.startsWith('data:') &&
    !t.startsWith('mailto:')
  );
}

function computeAssetPrefix() {
  const inPagesFolder = window.location.pathname.includes('/pages/');
  const siteBase = (typeof window.__SITE_BASE__ === 'string' && window.__SITE_BASE__) || '';
  if (siteBase) return siteBase.endsWith('/') ? siteBase : siteBase + '/';
  return inPagesFolder ? '../' : '';
}

function injectStylesheetHref(href) {
  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.crossOrigin = 'anonymous';
    link.onload = () => console.debug('[loadPartials] stylesheet loaded:', href);
    link.onerror = (e) => console.warn('[loadPartials] stylesheet failed:', href, e);
    document.head.appendChild(link);
  } catch (e) {
    console.warn('[loadPartials] injectStylesheetHref error', href, e);
  }
}

// load external scripts sequentially (preserves order)
function loadScriptsSequentially(urls) {
  return urls.reduce((p, url) => {
    return p.then(() => new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = false;
      s.onload = () => {
        console.debug('[loadPartials] external script loaded:', url);
        resolve(true);
      };
      s.onerror = (ev) => {
        console.warn('[loadPartials] external script failed:', url, ev);
        resolve(false); // continue even on failure
      };
      document.head.appendChild(s);
    }));
  }, Promise.resolve());
}

// Execute inline script text in a safe manner
function executeInlineScript(jsText) {
  try {
    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.text = jsText;
    document.head.appendChild(s);
  } catch (e) {
    console.error('[loadPartials] executeInlineScript error', e);
  }
}

// ------------------------
// Partial loader
// ------------------------
async function loadPartial(targetId, fileName) {
  const container = document.getElementById(targetId);
  if (!container) {
    console.debug('[loadPartial] target not found:', targetId);
    return;
  }

  const inPagesFolder = window.location.pathname.includes('/pages/');
  const partialsBase = inPagesFolder ? '../partials/' : 'partials/';
  const partialPath = partialsBase + fileName;
  const assetPrefix = computeAssetPrefix();

  try {
    console.debug('[loadPartials] fetching partial ->', partialPath);
    const resp = await fetch(partialPath, { cache: 'no-cache' });
    if (!resp.ok) {
      console.warn('[loadPartials] failed to fetch partial', partialPath, resp.status);
      return;
    }
    const rawHtml = await resp.text();

    // Parse with DOMParser to avoid partial/incomplete script append issues
    const parser = new DOMParser();
    const parsed = parser.parseFromString(rawHtml, 'text/html');

    if (!parsed || !parsed.body) {
      console.warn('[loadPartials] parsed partial looks invalid:', partialPath);
      return;
    }

    // Clear container and adopt nodes (except <script> and <link>)
    container.innerHTML = ''; // reset container
    const scriptsToHandle = [];

    // Move nodes from parsed.body into container (but do not directly append <script> or <link>)
    Array.from(parsed.body.childNodes).forEach((node) => {
      // handle <link rel="stylesheet">: move to head (resolve path)
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'link' &&
          (node.getAttribute('rel') || '').toLowerCase() === 'stylesheet') {
        const href = node.getAttribute('href');
        if (href) {
          const finalHref = isRelativeAsset(href) ? (assetPrefix + href) : href;
          injectStylesheetHref(finalHref);
        }
        return; // skip appending to container
      }

      // Collect <script> elements separately
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'script') {
        scriptsToHandle.push(node);
        return;
      }

      // For other element nodes, adjust <img> and <a> attributes inside them then append
      if (node.nodeType === Node.ELEMENT_NODE) {
        // fix images inside this node
        node.querySelectorAll && node.querySelectorAll('img').forEach(img => {
          const s = img.getAttribute('src') || img.getAttribute('data-src');
          if (s && isRelativeAsset(s)) img.src = assetPrefix + s;
        });
        // fix anchors inside this node
        node.querySelectorAll && node.querySelectorAll('a').forEach(a => {
          const h = a.getAttribute('href');
          if (h && isRelativeAsset(h)) a.href = assetPrefix + h;
        });
      }

      // import node into current document to avoid document ownership errors
      try {
        const imported = document.importNode(node, true);
        container.appendChild(imported);
      } catch (e) {
        // fallback: use innerHTML append for safer recovery
        try {
          const wrapper = document.createElement('div');
          wrapper.appendChild(node.cloneNode(true));
          container.appendChild(wrapper);
        } catch (err) {
          console.warn('[loadPartials] failed to append node for', targetId, err);
        }
      }
    });

    // Now handle scripts: collect external urls and inline code (preserve order)
    const externalScriptUrls = [];
    const inlineScriptTexts = [];

    for (const s of scriptsToHandle) {
      const src = s.getAttribute && s.getAttribute('src');
      if (src) {
        const finalSrc = isRelativeAsset(src) ? (assetPrefix + src) : src;
        externalScriptUrls.push(finalSrc);
      } else {
        inlineScriptTexts.push(s.textContent || s.innerText || '');
      }
    }

    // Load external scripts first (sequentially) then run inline scripts
    if (externalScriptUrls.length) {
      await loadScriptsSequentially(externalScriptUrls);
    }

    if (inlineScriptTexts.length) {
      inlineScriptTexts.forEach(executeInlineScript);
    }

    // Attempt to resolve and set logo src if present
    const logo = container.querySelector('#appLogo');
    if (logo) {
      const dataLogo = logo.getAttribute('data-logo') || 'images/gonotes.png';
      let resolved;
      if (dataLogo.startsWith('/')) resolved = dataLogo;
      else if (/^(?:[a-z]+:)?\/\//i.test(dataLogo)) resolved = dataLogo;
      else resolved = assetPrefix + dataLogo;
      logo.src = resolved;
    }

    // Run data-init hooks (run after scripts so functions are available)
    container.querySelectorAll('[data-init]').forEach((el) => {
      const fnName = el.getAttribute('data-init');
      if (fnName && typeof window[fnName] === 'function') {
        try {
          window[fnName](el);
          console.debug('[loadPartials] ran data-init:', fnName, 'for', fileName);
        } catch (err) {
          console.error('[loadPartials] data-init error for', fnName, err);
        }
      } else if (fnName) {
        // not found yet — log but don't throw
        console.debug('[loadPartials] data-init function not found yet:', fnName, 'for', fileName);
      }
    });

    // Special-case: if this is articles partial and window.articles not present,
    // try loading common fallback paths for js/articles.js then rerun data-init hooks.
    if (fileName.toLowerCase().includes('articles')) {
      const needArticles = !(Array.isArray(window.articles));
      if (needArticles) {
        const candidates = [ assetPrefix + 'js/articles.js', '/js/articles.js', './js/articles.js', '../js/articles.js' ];
        for (const p of candidates) {
          try {
            await new Promise((resolve) => {
              const s = document.createElement('script');
              s.src = p;
              s.async = false;
              s.onload = () => resolve(true);
              s.onerror = () => resolve(false);
              document.head.appendChild(s);
              // small delay to allow execution
              setTimeout(resolve, 150);
            });
            if (Array.isArray(window.articles)) break;
          } catch (e) {
            /* continue */
          }
        }
        // rerun data-init hooks again in case they depend on window.articles
        container.querySelectorAll('[data-init]').forEach((el) => {
          const fnName = el.getAttribute('data-init');
          if (fnName && typeof window[fnName] === 'function') {
            try { window[fnName](el); } catch (err) { console.error('[loadPartials] data-init retry', fnName, err); }
          }
        });
      }
    }

    console.debug('[loadPartials] injected partial:', partialPath);
  } catch (err) {
    console.error('[loadPartials] caught error loading partial:', partialPath, err);
  }
}

// ------------------------
// Bulk load list & DOM ready
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
  ].forEach(([id, file]) => {
    // schedule asynchronously to avoid blocking
    setTimeout(() => loadPartial(id, file), 0);
  });
});

// ------------------------
// AUTH + HEADER UI HANDLING (unchanged logic)
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

  const publicPages = [
    'index.html',
    'login.html',
    'signup.html',
    'shop.html',
    'cart.html',
    'forgot-password.html'
  ];

  const isRoot = currentPage === '/' || currentPage === '';
  const isPublic = isRoot || publicPages.some((p) => currentPage.includes(p));

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

    if (logoutBtn) {
      logoutBtn.onclick = async () => {
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
          // ignore
        }

        localStorage.removeItem('gonotes_token');
        localStorage.removeItem('gonotes_user');

        const target = isInPages ? './login.html' : '/pages/login.html';
        window.location.href = target;
      };
    }
  } else {
    if (loginLink) loginLink.style.display = 'inline-flex';
    if (loginItemMobile) loginItemMobile.style.display = 'block';

    if (myNotesLink) myNotesLink.style.display = 'none';
    if (myNotesItemMobile) myNotesItemMobile.style.display = 'none';
    if (userMenu) userMenu.style.display = 'none';
  }
}
