// js/shop.js
// Shop page logic — populates dropdowns from GnAPI so admin changes will appear automatically.

(function () {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const state = {
    notes: [],
    filtered: [],
    cart: []
  };

  // utility
  function formatMoney(n){ return Number(n).toFixed(2); }
  function escapeHtml(s){ if(!s && s !== 0) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

  async function init(){
    // load header/footer partials (if loadPartials.js available)
    if (typeof loadPartial === 'function') {
      // ensure header/footer loaded — loadPartials.js normally runs on DOMContentLoaded for index,
      // but this page might be loaded separately. Try to call explicitly if defined.
      try {
        loadPartial('header','header.html');
        loadPartial('footer','footer.html');
      } catch (e) { /* ignore */ }
    }

    // wire UI
    $('#streamSelect').addEventListener('change', applyFilters);
    $('#semesterSelect').addEventListener('change', applyFilters);
    $('#shopSearch').addEventListener('input', debounce(applyFilters, 200));
    $('#resetFilters').addEventListener('click', resetFilters);
    $('#closePreview').addEventListener('click', ()=> setModal('#previewModal', false));
    $('#buyFromPreview').addEventListener('click', buyFromPreview);
    $('#downloadPreview').addEventListener('click', downloadPreview);
    $('#cartBtn')?.addEventListener('click', openCart);
    $('#closeCart')?.addEventListener('click', ()=> setModal('#cartModal', false));
    $('#checkoutBtn')?.addEventListener('click', doCheckout);

    // fetch data from GnAPI (mock API)
    try {
      const [notes, streams, semesters] = await Promise.all([
        GnAPI.fetchNotes ? GnAPI.fetchNotes() : [],
        GnAPI.getStreams ? GnAPI.getStreams() : [],
        GnAPI.getSemesters ? GnAPI.getSemesters() : []
      ]);

      state.notes = Array.isArray(notes) ? notes : [];
      populateDropdown($('#streamSelect'), streams, 'All Streams');
      populateDropdown($('#semesterSelect'), semesters, 'All Semesters', v => `Sem ${v}`);
      applyFilters();
    } catch (err) {
      console.error('Shop init error', err);
      state.notes = [];
      renderList();
    }
  }

  function populateDropdown(selectEl, values, defaultLabel = '', labelTransform) {
    if(!selectEl) return;
    // clear but keep first default
    selectEl.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = defaultLabel || 'All';
    selectEl.appendChild(def);

    if(!Array.isArray(values)) return;
    values.forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = labelTransform ? labelTransform(v) : v;
      selectEl.appendChild(o);
    });
  }

  function applyFilters() {
    const q = ($('#shopSearch').value || '').trim().toLowerCase();
    const stream = $('#streamSelect').value;
    const sem = $('#semesterSelect').value;

    state.filtered = state.notes.filter(n => {
      const matchQ = !q || (n.title + ' ' + (n.description||'') + ' ' + (n.stream||'')).toLowerCase().includes(q);
      const matchStream = !stream || n.stream === stream;
      const matchSem = !sem || String(n.semester) === String(sem);
      return matchQ && matchStream && matchSem;
    });

    renderList();
  }

  function renderList(){
    const grid = $('#notesGrid');
    const empty = $('#emptyMessage');
    grid.innerHTML = '';

    if(!state.filtered.length){
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    state.filtered.forEach(note => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img class="thumb" src="${escapeHtml(note.img || '../assets/note1.jpg')}" alt="${escapeHtml(note.title)}" />
        <h3>${escapeHtml(note.title)}</h3>
        <div class="meta">${escapeHtml(note.stream)} • Sem ${escapeHtml(note.semester)}</div>
        <div class="meta" style="font-size:13px">${escapeHtml(note.description || '')}</div>
        <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:8px">
          <div class="price">₹${formatMoney(note.price || 0)}</div>
          <div style="display:flex;gap:8px">
            <button class="small preview-btn" data-id="${note.id}">Preview</button>
            <button class="small add-btn" data-id="${note.id}">Add</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // attach events
    $$('.preview-btn').forEach(b => b.addEventListener('click', onPreview));
    $$('.add-btn').forEach(b => b.addEventListener('click', onAddToCart));
  }

  // preview handlers
  async function onPreview(e){
    const id = e.currentTarget.dataset.id;
    const note = await GnAPI.getNoteById ? GnAPI.getNoteById(id) : null;
    if(!note){ alert('Note not found'); return; }
    showPreview(note);
  }

  function showPreview(note){
    const modal = $('#previewModal');
    const body = $('#previewBody');
    body.innerHTML = `<h3>${escapeHtml(note.title)}</h3>
      <div class="meta">${escapeHtml(note.stream)} • Sem ${escapeHtml(note.semester)}</div>
      <p style="margin-top:8px">${escapeHtml(note.description)}</p>`;

    if(note.previewUrl){
      const iframe = document.createElement('iframe');
      iframe.className = 'preview-embed';
      iframe.src = note.previewUrl;
      iframe.title = 'Preview';
      iframe.style.width = '100%';
      iframe.style.height = '420px';
      body.appendChild(iframe);
      modal.dataset.current = note.id;
    } else {
      delete modal.dataset.current;
    }

    setModal('#previewModal', true);
  }

  // cart logic (simple)
  function onAddToCart(e){
    const id = e.currentTarget.dataset.id;
    const note = state.notes.find(n => n.id === id);
    if(!note) return alert('Note not found');
    const existing = state.cart.find(i => i.id === id);
    if(existing) existing.qty++;
    else state.cart.push(Object.assign({qty:1}, note));
    updateCartUI();
    alert('Added to cart');
  }

  function updateCartUI(){
    const count = state.cart.reduce((s,i) => s + (i.qty||0), 0);
    const cartCountSpan = document.getElementById('cartCount');
    if(cartCountSpan) cartCountSpan.textContent = count;
  }

  function openCart(){
    renderCart();
    setModal('#cartModal', true);
  }

  function renderCart(){
    const el = $('#cartItems');
    el.innerHTML = '';
    if(!state.cart.length){ el.innerHTML = '<p>No items in cart.</p>'; $('#cartTotal').textContent = formatMoney(0); return; }
    state.cart.forEach(item => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `<div><strong>${escapeHtml(item.title)}</strong><div class="meta">Qty: ${item.qty}</div></div><div>₹${formatMoney(item.price * item.qty)}</div>`;
      el.appendChild(row);
    });
    const total = state.cart.reduce((s,i) => s + i.price * i.qty, 0);
    $('#cartTotal').textContent = formatMoney(total);
  }

  function doCheckout(){
    if(!state.cart.length) { alert('Cart empty'); return; }
    alert('Mock checkout — in production you will integrate payments.');
    state.cart = [];
    updateCartUI();
    setModal('#cartModal', false);
  }

  function buyFromPreview(){
    const id = $('#previewModal').dataset.current;
    if(!id) return alert('No note selected');
    const note = state.notes.find(n => n.id === id);
    if(!note) return alert('Note not found');
    const existing = state.cart.find(i => i.id === id);
    if(existing) existing.qty++;
    else state.cart.push(Object.assign({qty:1}, note));
    updateCartUI();
    setModal('#previewModal', false);
  }

  function downloadPreview(){
    const id = $('#previewModal').dataset.current;
    if(!id) return alert('No preview available.');
    const note = state.notes.find(n => n.id === id);
    if(note && note.previewUrl) window.open(note.previewUrl, '_blank');
    else alert('No preview file.');
  }

  // modal util
  function setModal(selector, open){
    const el = document.querySelector(selector);
    if(!el) return;
    if(open) el.setAttribute('aria-hidden','false');
    else {
      el.setAttribute('aria-hidden','true');
      if(selector === '#previewModal') {
        $('#previewBody').innerHTML = '';
        delete el.dataset.current;
      }
    }
  }

  function resetFilters(){
    $('#streamSelect').value = '';
    $('#semesterSelect').value = '';
    $('#shopSearch').value = '';
    applyFilters();
  }

  // helper: debounce
  function debounce(fn, ms=200){
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(()=> fn(...args), ms); };
  }

  // init
  document.addEventListener('DOMContentLoaded', init);
})();
