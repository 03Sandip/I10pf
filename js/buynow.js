// buynow.js / checkout.js

// --- CONFIG: use SERVER_URL from server.js only ---
if (!window.SERVER_URL) {
  alert("SERVER_URL missing — load js/server.js before buynow.js");
  throw new Error("SERVER_URL missing");
}

const ROOT_URL = window.SERVER_URL.replace(/\/+$/, "");
const API_BASE = ROOT_URL + "/api";

let cart = [];
let subtotal = 0;
let discount = 0;
let payable = 0;
let appliedCoupon = null; // { code, discountType, discountValue }

/* =====================================================
   CART LOADING
   ===================================================== */

function loadCheckoutItems() {
  try {
    const raw = localStorage.getItem("gonotes_checkout");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}

  const rawCart = localStorage.getItem("gonotes_cart");
  if (!rawCart) return [];
  try {
    const parsed = JSON.parse(rawCart);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatPrice(n) {
  return Number(n || 0).toFixed(2);
}

/* =====================================================
   RENDER SUMMARY
   ===================================================== */

function renderOrderSummary() {
  const orderItemsEl = document.getElementById("orderItems");
  const emptyCartMsg = document.getElementById("emptyCartMsg");

  orderItemsEl.innerHTML = "";
  subtotal = 0;

  if (!cart.length) {
    emptyCartMsg.style.display = "block";
  } else {
    emptyCartMsg.style.display = "none";
    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "order-item";

      const price = Number(item.price || item.discountPrice || 0);
      const qty = Number(item.qty || 1);

      row.innerHTML = `
        <span class="order-item-title">${item.title} × ${qty}</span>
        <span>₹${formatPrice(price * qty)}</span>
      `;

      orderItemsEl.appendChild(row);
      subtotal += price * qty;
    });
  }

  payable = subtotal - discount;

  document.getElementById("subtotalAmount").textContent = formatPrice(subtotal);
  document.getElementById("discountAmount").textContent = formatPrice(discount);
  document.getElementById("payableAmount").textContent = formatPrice(payable);

  document.getElementById("discountRow").style.display =
    discount > 0 ? "flex" : "none";
}

/* =====================================================
   COUPON  (USES BACKEND /api/coupons/validate)
   ===================================================== */

async function applyCoupon() {
  const inputEl = document.getElementById("couponInput");
  const msg = document.getElementById("couponMsg");
  const rawCode = (inputEl.value || "").trim();
  const code = rawCode.toUpperCase();

  if (!cart.length) {
    msg.textContent = "Add at least one note first.";
    msg.className = "msg error";
    msg.style.display = "block";
    return;
  }

  if (!code) {
    msg.textContent = "Please enter a coupon code.";
    msg.className = "msg error";
    msg.style.display = "block";
    return;
  }

  try {
    const res = await fetch(API_BASE + "/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,      // coupon code
        subtotal,  // current subtotal amount
      }),
    });

    const data = await res.json().catch(() => ({}));
    console.log("[buynow] /coupons/validate =>", data);

    if (!res.ok || !data.success) {
      msg.textContent = data.message || "Invalid coupon.";
      msg.className = "msg error";
      msg.style.display = "block";

      discount = 0;
      appliedCoupon = null;
      renderOrderSummary();
      return;
    }

    // ✅ Use fields directly from response (NOT data.coupon)
    discount = Number(data.discountAmount || 0);
    payable =
      data.payable != null ? Number(data.payable) : subtotal - discount;

    appliedCoupon = {
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
    };

    msg.textContent = data.message || "Coupon applied successfully.";
    msg.className = "msg success";
    msg.style.display = "block";

    renderOrderSummary();
  } catch (err) {
    console.error("[buynow] coupon validate error:", err);
    msg.textContent = "Could not validate coupon. Please try again.";
    msg.className = "msg error";
    msg.style.display = "block";

    discount = 0;
    appliedCoupon = null;
    renderOrderSummary();
  }
}

/* =====================================================
   PAYMENT
   ===================================================== */

async function startPayment() {
  if (!cart.length) {
    showInteractiveToast({
      title: "Cart is empty",
      message: "Please add at least one note before paying.",
      type: "error",
      secondaryText: "Close",
    });
    return;
  }

  const token = localStorage.getItem("gonotes_token");
  if (!token) {
    showInteractiveToast({
      title: "Login required",
      message: "Please log in before making a payment.",
      type: "error",
      primaryText: "Go to Login",
      onPrimary: () => (window.location.href = "login.html"),
      secondaryText: "Close",
    });
    return;
  }

  const orderRes = await fetch(API_BASE + "/payment/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: payable }),
  });

  const orderData = await orderRes.json();

  if (!orderData.success) {
    showInteractiveToast({
      title: "Order failed",
      message: "We could not create your order. Please try again.",
      type: "error",
      secondaryText: "Close",
    });
    return;
  }

  const options = {
    key: "rzp_test_RnRIwRM8IIcfaf",
    amount: orderData.order.amount,
    currency: "INR",
    name: "GoNotes Store",
    description: "Notes Purchase",
    order_id: orderData.order.id,

    handler: async function (response) {
      const verifyRes = await fetch(API_BASE + "/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...response,   // razorpay_* fields
          cart,          // purchased notes
          appliedCouponCode: appliedCoupon ? appliedCoupon.code : null,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        localStorage.removeItem("gonotes_checkout");

        showInteractiveToast({
          title: "Payment Successful!",
          message: "Your notes are unlocked. Redirecting to My Notes...",
          type: "success",
          primaryText: "View My Notes",
          onPrimary: () => (window.location.href = "mynotes.html"),
          secondaryText: "Back to Shop",
          onSecondary: () => (window.location.href = "shop.html"),
          autoCloseMs: 6000,
          autoRedirect: () => {
            window.location.href = "mynotes.html";
          },
        });
      } else {
        showInteractiveToast({
          title: "Verification failed",
          message: verifyData.message || "Payment verification failed.",
          type: "error",
          secondaryText: "Close",
        });
      }
    },
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

/* =====================================================
   INIT
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  cart = loadCheckoutItems();
  renderOrderSummary();

  document.getElementById("applyCouponBtn").onclick = applyCoupon;
  document.getElementById("payBtn").onclick = startPayment;

  document.getElementById("backBtn").onclick = () => {
    window.location.href = "shop.html";
  };
});
