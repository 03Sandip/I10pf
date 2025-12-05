// js/shop.js — list + filters + cart for client website

(function () {
  // --- CONFIG ---
  // Expect server.js to set window.SERVER_URL
  if (!window.SERVER_URL) {
    alert("SERVER_URL missing — load js/server.js before js/shop.js");
    throw new Error("SERVER_URL missing");
  }

  const ROOT_URL = window.SERVER_URL.replace(/\/+$/, "");
  const API_BASE = ROOT_URL + "/api";
  const NOTES_BASE = API_BASE + "/notes";

  const PAGE_SIZE = 20;
  const PLACEHOLDER_IMG = "/images/note-placeholder.png";
  const PLACEHOLDER_SVG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420"><rect width="100%" height="100%" fill="#f6f2ef"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-size="20">No cover</text></svg>'
    );

  // --- DOM REFS ---
  const notesGrid = document.getElementById("notesGrid");
  const noteCardTemplate = document.getElementById("noteCardTemplate");
  const streamSelect = document.getElementById("streamSelect"); // departments
  const semesterSelect = document.getElementById("semesterSelect");
  const shopSearch = document.getElementById("shopSearch");
  const resetFiltersBtn = document.getElementById("resetFilters");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const noMoreEl = document.getElementById("noMore");
  const emptyMessage = document.getElementById("emptyMessage");

  // preview modal (kept for future use)
  const previewModal = document.getElementById("previewModal");
  const previewBody = document.getElementById("previewBody");
  const closePreview = document.getElementById("closePreview");
  const downloadPreview = document.getElementById("downloadPreview");
  const buyFromPreview = document.getElementById("buyFromPreview");

  // cart modal
  const cartModal = document.getElementById("cartModal");
  const cartItemsWrap = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const openCartBtn = document.getElementById("openCartBtn");

  // --- STATE ---
  let currentPage = 1;
  let totalResults = 0;
  let isLoading = false;
  let currentNotes = []; // notes loaded so far for this query
  let cart = loadCartFromStorage();

  // current filters
  let currentFilters = {
    departmentId: "",
    semester: "",
    q: "",
  };

  // --- HELPERS ---

  function buildUrl(path, params) {
    const base = path.startsWith("http") ? path : NOTES_BASE + path;
    if (!params) return base;
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }

  async function safeGet(url) {
    const res = await fetch(url, { credentials: "same-origin" });
    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}: ${txt || res.statusText}`);
      err.status = res.status;
      err.body = txt;
      throw err;
    }
    try {
      return JSON.parse(txt === "" ? "{}" : txt);
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
    modalEl.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function showLoadingState(isLoadingNow) {
    isLoading = isLoadingNow;
    if (!notesGrid) return;
    if (isLoadingNow) {
      notesGrid.innerHTML = `<div class="empty">Loading notes…</div>`;
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
      if (noMoreEl) noMoreEl.style.display = "none";
      if (emptyMessage) emptyMessage.style.display = "none";
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
      (typeof n.department === "string" ? n.department : "") ||
      "";

    const sem = n.semester ?? n.sem ?? null;

    const originalPrice = Number(n.originalPrice || 0);
    const discountPrice = Number(n.discountPrice || 0);

    let price = originalPrice || discountPrice || 0;
    let discountPercent = n.discountPercent || 0;

    if (
      !discountPercent &&
      originalPrice &&
      discountPrice &&
      discountPrice < originalPrice
    ) {
      discountPercent = Math.round(
        ((originalPrice - discountPrice) / originalPrice) * 100
      );
      price = discountPrice;
    } else if (discountPrice && discountPrice < originalPrice) {
      price = discountPrice;
    }

    const hasImage = !!n.hasImage;
    const coverImage = hasImage
      ? `${NOTES_BASE}/${encodeURIComponent(id)}/pic`
      : "";

    // preview link from admin panel
    const previewLink = n.previewLink ? String(n.previewLink).trim() : "";

    // raw PDF endpoint (not used for preview button now)
    const sampleUrl = `${NOTES_BASE}/${encodeURIComponent(id)}/file`;

    return {
      id,
      title: n.title || "Untitled",
      dept: deptName,
      sem,
      originalPrice,
      discountPrice,
      price,
      discountPercent,
      hasImage,
      coverImage,
      previewLink,
      sampleUrl,
      description: n.description || "",
    };
  }

  // --- DEPARTMENTS & SEMESTERS ---

  async function loadDepartments() {
    if (!streamSelect) return;
    try {
      const data = await safeGet(buildUrl("/departments"));
      if (!Array.isArray(data)) return;

      // keep "All Streams" option (assumed first)
      while (streamSelect.options.length > 1) streamSelect.remove(1);

      data.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = String(d.id || d._id);
        opt.textContent = d.name || "Unknown";
        opt.dataset.sems = JSON.stringify(d.semesters || []);
        streamSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Failed to load departments", err);
    }
  }

  function populateSemestersFromOption(deptId) {
    if (!semesterSelect) return;
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
      const o = document.createElement("option");
      o.value = String(s);
      o.textContent = String(s);
      semesterSelect.appendChild(o);
    });
  }

  async function loadSemestersForDept(deptId) {
    if (!semesterSelect) return;

    // first try from data attribute
    populateSemestersFromOption(deptId);
    if (semesterSelect.options.length > 1) return;

    // fallback: fetch from backend
    try {
      const res = await safeGet(
        buildUrl(`/semesters/${encodeURIComponent(deptId)}`)
      );
      const sems = Array.isArray(res) ? res : res.semesters || [];
      while (semesterSelect.options.length > 1) semesterSelect.remove(1);
      sems.forEach((s) => {
        const o = document.createElement("option");
        o.value = String(s);
        o.textContent = String(s);
        semesterSelect.appendChild(o);
      });
    } catch (err) {
      console.warn("Failed to load semesters for department", deptId, err);
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
      sortBy: "createdAt",
      sortDir: "desc",
    };

    try {
      const data = await safeGet(buildUrl("/search", query));
      const results = Array.isArray(data.results) ? data.results : [];
      totalResults = Number(data.total || results.length || 0);

      const normalized = results.map(normalizeNote);

      if (!append) {
        currentNotes = [];
        if (notesGrid) notesGrid.innerHTML = "";
      }

      currentNotes = currentNotes.concat(normalized);
      renderNotes(normalized, { append });

      const loadedCount = currentNotes.length;

      if (!emptyMessage || !loadMoreBtn || !noMoreEl) return;

      if (loadedCount === 0) {
        emptyMessage.style.display = "block";
        loadMoreBtn.style.display = "none";
        noMoreEl.style.display = "none";
      } else {
        emptyMessage.style.display = "none";
        if (loadedCount < totalResults) {
          loadMoreBtn.style.display = "inline-block";
          noMoreEl.style.display = "none";
        } else {
          loadMoreBtn.style.display = "none";
          noMoreEl.style.display = totalResults > 0 ? "block" : "none";
        }
      }
    } catch (err) {
      console.error("Failed to fetch notes", err);
      if (notesGrid)
        notesGrid.innerHTML = `<div class="empty">Failed to load notes.</div>`;
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
      if (noMoreEl) noMoreEl.style.display = "none";
    } finally {
      showLoadingState(false);
    }
  }

  function renderNotes(notes, { append = false } = {}) {
    if (!notesGrid) return;
    if (!append) notesGrid.innerHTML = "";
    notes.forEach(renderNoteCard);
  }

  function renderNoteCard(note) {
    if (!noteCardTemplate || !notesGrid) return;

    const tpl = noteCardTemplate.content.cloneNode(true);

    const img = tpl.querySelector(".card-image");
    const discountBadge = tpl.querySelector(".discount-badge");
    const previewBtn = tpl.querySelector(".preview-btn");
    const titleEl = tpl.querySelector(".card-title");
    const subtitleEl = tpl.querySelector(".card-subtitle");
    const originalPriceEl = tpl.querySelector(".original-price");
    const discountedPriceEl = tpl.querySelector(".discounted-price");
    const addToCartBtn = tpl.querySelector(".add-to-cart");
    const buyNowBtn = tpl.querySelector(".buy-now");

    if (titleEl) titleEl.textContent = note.title || "Untitled";
    const semText = note.sem ? `Sem ${note.sem}` : "";
    if (subtitleEl)
      subtitleEl.textContent = `${note.dept || "Department"}${
        semText ? " · " + semText : ""
      }`;

    if (img) {
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
    }

    const price = Number(note.price || 0);
    const discountPercent = Number(note.discountPercent || 0);

    if (discountPercent > 0 && note.originalPrice) {
      if (originalPriceEl) {
        originalPriceEl.textContent = `₹${formatPrice(note.originalPrice)}`;
        originalPriceEl.style.textDecoration = "line-through";
      }
      if (discountedPriceEl)
        discountedPriceEl.textContent = `₹${formatPrice(price)}`;
      if (discountBadge) {
        discountBadge.textContent = `-${discountPercent}%`;
        discountBadge.style.display = "inline-block";
      }
    } else if (price > 0) {
      if (originalPriceEl)
        originalPriceEl.textContent = `₹${formatPrice(price)}`;
      if (discountedPriceEl) discountedPriceEl.textContent = "";
      if (discountBadge) discountBadge.style.display = "none";
    } else {
      if (originalPriceEl) originalPriceEl.textContent = "Free";
      if (discountedPriceEl) discountedPriceEl.textContent = "";
      if (discountBadge) discountBadge.style.display = "none";
    }

    // PREVIEW: open previewLink in new tab
    if (previewBtn) {
      if (note.previewLink) {
        previewBtn.addEventListener("click", () => {
          window.open(note.previewLink, "_blank", "noopener");
        });
      } else {
        previewBtn.disabled = true;
        previewBtn.textContent = "No preview";
      }
    }

    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => {
        addToCart(note);
        addToCartBtn.textContent = "Added";
        setTimeout(() => (addToCartBtn.textContent = "Add to cart"), 900);
      });
    }

    // BUY NOW (single item): send only this note to buynow.html
    if (buyNowBtn) {
      buyNowBtn.addEventListener("click", () => {
        const checkoutItems = [
          {
            id: note.id,
            title: note.title,
            price: Number(note.price || 0),
            qty: 1,
          },
        ];
        saveCheckoutItems(checkoutItems);
        window.location.href = "buynow.html";
      });
    }

    notesGrid.appendChild(tpl);
  }

  // --- PREVIEW MODAL (optional) ---

  function downloadPreviewSample() {
    if (!downloadPreview) return;
    const url = downloadPreview.dataset.url;
    if (!url) return;
    window.open(url, "_blank");
  }

  // --- CART (LOCALSTORAGE) ---

  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem("gonotes_cart");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Failed loading cart", e);
      return [];
    }
  }

  function saveCartToStorage() {
    try {
      localStorage.setItem("gonotes_cart", JSON.stringify(cart));
    } catch (e) {
      console.warn("Failed saving cart", e);
    }
  }

  function saveCheckoutItems(items) {
    try {
      localStorage.setItem("gonotes_checkout", JSON.stringify(items || []));
    } catch (e) {
      console.warn("Failed saving checkout items", e);
    }
  }

  function updateHeaderCartCount() {
    const badge = document.getElementById("cartCount");
    if (!badge) return;
    const totalItems = cart.reduce(
      (sum, item) => sum + (Number(item.qty) || 0),
      0
    );
    badge.textContent = String(totalItems);
    badge.style.display = totalItems > 0 ? "inline-flex" : "none";
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
    cartItemsWrap.innerHTML = "";

    if (!cart.length) {
      cartItemsWrap.innerHTML = `<div class="empty">Your cart is empty.</div>`;
      if (cartTotalEl) cartTotalEl.textContent = "0.00";
      updateHeaderCartCount();
      return;
    }

    let total = 0;
    const list = document.createElement("div");
    list.className = "cart-list";

    cart.forEach((it) => {
      const row = document.createElement("div");
      row.className = "cart-row";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.gap = "12px";
      row.style.marginBottom = "8px";

      const left = document.createElement("div");
      left.style.flex = "1";

      const title = document.createElement("div");
      title.textContent = it.title;
      title.style.fontWeight = "600";

      const price = document.createElement("div");
      price.textContent = `₹${formatPrice(it.price)}`;
      price.style.fontSize = "13px";
      price.style.color = "var(--muted)";

      left.appendChild(title);
      left.appendChild(price);

      const qtyWrap = document.createElement("div");
      qtyWrap.style.display = "flex";
      qtyWrap.style.gap = "6px";
      qtyWrap.style.alignItems = "center";

      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.min = "1";
      qtyInput.max = "99";
      qtyInput.value = String(it.qty);
      qtyInput.style.width = "56px";
      qtyInput.addEventListener("change", (e) =>
        updateCartQty(it.id, e.target.value)
      );

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => removeFromCart(it.id));

      qtyWrap.appendChild(qtyInput);
      qtyWrap.appendChild(removeBtn);

      row.appendChild(left);
      row.appendChild(qtyWrap);
      list.appendChild(row);

      total += it.price * it.qty;
    });

    cartItemsWrap.appendChild(list);
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(total);

    updateHeaderCartCount();
  }

  // --- FILTERS + EVENTS ---

  const debouncedFilterChange = debounce(() => {
    currentFilters = {
      departmentId: (streamSelect?.value || "").trim(),
      semester: (semesterSelect?.value || "").trim(),
      q: (shopSearch?.value || "").trim(),
    };
    currentPage = 1;
    fetchNotes({ append: false });
  }, 300);

  function resetFilters() {
    if (streamSelect) streamSelect.value = "";
    if (semesterSelect) semesterSelect.value = "";
    if (shopSearch) shopSearch.value = "";
    currentFilters = { departmentId: "", semester: "", q: "" };
    currentPage = 1;
    fetchNotes({ append: false });
  }

  function wireEvents() {
    streamSelect?.addEventListener("change", async () => {
      const deptId = streamSelect.value || "";
      if (deptId) await loadSemestersForDept(deptId);
      else if (semesterSelect) {
        while (semesterSelect.options.length > 1)
          semesterSelect.remove(1);
      }
      debouncedFilterChange();
    });

    semesterSelect?.addEventListener("change", debouncedFilterChange);
    shopSearch?.addEventListener("input", debouncedFilterChange);
    resetFiltersBtn?.addEventListener("click", resetFilters);

    loadMoreBtn?.addEventListener("click", () => {
      if (isLoading) return;
      const loadedCount = currentNotes.length;
      if (loadedCount >= totalResults) return;
      currentPage += 1;
      fetchNotes({ append: true });
    });

    closePreview?.addEventListener("click", () =>
      toggleModal(previewModal, false)
    );
    previewModal?.addEventListener("click", (e) => {
      if (e.target === previewModal) toggleModal(previewModal, false);
    });

    downloadPreview?.addEventListener("click", downloadPreviewSample);

    buyFromPreview?.addEventListener("click", () => {
      const noteId = buyFromPreview?.dataset.noteId;
      if (!noteId) return;
      const note = currentNotes.find((n) => n.id === noteId);
      if (!note) return;
      addToCart(note);
      toggleModal(previewModal, false);
      toggleModal(cartModal, true);
    });

    document.getElementById("closeCart")?.addEventListener("click", () =>
      toggleModal(cartModal, false)
    );
    cartModal?.addEventListener("click", (e) => {
      if (e.target === cartModal) toggleModal(cartModal, false);
    });

    checkoutBtn?.addEventListener("click", () => {
      if (!cart.length) {
        alert("Your cart is empty.");
        return;
      }
      saveCheckoutItems(cart);
      window.location.href = "buynow.html";
    });

    openCartBtn?.addEventListener("click", () =>
      toggleModal(cartModal, true)
    );
  }

  // --- INIT ---

  document.addEventListener("DOMContentLoaded", async () => {
    wireEvents();
    renderCart();
    await loadDepartments();
    currentFilters = { departmentId: "", semester: "", q: "" };
    currentPage = 1;
    fetchNotes({ append: false });
  });

  window.gonotes_reloadNotes = () => {
    currentPage = 1;
    fetchNotes({ append: false });
  };
})();
