// app.js - orchestrates landing page behavior, preview modal and cart (mock)
const state = { cart: [], notes: [], featured: [], popular: [], offers: [], articles: [], hero: [], benefits: [] };

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

async function init(){
  // wire simple controls
  $('#searchInput').addEventListener('input', onSearch);
  $('#streamFilter').addEventListener('change', applyFilters);
  $('#semesterFilter').addEventListener('change', applyFilters);
  $('#cartBtn').addEventListener('click', openCart);
  $('#closePreview').addEventListener('click', ()=>setModal('#previewModal', false));
  $('#closeCart').addEventListener('click', ()=>setModal('#cartModal', false));
  $('#checkoutBtn').addEventListener('click', doCheckout);
  $('#buyFromPreview').addEventListener('click', buyFromPreview);
  $('#downloadPreview').addEventListener('click', downloadPreview);
  document.getElementById('newsletterForm').addEventListener('submit', e=>{ e.preventDefault(); alert('Subscribed!'); });

  // fetch data
  const [notes, featured, popular, offers, articles, hero, benefits] = await Promise.all([
    GnAPI.fetchNotes(), GnAPI.fetchFeatured(), GnAPI.fetchPopular(), GnAPI.fetchOffers(), GnAPI.fetchArticles(), GnAPI.fetchHero(), GnAPI.fetchBenefits()
  ]);
  state.notes = notes; state.featured = featured; state.popular = popular; state.offers = offers; state.articles = articles; state.hero = hero; state.benefits = benefits;

  populateHero();
  populateBenefits();
  populateFilters();
  renderFeatured();
  renderPopular();
  renderOffers();
  renderArticles();
  initHeroSlider();
  updateCartUI();
}

function populateHero(){
  const container = $('#heroSlider');
  container.innerHTML = '';
  state.hero.forEach((h,i)=> {
    const slide = createHeroSlide(h);
    if(i===0) slide.classList.add('active');
    container.appendChild(slide);
  });
}

function initHeroSlider(){
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  if(!slides.length) return;
  let idx = 0;
  setInterval(()=> {
    slides[idx].classList.remove('active');
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add('active');
  }, 4000);
}

function populateBenefits(){
  const el = $('#benefitGrid');
  el.innerHTML = '';
  state.benefits.forEach(b => {
    const d = document.createElement('div'); d.className='benefit';
    d.innerHTML = `<div class="icon" style="font-size:22px">${b.icon}</div><div class="label">${b.label}</div>`;
    el.appendChild(d);
  });
}

function populateFilters(){
  const streams = Array.from(new Set(state.notes.map(n=>n.stream)));
  const sems = Array.from(new Set(state.notes.map(n=>n.semester))).sort((a,b)=>a-b);
  const s = $('#streamFilter'); streams.forEach(v => { const o = document.createElement('option'); o.value=v; o.textContent=v; s.appendChild(o); });
  const sem = $('#semesterFilter'); sems.forEach(v=>{ const o = document.createElement('option'); o.value=v; o.textContent='Sem '+v; sem.appendChild(o); });
}

function renderFeatured(){
  const el = $('#featuredList'); el.innerHTML='';
  state.featured.forEach(n=> el.appendChild(createNoteCard(n)));
  attachCardEvents(el);
}

function renderPopular(){
  const el = $('#popularList'); el.innerHTML='';
  state.popular.forEach(n=> el.appendChild(createNoteCard(n)));
  attachCardEvents(el);
}

function renderOffers(){
  const el = $('#offersList'); el.innerHTML='';
  state.offers.forEach(n=> el.appendChild(createOfferCard(n)));
  // offers usually don't need events here
}

function renderArticles(){
  const el = $('#articlesList'); el.innerHTML='';
  state.articles.forEach(a=> el.appendChild(createArticleCard(a)));
}

function attachCardEvents(root){
  root.querySelectorAll('.small[data-action="preview"]').forEach(b=> b.addEventListener('click', onPreviewClick));
  root.querySelectorAll('.small[data-action="buy"]').forEach(b=> b.addEventListener('click', onAddToCart));
}

function onSearch(){ applyFilters(); }

function applyFilters(){
  const q = $('#searchInput').value.trim().toLowerCase();
  const stream = $('#streamFilter').value;
  const sem = $('#semesterFilter').value;
  const list = state.notes.filter(n=>{
    const matchesQ = !q || (n.title + ' ' + n.description + ' ' + n.stream).toLowerCase().includes(q);
    const matchesS = !stream || n.stream === stream;
    const matchesSem = !sem || n.semester === sem;
    return matchesQ && matchesS && matchesSem;
  });
  // show filtered in featured area for quick demo
  const el = $('#featuredList'); el.innerHTML='';
  list.slice(0,8).forEach(n=> el.appendChild(createNoteCard(n)));
  attachCardEvents(el);
}

async function onPreviewClick(e){
  const id = e.currentTarget.dataset.id;
  const note = await GnAPI.getNoteById(id);
  if(!note) return alert('Note not found');
  showPreview(note);
}

function showPreview(note){
  const modal = $('#previewModal');
  const body = $('#previewBody');
  body.innerHTML = `<h3>${escapeHtml(note.title)}</h3><p class="meta">${escapeHtml(note.stream)} • Sem ${escapeHtml(note.semester)}</p><p>${escapeHtml(note.description)}</p>`;
  if(note.previewUrl){
    const iframe = document.createElement('iframe');
    iframe.style.width='100%'; iframe.style.height='420px'; iframe.src = note.previewUrl; iframe.className='preview-embed';
    body.appendChild(iframe);
    modal.dataset.current = note.id;
  }
  setModal('#previewModal', true);
}

function setModal(sel, open){
  const el = document.querySelector(sel);
  if(open){ el.setAttribute('aria-hidden','false'); }
  else { el.setAttribute('aria-hidden','true'); if(sel === '#previewModal') { $('#previewBody').innerHTML=''; delete el.dataset.current; } }
}

/* Cart logic (simple) */
function onAddToCart(e){
  const id = e.currentTarget.dataset.id;
  GnAPI.getNoteById(id).then(note=>{
    if(!note) return;
    const found = state.cart.find(i=>i.id===note.id);
    if(found) found.qty++;
    else state.cart.push(Object.assign({qty:1}, note));
    updateCartUI();
    alert('Added to cart');
  });
}

function updateCartUI(){
  $('#cartCount').textContent = state.cart.reduce((s,i)=> s + i.qty, 0);
}

function openCart(){
  renderCart();
  setModal('#cartModal', true);
}

function renderCart(){
  const el = $('#cartItems'); el.innerHTML='';
  if(!state.cart.length){ el.innerHTML='<p>No items in cart.</p>'; $('#cartTotal').textContent='0.00'; return; }
  state.cart.forEach(item=>{
    const row = document.createElement('div'); row.className='cart-item'; row.style.display='flex'; row.style.justifyContent='space-between'; row.style.padding='8px 0';
    row.innerHTML = `<div><strong>${escapeHtml(item.title)}</strong><div class="meta">Qty: ${item.qty}</div></div><div>₹${(item.qty*item.price).toFixed(2)}</div>`;
    el.appendChild(row);
  });
  const total = state.cart.reduce((s,i)=> s + i.qty*i.price, 0);
  $('#cartTotal').textContent = total.toFixed(2);
}

function doCheckout(){
  if(!state.cart.length) return alert('Cart empty');
  alert('Mock checkout — purchase simulated.');
  state.cart = [];
  updateCartUI();
  setModal('#cartModal', false);
}

/* Preview actions */
function buyFromPreview(){
  const m = $('#previewModal'); const id = m.dataset.current;
  if(!id) return alert('No note selected');
  GnAPI.getNoteById(id).then(note => { if(note){ const found = state.cart.find(i=>i.id===note.id); if(found) found.qty++; else state.cart.push(Object.assign({qty:1}, note)); updateCartUI(); setModal('#previewModal', false); alert('Added to cart'); } });
}
function downloadPreview(){
  const id = $('#previewModal').dataset.current;
  if(!id) return alert('No preview');
  GnAPI.getNoteById(id).then(n => { if(n && n.previewUrl) window.open(n.previewUrl, '_blank'); else alert('No preview file'); });
}

/* small util (same as components) */
function escapeHtml(str){
  if(!str && str !== 0) return '';
  return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

document.addEventListener('DOMContentLoaded', init);
