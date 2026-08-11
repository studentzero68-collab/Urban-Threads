import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import {
  collection,
  getDocs,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const FALLBACK_PRODUCTS = [
  { id: 'fallback-1', name: 'Royal Signature Hoodie', category: 'Hoodies', price: 1299, image: 'https://thefoschini.vtexassets.com/arquivos/ids/226170928-800-1067?v=639134838353270000&width=800&height=1067&aspect=true' },
  { id: 'fallback-2', name: 'Courtline Tee', category: 'T-shirts', price: 699, image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80' },
  { id: 'fallback-3', name: 'Apex Runner', category: 'Sneakers', price: 1899, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80' },
];

const authLink = document.getElementById('auth-link');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginError = document.getElementById('login-error');
const loginInfo = document.getElementById('login-info');
const signupError = document.getElementById('signup-error');
const tabs = document.querySelectorAll('.auth-tab');
const productGrid = document.getElementById('product-grid');
const cartContent = document.getElementById('cart-content');
const forgotPasswordBtn = document.getElementById('forgot-password-btn');

let currentUser = null;

// ---------- CART (localStorage, per browser) ----------
function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
  }

  saveCart(cart);
  renderCart();
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  item.qty += delta;
  const updated = item.qty <= 0 ? cart.filter((i) => i.id !== id) : cart;
  saveCart(updated);
  renderCart();
}

function removeFromCart(id) {
  const cart = getCart().filter((item) => item.id !== id);
  saveCart(cart);
  renderCart();
}

function renderCart() {
  if (!cartContent) return;

  // gate: only logged-in users can view the cart
  if (!currentUser) {
    cartContent.innerHTML = `
      <div class="cart-locked">
        <p>You need to be logged in to view your cart.</p>
        <p><a href="login.html">Log in or sign up</a></p>
      </div>
    `;
    return;
  }

  const cart = getCart();

  if (cart.length === 0) {
    cartContent.innerHTML = '<p class="loading-msg">Your cart is empty.</p>';
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  cartContent.innerHTML = `
    ${cart.map((item) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <h3>${item.name}</h3>
          <p>R ${item.price.toFixed(2)} each</p>
        </div>
        <div class="cart-qty">
          <button type="button" data-action="decrease" data-id="${item.id}">-</button>
          <span>${item.qty}</span>
          <button type="button" data-action="increase" data-id="${item.id}">+</button>
        </div>
        <button type="button" class="cart-remove" data-action="remove" data-id="${item.id}">Remove</button>
      </div>
    `).join('')}
    <div class="cart-summary">
      <span>Total</span>
      <span class="cart-total">R ${total.toFixed(2)}</span>
    </div>
  `;

  cartContent.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === 'increase') changeQty(id, 1);
      if (btn.dataset.action === 'decrease') changeQty(id, -1);
      if (btn.dataset.action === 'remove') removeFromCart(id);
    });
  });
}

// ---------- AUTH ----------
function setAuthLink(user) {
  if (!authLink) return;

  if (user) {
    authLink.textContent = `Logout (${user.email})`;
    authLink.href = '#';
    authLink.onclick = handleLogout;
  } else {
    authLink.textContent = 'Login';
    authLink.href = 'login.html';
    authLink.onclick = null;
  }
}

async function handleLogout(event) {
  event.preventDefault();
  await signOut(auth);
}

function toggleAuthForms(activeTab) {
  if (!loginForm || !signupForm) return;

  const isLogin = activeTab === 'login';
  loginForm.classList.toggle('hidden', !isLogin);
  signupForm.classList.toggle('hidden', isLogin);

  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === activeTab));
}

function showAuthError(element, message) {
  if (element) element.textContent = message;
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showAuthError(loginError, '');
    window.location.href = 'shop.html';
  } catch (error) {
    showAuthError(loginError, error.message || 'Login failed');
  }
}

async function handleSignupSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showAuthError(signupError, '');
    window.location.href = 'shop.html';
  } catch (error) {
    showAuthError(signupError, error.message || 'Signup failed');
  }
}

// ---------- PASSWORD TOGGLE (show/hide) ----------
function wirePasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.textContent = isPassword ? 'Hide' : 'Show';
      button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  });
}

// ---------- FORGOT PASSWORD ----------
function wireForgotPassword() {
  if (!forgotPasswordBtn) return;

  forgotPasswordBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();

    if (!email) {
      showAuthError(loginError, 'Enter your email above first, then click "Forgot password?"');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showAuthError(loginError, '');
      if (loginInfo) loginInfo.textContent = 'Password reset email sent — check your inbox.';
    } catch (error) {
      showAuthError(loginError, error.message || 'Could not send reset email');
    }
  });
}

// ---------- PRODUCTS ----------
function renderProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  card.innerHTML = `
    <img class="product-image" src="${product.image || FALLBACK_PRODUCTS[0].image}" alt="${product.name || 'Product'}">
    <div class="product-info">
      <p class="product-category">${product.category || 'General'}</p>
      <h3 class="product-name">${product.name || 'Untitled product'}</h3>
      <p class="product-price">R ${Number(product.price || 0).toFixed(2)}</p>
      <button type="button" class="add-to-cart-btn">Add to cart</button>
    </div>
  `;

  card.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(product));
  return card;
}

async function loadProducts(category = 'all') {
  if (!productGrid) return;

  productGrid.innerHTML = '<p class="loading-msg">Loading products...</p>';

  try {
    const productsRef = collection(db, 'products');
    const q = category === 'all' ? query(productsRef) : query(productsRef, where('category', '==', category));
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const list = products.length
      ? products
      : FALLBACK_PRODUCTS.filter((p) => category === 'all' || p.category === category);

    productGrid.innerHTML = '';
    list.forEach((product) => productGrid.appendChild(renderProductCard(product)));

    if (!productGrid.querySelector('.product-card')) {
      productGrid.innerHTML = '<p class="loading-msg">No products available yet.</p>';
    }
  } catch (error) {
    productGrid.innerHTML = `<p class="loading-msg">Unable to load products: ${error.message}</p>`;
  }
}

function wireShopFilters() {
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      loadProducts(button.dataset.category || 'all');
    });
  });
}

// ---------- INIT ----------
function initAuth() {
  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
  if (signupForm) signupForm.addEventListener('submit', handleSignupSubmit);
  tabs.forEach((tab) => tab.addEventListener('click', () => toggleAuthForms(tab.dataset.tab)));

  wirePasswordToggles();
  wireForgotPassword();

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    setAuthLink(user);
    renderCart();
  });
}

function initShop() {
  if (!productGrid) return;
  wireShopFilters();
  loadProducts('all');
}

function init() {
  initAuth();
  initShop();
}

init();