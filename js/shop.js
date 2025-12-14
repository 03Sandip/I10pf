// js/shop.js — SAFE + FIXED VERSION
(function () {
  /* ================= CONFIG ================= */

  if (!window.SERVER_URL) {
    alert("SERVER_URL missing — load js/server.js before js/shop.js");
    return;
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

  const cartItemsWrap = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const openCartBtn = document.getElementById("openCartBtn");
  const cartModal = document.getElementById("cartModal");
  const closeCartBtn = document.getElementById("closeCart");

  if (!notesGrid || !noteCardTemplate) return;

  /* ================= STATE ================= */

  let currentPage = 1;
  let totalResults = 0;
  let isLoading = false;
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
    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v !== undefined && v !== "") qs.set(k, v);
    });

    return qs.toString() ? url + "?" + qs.toString() : url;
  }

  async function apiGet(path, params) {
    const res = await fetch(apiUrl(path, params));
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  function debounce(fn, delay) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(function () {
        fn.apply(null, args);
      }, delay);
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

  function renderCart() {
    if (!cartItemsWrap || !cartTotalEl) return;

    cartItemsWrap.innerHTML = "";
    if (!cart.length) {
      cartItemsWrap.innerHTML = "<div class='empty'>Your cart is empty.</div>";
      cartTotalEl.textContent = "0.00";
      return;
    }

    let total = 0;
    cart.forEach(function (item) {
      const row = document.createElement("div");
      row.className = "cart-row";
      row.innerHTML =
        "<div><strong>" +
        item.title +
        "</strong><div>₹" +
        formatPrice(item.price) +
        "</div></div><button class='btn'>Remove</button>";

      row.querySelector("button").onclick = function () {
        cart = cart.filter(function (c) {
          return c.id !== item.id;
        });
        saveCart();
        renderCart();
      };

      cartItemsWrap.appendChild(row);
      total += item.price * item.qty;
    });

    cartTotalEl.textContent = formatPrice(total);
  }

  /* ================= API ================= */

  async function loadDepartments() {
    if (!streamSelect) return;
    const data = await apiGet("/departments");
    while (streamSelect.options.length > 1) streamSelect.remove(1);

    (data || []).forEach(function (d) {
      const opt = document.createElement("option");
      opt.value = d._id || d.id;
      opt.textContent = d.name || "Unknown";
      streamSelect.appendChild(opt);
    });
  }

  async function fetchNotes(append) {
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

      if (!append) notesGrid.innerHTML = "";

      results.forEach(renderNote);

      if (loadMoreBtn) {
        loadMoreBtn.style.display =
          currentPage * PAGE_SIZE < totalResults ? "inline-block" : "none";
      }
    } catch (e) {
      notesGrid.innerHTML = "<div class='empty'>Failed to load notes.</div>";
    } finally {
      isLoading = false;
    }
  }

  /* ================= RENDER ================= */

  function renderNote(n) {
    const tpl = noteCardTemplate.content.cloneNode(true);

    const deptName =
      n.department && n.department.name ? n.department.name : "";

    tpl.querySelector(".card-title").textContent = n.title || "Untitled";
    tpl.querySelector(".card-subtitle").textContent =
      deptName + (n.semester ? " · Sem " + n.semester : "");

    const img = tpl.querySelector(".card-image");
    img.src = n.hasImage
      ? API_BASE + "/notes/" + n._id + "/pic"
      : PLACEHOLDER_IMG;

    tpl.querySelector(".discounted-price").textContent =
      "₹" + formatPrice(n.discountPrice || n.originalPrice);

    tpl.querySelector(".add-to-cart").onclick = function () {
      cart.push({
        id: n._id,
        title: n.title,
        price: n.discountPrice || n.originalPrice,
        qty: 1,
      });
      saveCart();
      renderCart();
    };

    notesGrid.appendChild(tpl);
  }

  /* ================= EVENTS ================= */

  const debouncedSearch = debounce(function () {
    currentFilters.q = shopSearch.value.trim();
    currentPage = 1;
    fetchNotes(false);
  }, 300);

  if (streamSelect)
    streamSelect.onchange = function () {
      currentFilters.departmentId = streamSelect.value;
      currentPage = 1;
      fetchNotes(false);
    };

  if (semesterSelect)
    semesterSelect.onchange = function () {
      currentFilters.semester = semesterSelect.value;
      currentPage = 1;
      fetchNotes(false);
    };

  if (shopSearch) shopSearch.oninput = debouncedSearch;

  if (resetFiltersBtn)
    resetFiltersBtn.onclick = function () {
      currentFilters = { departmentId: "", semester: "", q: "" };
      currentPage = 1;
      fetchNotes(false);
    };

  if (loadMoreBtn)
    loadMoreBtn.onclick = function () {
      currentPage++;
      fetchNotes(true);
    };

  if (openCartBtn)
    openCartBtn.onclick = function () {
      cartModal.setAttribute("aria-hidden", "false");
    };

  if (closeCartBtn)
    closeCartBtn.onclick = function () {
      cartModal.setAttribute("aria-hidden", "true");
    };

  if (checkoutBtn)
    checkoutBtn.onclick = function () {
      if (!cart.length) return alert("Cart is empty");
      localStorage.setItem("gonotes_checkout", JSON.stringify(cart));
      window.location.href = "buynow.html";
    };

  /* ================= INIT ================= */

  document.addEventListener("DOMContentLoaded", function () {
    renderCart();
    loadDepartments();
    fetchNotes(false);
  });
})();
