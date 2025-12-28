// buynow.js — FINAL, SELF-DEFENSIVE & STRICT

if (!window.SERVER_URL) {
  alert("SERVER_URL missing — load js/server.js first");
  throw new Error("SERVER_URL missing");
}

const ROOT_URL = window.SERVER_URL.replace(/\/+$/, "");
const API_BASE = ROOT_URL + "/api";

// ==============================
// STATE
// ==============================
let cartItems = [];
let subtotal = 0;
let discount = 0;
let payable = 0;
let appliedCoupon = null;

// ==============================
// HELPERS
// ==============================
function formatPrice(n) {
  return Number(n || 0).toFixed(2);
}

// ==============================
// LOAD ITEMS (🔥 BUY NOW ALWAYS WINS)
// ==============================
function loadItemsForCheckout() {
  // 🔵 1️⃣ BUY NOW — explicit user intent
  try {
    const buyNowRaw = localStorage.getItem("gonotes_buynow");
    if (buyNowRaw) {
      const item = JSON.parse(buyNowRaw);
      if (item && item.title && item.price) {
        // 🧹 Safety: kill cart snapshot
        localStorage.removeItem("gonotes_checkout");
        return [{ ...item, qty: item.qty || 1 }];
      }
    }
  } catch (e) {
    console.error("BuyNow parse error", e);
  }

  // 🟢 2️⃣ CART CHECKOUT SNAPSHOT
  try {
    const checkoutRaw = localStorage.getItem("gonotes_checkout");
    if (checkoutRaw) {
      const items = JSON.parse(checkoutRaw);
      if (Array.isArray(items) && items.length) {
        return items;
      }
    }
  } catch (e) {
    console.error("Checkout parse error", e);
  }

  return [];
}

// ==============================
// RENDER ORDER SUMMARY
// ==============================
function renderOrderSummary() {
  const itemsEl = document.getElementById("orderItems");
  const emptyMsg = document.getElementById("emptyCartMsg");

  itemsEl.innerHTML = "";
  subtotal = 0;

  if (!cartItems.length) {
    emptyMsg.style.display = "block";
    return;
  }

  emptyMsg.style.display = "none";

  cartItems.forEach((item) => {
    const qty = Number(item.qty || 1);
    const price = Number(item.price || 0);
    const total = qty * price;

    subtotal += total;

    const row = document.createElement("div");
    row.className = "order-item";
    row.innerHTML = `
      <span>${item.title} × ${qty}</span>
      <span>₹${formatPrice(total)}</span>
    `;

    itemsEl.appendChild(row);
  });

  payable = Math.max(subtotal - discount, 0);

  document.getElementById("subtotalAmount").textContent = formatPrice(subtotal);
  document.getElementById("discountAmount").textContent = formatPrice(discount);
  document.getElementById("payableAmount").textContent = formatPrice(payable);

  document.getElementById("discountRow").style.display =
    discount > 0 ? "flex" : "none";
}

// ==============================
// APPLY COUPON
// ==============================
async function applyCoupon() {
  const input = document.getElementById("couponInput");
  const msg = document.getElementById("couponMsg");
  const code = (input.value || "").trim().toUpperCase();

  if (!cartItems.length) {
    msg.textContent = "Your cart is empty.";
    msg.className = "msg error";
    msg.style.display = "block";
    return;
  }

  if (!code) {
    msg.textContent = "Enter a coupon code.";
    msg.className = "msg error";
    msg.style.display = "block";
    return;
  }

  try {
    const res = await fetch(API_BASE + "/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      discount = 0;
      appliedCoupon = null;
      msg.textContent = data.message || "Invalid coupon.";
      msg.className = "msg error";
    } else {
      discount = Number(data.discountAmount || 0);
      appliedCoupon = { code };
      msg.textContent = data.message || "Coupon applied!";
      msg.className = "msg success";
    }

    msg.style.display = "block";
    renderOrderSummary();
  } catch (e) {
    console.error(e);
  }
}

// ==============================
// LOGIN MODAL
// ==============================
function showLoginRequiredModal() {
  const modal = document.getElementById("loginRequiredModal");
  const btn = document.getElementById("loginModalBtn");

  if (!modal || !btn) {
    alert("Please login first");
    window.location.href = "/pages/login.html";
    return;
  }

  modal.style.display = "flex";
  btn.onclick = () => {
    window.location.href = "/pages/login.html";
  };
}

// ==============================
// PAYMENT
// ==============================
async function startPayment() {
  if (!cartItems.length) {
    alert("Cart is empty");
    return;
  }

  if (!payable || payable <= 0) {
    alert("Invalid amount");
    return;
  }

  const token = localStorage.getItem("gonotes_token");
  if (!token) {
    showLoginRequiredModal();
    return;
  }

  const orderRes = await fetch(API_BASE + "/payment/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount: payable }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok || !orderData.success) {
    alert("Failed to create order");
    return;
  }

  const rzp = new Razorpay({
    key: "rzp_live_Rx5dLfOW4QM590",
    amount: orderData.order.amount,
    currency: "INR",
    name: "GoNotes",
    description: "Notes Purchase",
    order_id: orderData.order.id,

    handler: async (response) => {
      const verifyRes = await fetch(API_BASE + "/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          cart: cartItems,
          appliedCouponCode: appliedCoupon?.code || null,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        alert("Payment verification failed");
        return;
      }

      // 🧹 CLEANUP
      localStorage.removeItem("gonotes_cart");
      localStorage.removeItem("gonotes_checkout");
      localStorage.removeItem("gonotes_buynow");

      window.location.href = "/pages/mynotes.html";
    },
  });

  rzp.open();
}

// ==============================
// INIT
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  cartItems = loadItemsForCheckout();
  renderOrderSummary();

  document.getElementById("applyCouponBtn").onclick = applyCoupon;
  document.getElementById("payBtn").onclick = startPayment;
  document.getElementById("backBtn").onclick = () =>
    (window.location.href = "/pages/shop.html");
});
