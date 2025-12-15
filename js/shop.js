(function () {
  // =====================================================
  // CONFIG — ONLY server.js is allowed
  // =====================================================
  if (!window.SERVER_URL) {
    throw new Error('SERVER_URL not found. Load server.js before shop.js');
  }

  const ROOT_URL = window.SERVER_URL.replace(/\/+$/, '');
  const API_BASE = ROOT_URL + '/api';
  const NOTES_BASE = API_BASE + '/notes';

  const PAGE_SIZE = 20;
  const PLACEHOLDER_IMG = '/images/note-placeholder.png';
  const PLACEHOLDER_SVG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420"><rect width="100%" height="100%" fill="#f6f2ef"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-size="20">No cover</text></svg>'
    );

  // =====================================================
  // DOM REFS
  // =====================================================
  const notesGrid = document.getElementById('notesGrid');
  const noteCardTemplate = document.getElementById('noteCardTemplate');
  const streamSelect = document.getElementById('streamSelect');
  const semesterSelect = document.getElementById('semesterSelect');
  const shopSearch = document.getElementById('shopSearch');
  const resetFiltersBtn = document.getElementById('resetFilters');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const noMoreEl = document.getElementById('noMore');
  const emptyMessage = document.getElementById('emptyMessage');

  const cartModal = document.getElementById('cartModal');
  const cartItemsWrap = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const openCartBtn = document.getElementById('openCartBtn');

  // =====================================================
  // STATE
  // =====================================================
  let currentPage = 1;
  let totalResults = 0;
  let isLoading = false;
  let currentNotes = [];

  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem('gonotes_cart');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed loading cart from storage', e);
      return [];
    }
  }

  let currentFilters = {
    departmentId: '',
    semester: '',
    q: '',
  };

  // =====================================================
  // HELPERS
  // =====================================================
  function buildUrl(path, params) {
    const base = NOTES_BASE + path;
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
    const txt = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt}`);
    return txt ? JSON.parse(txt) : {};
  }

  function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function formatPrice(v) {
    return Number(v || 0).toFixed(2);
  }

  // =====================================================
  // NORMALIZE NOTE
  // =====================================================
  function normalizeNote(n) {
    const id = String(n._id || n.id);
    const dept =
      (n.department && n.department.name) ||
      n.dept ||
      (typeof n.department === 'string' ? n.department : '');

    const sem = n.semester ?? n.sem ?? '';
    const originalPrice = Number(n.originalPrice || 0);
    const discountPrice = Number(n.discountPrice || 0);

    let price = discountPrice || originalPrice || 0;
    let discountPercent = n.discountPercent || 0;

    if (!discountPercent && originalPrice && discountPrice && discountPrice < originalPrice) {
      discountPercent = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
    }

    return {
      id,
      title: n.title || 'Untitled',
      dept,
      sem,
      price,
      originalPrice,
      discountPercent,
      coverImage: n.hasImage ? `${NOTES_BASE}/${id}/pic` : '',
      previewLink: n.previewLink || '',
      description: n.description || '',
    };
  }

  // =====================================================
  // LOAD DEPARTMENTS
  // =====================================================
  async function loadDepartments() {
    try {
      const list = await safeGet(buildUrl('/departments'));
      while (streamSelect.options.length > 1) streamSelect.remove(1);

      list.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d._id || d.id;
        opt.textContent = d.name;
        opt.dataset.sems = JSON.stringify(d.semesters || []);
        streamSelect.appendChild(opt);
      });
    } catch (e) {
      console.error('Failed to load departments', e);
    }
  }

  function populateSemesters(deptId) {
    while (semesterSelect.options.length > 1) semesterSelect.remove(1);
    const opt = streamSelect.querySelector(`option[value="${deptId}"]`);
    if (!opt) return;

    try {
      JSON.parse(opt.dataset.sems || '[]').forEach((s) => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s;
        semesterSelect.appendChild(o);
      });
    } catch {}
  }

  // =====================================================
  // FETCH NOTES
  // =====================================================
  async function fetchNotes({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;

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
      const results = (data.results || []).map(normalizeNote);

      if (!append) {
        currentNotes = [];
        notesGrid.innerHTML = '';
      }

      currentNotes = currentNotes.concat(results);
      results.forEach(renderNoteCard);

      totalResults = data.total || currentNotes.length;

      emptyMessage.style.display = currentNotes.length ? 'none' : 'block';
      loadMoreBtn.style.display =
        currentNotes.length < totalResults ? 'inline-block' : 'none';
      noMoreEl.style.display =
        currentNotes.length >= totalResults && totalResults > 0 ? 'block' : 'none';
    } catch (e) {
      console.error(e);
      notesGrid.innerHTML = `<div class="empty">Failed to load notes.</div>`;
    } finally {
      isLoading = false;
    }
  }

  // =====================================================
  // RENDER NOTE
  // =====================================================
  function renderNoteCard(note) {
    const tpl = noteCardTemplate.content.cloneNode(true);

    const img = tpl.querySelector('.card-image');
    const title = tpl.querySelector('.card-title');
    const subtitle = tpl.querySelector('.card-subtitle');
    const original = tpl.querySelector('.original-price');
    const discounted = tpl.querySelector('.discounted-price');
    const badge = tpl.querySelector('.discount-badge');
    const previewBtn = tpl.querySelector('.preview-btn');

    title.textContent = note.title;
    subtitle.textContent = `${note.dept}${note.sem ? ' · Sem ' + note.sem : ''}`;

    img.src = note.coverImage || PLACEHOLDER_IMG;
    img.onerror = () => (img.src = PLACEHOLDER_SVG);

    if (note.discountPercent > 0) {
      original.textContent = `₹${formatPrice(note.originalPrice)}`;
      original.style.textDecoration = 'line-through';
      discounted.textContent = `₹${formatPrice(note.price)}`;
      badge.textContent = `-${note.discountPercent}%`;
      badge.style.display = 'inline-block';
    } else {
      original.textContent = `₹${formatPrice(note.price)}`;
      discounted.textContent = '';
      badge.style.display = 'none';
    }

    if (note.previewLink) {
      previewBtn.onclick = () => window.open(note.previewLink, '_blank');
    } else {
      previewBtn.disabled = true;
      previewBtn.textContent = 'No preview';
    }

    notesGrid.appendChild(tpl);
  }

  // =====================================================
  // INIT
  // =====================================================
  document.addEventListener('DOMContentLoaded', async () => {
    await loadDepartments();
    fetchNotes();
  });

  window.gonotes_reloadNotes = () => {
    currentPage = 1;
    fetchNotes();
  };

  // =====================================================
  // ✅ BUY NOW HANDLER (ONLY ADDITION)
  // =====================================================
  document.addEventListener('click', (e) => {
    const buyBtn = e.target.closest('.buy-now');
    if (!buyBtn) return;

    const card = buyBtn.closest('.note-card');
    if (!card) return;

    const title =
      card.querySelector('.card-title')?.textContent || 'Note';

    const priceText =
      card.querySelector('.discounted-price')?.textContent ||
      card.querySelector('.original-price')?.textContent ||
      '₹0';

    const price = Number(priceText.replace(/[^\d.]/g, ''));

    localStorage.setItem(
      'gonotes_buynow',
      JSON.stringify({
        title,
        price,
        qty: 1,
      })
    );

    window.location.href = '/pages/buynow.html';
  });
})();
