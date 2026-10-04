(() => {
  'use strict';
  const db = window.BHATTI?.db;
  if (!db) return;
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money = v => window.BHATTI?.money ? BHATTI.money(v) : `PKR ${Number(v || 0).toLocaleString('en-PK')}`;
  const img = v => {
    if (!v) return 'assets/product-placeholder.svg';
    try { const u = new URL(v); return u.protocol === 'https:' ? u.href : 'assets/product-placeholder.svg'; }
    catch { return String(v).startsWith('assets/') ? v : 'assets/product-placeholder.svg'; }
  };

  async function repairCatalogue() {
    const body = document.getElementById('productsBody');
    if (!body || body.dataset.pathRepair === '1') return;
    body.dataset.pathRepair = '1';
    try {
      const { data, error } = await db.from('products').select('id,name,category,price,old_price,description,image_url,active,is_new,sku,created_at').order('created_at', { ascending: false });
      if (error) throw error;
      const search = () => {
        const q = String(document.getElementById('catalogSearch')?.value || '').trim().toLowerCase();
        const visibility = document.getElementById('catalogVisibility')?.value || 'all';
        const cat = String(document.getElementById('catalogCategory')?.value || 'all').toLowerCase();
        return (data || []).filter(p => (visibility === 'all' || (visibility === 'published' ? !!p.active : !p.active)) && (cat === 'all' || String(p.category || '').toLowerCase().includes(cat)) && `${p.name || ''} ${p.category || ''} ${p.sku || ''}`.toLowerCase().includes(q));
      };
      const render = () => {
        const list = search();
        const count = document.getElementById('catalogCount');
        if (count) count.textContent = `${list.length} products · ${(data || []).filter(p => p.active).length} published`;
        body.innerHTML = list.length ? list.map(p => `<article class="catalog-card" data-product-id="${esc(p.id)}"><img src="${esc(img(p.image_url))}" alt="${esc(p.name)}" loading="lazy"><div class="catalog-card-copy"><span class="muted">${esc(p.category || 'Uncategorised')}</span><h3>${esc(p.name || 'Unnamed product')}</h3><p>${esc(p.description || '')}</p><strong>${money(p.price)}</strong><div class="catalog-card-actions"><span class="status-chip">${p.active ? 'Published' : 'Hidden'}</span><button type="button" class="btn alt" data-repair-edit="${esc(p.id)}">Edit item</button></div></div></article>`).join('') : '<div class="search-empty"><h3>No catalogue items found.</h3><p>Try changing the visibility or category filter.</p></div>';
      };
      body.addEventListener('click', e => {
        const b = e.target.closest('[data-repair-edit]');
        if (!b) return;
        e.preventDefault();
        if (typeof window.openAdminProductEditor === 'function') window.openAdminProductEditor(b.dataset.repairEdit);
        else if (typeof window.openProductEditor === 'function') window.openProductEditor(b.dataset.repairEdit);
      });
      ['catalogSearch','catalogVisibility','catalogCategory'].forEach(id => document.getElementById(id)?.addEventListener('input', render));
      ['catalogVisibility','catalogCategory'].forEach(id => document.getElementById(id)?.addEventListener('change', render));
      render();
    } catch (e) {
      body.innerHTML = `<div class="search-empty"><h3>Catalogue could not be loaded.</h3><p>${esc(e.message || 'Please refresh and try again.')}</p></div>`;
    }
  }

  function ensureOrderDialog() {
    let d = document.getElementById('bhattiOrderItemsRepair');
    if (d) return d;
    d = document.createElement('dialog');
    d.id = 'bhattiOrderItemsRepair';
    d.style.cssText = 'width:min(720px,94vw);max-height:88vh;border:0;border-radius:22px;padding:0;box-shadow:0 24px 80px rgba(0,0,0,.28)';
    d.innerHTML = '<div style="padding:20px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><small style="letter-spacing:.12em;text-transform:uppercase;opacity:.6">Order items</small><h2 id="bhattiOrderItemsTitle" style="margin:.25rem 0"></h2></div><button type="button" class="btn alt" id="bhattiOrderItemsClose">×</button></div><div id="bhattiOrderItemsBody" style="display:grid;gap:10px;margin-top:16px"></div></div>';
    document.body.appendChild(d);
    d.querySelector('#bhattiOrderItemsClose').addEventListener('click', () => d.close());
    return d;
  }

  async function inspectItems(id) {
    const d = ensureOrderDialog();
    const title = d.querySelector('#bhattiOrderItemsTitle');
    const body = d.querySelector('#bhattiOrderItemsBody');
    title.textContent = 'Loading…'; body.innerHTML = '<p>Loading all items…</p>'; d.showModal();
    try {
      const [{ data: order, error: oe }, { data: items, error: ie }] = await Promise.all([
        db.from('orders').select('id,order_number,order_no,total').eq('id', id).maybeSingle(),
        db.from('order_items').select('*').eq('order_id', id)
      ]);
      if (oe) throw oe; if (ie) throw ie;
      const rows = items || [];
      const ids = [...new Set(rows.map(x => x.product_id).filter(Boolean).map(String))];
      let products = [];
      if (ids.length) { const r = await db.from('products').select('id,name,image_url').in('id', ids); if (!r.error) products = r.data || []; }
      const map = new Map(products.map(p => [String(p.id), p]));
      title.textContent = order?.order_number || order?.order_no || `Order ${id}`;
      body.innerHTML = rows.length ? rows.map(item => { const p = map.get(String(item.product_id)); const name = item.product_name || item.name || p?.name || 'Product'; const qty = Number(item.quantity || item.qty || 0); const price = Number(item.unit_price || item.price || 0); return `<div style="display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:center;padding:10px;border:1px solid rgba(0,0,0,.1);border-radius:14px"><img src="${esc(img(item.image_url || p?.image_url))}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px"><div><b>${esc(name)}</b><div style="opacity:.65">Quantity: ${qty}</div></div><strong>${money(price * qty)}</strong></div>`; }).join('') : '<p>No items were found for this order.</p>';
    } catch (e) { title.textContent = 'Order items'; body.innerHTML = `<p>${esc(e.message || 'Unable to load order items.')}</p>`; }
  }

  async function archiveDirect(id) {
    if (!id) return;
    if (!confirm('Archive this order? It will leave the live Orders list and appear in Order Archive.')) return;
    try {
      const patch = { archived_at: new Date().toISOString() };
      if (window.BHATTI?.profile?.id) patch.archived_by = window.BHATTI.profile.id;
      const { error } = await db.from('orders').update(patch).eq('id', id).is('archived_at', null);
      if (error) throw error;
      window.BHATTI?.notice?.({ eyebrow:'Orders', title:'Order archived', message:'The order was moved out of live Orders.', action:'Close' });
      await window.loadLiveOrders?.({ quiet:true });
      if (typeof window.loadArchivedOrders === 'function') await window.loadArchivedOrders();
    } catch (e) {
      window.BHATTI?.notice?.({ eyebrow:'Orders', title:'Archive failed', message:e.message || 'The order could not be archived.', tone:'error', action:'Close' });
    }
  }

  function bindOrderActions() {
    const body = document.getElementById('ordersBody');
    if (!body || body.dataset.pathRepairActions === '1') return;
    body.dataset.pathRepairActions = '1';
    body.addEventListener('click', e => {
      const inspect = e.target.closest('[data-live-inspect]');
      const archive = e.target.closest('[data-live-archive]');
      if (inspect) { e.preventDefault(); e.stopImmediatePropagation(); inspectItems(inspect.dataset.liveInspect); }
      if (archive) { e.preventDefault(); e.stopImmediatePropagation(); archiveDirect(archive.dataset.liveArchive); }
    }, true);
  }

  function start() {
    const products = document.getElementById('productsSection');
    if (products) {
      const observer = new MutationObserver(() => { if (products.style.display !== 'none') repairCatalogue(); });
      observer.observe(products, { attributes:true, attributeFilter:['style'] });
    }
    bindOrderActions();
    if (document.getElementById('productsSection')?.style.display !== 'none') repairCatalogue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
})();
