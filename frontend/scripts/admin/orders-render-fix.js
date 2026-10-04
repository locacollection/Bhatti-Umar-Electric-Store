(() => {
  'use strict';
  const bhatti = window.BHATTI;
  const db = bhatti?.db;
  if (!bhatti || !db) return;

  let liveOrders = [];
  let liveItems = [];
  let requestToken = 0;

  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money = value => bhatti.money ? bhatti.money(value) : `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
  const statusBadge = value => typeof window.orderStatusBadge === 'function' ? window.orderStatusBadge(value) : `<span class="status-chip">${esc(value || 'Pending')}</span>`;
  const paymentBadge = value => typeof window.paymentStatusBadge === 'function' ? window.paymentStatusBadge(value) : `<span class="status-chip">${esc(value || 'Unpaid')}</span>`;

  function installIsolationStyle() {
    if (document.getElementById('bhattiLiveOrdersIsolationStyle')) return;
    const style = document.createElement('style');
    style.id = 'bhattiLiveOrdersIsolationStyle';
    style.textContent = `#ordersSection #ordersBody{visibility:hidden!important}#ordersSection #orderCount{visibility:hidden!important}#ordersSection[data-live-orders-ready="true"] #ordersBody,#ordersSection[data-live-orders-ready="true"] #orderCount{visibility:visible!important}#ordersSection .live-order-empty{padding:24px!important;text-align:center}`;
    document.head.appendChild(style);
  }

  function itemCount(orderId) {
    return liveItems.filter(item => String(item.order_id) === String(orderId)).reduce((sum, item) => sum + Number(item.quantity || item.qty || 0), 0);
  }

  function customerFor(order) {
    return {name: order.customer_name || order.full_name || 'Customer', phone: order.customer_phone || order.phone || '', email: order.customer_email || order.email || '', city: order.city || ''};
  }

  function filteredOrders() {
    const query = String(document.getElementById('search')?.value || '').trim().toLowerCase();
    const status = document.getElementById('filter')?.value || 'All';
    const payment = document.getElementById('paymentFilter')?.value || 'All';
    return liveOrders.filter(order => {
      const customer = customerFor(order);
      const text = [order.order_number,order.order_no,order.id,customer.name,customer.phone,customer.email,customer.city,order.status,order.payment_status,order.payment_method].join(' ').toLowerCase();
      return (status === 'All' || order.status === status) && (payment === 'All' || order.payment_status === payment) && text.includes(query);
    });
  }

  function renderLiveStats() {
    const side = document.getElementById('sideOrderCount');
    if (side) side.textContent = liveOrders.length;
    const stats = document.querySelectorAll('#stats .stat b');
    if (stats.length >= 4) {
      const inProgress = liveOrders.filter(row => !['Delivered','Cancelled','Returned'].includes(row.status)).length;
      const delivered = liveOrders.filter(row => row.status === 'Delivered').length;
      const revenue = liveOrders.filter(row => row.payment_status === 'Paid' && !['Cancelled','Returned'].includes(row.status)).reduce((sum,row) => sum + Number(row.total || 0), 0);
      stats[0].textContent = liveOrders.length;
      stats[1].textContent = inProgress;
      stats[2].textContent = delivered;
      stats[3].textContent = money(revenue);
    }
  }

  function renderLiveOrders() {
    const section = document.getElementById('ordersSection');
    const body = document.getElementById('ordersBody');
    if (!section || !body) return;
    const list = filteredOrders();
    const count = document.getElementById('orderCount');
    if (count) count.textContent = `${list.length} shown · ${liveOrders.length} total`;
    body.innerHTML = list.length ? list.map(order => {
      const customer = customerFor(order);
      const count = itemCount(order.id);
      const orderNumber = order.order_number || order.order_no || order.id;
      return `<tr data-live-order-id="${esc(order.id)}"><td><b>${esc(orderNumber)}</b><br><span class="muted">${new Date(order.created_at).toLocaleString('en-PK')}</span></td><td><b>${esc(customer.name)}</b><br><span class="muted">${esc(customer.city || customer.email)}</span><br>${esc(customer.phone)}</td><td>${count}</td><td><b>${money(order.total)}</b></td><td>${esc(order.payment_method || 'COD')}</td><td><div class="workflow-cell">${statusBadge(order.status)}${paymentBadge(order.payment_status)}</div></td><td><div class="row-actions"><button class="smallbtn workflow-button" type="button" data-live-manage="${esc(order.id)}">Manage</button><button class="smallbtn" type="button" data-live-inspect="${esc(order.id)}">Inspect</button><button class="smallbtn danger-action" type="button" data-live-archive="${esc(order.id)}">Archive</button></div></td></tr>`;
    }).join('') : `<tr class="empty live-order-empty"><td colspan="7">No live orders match this view.</td></tr>`;
    section.dataset.liveOrdersReady = 'true';
    renderLiveStats();
  }

  async function loadLiveOrders({quiet = false} = {}) {
    const body = document.getElementById('ordersBody');
    const section = document.getElementById('ordersSection');
    if (!body || !section) return;
    const token = ++requestToken;
    section.dataset.liveOrdersReady = 'false';
    if (!quiet) body.innerHTML = '<tr><td colspan="7" class="empty">Loading live orders…</td></tr>';
    try {
      // Dedicated LIVE path: archived_at IS NULL. This query never reads the archive set.
      const {data: orders, error: ordersError} = await db.from('orders').select('*').is('archived_at', null).order('created_at', {ascending:false});
      if (ordersError) throw ordersError;
      if (token !== requestToken) return;
      const rows = orders || [];
      const ids = rows.map(row => row.id).filter(Boolean);
      let items = [];
      if (ids.length) {
        const {data, error} = await db.from('order_items').select('*').in('order_id', ids);
        if (error) throw error;
        items = data || [];
      }
      if (token !== requestToken) return;
      liveOrders = rows;
      liveItems = items;
      renderLiveOrders();
    } catch (error) {
      if (token !== requestToken) return;
      liveOrders = [];
      liveItems = [];
      body.innerHTML = `<tr class="empty live-order-empty"><td colspan="7">${esc(error.message || 'Live orders could not be loaded.')}</td></tr>`;
      section.dataset.liveOrdersReady = 'true';
      renderLiveStats();
      window.adminNotify?.(error.message || 'Live orders could not be loaded.', {title:'Orders unavailable',tone:'error'});
    }
  }

  function action(id,type) {
    if (type === 'manage' && typeof window.openOrderWorkflow === 'function') window.openOrderWorkflow(id);
    if (type === 'inspect' && typeof window.viewOrder === 'function') window.viewOrder(id);
    if (type === 'archive' && typeof window.openArchiveOrder === 'function') window.openArchiveOrder(id);
  }

  function bindEvents() {
    const body = document.getElementById('ordersBody');
    if (!body || body.dataset.liveOrdersBound === 'true') return;
    body.dataset.liveOrdersBound = 'true';
    body.addEventListener('click', event => {
      const manage = event.target.closest('[data-live-manage]');
      const inspect = event.target.closest('[data-live-inspect]');
      const archive = event.target.closest('[data-live-archive]');
      if (manage) return action(manage.dataset.liveManage,'manage');
      if (inspect) return action(inspect.dataset.liveInspect,'inspect');
      if (archive) return action(archive.dataset.liveArchive,'archive');
    });
    document.getElementById('search')?.addEventListener('input',renderLiveOrders);
    document.getElementById('filter')?.addEventListener('change',renderLiveOrders);
    document.getElementById('paymentFilter')?.addEventListener('change',renderLiveOrders);
  }

  // Live Orders owns the refresh/render entry points. Archive loading is allowed only while its tab is active.
  window.loadLiveOrders = loadLiveOrders;
  window.load = loadLiveOrders;
  window.renderOrders = renderLiveOrders;
  window.renderStats = renderLiveStats;
  const existingArchiveLoader = window.loadArchivedOrders;
  if (typeof existingArchiveLoader === 'function') {
    window.loadArchivedOrders = async function isolatedArchiveLoader(options) {
      const section = document.getElementById('archiveSection');
      if (section && section.style.display === 'none') return;
      return existingArchiveLoader(options);
    };
  }
  bhatti.syncStudioOrders = async () => {await loadLiveOrders({quiet:true});return {live:liveOrders};};

  function start() {
    installIsolationStyle();
    bindEvents();
    loadLiveOrders({quiet:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
