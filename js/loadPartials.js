// js/loadPartials.js
// Dynamic partial loader + asset-path fixer + dynamic logo handling
// Optional: set window.__SITE_BASE__ = '/repo/' if your site is hosted under a subpath

async function loadPartial(targetId, fileName) {
  const container = document.getElementById(targetId);
  if (!container) return;

  const inPagesFolder = window.location.pathname.includes('/pages/');
  // optional global override for hosted subpath (e.g. '/repo/')
  const siteBase = (typeof window.__SITE_BASE__ === 'string' && window.__SITE_BASE__) || '';

  // where partials live relative to current page
  const partialsBase = inPagesFolder ? '../partials/' : 'partials/';
  const partialPath = partialsBase + fileName;

  try {
    const response = await fetch(partialPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    container.innerHTML = html;

    // compute prefix for relative assets inside the injected partial
    // precedence: explicit siteBase > inPagesFolder ? '../' : '' (root)
    const computedPrefix = (() => {
      if (siteBase) {
        // ensure it ends with '/'
        return siteBase.endsWith('/') ? siteBase : siteBase + '/';
      }
      return inPagesFolder ? '../' : '';
    })();

    // helper: should prefix only non-absolute, non-data URLs
    const shouldPrefix = (url) => {
      if (!url) return false;
      const t = url.trim();
      return !/^(?:[a-z]+:)?\/\//i.test(t) && !t.startsWith('/') && !t.startsWith('data:') && !t.startsWith('mailto:');
    };

    // Rewrite src/href for specific elements inside container
    // images
    container.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (!src) return;
      if (shouldPrefix(src)) img.setAttribute('src', computedPrefix + src);
      // if absolute (starts with '/'), leave as-is, if external leave as-is
    });

    // anchors: (for downloads / internal pages)
    container.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (shouldPrefix(href)) a.setAttribute('href', computedPrefix + href);
    });

    // link tags (css)
    container.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      if (shouldPrefix(href)) link.setAttribute('href', computedPrefix + href);
    });

    // script tags with relative src: replace and reload
    container.querySelectorAll('script').forEach(s => {
      const src = s.getAttribute('src');
      if (!src) return;
      if (shouldPrefix(src)) {
        const newSrc = computedPrefix + src;
        const newScript = document.createElement('script');
        // copy attributes except src
        Array.from(s.attributes).forEach(attr => {
          if (attr.name === 'src') return;
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.src = newSrc;
        s.parentNode.replaceChild(newScript, s);
      }
    });

    // === dynamic logo handling ===
    // if partial included <img id="appLogo" data-logo="path">, set src computed properly
    const logo = container.querySelector('#appLogo');
    if (logo) {
      const dataLogo = logo.getAttribute('data-logo') || 'images/gonotes.png';
      // if dataLogo is absolute (starts with '/'), use siteBase if provided, else use it as absolute
      let resolved;
      if (dataLogo.startsWith('/')) {
        // absolute from site root; if siteBase provided, prefix it
        resolved = siteBase ? (siteBase.endsWith('/') ? siteBase.slice(0, -1) : siteBase) + dataLogo : dataLogo;
      } else if (/^(?:[a-z]+:)?\/\//i.test(dataLogo)) {
        // external URL (http:// or https://) -> use directly
        resolved = dataLogo;
      } else {
        // relative -> prefix with computedPrefix
        resolved = computedPrefix + dataLogo;
      }
      logo.setAttribute('src', resolved);
    }

    // optional: run initialization callback if partial included an element with data-init attribute
    // example: <div data-init="heroInit"></div> and you expose heroInit() in global
    container.querySelectorAll('[data-init]').forEach(el => {
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

// list of partials to load (same order used before)
window.addEventListener('DOMContentLoaded', () => {
  loadPartial('header', 'header.html');
  loadPartial('hero', 'hero.html');
  loadPartial('benefits', 'benefits.html');
  loadPartial('featured', 'featured.html');
  loadPartial('spotlight', 'spotlight.html');
  loadPartial('popular', 'popular.html');
  loadPartial('quote', 'quote.html');
  loadPartial('offers', 'offers.html');
  loadPartial('newsletter', 'newsletter.html');
  loadPartial('articles', 'articles.html');
  loadPartial('appcta', 'app-cta.html');
  loadPartial('footer', 'footer.html');
});
