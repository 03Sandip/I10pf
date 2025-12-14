// js/shop.js — list + filters + cart for client website
(function () {
  /* ================= CONFIG ================= */

  if (!window.SERVER_URL) {
    alert("SERVER_URL missing — load js/server.js before js/shop.js");
    throw new Error("SERVER_URL missing");
  }

  const ROOT_URL = window.SERVER_URL.replace(/\/+$/, "");
  const API_BASE = ROOT_URL + "/api";

  const PAGE_SIZE = 20;
  const PLACEHOLDER_IMG = "/images/note-placeholder.png";

  /* ================= DOM ================= */

  const notesGrid = document.getElementById("notesGrid");
  const noteCardTemplate = document.getElementById("noteCardTemplate");
  const streamSelect = document.getElementById("streamSelect");
  const semesterSelect = document.getElementById("semesterSelect");
  const shopSearch = document.getElementById("shopSearch");
  const resetFiltersBtn = document.getElementById("resetFilters");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const noMoreEl = document.getElementById("noMore");
  const emptyMessage = document.getElementById("emptyMessage");

  const cartItemsWrap = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const openCartBtn = document.getElementById("openCartBtn");
  const cartModal = document.getElementById("cartModal");

  /* ================= STATE ================= */

  let currentPage = 1;
  let totalResults = 0;
  let isLoading = false;
  let currentNotes = [];
  let cart = loadCartFromStorage();

  let currentFilters = {
    departmentId: "",
    semester: "",
    q: "",
  };

  /* ================= HELPERS ================= */

  function apiUrl(path, params) {
    let url = API_BASE + path;
    if (!params) return url;

    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, v);
    });

    return qs.toString() ? `${url}?${qs}` : url;
  }

  async function apiGet(path, params) {
    const res = await fetch(apiUrl(path, params));
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  function debounce(fn, delay = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function formatPrice(v) {
    return Number(v || 0).toFixed(2);
  }

  /* ================= CART ================= */

  function loadCartFromStorage() {
    try {
      return JSON.parse(localStorage.getItem("gonotes_cart")) || [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem("gonotes_cart", JSON.stringify(cart));
  }

  function updateCartCount() {
    const badge = document.getElementById("cartCount");
    if (!badge) return;
    const count = cart.reduce((s, i) => s + i.qty, 0);
    badge.textContent = count;
    badge.style.display = count ? "inline-flex" : "none";
  }

  function addToCart(note) {
    const existing = cart.find((i) => i.id === note.id);
    if (existing) existing.qty++;
    else cart.push({ id: note.id, title: note.title, price: note.price, qty: 1 });
    saveCart();
    renderCart();
  }

  function renderCart() {
    if (!cartItemsWrap) return;
    cartItemsWrap.innerHTML = "";

    if (!cart.length) {
      cartItemsWrap.innerHTML = `<div class="empty">Your cart is empty.</div>`;
      cartTotalEl.textContent = "0.00";
      updateCartCount();
      return;
    }

    let total = 0;

    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-row";
      row.innerHTML = `
        <div>
          <strong>${item.title}</strong>
          <div>₹${formatPrice(item.price)}</div>
        </div>
        <button class="btn">Remove</button>
      `;
      row.querySelector("button").onclick = () => {
        cart = cart.filter((c) => c.id !== item.id);
        saveCart();
        renderCart();
      };
      cartItemsWrap.appendChild(row);
      total += item.price * item.qty;
    });

    cartTotalEl.textContent = formatPrice(total);
    updateCartCount();
  }

  /* ================= API ================= */

  async function loadDepartments() {
    const data = await apiGet("/departments");
    while (streamSelect.options.length > 1) streamSelect.remove(1);
    data.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d._id || d.id;
      opt.textContent = d.name;
      opt.dataset.sems = JSON.stringify(d.semesters || []);
      streamSelect.appendChild(opt);
    });
  }

  async function fetchNotes({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;

    const query = {
      departmentId: currentFilters.departmentId || undefined,
      semester: currentFilters.semester || undefined,
      q: currentFilters.q || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
    };

    try {
      const data = await apiGet("/notes/search", query);
      const results = data.results || [];
      totalResults = data.total || results.length;

      if (!append) {
        currentNotes = [];
        notesGrid.innerHTML = "";
      }

      results.forEach((n) => renderNote(n));
      currentNotes = currentNotes.concat(results);

      loadMoreBtn.style.display =
        currentNotes.length < totalResults ? "inline-block" : "none";
    } catch (e) {
      notesGrid.innerHTML = `<div class="empty">Failed to load notes.</div>`;
    } finally {
      isLoading = false;
    }
  }

  /* ================= RENDER ================= */

  function renderNote(n) {
    const tpl = noteCardTemplate.content.cloneNode(true);
    tpl.querySelector(".card-title").textContent = n.title;
    tpl.querySelector(".card-subtitle").textContent =
      `${n.department?.name || ""} · Sem ${n.semester || ""}`;

    const img = tpl.querySelector(".card-image");
    img.src = n.hasImage
      ? `${API_BASE}/notes/${n._id}/pic`
      : PLACEHOLDER_IMG;

    tpl.querySelector(".discounted-price").textContent =
      `₹${formatPrice(n.discountPrice || n.originalPrice)}`;

    tpl.querySelector(".add-to-cart").onclick = () => addToCart({
      id: n._id,
      title: n.title,
      price: n.discountPrice || n.originalPrice,
    });

    notesGrid.appendChild(tpl);
  }

  /* ================= EVENTS ================= */

  const debouncedSearch = debounce(() => {
    currentFilters.q = shopSearch.value.trim();
    currentPage = 1;
    fetchNotes();
  });

  streamSelect.onchange = () => {
    currentFilters.departmentId = streamSelect.value;
    currentPage = 1;
    fetchNotes();
  };

  semesterSelect.onchange = () => {
    currentFilters.semester = semesterSelect.value;
    currentPage = 1;
    fetchNotes();
  };

  shopSearch.oninput = debouncedSearch;

  resetFiltersBtn.onclick = () => {
    streamSelect.value = "";
    semesterSelect.value = "";
    shopSearch.value = "";
    currentFilters = { departmentId: "", semester: "", q: "" };
    currentPage = 1;
    fetchNotes();
  };

  loadMoreBtn.onclick = () => {
    if (currentNotes.length < totalResults) {
      currentPage++;
      fetchNotes({ append: true });
    }
  };

  openCartBtn.onclick = () => {
    cartModal.setAttribute("aria-hidden", "false");
  };

  document.getElementById("closeCart")?.onclick = () => {
    cartModal.setAttribute("aria-hidden", "true");
  };

  checkoutBtn.onclick = () => {
    if (!cart.length) return alert("Cart is empty");
    localStorage.setItem("gonotes_checkout", JSON.stringify(cart));
    window.location.href = "buynow.html";
  };

  /* ================= INIT ================= */

  document.addEventListener("DOMContentLoaded", async () => {
    renderCart();
    await loadDepartments();
    fetchNotes();
  });
})();
