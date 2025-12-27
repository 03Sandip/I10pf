(function () {
  let cart = [];

  // ==============================
  // HELPERS
  // ==============================
  function formatPrice(num) {
    return Number(num || 0).toFixed(2);
  }

  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem("gonotes_cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveCartToStorage() {
    localStorage.setItem("gonotes_cart", JSON.stringify(cart));
  }

  // 🔑 used by buynow.html (cart checkout snapshot)
  function saveCheckoutItems(items) {
    localStorage.setItem("gonotes_checkout", JSON.stringify(items || []));
  }

  // ==============================
  // RENDER CART
  // ==============================
  function renderCart() {
    const cartEmptyEl = document.getElementById("cartEmpty");
    const cartWrapEl = document.getElementById("cartWrap");
    const cartItemsEl = document.getElementById("cartItems");
    const subtotalEl = document.getElementById("subtotalAmount");
    const itemsCountEl = document.getElementById("itemsCount");

    cartItemsEl.innerHTML = "";

    if (!cart.length) {
      cartEmptyEl.style.display = "block";
      cartWrapEl.style.display = "none";
      subtotalEl.textContent = "0.00";
      itemsCountEl.textContent = "0";
      return;
    }

    cartEmptyEl.style.display = "none";
    cartWrapEl.style.display = "grid";

    let subtotal = 0;
    let itemsCount = 0;

    cart.forEach((item, index) => {
      const qty = Math.max(1, Number(item.qty) || 1);
      const lineTotal = item.price * qty;

      subtotal += lineTotal;
      itemsCount += qty;

      const row = document.createElement("div");
      row.className = "cart-item-row";

      row.innerHTML = `
        <div class="cart-item-main">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-price">₹${formatPrice(item.price)} each</div>
        </div>

        <div class="cart-item-actions">
          <input type="number" min="1" max="99" value="${qty}" class="cart-item-qty" />
          <button class="cart-remove-btn">Remove</button>
        </div>

        <div class="cart-line-total">₹${formatPrice(lineTotal)}</div>
      `;

      // Quantity change
      row.querySelector(".cart-item-qty").addEventListener("change", (e) => {
        item.qty = Math.max(1, Math.min(99, Number(e.target.value) || 1));
        saveCartToStorage();
        renderCart();
      });

      // Remove item
      row.querySelector(".cart-remove-btn").addEventListener("click", () => {
        if (!confirm("Remove this item from cart?")) return;
        cart.splice(index, 1);
        saveCartToStorage();
        renderCart();
      });

      cartItemsEl.appendChild(row);
    });

    subtotalEl.textContent = formatPrice(subtotal);
    itemsCountEl.textContent = itemsCount;
  }

  // ==============================
  // EVENTS
  // ==============================
  function wireEvents() {
    document.getElementById("goShopBtn")?.addEventListener("click", () => {
      window.location.href = "shop.html";
    });

    document.getElementById("continueShoppingBtn")?.addEventListener("click", () => {
      window.location.href = "shop.html";
    });

    document.getElementById("clearCartBtn")?.addEventListener("click", () => {
      if (!cart.length) return;
      if (!confirm("Clear all items from cart?")) return;

      cart = [];
      saveCartToStorage();
      renderCart();
    });

    // 🔥 CART → CHECKOUT (VERY IMPORTANT FIX)
    document.getElementById("checkoutBtn")?.addEventListener("click", () => {
      if (!cart.length) {
        alert("Your cart is empty.");
        return;
      }

      // ❌ Kill individual Buy Now flow
      localStorage.removeItem("gonotes_buynow");

      // ✅ Save cart snapshot for checkout
      saveCheckoutItems(cart);

      window.location.href = "buynow.html";
    });
  }

  // ==============================
  // INIT
  // ==============================
  document.addEventListener("DOMContentLoaded", () => {
    cart = loadCartFromStorage();
    wireEvents();
    renderCart();
  });
})();
