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
const cartBadge = document.getElementById('cart-badge');
const forgotPasswordBtn = document.getElementById('forgot-password-btn');

let currentUser = null;
let selectedPaymentMethod = 'pay-now';

const PAYMENT_OPTIONS = [
  { id: 'pay-now', label: 'Pay now', subtitle: 'Full payment' },
  { id: 'weekly', label: 'Weekly payments', subtitle: '4 payments' },
  { id: 'monthly', label: 'Monthly payments', subtitle: '3 payments' },
];

// ---------- CART (localStorage, per browser) ----------
function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge() {
  if (!cartBadge) return;
  const count = getCartCount();
  cartBadge.textContent = count;
  cartBadge.style.opacity = count > 0 ? '1' : '0.65';
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

function renderProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const img = document.createElement('img');
  img.className = 'product-image';
  img.src = product.image || FALLBACK_PRODUCTS[0].image;
  img.alt = product.name || 'Product';

  const info = document.createElement('div');
  info.className = 'product-info';

  const category = document.createElement('p');
  category.className = 'product-category';
  category.textContent = product.category || 'General';

  const name = document.createElement('h3');
  name.className = 'product-name';
  name.textContent = product.name || 'Untitled product';

  const price = document.createElement('p');
  price.className = 'product-price';
  price.textContent = `R ${Number(product.price || 0).toFixed(2)}`;

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'add-to-cart-btn';
  addBtn.textContent = 'Add to cart';
  addBtn.addEventListener('click', () => addToCart(product));

  info.appendChild(category);
  info.appendChild(name);
  info.appendChild(price);
  info.appendChild(addBtn);

  card.appendChild(img);
  card.appendChild(info);

  return card;
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

async function loadHomeFeatured() {
  const homeGrid = document.getElementById('home-product-grid');
  if (!homeGrid) return;

  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(query(productsRef));
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const list = (products.length ? products : FALLBACK_PRODUCTS).slice(0, 3);

    homeGrid.innerHTML = '';
    list.forEach((product) => homeGrid.appendChild(renderProductCard(product)));
  } catch (error) {
    homeGrid.innerHTML = '<p class="loading-msg">Check back soon for new arrivals.</p>';
  }
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
  updateCartBadge();

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