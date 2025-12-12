// components.js - small helpers to render HTML fragments

/* -------------------------
   NOTE CARD (Shop items)
--------------------------*/
function createNoteCard(note){
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `
    <img src="${escapeHtml(note.img)}" alt="${escapeHtml(note.title)}">
    <h4>${escapeHtml(note.title)}</h4>
    <div class="meta">${escapeHtml(note.stream)} • Sem ${escapeHtml(note.semester)}</div>

    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div class="price">₹${Number(note.price).toFixed(2)}</div>

      <div>
        <button class="small" data-action="preview" data-id="${note.id}">Preview</button>
        <button class="small" data-action="buy" data-id="${note.id}">Add</button>
      </div>
    </div>
  `;
  return div;
}


/* -------------------------
   ARTICLE CARD (Simple grid)
   - This is *not* your new slider.
   - Used only in pages like "Blog" list view.
--------------------------*/
function createArticleCard(a){
  const div = document.createElement('div');
  div.className = 'article';

  div.innerHTML = `
    <img src="${escapeHtml(a.img || a.image || '')}" 
         alt="${escapeHtml(a.title || '')}">
    
    <h4>${escapeHtml(a.title || '')}</h4>

    <p class="meta">${escapeHtml(a.excerpt || '')}</p>
  `;

  return div;
}


/* -------------------------
   OFFER CARD
--------------------------*/
function createOfferCard(note){
  const d = document.createElement('div');
  d.className = 'card';
  d.style.minWidth = '180px';

  d.innerHTML = `
    <img src="${escapeHtml(note.img)}" alt="${escapeHtml(note.title)}">
    
    <h4>${escapeHtml(note.title)}</h4>
    
    <div class="meta">
      Offer price:
      <span class="price">₹${Number(note.price * 0.8).toFixed(2)}</span>
    </div>
  `;

  return d;
}


/* -------------------------
   HERO SLIDE (Homepage Banner)
--------------------------*/
function createHeroSlide(h){
  const el = document.createElement('div');
  el.className = 'hero-slide';
  el.style.backgroundImage = `url(${escapeHtml(h.img)})`;

  el.innerHTML = `
    <div class="hero-overlay" 
         style="background:rgba(0,0,0,0.18);position:absolute;inset:0;">
    </div>
  `;

  return el;
}


/* -------------------------
   GLOBAL HTML ESCAPER (XSS safe)
--------------------------*/
function escapeHtml(str){
  if (!str && str !== 0) return '';

  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
