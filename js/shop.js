(function () {
  // --- CONFIG ---
  const HOST =
    typeof window !== 'undefined' && window.API_BASE
      ? String(window.API_BASE).replace(/\/+$/, '')
      : 'http://localhost:5000';

  const API_BASE =
    typeof window !== 'undefined' && typeof window.GN_API_BASE === 'string'
      ? window.GN_API_BASE.replace(/\/+$/, '')
      : HOST + '/api';

  const NOTES_BASE = API_BASE + '/notes';
  const PAGE_SIZE = 20;
  const PLACEHOLDER_IMG = '/images/note-placeholder.png';
  const PLACEHOLDER_SVG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420"><rect width="100%" height="100%" fill="#f6f2ef"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-size="20">No cover</text></svg>',
    );

  // --- DOM REFS ---
  const notesGrid = document.getElementById('notesGrid');
  const noteCardTemplate = document.getElementById('noteCardTemplate');
  const streamSelect = document.getElementById('streamSelect'); // departments
  const semesterSelect = document.getElementById('semesterSelect');
  const shopSearch = document.getElementById('shopSearch');
  const resetFiltersBtn = document.getElementById('resetFilters');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const noMoreEl = document.getElementById('noMore');
  const emptyMessage = document.getElementById('emptyMessage');

  // preview modal (currently unused for opening, but kept if needed later)
  const previewModal = document.getElementById('previewModal');
  const previewBody = document.getElementById('previewBody');
  const closePreview = document.getElementById('closePreview');
  const downloadPreview = document.getElementById('downloadPreview');
  const buyFromPreview = document.getElementById('buyFromPreview');

  // cart modal
  const cartModal = document.getElementById('cartModal');
  const cartItemsWrap = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const openCartBtn = document.getElementById('openCartBtn');

  // --- STATE ---
  let currentPage = 1;
  let totalResults = 0;
  let isLoading = false;
  let currentNotes = []; // notes loaded so far for this query
  let cart = loadCartFromStorage();

  // current filters
  let currentFilters = {
    departmentId: '',
    semester: '',
    q: '',
  };

  // --- HELPERS ---

  function buildUrl(path, params) {
    const base = path.startsWith('http') ? path : NOTES_BASE + path;
    if (!params) return base;
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') usp.set(k, v);
    });
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }

  async function safeGet(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    const txt = await res.text().catch(() => '');
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}: ${txt || res.statusText}`);
      err.status = res.status;
      err.body = txt;
      throw err;
    }
    try {
      return JSON.parse(txt === '' ? '{}' : txt);
    } catch {
      return txt;
    }
  }

  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  function toggleModal(modalEl, open) {
    if (!modalEl) return;
    modalEl.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  function showLoadingState(isLoadingNow) {
    isLoading = isLoadingNow;
    if (!notesGrid) return;
    if (isLoadingNow) {
      notesGrid.innerHTML = `<div class="empty">Loading notes…</div>`;
      loadMoreBtn.style.display = 'none';
      noMoreEl.style.display = 'none';
      emptyMessage.style.display = 'none';
    }
  }

  function formatPrice(num) {
    return Number(num || 0).toFixed(2);
  }

  // --- NORMALIZE NOTE (backend -> frontend shape) ---
  function normalizeNote(n) {
    const id = String(n.id || n._id);
    const deptName =
      (n.department && n.department.name) ||
      n.dept ||
      (typeof n.department === 'string' ? n.department : '') ||
      '';

    const sem = n.semester ?? n.sem ?? null;

    const originalPrice = Number(n.originalPrice || 0);
    const discountPrice = Number(n.discountPrice || 0);

    let price = originalPrice || discountPrice || 0;
    let discountPercent = n.discountPercent || 0;

    if (!discountPercent && originalPrice && discountPrice && discountPrice < originalPrice) {
      discountPercent = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
      price = discountPrice;
    } else if (discountPrice && discountPrice < originalPrice) {
      price = discountPrice;
    }

    const hasImage = !!n.hasImage;
    const coverImage = hasImage ? `${NOTES_BASE}/${encodeURIComponent(id)}/pic` : '';

    // NEW: previewLink provided from backend (admin panel)
    const previewLink = n.previewLink ? String(n.previewLink).trim() : '';

    // Keep sampleUrl as the raw PDF endpoint (for potential future use)
    const sampleUrl = `${NOTES_BASE}/${encodeURIComponent(id)}/file`;

    return {
      id,
      title: n.title || 'Untitled',
      dept: deptName,
      sem,
      originalPrice,
      discountPrice,
      price,
      discountPercent,
      hasImage,
      coverImage,
      previewLink, // <-- expose previewLink to frontend
      sampleUrl,   // <-- pure PDF link (not used for preview button now)
      description: n.description || '',
    };
  }

  // --- DEPARTMENTS & SEMESTERS ---

  async function loadDepartments() {
    try {
      const data = await safeGet(buildUrl('/departments'));
      if (!Array.isArray(data)) return;

      // keep "All Streams" option
      while (streamSelect.options.length > 1) streamSelect.remove(1);

      data.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = String(d.id || d._id);
        opt.textContent = d.name || 'Unknown';
        opt.dataset.sems = JSON.stringify(d.semesters || []);
        streamSelect.appendChild(opt);
      });
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  }

  function populateSemestersFromOption(deptId) {
    while (semesterSelect.options.length > 1) semesterSelect.remove(1);
    if (!deptId) return;
    const opt = streamSelect.querySelector(`option[value="${deptId}"]`);
    if (!opt || !opt.dataset.sems) return;

    let sems = [];
    try {
      sems = JSON.parse(opt.dataset.sems);
    } catch {
      sems = [];
    }
    (sems || []).forEach((s) => {
      const o = document.createElement('option');
      o.value = String(s);
      o.textContent = String(s);
      semesterSelect.appendChild(o);
    });
  }

  async function loadSemestersForDept(deptId) {
    // first try from data attribute
    populateSemestersFromOption(deptId);
    if (semesterSelect.options.length > 1) return;

    // fallback: fetch from backend
    try {
      const res = await safeGet(buildUrl(`/semesters/${encodeURIComponent(deptId)}`));
      const sems = Array.isArray(res) ? res : res.semesters || [];
      while (semesterSelect.options.length > 1) semesterSelect.remove(1);
      sems.forEach((s) => {
        const o = document.createElement('option');
        o.value = String(s);
        o.textContent = String(s);
        semesterSelect.appendChild(o);
      });
    } catch (err) {
      console.warn('Failed to load semesters for department', deptId, err);
    }
  }

  // --- NOTES FETCH + RENDER ---

  async function fetchNotes({ append = false } = {}) {
    if (isLoading) return;

    showLoadingState(true);

    const query = {
      departmentId: currentFilters.departmentId || undefined,
      semester: currentFilters.semester || undefined,
      q: currentFilters.q || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
      sortBy: 'createdAt',
      sortDir: 'desc',
    };

    try {
      const data = await safeGet(buildUrl('/search', query));
      const results = Array.isArray(data.results) ? data.results : [];
      totalResults = Number(data.total || results.length || 0);

      const normalized = results.map(normalizeNote);

      if (!append) {
        currentNotes = [];
        notesGrid.innerHTML = '';
      }

      currentNotes = currentNotes.concat(normalized);
      renderNotes(normalized, { append });

      const loadedCount = currentNotes.length;

      if (loadedCount === 0) {
        emptyMessage.style.display = 'block';
        loadMoreBtn.style.display = 'none';
        noMoreEl.style.display = 'none';
      } else {
        emptyMessage.style.display = 'none';
        if (loadedCount < totalResults) {
          loadMoreBtn.style.display = 'inline-block';
          noMoreEl.style.display = 'none';
        } else {
          loadMoreBtn.style.display = 'none';
          noMoreEl.style.display = totalResults > 0 ? 'block' : 'none';
        }
      }
    } catch (err) {
      console.error('Failed to fetch notes', err);
      notesGrid.innerHTML = `<div class="empty">Failed to load notes.</div>`;
      loadMoreBtn.style.display = 'none';
      noMoreEl.style.display = 'none';
    } finally {
      showLoadingState(false);
    }
  }

  function renderNotes(notes, { append = false } = {}) {
    if (!append) notesGrid.innerHTML = '';
    notes.forEach(renderNoteCard);
  }

  function renderNoteCard(note) {
    const tpl = noteCardTemplate.content.cloneNode(true);

    const img = tpl.querySelector('.card-image');
    const discountBadge = tpl.querySelector('.discount-badge');
    const previewBtn = tpl.querySelector('.preview-btn');
    const titleEl = tpl.querySelector('.card-title');
    const subtitleEl = tpl.querySelector('.card-subtitle');
    const originalPriceEl = tpl.querySelector('.original-price');
    const discountedPriceEl = tpl.querySelector('.discounted-price');
    const addToCartBtn = tpl.querySelector('.add-to-cart');
    const buyNowBtn = tpl.querySelector('.buy-now');

    titleEl.textContent = note.title || 'Untitled';
    const semText = note.sem ? `Sem ${note.sem}` : '';
    subtitleEl.textContent = `${note.dept || 'Department'}${semText ? ' · ' + semText : ''}`;

    if (note.coverImage) {
      img.src = note.coverImage;
      img.alt = `${note.title} cover`;
    } else {
      img.src = PLACEHOLDER_IMG;
      img.alt = `${note.title} (no cover)`;
    }
    img.onerror = () => {
      img.onerror = null;
      img.src = PLACEHOLDER_SVG;
    };

    const price = Number(note.price || 0);
    const discountPercent = Number(note.discountPercent || 0);

    if (discountPercent > 0 && note.originalPrice) {
      originalPriceEl.textContent = `₹${formatPrice(note.originalPrice)}`;
      originalPriceEl.style.textDecoration = 'line-through';
      discountedPriceEl.textContent = `₹${formatPrice(price)}`;
      discountBadge.textContent = `-${discountPercent}%`;
      discountBadge.style.display = 'inline-block';
    } else if (price > 0) {
      originalPriceEl.textContent = `₹${formatPrice(price)}`;
      discountedPriceEl.textContent = '';
      discountBadge.style.display = 'none';
    } else {
      originalPriceEl.textContent = 'Free';
      discountedPriceEl.textContent = '';
      discountBadge.style.display = 'none';
    }

    // PREVIEW: open the link from admin panel in a new tab (not the PDF)
    if (note.previewLink) {
      previewBtn.addEventListener('click', () => {
        window.open(note.previewLink, '_blank', 'noopener');
      });
    } else {
      // no preview link configured
      previewBtn.disabled = true;
      previewBtn.textContent = 'No preview';
    }

    addToCartBtn.addEventListener('click', () => {
      addToCart(note);
      addToCartBtn.textContent = 'Added';
      setTimeout(() => (addToCartBtn.textContent = 'Add to cart'), 900);
    });

    buyNowBtn.addEventListener('click', () => {
      addToCart(note);
      toggleModal(cartModal, true);
    });

    notesGrid.appendChild(tpl);
  }

  // --- PREVIEW MODAL (kept if you want to reuse later, but not used for open) ---

  function openPreview(note) {
    previewBody.innerHTML = '';

    const h3 = document.createElement('h3');
    h3.id = 'previewTitle';
    h3.textContent = note.title;

    const meta = document.createElement('p');
    meta.style.margin = '4px 0';
    meta.style.color = '#555';
    const semText = note.sem ? ` • Sem ${note.sem}` : '';
    meta.textContent = `${note.dept || 'Department'}${semText}`;

    const desc = document.createElement('p');
    desc.style.marginTop = '10px';
    desc.style.fontSize = '14px';
    desc.style.color = '#666';
    desc.textContent = note.description || 'No description provided.';

    previewBody.appendChild(h3);
    previewBody.appendChild(meta);
    previewBody.appendChild(desc);

    const sample = note.sampleUrl;

    if (sample) {
      const frameWrap = document.createElement('div');
      frameWrap.style.marginTop = '12px';
      frameWrap.style.height = '360px';
      frameWrap.style.border = '1px solid #e5e7eb';
      frameWrap.style.borderRadius = '8px';
      frameWrap.style.overflow = 'hidden';

      const iframe = document.createElement('iframe');
      iframe.src = sample;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.setAttribute('aria-label', 'Note sample preview');
      iframe.setAttribute('title', note.title + ' preview');
      frameWrap.appendChild(iframe);

      previewBody.appendChild(frameWrap);

      downloadPreview.dataset.url = sample;
      downloadPreview.disabled = false;
    } else {
      const msg = document.createElement('div');
      msg.className = 'empty';
      msg.textContent = 'No sample available for this note.';
      previewBody.appendChild(msg);
      downloadPreview.dataset.url = '';
      downloadPreview.disabled = true;
    }

    buyFromPreview.dataset.noteId = note.id;
    toggleModal(previewModal, true);
  }

  function downloadPreviewSample() {
    const url = downloadPreview.dataset.url;
    if (!url) return;
    window.open(url, '_blank');
  }

  // --- CART (LOCALSTORAGE) ---

  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem('gonotes_cart');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed loading cart', e);
      return [];
    }
  }

  function saveCartToStorage() {
    try {
      localStorage.setItem('gonotes_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed saving cart', e);
    }
  }

  function addToCart(note, qty = 1) {
    const existing = cart.find((i) => i.id === note.id);
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else
      cart.push({
        id: note.id,
        title: note.title,
        price: Number(note.price || 0),
        qty,
      });
    saveCartToStorage();
    renderCart();
  }

  function removeFromCart(id) {
    cart = cart.filter((i) => i.id !== id);
    saveCartToStorage();
    renderCart();
  }

  function updateCartQty(id, qty) {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, Math.min(99, Number(qty) || 1));
    saveCartToStorage();
    renderCart();
  }

  function renderCart() {
    if (!cartItemsWrap) return;
    cartItemsWrap.innerHTML = '';

    if (!cart.length) {
      cartItemsWrap.innerHTML = `<div class="empty">Your cart is empty.</div>`;
      if (cartTotalEl) cartTotalEl.textContent = '0.00';
      return;
    }

    let total = 0;
    const list = document.createElement('div');
    list.className = 'cart-list';

    cart.forEach((it) => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '12px';
      row.style.marginBottom = '8px';

      const left = document.createElement('div');
      left.style.flex = '1';

      const title = document.createElement('div');
      title.textContent = it.title;
      title.style.fontWeight = '600';

      const price = document.createElement('div');
      price.textContent = `₹${formatPrice(it.price)}`;
      price.style.fontSize = '13px';
      price.style.color = 'var(--muted)';

      left.appendChild(title);
      left.appendChild(price);

      const qtyWrap = document.createElement('div');
      qtyWrap.style.display = 'flex';
      qtyWrap.style.gap = '6px';
      qtyWrap.style.alignItems = 'center';

      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.max = '99';
      qtyInput.value = String(it.qty);
      qtyInput.style.width = '56px';
      qtyInput.addEventListener('change', (e) => updateCartQty(it.id, e.target.value));

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => removeFromCart(it.id));

      qtyWrap.appendChild(qtyInput);
      qtyWrap.appendChild(removeBtn);

      row.appendChild(left);
      row.appendChild(qtyWrap);
      list.appendChild(row);

      total += it.price * it.qty;
    });

    cartItemsWrap.appendChild(list);
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(total);
  }

  // --- FILTERS + EVENTS ---

  const debouncedFilterChange = debounce(() => {
    currentFilters = {
      departmentId: (streamSelect.value || '').trim(),
      semester: (semesterSelect.value || '').trim(),
      q: (shopSearch.value || '').trim(),
    };
    currentPage = 1;
    fetchNotes({ append: false });
  }, 300);

  function resetFilters() {
    streamSelect.value = '';
    semesterSelect.value = '';
    shopSearch.value = '';
    currentFilters = { departmentId: '', semester: '', q: '' };
    currentPage = 1;
    fetchNotes({ append: false });
  }

  function wireEvents() {
    streamSelect?.addEventListener('change', async () => {
      const deptId = streamSelect.value || '';
      if (deptId) await loadSemestersForDept(deptId);
      else while (semesterSelect.options.length > 1) semesterSelect.remove(1);
      debouncedFilterChange();
    });

    semesterSelect?.addEventListener('change', debouncedFilterChange);
    shopSearch?.addEventListener('input', debouncedFilterChange);
    resetFiltersBtn?.addEventListener('click', resetFilters);

    loadMoreBtn?.addEventListener('click', () => {
      if (isLoading) return;
      const loadedCount = currentNotes.length;
      if (loadedCount >= totalResults) return;
      currentPage += 1;
      fetchNotes({ append: true });
    });

    closePreview?.addEventListener('click', () => toggleModal(previewModal, false));
    previewModal?.addEventListener('click', (e) => {
      if (e.target === previewModal) toggleModal(previewModal, false);
    });

    downloadPreview?.addEventListener('click', downloadPreviewSample);

    buyFromPreview?.addEventListener('click', () => {
      const noteId = buyFromPreview.dataset.noteId;
      if (!noteId) return;
      const note = currentNotes.find((n) => n.id === noteId);
      if (!note) return;
      addToCart(note);
      toggleModal(previewModal, false);
      toggleModal(cartModal, true);
    });

    document.getElementById('closeCart')?.addEventListener('click', () =>
      toggleModal(cartModal, false),
    );
    cartModal?.addEventListener('click', (e) => {
      if (e.target === cartModal) toggleModal(cartModal, false);
    });

    checkoutBtn?.addEventListener('click', () => {
      alert('Checkout is a mock — integrate a payment gateway to complete purchases.');
    });

    openCartBtn?.addEventListener?.('click', () => toggleModal(cartModal, true));
  }

  // --- INIT ---

  document.addEventListener('DOMContentLoaded', async () => {
    wireEvents();
    renderCart();
    await loadDepartments();
    currentFilters = { departmentId: '', semester: '', q: '' };
    currentPage = 1;
    fetchNotes({ append: false }); // initial load: all notes
  });

  // small debug hook
  window.gonotes_reloadNotes = () => {
    currentPage = 1;
    fetchNotes({ append: false });
  };
})();