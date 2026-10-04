(() => {
  'use strict';
  const db = window.BHATTI?.db;
  if (!db) return;

  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  function installStyle() {
    if (document.getElementById('bhattiOrdersFinalRepairStyle')) return;
    const style = document.createElement('style');
    style.id = 'bhattiOrdersFinalRepairStyle';
    style.textContent = `
      #ordersSection .final-order-items{display:grid;gap:5px;margin-top:6px;min-width:0}
      #ordersSection .final-order-items-summary{font-weight:800;color:#29231e;font-size:11px}
      #ordersSection .final-order-item-name{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;padding:6px 8px;border:1px solid rgba(51,40,31,.10);border-radius:9px;background:rgba(249,246,239,.62);font-size:11px;line-height:1.35}
      #ordersSection .final-order-item-name strong{font-weight:800;color:#29231e;overflow-wrap:anywhere}
      #ordersSection .final-order-item-name span{white-space:nowrap;color:#746b61;font-weight:700}
      @media(max-width:700px){
        #ordersSection .final-order-items{width:100%}
        #ordersSection .final-order-items-summary{font-size:10px}
        #ordersSection .final-order-item-name{font-size:11px;padding:7px 8px}
      }
    `;
    document.head.appendChild(style);
  }

  async function fetchItems(orderIds) {
    const ids = [...new Set(orderIds.filter(Boolean).map(String))];
    if (!ids.length) return new Map();
    const { data: rows, error } = await db.from('order_items').select('*').in('order_id', ids);
    if (error) throw error;
    const items = rows || [];
    const productIds = [...new Set(items.map(x => x.product_id).filter(Boolean).map(String))];
    let products = [];
    if (productIds.length) {
      const r = await db.from('products').select('id,name').in('id', productIds);
      if (!r.error) products = r.data || [];
    }
    const productMap = new Map(products.map(p => [String(p.id), p.name]));
    const grouped = new Map();
    items.forEach(item => {
      const key = String(item.order_id);
      const name = String(item.product_name || item.name || productMap.get(String(item.product_id)) || 'Unnamed item').trim();
      const qty = Number(item.quantity ?? item.qty ?? 0);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({name, qty});
    });
    return grouped;
  }

  function renderItemCell(row, items) {
    const cell = row.querySelector('td:nth-child(3)');
    if (!cell) return;
    const safeItems = Array.isArray(items) ? items : [];
    const totalQty = safeItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const count = totalQty || safeItems.length || Number((cell.textContent || '').match(/\d+/)?.[0] || 0);
    const wrap = document.createElement('div');
    wrap.className = 'final-order-items';
    const summary = document.createElement('div');
    summary.className = 'final-order-items-summary';
    summary.textContent = `${count || safeItems.length || 0} item${(count || safeItems.length || 0) === 1 ? '' : 's'}`;
    wrap.appendChild(summary);
    if (safeItems.length) {
      safeItems.forEach(item => {
        const line = document.createElement('div');
        line.className = 'final-order-item-name';
        line.innerHTML = `<strong>${esc(item.name)}</strong><span>× ${Number(item.qty) || 0}</span>`;
        wrap.appendChild(line);
      });
    } else {
      const line = document.createElement('div');
      line.className = 'final-order-item-name';
      line.innerHTML = '<strong>Item details unavailable</strong>';
      wrap.appendChild(line);
    }
    cell.replaceChildren(wrap);
  }

  async function refreshItemNames() {
    const body = document.getElementById('ordersBody');
    if (!body) return;
    const rows = [...body.querySelectorAll('tr[data-live-order-id]')];
    if (!rows.length) return;
    try {
      const grouped = await fetchItems(rows.map(row => row.dataset.liveOrderId));
      rows.forEach(row => renderItemCell(row, grouped.get(String(row.dataset.liveOrderId)) || []));
    } catch (error) {
      console.warn('Final order item-name repair failed:', error);
    }
  }

  async function updateArchiveCount() {
    const { count, error } = await db.from('orders').select('id', {count:'exact', head:true}).not('archived_at', 'is', null);
    if (error) return;
    const badge = document.getElementById('sideArchiveCount');
    if (badge) badge.textContent = String(count || 0);
    const label = document.getElementById('archiveCount');
    if (label) label.textContent = `${count || 0} archived order${Number(count || 0) === 1 ? '' : 's'}.`;
  }

  async function archiveOrder(id) {
    if (!id) return;
    const confirmed = typeof window.confirmAction === 'function'
      ? await window.confirmAction({eyebrow:'Order archive',title:'Archive this order?',message:'The order will leave the live Orders list and remain safely stored in Order Archive.',confirmLabel:'Archive order'})
      : window.confirm('Archive this order? It will move to Order Archive.');
    if (!confirmed) return;

    try {
      const { data, error } = await db.rpc('admin_archive_order', {
        p_order_id: id,
        p_reason: 'Archived from live Orders'
      });
      if (error) throw error;
      if (!data) throw new Error('The archive operation returned no order.');
      window.adminNotify?.('Order moved to Order Archive.', {title:'Order archived',tone:'success'});
      await window.loadLiveOrders?.({quiet:true});
      await updateArchiveCount();
      if (document.getElementById('archiveSection')?.style.display !== 'none') {
        await window.loadArchivedOrders?.({quiet:true});
      }
    } catch (error) {
      window.adminNotify?.(error.message || 'The order could not be archived.', {title:'Archive failed',tone:'error'});
    }
  }

  function bindArchive() {
    const body = document.getElementById('ordersBody');
    if (!body || body.dataset.finalArchiveBound === '1') return;
    body.dataset.finalArchiveBound = '1';
    body.addEventListener('click', event => {
      const button = event.target.closest('[data-live-archive]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      archiveOrder(button.dataset.liveArchive);
    }, true);
  }

  function start() {
    installStyle();
    bindArchive();
    refreshItemNames();
    updateArchiveCount();
    const body = document.getElementById('ordersBody');
    if (!body) return;
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(refreshItemNames, 80);
    }).observe(body, {childList:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
