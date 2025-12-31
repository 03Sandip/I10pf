(function () {
  // =====================================================
  // CONFIG
  // =====================================================
  if (!window.SERVER_URL) {
    throw new Error("SERVER_URL not found. Load server.js before shop.js");
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

  // =====================================================
  // DOM
  // =====================================================
  const notesGrid = document.getElementById("notesGrid");
  const noteCardTemplate = document.getElementById("noteCardTemplate");
  const streamSelect = document.getElementById("streamSelect");
  const semesterSelect = document.getElementById("semesterSelect");
  const shopSearch = document.getElementById("shopSearch");
  const resetBtn = document.getElementById("resetFilters");
  const emptyMessage = document.getElementById("emptyMessage");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const noMoreEl = document.getElementById("noMore");

  // =====================================================
  // STATE
  // =====================================================
  let currentPage = 1;
  let totalResults = 0;
  let isLoading = false;
  let currentNotes = [];

  let currentFilters = {
    departmentId: "",
    semester: "",
    q: "",
  };

  // =====================================================
  // HELPERS
  // =====================================================
  function buildUrl(path, params) {
    const usp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    return usp.toString()
      ? `${NOTES_BASE}${path}?${usp}`
      : `${NOTES_BASE}${path}`;
  }

  async function safeGet(url) {
    const res = await fetch(url);
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return txt ? JSON.parse(txt) : {};
  }

  function formatPrice(v) {
    return Number(v || 0).toFixed(2);
  }

  function updateCartCount() {
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem("gonotes_cart")) || [];
    } catch {}

    const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
    const badge = document.getElementById("cartCount");
    const badgeMobile = document.getElementById("cartCountMobile");
    if (badge) badge.textContent = count;
    if (badgeMobile) badgeMobile.textContent = count;
  }

  // =====================================================
  // NORMALIZE NOTE
  // =====================================================
  function normalizeNote(n) {
    const id = String(n._id || n.id);
    const dept =
      (n.department && n.department.name) ||
      n.dept ||
      (typeof n.department === "string" ? n.department : "");

    const sem = n.semester ?? n.sem ?? "";
    const originalPrice = Number(n.originalPrice || 0);
    const discountPrice = Number(n.discountPrice || 0);
    const price = discountPrice || originalPrice || 0;

    let discountPercent = n.discountPercent || 0;
    if (!discountPercent && originalPrice && discountPrice < originalPrice) {
      discountPercent = Math.round(
        ((originalPrice - discountPrice) / originalPrice) * 100
      );
    }

    return {
      id,
      title: n.title || "Untitled",
      dept,
      sem,
      price,
      originalPrice,
      discountPercent,
      coverImage: n.hasImage? `${NOTES_BASE}/${id}/pic?v=${Date.now()}`: "",
      previewLink: n.previewLink || "",
    };
  }

  // =====================================================
  // LOAD DEPARTMENTS + SEMESTERS
  // =====================================================
  async function loadDepartments() {
    const list = await safeGet(`${NOTES_BASE}/departments`);
    while (streamSelect.options.length > 1) streamSelect.remove(1);

    list.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d._id || d.id;
      opt.textContent = d.name;
      opt.dataset.sems = JSON.stringify(d.semesters || []);
      streamSelect.appendChild(opt);
    });
  }

  function populateSemesters(deptId) {
    while (semesterSelect.options.length > 1) semesterSelect.remove(1);
    if (!deptId) return;

    const opt = streamSelect.querySelector(`option[value="${deptId}"]`);
    if (!opt) return;

    JSON.parse(opt.dataset.sems || "[]").forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s;
      semesterSelect.appendChild(o);
    });
  }

  // =====================================================
  // FETCH NOTES
  // =====================================================
  async function fetchNotes({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;

    try {
      const data = await safeGet(
        buildUrl("/search", {
          ...currentFilters,
          page: currentPage,
          limit: PAGE_SIZE,
        })
      );

      const results = (data.results || []).map(normalizeNote);

      if (!append) {
        notesGrid.innerHTML = "";
        currentNotes = [];
      }

      currentNotes.push(...results);
      results.forEach(renderNoteCard);

      totalResults = data.total || currentNotes.length;

      emptyMessage.style.display = currentNotes.length ? "none" : "block";
      loadMoreBtn.style.display =
        currentNotes.length < totalResults ? "inline-block" : "none";
      noMoreEl.style.display =
        currentNotes.length >= totalResults && totalResults > 0
          ? "block"
          : "none";
    } catch (e) {
      console.error(e);
      notesGrid.innerHTML = `<div class="empty">Failed to load notes.</div>`;
    } finally {
      isLoading = false;
    }
  }

  // =====================================================
  // RENDER CARD
  // =====================================================
  function renderNoteCard(note) {
    const tpl = noteCardTemplate.content.cloneNode(true);

    tpl.querySelector(".card-title").textContent = note.title;
    tpl.querySelector(".card-subtitle").textContent =
      `${note.dept}${note.sem ? " · Sem " + note.sem : ""}`;

    const img = tpl.querySelector(".card-image");
    img.src = note.coverImage || PLACEHOLDER_IMG;
    img.onerror = () => (img.src = PLACEHOLDER_SVG);

    const original = tpl.querySelector(".original-price");
    const discounted = tpl.querySelector(".discounted-price");
    const badge = tpl.querySelector(".discount-badge");

    if (note.discountPercent) {
      original.textContent = `₹${formatPrice(note.originalPrice)}`;
      original.style.textDecoration = "line-through";
      discounted.textContent = `₹${formatPrice(note.price)}`;
      badge.textContent = `-${note.discountPercent}%`;
      badge.style.display = "inline-block";
    } else {
      original.textContent = `₹${formatPrice(note.price)}`;
      discounted.textContent = "";
      badge.style.display = "none";
    }

    const previewBtn = tpl.querySelector(".preview-btn");
    if (note.previewLink) previewBtn.onclick = () => window.open(note.previewLink);
    else previewBtn.disabled = true;

    notesGrid.appendChild(tpl);
  }

  // =====================================================
  // EVENTS
  // =====================================================
  document.addEventListener("DOMContentLoaded", async () => {
    await loadDepartments();
    fetchNotes();
    updateCartCount();

    streamSelect.onchange = () => {
      currentFilters.departmentId = streamSelect.value;
      currentFilters.semester = "";
      populateSemesters(streamSelect.value);
      currentPage = 1;
      fetchNotes();
    };

    semesterSelect.onchange = () => {
      currentFilters.semester = semesterSelect.value;
      currentPage = 1;
      fetchNotes();
    };

    let t;
    shopSearch.oninput = (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        currentFilters.q = e.target.value.trim();
        currentPage = 1;
        fetchNotes();
      }, 400);
    };

    resetBtn.onclick = () => {
      streamSelect.value = "";
      semesterSelect.value = "";
      shopSearch.value = "";
      currentFilters = { departmentId: "", semester: "", q: "" };
      populateSemesters("");
      currentPage = 1;
      fetchNotes();
    };

    loadMoreBtn.onclick = () => {
      currentPage++;
      fetchNotes({ append: true });
    };
  });

  // =====================================================
  // BUY NOW
  // =====================================================
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".buy-now");
    if (!btn) return;

    const card = btn.closest(".note-card");
    const title = card.querySelector(".card-title").textContent;
    const price = Number(
      (card.querySelector(".discounted-price")?.textContent ||
        card.querySelector(".original-price").textContent).replace(/[^\d.]/g, "")
    );

    localStorage.setItem(
      "gonotes_buynow",
      JSON.stringify({ title, price, qty: 1 })
    );

    window.location.href = "/pages/buynow.html";
  });

  // =====================================================
  // ADD TO CART
  // =====================================================
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart");
    if (!btn) return;

    const card = btn.closest(".note-card");
    const title = card.querySelector(".card-title").textContent;
    const price = Number(
      (card.querySelector(".discounted-price")?.textContent ||
        card.querySelector(".original-price").textContent).replace(/[^\d.]/g, "")
    );

    let cart = JSON.parse(localStorage.getItem("gonotes_cart")) || [];
    const found = cart.find((i) => i.title === title);

    if (found) found.qty += 1;
    else cart.push({ title, price, qty: 1 });

    localStorage.setItem("gonotes_cart", JSON.stringify(cart));
    updateCartCount();

    btn.textContent = "Added ✓";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "Add to cart";
      btn.disabled = false;
    }, 900);
  });
})();
