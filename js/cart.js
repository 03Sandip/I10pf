// js/cart.js
// Simple cart page logic using localStorage to persist cart items across pages.
//
// Data model expected for each cart item:
// {
//   id: 'n1',
//   title: 'Title',
//   stream: 'Engineering',
//   semester: '1',
//   price: 89,
//   img: 'assets/note1.jpg',
//   qty: 1,
//   previewUrl: 'assets/sample-note-preview.pdf'
// }

// keys
const CART_KEY = 'gonotes_cart_v1';

// utilities
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = n => Number(n || 0).toFixed(2);

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse cart', e);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  // update header cart counters if present
  const count = cart.reduce((s,i)=> s + (i.qty||0), 0);
  const b = $('#cartCount'); if (b) b.textContent = count;
  const bm = $('#cartCountMobile'); if (bm) bm.textContent = count;
}

function findIndex(cart, id) {
  return cart.findIndex(i => i.id === id);
}

// render cart page
function renderCartPage() {
  const container = $('#cartItemsContainer');
  const empty = $('#cartEmpty');
  container.innerHTML = '';

  const cart = loadCart();
  if (!cart || cart.length === 0) {
    empty.style.display = 'block';
    $('#subtotal').textContent = '₹0.00';
    $('#tax').textContent = '₹0.00';
    $('#shipping').textContent = '₹0.00';
    $('#grandTotal').textContent = '₹0.00';
    saveCart([]);
    return;
  }
  empty.style.display = 'none';

  cart.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <img class="thumb" src="${escapeHtml(item.img || '../assets/note1.jpg')}" alt="${escapeHtml(item.title)}"/>
      <div class="meta">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="sub">${escapeHtml(item.stream)} • Sem ${escapeHtml(item.semester)}</div>
        <div class="desc">${escapeHtml(item.description || '')}</div>
      </div>
      <div class="item-controls">
        <div class="item-price">₹${fmt(item.price)}</div>
        <div class="qty-control" data-id="${item.id}">
          <button class="qty-btn qty-decrease" data-id="${item.id}">−</button>
          <div class="qty-display" data-id="${item.id}">${item.qty || 1}</div>
          <button class="qty-btn qty-increase" data-id="${item.id}">+</button>
        </div>
        <button class="remove-link" data-id="${item.id}">Remove</button>
      </div>
    `;
    container.appendChild(itemEl);
  });

  // attach events
  $$('.qty-increase').forEach(b => b.addEventListener('click', onQtyInc));
  $$('.qty-decrease').forEach(b => b.addEventListener('click', onQtyDec));
  $$('.remove-link').forEach(b => b.addEventListener('click', onRemove));

  updateTotals();
}

// qty handlers
function onQtyInc(e) {
  const id = e.currentTarget.dataset.id;
  const cart = loadCart();
  const i = findIndex(cart, id);
  if (i === -1) return;
  cart[i].qty = (cart[i].qty || 0) + 1;
  saveCart(cart);
  renderCartPage();
}
function onQtyDec(e) {
  const id = e.currentTarget.dataset.id;
  const cart = loadCart();
  const i = findIndex(cart, id);
  if (i === -1) return;
  cart[i].qty = Math.max(1, (cart[i].qty || 1) - 1);
  saveCart(cart);
  renderCartPage();
}
function onRemove(e) {
  const id = e.currentTarget.dataset.id;
  let cart = loadCart();
  cart = cart.filter(i => i.id !== id);
  saveCart(cart);
  renderCartPage();
}

// totals
function updateTotals() {
  const cart = loadCart();
  const subtotal = cart.reduce((s,i)=> s + (i.price || 0) * (i.qty || 1), 0);
  const tax = subtotal * 0.05; // 5% tax
  const shipping = subtotal > 0 ? 29 : 0;
  const grand = subtotal + tax + shipping;

  $('#subtotal').textContent = `₹${fmt(subtotal)}`;
  $('#tax').textContent = `₹${fmt(tax)}`;
  $('#shipping').textContent = `₹${fmt(shipping)}`;
  $('#grandTotal').textContent = `₹${fmt(grand)}`;
}

// checkout (mock)
function doCheckout() {
  const cart = loadCart();
  if (!cart.length) return alert('Your cart is empty');
  // In production, send cart to server; here we mock
  alert('Checkout simulated. Thank you for your order!');
  saveCart([]);
  renderCartPage();
}

// helpers
function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

// sync header counters when page loads
function syncHeaderCount() {
  const cart = loadCart();
  const count = cart.reduce((s,i)=> s + (i.qty||0), 0);
  const el = $('#cartCount'); if (el) el.textContent = count;
  const elm = $('#cartCountMobile'); if (elm) elm.textContent = count;
}

// init
document.addEventListener('DOMContentLoaded', () => {
  // ensure header/footer loaded by loadPartials.js before we manipulate counters
  // render page
  renderCartPage();
  syncHeaderCount();

  // wire checkout button
  const btn = $('#checkoutBtn'); if (btn) btn.addEventListener('click', doCheckout);
});
