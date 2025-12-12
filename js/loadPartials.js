// js/loadPartials.js
// Robust partial loader + asset-path fixer + header auth handling via data-init

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
  const inPagesFolder = window.location.pathname.includes('/pages/');
  return inPagesFolder ? '../' : './';
}

function injectStylesheetHref(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

// Load external scripts sequentially
function loadScriptsSequentially(urls) {
  return urls.reduce((p, url) => {
    return p.then(() => new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = false;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    }));
  }, Promise.resolve());
}

function executeInlineScript(jsText) {
  const s = document.createElement('script');
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
  const partialPath = (inPagesFolder ? '../partials/' : './partials/') + fileName;
  const assetPrefix = computeAssetPrefix();

  try {
    const resp = await fetch(partialPath, { cache: 'no-cache' });
    if (!resp.ok) return;

    const rawHtml = await resp.text();
    const parser = new DOMParser();
    const parsed = parser.parseFromString(rawHtml, 'text/html');

    container.innerHTML = '';
    const scripts = [];

    Array.from(parsed.body.childNodes).forEach((node) => {

      // styles
      if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
        const href = node.getAttribute('href');
        if (href) injectStylesheetHref(isRelativeAsset(href) ? assetPrefix + href : href);
        return;
      }

      // scripts
      if (node.tagName === 'SCRIPT') {
        scripts.push(node);
        return;
      }

      // images & links
      if (node.querySelectorAll) {
        node.querySelectorAll('img').forEach(img => {
          const s = img.getAttribute('src');
          if (s && isRelativeAsset(s)) img.src = assetPrefix + s;
        });

        node.querySelectorAll('a').forEach(a => {
          const h = a.getAttribute('href');
          if (h && isRelativeAsset(h)) a.href = assetPrefix + h;
        });
      }

      container.appendChild(document.importNode(node, true));
    });

    const externalScripts = [];
    const inlineScripts = [];

    scripts.forEach(s => {
      const src = s.getAttribute('src');
      if (src) {
        externalScripts.push(isRelativeAsset(src) ? assetPrefix + src : src);
      } else {
        inlineScripts.push(s.textContent);
      }
    });

    if (externalScripts.length) await loadScriptsSequentially(externalScripts);
    inlineScripts.forEach(executeInlineScript);

    // data-init hooks
    container.querySelectorAll('[data-init]').forEach(el => {
      const fn = el.getAttribute('data-init');
      if (fn && typeof window[fn] === 'function') {
        window[fn](el);
      }
    });

  } catch (e) {
    console.error('[loadPartials]', e);
  }
}

// ------------------------
// Load all partials
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
    user = JSON.parse(localStorage.getItem('gonotes_user'));
  } catch {}

  const inPages = window.location.pathname.includes('/pages/');
  const publicPages = ['index.html', 'login.html', 'signup.html', 'shop.html', 'cart.html'];

  const isRoot = window.location.pathname === '/' || window.location.pathname.endsWith('/');
  const isPublic = isRoot || publicPages.some(p => window.location.pathname.includes(p));

  if (!token && !isPublic) {
    window.location.href = inPages ? './login.html' : './pages/login.html';
    return;
  }
}
