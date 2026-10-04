(() => {
  'use strict';

  const getDb = () => window.BHATTI?.db || null;
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money = value => window.BHATTI?.money ? window.BHATTI.money(value) : `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
  const placeholder = '../assets/product-placeholder.svg';

  function notify(message, options = {}) {
    window.adminNotify?.(message, options);
  }

  async function confirmAction(title, message) {
    if (typeof window.confirmAction === 'function') {
      return window.confirmAction({ eyebrow: 'Order archive', title, message, confirmLabel: 'Archive order' });
    }
    return window.confirm(message);
  }

  async function archiveOrderDirect(id, button = null, reason = null) {
    const database = getDb();
    id = String(id || '').trim();
    if (!database || !id) {
      notify('Order ID is missing.', { title: 'Archive failed', tone: 'error' });
      return false;
    }
    if (button?.dataset.busy === '1') return false;
    if (button) { button.dataset.busy = '1'; button.disabled = true; }
    try {
      const { error } = await database.rpc('admin_archive_order', { p_order_id: id, p_reason: reason || null });
      if (error) throw error;

      const dialog = document.getElementById('archiveOrderDialog');
      try { dialog?.close?.(); } catch (_) {}
      dialog?.removeAttribute('open');
      document.body.classList.remove('archive-dialog-lock');
      document.getElementById('archiveOrderForm')?.reset();

      notify('Order moved to Order Archive.', { title: 'Order archived', tone: 'success' });
      await window.loadLiveOrders?.({ quiet: true, force: true });
      if (typeof window.loadArchivedOrders === 'function') await window.loadArchivedOrders({ quiet: true });
      return true;
    } catch (error) {
      notify(error?.message || 'The order could not be archived.', { title: 'Archive failed', tone: 'error' });
      return false;
    } finally {
      if (button) { button.dataset.busy = '0'; button.disabled = false; }
    }
  }

  // Canonical live-order archive path. It bypasses the older dialog handler so the
  // Archive action always updates the same orders.archived_at field used by both tabs.
  document.addEventListener('click', async event => {
    const archive = event.target.closest('[data-live-archive]');
    if (archive) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = archive.dataset.liveArchive;
      const confirmed = await confirmAction(
        'Archive this order?',
        'The order will be removed from live Orders and moved to Order Archive. It will not be permanently deleted.'
      );
      if (confirmed) await archiveOrderDirect(id, archive);
      return;
    }
  }, true);

  // Keep the existing archive dialog usable as well, but make its submit path deterministic.
  document.addEventListener('submit', async event => {
    const form = event.target.closest('#archiveOrderForm');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const id = document.getElementById('archiveOrderId')?.value;
    const reason = document.getElementById('archiveReason')?.value || null;
    await archiveOrderDirect(id, form.querySelector('button[type="submit"]'), reason);
  }, true);

  function orderIdFor(button) {
    const row = button?.closest('[data-live-order-id], [data-order-id], tr');
    return String(button?.dataset?.orderId || row?.dataset?.liveOrderId || row?.dataset?.orderId || '').trim();
  }

  async function renderOrderItems(button, orderId) {
    const database = getDb();
    if (!database || !orderId) return;
    const row = button.closest('[data-live-order-id], [data-order-id], tr');
    const panel = button.closest('td')?.querySelector('.mobile-order-items-panel');
    if (!panel) return;

    const expanded = button.getAttribute('aria-expanded') === 'true';
    if (!expanded) return;
    panel.classList.add('is-open');
    panel.innerHTML = '<div class="mobile-order-item-line"><span class="item-name">Loading items…</span></div>';

    try {
      const { data: items, error } = await database
        .from('order_items')
        .select('product_id,product_name,sku,unit_price,quantity,line_total')
        .eq('order_id', orderId)
        .order('id');
      if (error) throw error;

      const rows = items || [];
      if (!rows.length) {
        panel.innerHTML = '<div class="mobile-order-item-line"><span class="item-name">No items were found for this order.</span></div>';
        return;
      }

      panel.innerHTML = rows.map(item => {
        const name = item.product_name || 'Unnamed item';
        const qty = Number(item.quantity || 0);
        return `<div class="mobile-order-item-line"><span class="item-name" title="${esc(name)}">${esc(name)}</span><span class="mobile-order-item-qty">× ${qty}</span></div>`;
      }).join('');
    } catch (error) {
      panel.innerHTML = `<div class="mobile-order-item-line"><span class="item-name">${esc(error?.message || 'Items could not be loaded.')}</span></div>`;
    }
  }

  // The mobile item viewer previously inserted a div directly after a <tr>, which
  // browsers repair/remove because it is invalid table markup. Render into the
  // existing dropdown panel instead, keeping every item name and quantity intact.
  document.addEventListener('click', event => {
    const button = event.target.closest('.mobile-order-items-toggle');
    if (!button) return;
    const id = orderIdFor(button);
    if (!id) return;
    setTimeout(() => renderOrderItems(button, id), 0);
  }, true);

  function imageFor(product) {
    const value = String(product?.image_url || '').trim();
    if (value.startsWith('https://')) return value;
    return placeholder;
  }

  function catalogueCard(product) {
    const id = String(product.id);
    const name = product.name || 'Unnamed product';
    const category = product.category || 'Electrical';
    const price = money(product.price);
    const stock = product.quantity == null ? '' : `<span class="catalog-stock">${Number(product.quantity || 0)} in stock</span>`;
    return `<article class="catalog-card bhatti-repaired-catalog-card" data-product-id="${esc(id)}">
      <div class="catalog-thumb-wrap"><img class="catalog-thumb" loading="lazy" src="${esc(imageFor(product))}" alt="" onerror="this.onerror=null;this.src='${placeholder}'"></div>
      <div class="catalog-card-info">
        <span class="catalog-card-category">${esc(category)}</span>
        <h3>${esc(name)}</h3>
        <div class="catalog-card-meta"><strong>${price}</strong>${stock}</div>
        <button type="button" class="smallbtn catalog-edit-button" data-catalog-edit="${esc(id)}">Edit item</button>
      </div>
    </article>`;
  }

  function installCatalogueStyle() {
    if (document.getElementById('bhattiCatalogueRepairStyle')) return;
    const style = document.createElement('style');
    style.id = 'bhattiCatalogueRepairStyle';
    style.textContent = `
      .bhatti-repaired-catalog{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .bhatti-repaired-catalog-card{min-width:0;padding:12px;border:1px solid rgba(39,31,24,.1);border-radius:16px;background:rgba(255,255,255,.9);box-shadow:0 10px 30px rgba(35,26,19,.05)}
      .catalog-thumb-wrap{width:100%;aspect-ratio:1/1;border-radius:12px;background:#f4efe8;overflow:hidden;margin-bottom:10px}
      .catalog-thumb{display:block;width:100%;height:100%;object-fit:contain}
      .catalog-card-info{display:grid;gap:6px;min-width:0}
      .catalog-card-category{font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8a8177}
      .catalog-card-info h3{margin:0;font-size:14px;line-height:1.25;overflow-wrap:anywhere}
      .catalog-card-meta{display:flex;justify-content:space-between;gap:6px;align-items:center;font-size:11px}
      .catalog-stock{color:#756b62;font-size:10px}
      .catalog-edit-button{width:100%;min-height:40px;margin-top:3px}
      .bhatti-catalog-empty{padding:28px;text-align:center;color:#766b61}
      @media(max-width:700px){.bhatti-repaired-catalog{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.bhatti-repaired-catalog-card{padding:9px;border-radius:13px}.catalog-card-info h3{font-size:12px}.catalog-card-meta{font-size:10px}.catalog-stock{font-size:9px}.catalog-edit-button{min-height:38px;font-size:10px}}
    `;
    document.head.appendChild(style);
  }

  async function ensureCatalogue() {
    const body = document.getElementById('productsBody');
    const section = document.getElementById('productsSection');
    const database = getDb();
    if (!body || !database) return;

    installCatalogueStyle();
    body.dataset.catalogueRepairLoading = '1';
    try {
      const { data: products, error } = await database
        .from('products')
        .select('id,name,category,price,image_url,active,created_at,updated_at')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = products || [];
      const markup = rows.length
        ? `<div class="bhatti-repaired-catalog">${rows.map(catalogueCard).join('')}</div>`
        : '<div class="bhatti-catalog-empty">No active catalogue items are available.</div>';

      if (body.tagName === 'TBODY') {
        body.innerHTML = `<tr><td colspan="8" style="padding:0;border:0">${markup}</td></tr>`;
      } else {
        body.innerHTML = markup;
      }
      if (section) section.dataset.catalogueReady = 'true';
    } catch (error) {
      console.warn('Catalogue repair failed:', error);
      if (body.tagName === 'TBODY') body.innerHTML = `<tr><td colspan="8" class="empty">${esc(error?.message || 'Catalogue could not be loaded.')}</td></tr>`;
      else body.innerHTML = `<div class="bhatti-catalog-empty">${esc(error?.message || 'Catalogue could not be loaded.')}</div>`;
    } finally {
      delete body.dataset.catalogueRepairLoading;
    }
  }

  document.addEventListener('click', event => {
    const edit = event.target.closest('[data-catalog-edit]');
    if (!edit) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const id = edit.dataset.catalogEdit;
    if (typeof window.openAdminProductEditor === 'function') window.openAdminProductEditor(id);
  }, true);

  // Catalogue is deliberately loaded from its own products path. It does not depend
  // on the Orders renderer or the storefront's cached BHATTI.products array.
  document.addEventListener('click', event => {
    const tab = event.target.closest('.tab,[data-tab]');
    if (!tab) return;
    const key = String(tab.dataset.tab || tab.textContent || '').toLowerCase();
    if (!key.includes('product') && !key.includes('catalog')) return;
    setTimeout(ensureCatalogue, 20);
  }, true);

  function start() {
    if (document.getElementById('productsSection')?.style.display !== 'none') ensureCatalogue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
