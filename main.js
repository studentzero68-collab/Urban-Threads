import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import {
  collection,
  getDocs,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const FALLBACK_PRODUCTS = [
  {
    id: 'fallback-1',
    name: 'Signature Hoodie',
    category: 'Hoodies',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'fallback-2',
    name: 'Street Tee',
    category: 'T-shirts',
    price: 699,
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'fallback-3',
    name: 'Court Runner',
    category: 'Sneakers',
    price: 1899,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  },
];

const authLink = document.getElementById('auth-link');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const tabs = document.querySelectorAll('.auth-tab');
const productGrid = document.getElementById('product-grid');

function setAuthLink(user) {
  if (!authLink) return;

  if (user) {
    authLink.textContent = `Logout (${user.email})`;
    authLink.href = '#';
    authLink.addEventListener('click', handleLogout);
  } else {
    authLink.textContent = 'Login';
    authLink.href = 'login.html';
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

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === activeTab);
  });
}

function showAuthError(element, message) {
  if (element) {
    element.textContent = message;
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!loginForm) return;

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
  if (!signupForm) return;

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

async function loadProducts(category = 'all') {
  if (!productGrid) return;

  productGrid.innerHTML = '<p class="loading-msg">Loading products...</p>';

  try {
    const productsRef = collection(db, 'products');
    const q = category === 'all' ? query(productsRef) : query(productsRef, where('category', '==', category));
    const snapshot = await getDocs(q);

    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (!products.length) {
      productGrid.innerHTML = '';
      FALLBACK_PRODUCTS.filter((product) => category === 'all' || product.category === category).forEach((product) => {
        const card = document.createElement('article');
        card.className = 'product-card';

        card.innerHTML = `
          <img class="product-image" src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <p class="product-category">${product.category}</p>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-price">R ${Number(product.price || 0).toFixed(2)}</p>
            <button type="button" class="add-to-cart-btn">Add to cart</button>
          </div>
        `;

        productGrid.appendChild(card);
      });

      if (!productGrid.querySelector('.product-card')) {
        productGrid.innerHTML = '<p class="loading-msg">No products available yet.</p>';
      }
      return;
    }

    productGrid.innerHTML = '';

    products.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'product-card';

      card.innerHTML = `
        <img class="product-image" src="${product.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'}" alt="${product.name || 'Product'}">
        <div class="product-info">
          <p class="product-category">${product.category || 'General'}</p>
          <h3 class="product-name">${product.name || 'Untitled product'}</h3>
          <p class="product-price">R ${Number(product.price || 0).toFixed(2)}</p>
          <button type="button" class="add-to-cart-btn">Add to cart</button>
        </div>
      `;

      productGrid.appendChild(card);
    });
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

function initAuth() {
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  if (signupForm) {
    signupForm.addEventListener('submit', handleSignupSubmit);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => toggleAuthForms(tab.dataset.tab));
  });

  onAuthStateChanged(auth, (user) => {
    setAuthLink(user);
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
