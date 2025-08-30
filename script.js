// Mini Shop – Products, Filters, Cart with localStorage persistence
(function () {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  const productsData = [
    { id: 'p1', name: 'Aurora Headphones', price: 99, rating: 4.6, category: 'Audio', stock: 18, color: '#7aa0ff' },
    { id: 'p2', name: 'Nebula Bluetooth Speaker', price: 59, rating: 4.2, category: 'Audio', stock: 30, color: '#6b78ff' },
    { id: 'p3', name: 'Stellar Smartwatch', price: 149, rating: 4.7, category: 'Wearables', stock: 12, color: '#9b5cff' },
    { id: 'p4', name: 'Comet Fitness Band', price: 39, rating: 4.1, category: 'Wearables', stock: 40, color: '#ff6b9b' },
    { id: 'p5', name: 'Photon LED Lamp', price: 25, rating: 4.0, category: 'Home', stock: 55, color: '#6effb1' },
    { id: 'p6', name: 'Zen Keyboard', price: 75, rating: 4.4, category: 'Computer', stock: 22, color: '#ffc36e' },
    { id: 'p7', name: 'Glide Wireless Mouse', price: 35, rating: 4.3, category: 'Computer', stock: 46, color: '#6ee8ff' },
    { id: 'p8', name: 'Quasar USB-C Hub', price: 45, rating: 4.2, category: 'Computer', stock: 33, color: '#c06eff' },
    { id: 'p9', name: 'Orbit Desk Fan', price: 29, rating: 4.1, category: 'Home', stock: 28, color: '#6eff7d' },
    { id: 'p10', name: 'Pulse Action Camera', price: 199, rating: 4.5, category: 'Cameras', stock: 9, color: '#ff6e8c' }
  ];

  const els = {
    productsList: $('#productsList'),
    resultsCount: $('#resultsCount'),
    loader: $('#loader'),
    cartCount: $('#cartCount'),
    searchInput: $('#searchInput'),
    categorySelect: $('#categorySelect'),
    priceMin: $('#priceMin'),
    priceMax: $('#priceMax'),
    sortSelect: $('#sortSelect'),
    clearFilters: $('#clearFilters'),
    // cart drawer
    cartToggle: $('#cartToggle'),
    cartDrawer: $('#cartDrawer'),
    cartBackdrop: $('#cartBackdrop'),
    closeCart: $('#closeCart'),
    cartItems: $('#cartItems'),
    cartSubtotal: $('#cartSubtotal'),
    checkoutBtn: $('#checkoutBtn'),
  };

  // Generate placeholder SVG (no external images)
  function makeSVGPlaceholder(label, color) {
    const encoded = encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
        <defs>
          <linearGradient id='g' x1='0' x2='0' y1='0' y2='1'>
            <stop offset='0%' stop-color='${color}' stop-opacity='0.8'/>
            <stop offset='100%' stop-color='${color}' stop-opacity='0.3'/>
          </linearGradient>
        </defs>
        <rect width='100%' height='100%' rx='16' fill='url(#g)'/>
        <g fill='white' font-family='system-ui,Segoe UI,Roboto' font-weight='700' text-anchor='middle'>
          <text x='200' y='160' font-size='26'>${label}</text>
        </g>
      </svg>
    `.trim());
    return `url("data:image/svg+xml,${encoded}")`;
  }

  // State
  let state = {
    query: '',
    category: 'all',
    priceMin: 0,
    priceMax: 9999,
    sort: 'relevance',
    cart: loadCart()
  };

  // ---- CART PERSISTENCE ----
  function loadCart() {
    try { return JSON.parse(localStorage.getItem('cart_v1') || '{}'); } catch { return {}; }
  }
  function saveCart() {
    localStorage.setItem('cart_v1', JSON.stringify(state.cart));
  }

  function cartCount() {
    return Object.values(state.cart).reduce((sum, item) => sum + item.qty, 0);
  }

  function cartSubtotal() {
    return Object.values(state.cart).reduce((sum, item) => {
      const p = productsData.find(x => x.id === item.id);
      return sum + (p ? p.price * item.qty : 0);
    }, 0);
  }

  function formatCurrency(n) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
  }

  function updateCartBadge() {
    els.cartCount.textContent = cartCount();
  }

  function renderCart() {
    els.cartItems.innerHTML = '';
    const tmpl = $('#cartItemTmpl');

    Object.values(state.cart).forEach(ci => {
      const product = productsData.find(p => p.id === ci.id);
      if (!product) return;
      const node = tmpl.content.cloneNode(true);
      const root = node.querySelector('.cart-item');
      const t = node.querySelector('.ci-thumb');
      const title = node.querySelector('.ci-title');
      const price = node.querySelector('.ci-price');
      const rating = node.querySelector('.ci-rating');
      const qtyInput = node.querySelector('.qty-input');
      const decBtn = node.querySelector('.qty-btn.dec');
      const incBtn = node.querySelector('.qty-btn.inc');
      const rmBtn = node.querySelector('.remove');

      t.style.backgroundImage = makeSVGPlaceholder(product.name, product.color);
      title.textContent = product.name;
      price.textContent = formatCurrency(product.price);
      rating.textContent = `★ ${product.rating.toFixed(1)}`;

      qtyInput.value = ci.qty;

      function setQty(newQty) {
        newQty = Math.max(1, Math.min(99, Number(newQty) || 1));
        state.cart[product.id].qty = newQty;
        saveCart();
        updateCartBadge();
        els.cartSubtotal.textContent = formatCurrency(cartSubtotal());
      }

      qtyInput.addEventListener('change', e => setQty(e.target.value));
      decBtn.addEventListener('click', () => setQty(ci.qty - 1));
      incBtn.addEventListener('click', () => setQty(ci.qty + 1));
      rmBtn.addEventListener('click', () => {
        delete state.cart[product.id];
        saveCart();
        renderCart();
        updateCartBadge();
        els.cartSubtotal.textContent = formatCurrency(cartSubtotal());
      });

      els.cartItems.appendChild(node);
    });

    els.cartSubtotal.textContent = formatCurrency(cartSubtotal());
  }

  // ---- PRODUCTS RENDER ----
  function applyFilters(list) {
    let out = list.filter(p => 
      p.name.toLowerCase().includes(state.query) &&
      (state.category === 'all' || p.category === state.category) &&
      p.price >= state.priceMin && p.price <= state.priceMax
    );

    switch (state.sort) {
      case 'priceAsc': out.sort((a,b) => a.price - b.price); break;
      case 'priceDesc': out.sort((a,b) => b.price - a.price); break;
      case 'ratingDesc': out.sort((a,b) => b.rating - a.rating); break;
      case 'nameAsc': out.sort((a,b) => a.name.localeCompare(b.name)); break;
      default: /* relevance: keep original order */ break;
    }

    return out;
  }

  function renderProducts(list) {
    els.productsList.innerHTML = '';
    const tmpl = $('#productCardTmpl');

    list.forEach(p => {
      const node = tmpl.content.cloneNode(true);
      const art = node.querySelector('.card');
      const thumb = node.querySelector('.thumb');
      const title = node.querySelector('.title');
      const price = node.querySelector('.price');
      const rating = node.querySelector('.rating');
      const addBtn = node.querySelector('.add-btn');

      thumb.style.backgroundImage = makeSVGPlaceholder(p.name, p.color);
      title.textContent = p.name;
      price.textContent = formatCurrency(p.price);
      rating.textContent = `★ ${p.rating.toFixed(1)}`;

      addBtn.addEventListener('click', () => {
        if (!state.cart[p.id]) state.cart[p.id] = { id: p.id, qty: 0 };
        state.cart[p.id].qty += 1;
        saveCart();
        updateCartBadge();
      });

      els.productsList.appendChild(node);
    });

    els.resultsCount.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
  }

  // ---- INIT ----
  function populateCategories(list) {
    const cats = Array.from(new Set(list.map(p => p.category))).sort();
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      els.categorySelect.appendChild(opt);
    });
  }

  function withLoader(task) {
    els.loader.classList.remove('hidden');
    // Simulate small delay as if fetching from server
    setTimeout(() => {
      task();
      els.loader.classList.add('hidden');
    }, 300);
  }

  function applyAndRender() {
    withLoader(() => {
      const filtered = applyFilters(productsData);
      renderProducts(filtered);
    });
  }

  function attachEvents() {
    // Search
    let searchTimer;
    els.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = e.target.value.trim().toLowerCase();
        applyAndRender();
      }, 150);
    });

    // Category
    els.categorySelect.addEventListener('change', (e) => {
      state.category = e.target.value;
      applyAndRender();
    });

    // Price
    const priceChange = () => {
      state.priceMin = Math.max(0, Number(els.priceMin.value) || 0);
      state.priceMax = Math.max(state.priceMin, Number(els.priceMax.value) || 9999);
      els.priceMin.value = state.priceMin;
      els.priceMax.value = state.priceMax;
      applyAndRender();
    };
    els.priceMin.addEventListener('change', priceChange);
    els.priceMax.addEventListener('change', priceChange);

    // Sort
    els.sortSelect.addEventListener('change', (e) => {
      state.sort = e.target.value;
      applyAndRender();
    });

    // Clear
    els.clearFilters.addEventListener('click', () => {
      state = { ...state, query: '', category: 'all', priceMin: 0, priceMax: 9999, sort: 'relevance' };
      els.searchInput.value = '';
      els.categorySelect.value = 'all';
      els.priceMin.value = 0;
      els.priceMax.value = 9999;
      els.sortSelect.value = 'relevance';
      applyAndRender();
    });

    // Cart open/close
    const openCart = () => { els.cartDrawer.classList.add('open'); els.cartDrawer.setAttribute('aria-hidden', 'false'); renderCart(); };
    const closeCart = () => { els.cartDrawer.classList.remove('open'); els.cartDrawer.setAttribute('aria-hidden', 'true'); };

    els.cartToggle.addEventListener('click', openCart);
    els.closeCart.addEventListener('click', closeCart);
    els.cartBackdrop.addEventListener('click', closeCart);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCart();
      if (e.key.toLowerCase() === 'c') openCart();
    });

    // Checkout (demo)
    els.checkoutBtn.addEventListener('click', () => {
      if (cartCount() === 0) { alert('Your cart is empty.'); return; }
      alert('Demo checkout! Thank you for shopping 🛍️');
      state.cart = {};
      saveCart();
      renderCart();
      updateCartBadge();
    });
  }

  // Boot
  function init() {
    populateCategories(productsData);
    updateCartBadge();
    attachEvents();
    applyAndRender();
  }

  init();
})();