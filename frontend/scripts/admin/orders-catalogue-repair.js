(() => {
  'use strict';
  const db = () => window.BHATTI?.db;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => window.BHATTI?.money ? window.BHATTI.money(value) : `PKR ${Number(value || 0).toLocaleString('en-PK')}`;

  // One canonical archive action. This runs at capture phase before legacy handlers,
  // so clicking the archive confirmation always performs the secured RPC.
  document.addEventListener('submit', async event => {
    const form = event.target.closest('#archiveOrderForm');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const database = db();
    const id = String(document.getElementById('archiveOrderId')?.value || '').trim();
    if (!database || !id) return window.adminNotify?.('Order ID is missing.', {title:'Archive failed', tone:'error'});
    const submit = form.querySelector('button[type="submit"]');
    if (submit?.dataset.busy === '1') return;
    if (submit) { submit.dataset.busy = '1'; submit.disabled = true; }
    try {
      const reason = String(document.getElementById('archiveReason')?.value || '').trim() || null;
      const {data, error} = await database.rpc('admin_archive_order', {p_order_id:id, p_reason:reason});
      if (error) throw error;
      const dialog = document.getElementById('archiveOrderDialog');
      try { dialog?.close?.(); } catch (_) {}
      dialog?.removeAttribute('open');
      document.body.classList.remove('archive-dialog-lock');
      document.getElementById('archiveOrderForm')?.reset();
      window.adminNotify?.('Order moved to Order Archive.', {title:'Order archived', tone:'success'});
      await window.loadLiveOrders?.({quiet:true});
      await window.loadArchivedOrders?.({quiet:true});
    } catch (error) {
      window.adminNotify?.(error?.message || 'The order could not be archived.', {title:'Archive failed', tone:'error'});
    } finally {
      if (submit) { submit.dataset.busy = '0'; submit.disabled = false; }
    }
  }, true);

  // Replace the unreliable item summary/dropdown with a deterministic per-order
  // expansion. It loads order_items by order id and resolves product names from products.
  async function showItems(button, orderId) {
    const database = db();
    if (!database || !orderId) return;
    const row = button.closest('[data-live-order-id], [data-order-id], tr');
    const old = row?.nextElementSibling;
    if (old?.dataset?.orderItemsFor === orderId) { old.remove(); return; }
    if (row) {
      const loading = document.createElement('div');
      loading.className = 'order-items-inline';
      loading.dataset.orderItemsFor = orderId;
      loading.innerHTML = '<div class="muted">Loading items…</div>';
      row.insertAdjacentElement('afterend', loading);
      try {
        const {data: items, error} = await database.from('order_items').select('*').eq('order_id', orderId);
        if (error) throw error;
        const rows = items || [];
        const ids = [...new Set(rows.map(item => item.product_id).filter(Boolean).map(String))];
        let products = [];
        if (ids.length) {
          const result = await database.from('products').select('id,name,sku,image_url,category').in('id', ids);
          products = result.data || [];
        }
        const productMap = new Map(products.map(product => [String(product.id), product]));
        loading.innerHTML = rows.length ? `<div class="order-items-inline-title">Items in this order</div>${rows.map(item => {
          const product = productMap.get(String(item.product_id));
          const name = item.product_name || item.name || product?.name || 'Unnamed item';
          const qty = Number(item.quantity || item.qty || 0);
          const price = Number(item.unit_price || item.price || 0);
          return `<div class="order-item-inline"><span class="order-item-inline-name">${esc(name)}</span><span>Qty ${qty}</span><b>${money(price * qty)}</b></div>`;
        }).join('')}` : '<div class="muted">No items were found for this order.</div>';
      } catch (error) {
        loading.innerHTML = `<div class="muted">${esc(error.message || 'Items could not be loaded.')}</div>`;
      }
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button, a');
    if (!button) return;
    const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!/^(view items|view \d+ items|\d+ items|items)$/.test(label)) return;
    const row = button.closest('[data-live-order-id], [data-order-id], tr');
    const id = button.dataset.orderId || button.dataset.liveOrderId || row?.dataset?.liveOrderId || row?.dataset?.orderId;
    if (!id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showItems(button, id);
  }, true);

  // Catalogue tab: ensure the existing product loader is called whenever the tab
  // becomes visible. This does not alter storefront/product data.
  document.addEventListener('click', event => {
    const tab = event.target.closest('.tab, [data-tab]');
    if (!tab) return;
    const key = String(tab.dataset.tab || tab.textContent || '').toLowerCase();
    if (!key.includes('catalog')) return;
    setTimeout(() => {
      try {
        if (typeof window.startCatalogue === 'function') window.startCatalogue();
        else if (typeof window.loadProducts === 'function') window.loadProducts();
        else if (typeof window.loadCatalogue === 'function') window.loadCatalogue();
      } catch (error) { console.warn('Catalogue refresh failed:', error); }
    }, 0);
  });

  const style = document.createElement('style');
  style.textContent = `.order-items-inline{margin:0 0 10px;padding:12px 14px;border:1px solid rgba(39,31,24,.1);border-radius:12px;background:#fffaf4;display:grid;gap:7px}.order-items-inline-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#766b61}.order-item-inline{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid rgba(39,31,24,.07)}.order-item-inline-name{font-weight:700;overflow-wrap:anywhere}`;
  document.head.appendChild(style);
})();
