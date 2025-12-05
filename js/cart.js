(function () {
  let cart = [];

  function formatPrice(num) {
    return Number(num || 0).toFixed(2);
  }

  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem("gonotes_cart");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Failed to load cart", e);
      return [];
    }
  }

  // used by buynow.html
  function saveCheckoutItems(items) {
    try {
      localStorage.setItem("gonotes_checkout", JSON.stringify(items || []));
    } catch (e) {
      console.warn("Failed saving checkout items", e);
    }
  }

  function saveCartToStorage() {
    try {
      localStorage.setItem("gonotes_cart", JSON.stringify(cart));
    } catch (e) {
      console.warn("Failed saving cart", e);
    }
  }

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

    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item-row";

      const main = document.createElement("div");
      main.className = "cart-item-main";

      const title = document.createElement("div");
      title.className = "cart-item-title";
      title.textContent = item.title;

      const price = document.createElement("div");
      price.className = "cart-item-price";
      price.textContent = `₹${formatPrice(item.price)} each`;

      main.appendChild(title);
      main.appendChild(price);

      const actions = document.createElement("div");
      actions.className = "cart-item-actions";

      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.min = "1";
      qtyInput.max = "99";
      qtyInput.value = String(item.qty || 1);
      qtyInput.className = "cart-item-qty";
      qtyInput.addEventListener("change", (e) => {
        const val = Math.max(1, Math.min(99, Number(e.target.value) || 1));
        item.qty = val;
        saveCartToStorage();
        renderCart();
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "cart-remove-btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        cart = cart.filter((c) => c.id !== item.id);
        saveCartToStorage();
        renderCart();
      });

      actions.appendChild(qtyInput);
      actions.appendChild(removeBtn);

      const lineTotal = item.price * (item.qty || 1);
      subtotal += lineTotal;
      itemsCount += item.qty || 1;

      const lineTotalEl = document.createElement("div");
      lineTotalEl.textContent = `₹${formatPrice(lineTotal)}`;
      lineTotalEl.style.minWidth = "80px";
      lineTotalEl.style.textAlign = "right";
      lineTotalEl.style.fontWeight = "500";

      row.appendChild(main);
      row.appendChild(actions);
      row.appendChild(lineTotalEl);

      cartItemsEl.appendChild(row);
    });

    subtotalEl.textContent = formatPrice(subtotal);
    itemsCountEl.textContent = String(itemsCount);
  }

  function wireEvents() {
    const goShopBtn = document.getElementById("goShopBtn");
    const continueShoppingBtn = document.getElementById("continueShoppingBtn");
    const clearCartBtn = document.getElementById("clearCartBtn");
    const checkoutBtn = document.getElementById("checkoutBtn");

    goShopBtn?.addEventListener("click", () => {
      window.location.href = "shop.html";
    });

    continueShoppingBtn?.addEventListener("click", () => {
      window.location.href = "shop.html";
    });

    clearCartBtn?.addEventListener("click", () => {
      if (!cart.length) return;
      if (!confirm("Clear all items from cart?")) return;
      cart = [];
      saveCartToStorage();
      renderCart();
    });

    checkoutBtn?.addEventListener("click", () => {
      if (!cart.length) {
        alert("Your cart is empty.");
        return;
      }
      // send all cart items to Buy Now page
      saveCheckoutItems(cart);
      window.location.href = "buynow.html";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    cart = loadCartFromStorage();
    wireEvents();
    renderCart();
  });
})();
