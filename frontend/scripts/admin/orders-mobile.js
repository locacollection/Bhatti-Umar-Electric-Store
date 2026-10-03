(() => {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getDb = () => window.BHATTI?.db || null;

  function installStyle() {
    if (document.getElementById('bhattiMobileOrdersStyle')) return;
    const style = document.createElement('style');
    style.id = 'bhattiMobileOrdersStyle';
    style.textContent = `
      .mobile-order-items-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px;padding:9px 11px;border:1px solid rgba(51,40,31,.10);border-radius:10px;background:rgba(249,246,239,.72);color:#29231e;font:inherit;font-size:10px;font-weight:800;text-align:left;cursor:pointer;transition:background .18s ease,border-color .18s ease}
      .mobile-order-items-toggle:hover{background:#fff;border-color:rgba(168,126,60,.28)}
      .mobile-order-items-toggle:focus-visible{outline:2px solid #d7a52a;outline-offset:2px}
      .mobile-order-items-toggle .items-chevron{font-size:12px;line-height:1;transition:transform .18s ease}
      .mobile-order-items-toggle[aria-expanded="true"] .items-chevron{transform:rotate(180deg)}
      .mobile-order-items-panel{display:none;margin-top:5px;padding:8px 10px;border-left:2px solid rgba(168,126,60,.45);background:rgba(249,246,239,.48);border-radius:0 9px 9px 0}
      .mobile-order-items-panel.is-open{display:grid;gap:6px}
      .mobile-order-item-line{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0;color:#514940;font-size:10px;line-height:1.35}
      .mobile-order-item-line .item-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mobile-order-item-line strong{font-weight:800;color:#29231e}
      .mobile-order-item-qty{flex:0 0 auto;color:#746b61;font-weight:700;white-space:nowrap}
      @media(max-width:700px){
        #ordersSection .section-head{margin-bottom:16px}
        #ordersSection .section-head h2{font-size:27px}
        #ordersSection .toolbar-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:8px!important}
        #ordersSection .toolbar-actions .search-control{grid-column:1/-1;width:100%!important}
        #ordersSection .toolbar-actions .btn{min-height:44px}
        #ordersSection .tablewrap{overflow:visible!important;border:0!important;background:transparent!important;box-shadow:none!important}
        #ordersSection .tablewrap table{display:block!important;width:100%!important}
        #ordersSection .tablewrap thead{display:none!important}
        #ordersSection .tablewrap tbody{display:grid!important;gap:12px!important}
        #ordersSection .tablewrap tbody tr:not(.empty){display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 14px!important;padding:16px!important;border:1px solid rgba(51,40,31,.1)!important;border-radius:18px!important;background:rgba(255,255,255,.9)!important;box-shadow:0 10px 28px rgba(35,26,19,.06)!important}
        #ordersSection .tablewrap tbody tr:not(.empty)>td{display:block!important;padding:7px 0!important;border:0!important;min-width:0!important}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(1){grid-column:1/-1;padding-top:0!important;border-bottom:1px solid rgba(39,31,24,.08)!important;padding-bottom:12px!important}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(2){grid-column:1/-1}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(3){grid-column:1}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(4){grid-column:2}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(5){grid-column:1}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(6){grid-column:2}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(7){grid-column:1/-1;padding-top:12px!important;border-top:1px solid rgba(39,31,24,.08)!important}
        #ordersSection .row-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px!important;width:100%!important}
        #ordersSection .row-actions .smallbtn{width:100%!important;min-height:42px!important;padding:8px 5px!important;font-size:11px!important}
        #ordersSection .workflow-cell{display:flex!important;flex-wrap:wrap!important;gap:5px!important}
        #ordersSection .status-chip{font-size:9px!important;padding:6px 8px!important}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(3)::before{content:'ITEMS';display:block;margin-bottom:3px;color:#8a8177;font-size:8px;font-weight:800;letter-spacing:.12em}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(4)::before{content:'TOTAL';display:block;margin-bottom:3px;color:#8a8177;font-size:8px;font-weight:800;letter-spacing:.12em}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(5)::before{content:'PAYMENT';display:block;margin-bottom:3px;color:#8a8177;font-size:8px;font-weight:800;letter-spacing:.12em}
        #ordersSection .tablewrap tbody tr:not(.empty)>td:nth-child(6)::before{content:'WORKFLOW';display:block;margin-bottom:5px;color:#8a8177;font-size:8px;font-weight:800;letter-spacing:.12em}
        #ordersSection .tablewrap tbody tr.empty{display:block!important;padding:22px!important}
        #ordersSection .mobile-order-items-toggle{font-size:10px;min-height:38px}
        #ordersSection .mobile-order-items-panel{font-size:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function addAccordion(row, orderItems) {
    const itemsCell = row.querySelector('td:nth-child(3)');
    if (!itemsCell) return;

    const totalCount = orderItems.reduce((sum, item) => sum + Number(item.quantity || item.qty || 0), 0);
    const fallbackCount = Number((itemsCell.textContent || '').match(/\d+/)?.[0] || 0);
    const itemCount = totalCount || fallbackCount || orderItems.length;
    const id = `mobile-items-${Math.random().toString(36).slice(2,10)}`;

    const lines = orderItems.map(item => {
      const name = item.product_name || item.name || 'Product';
      const quantity = Number(item.quantity || item.qty || 0);
      return `<div class="mobile-order-item-line"><span class="item-name"><strong>${esc(name)}</strong></span><span class="mobile-order-item-qty">× ${quantity}</span></div>`;
    }).join('');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobile-order-items-toggle';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    button.innerHTML = `<span>View ${itemCount} items</span><span class="items-chevron" aria-hidden="true">⌄</span>`;

    const panel = document.createElement('div');
    panel.id = id;
    panel.className = 'mobile-order-items-panel';
    panel.innerHTML = lines || `<div class="mobile-order-item-line"><span class="item-name">Item details available in Inspect</span></div>`;

    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      panel.classList.toggle('is-open', !open);
    });

    itemsCell.replaceChildren(button, panel);
  }

  // Always create the mobile accordion trigger when the canonical renderer
  // has supplied a numeric item count such as "10". The previous guard
  // returned early for numeric-only cells, which caused the View N items
  // control to disappear completely.
  function sanitizeRows() {
    const body = document.getElementById('ordersBody');
    if (!body) return;
    [...body.querySelectorAll('tr')].forEach(row => {
      if (row.hidden || !row.querySelector('.row-actions')) return;
      const cell = row.querySelector('td:nth-child(3)');
      if (!cell || cell.querySelector('.mobile-order-items-toggle')) return;
      const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      const count = Number(text.match(/\d+/)?.[0] || 0);
      const id = `mobile-items-${Math.random().toString(36).slice(2,10)}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mobile-order-items-toggle';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', id);
      button.innerHTML = `<span>View ${count || 'all'} items</span><span class="items-chevron" aria-hidden="true">⌄</span>`;
      const panel = document.createElement('div');
      panel.id = id;
      panel.className = 'mobile-order-items-panel';
      panel.innerHTML = '<div class="mobile-order-item-line"><span class="item-name">Open to view item names and quantities.</span></div>';
      button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('is-open', !open);
        if (!open) enrichRows();
      });
      cell.replaceChildren(button, panel);
    });
  }

  async function enrichRows() {
    sanitizeRows();
    const body = document.getElementById('ordersBody');
    const db = getDb();
    if (!body || !db) return;
    const rows = [...body.querySelectorAll('tr')].filter(row => !row.hidden && row.querySelector('.row-actions'));
    if (!rows.length) return;

    const ids = rows.map(row => {
      const button = row.querySelector('.workflow-button[onclick*="openOrderWorkflow"], .row-actions button[onclick*="openOrderWorkflow"]');
      const match = button?.getAttribute('onclick')?.match(/openOrderWorkflow\(['"]([^'"]+)['"]\)/);
      return match?.[1] || null;
    }).filter(Boolean);
    if (!ids.length) return;

    try {
      const { data: items, error: itemError } = await db.from('order_items').select('*').in('order_id', ids);
      if (itemError) throw itemError;
      const grouped = new Map();
      (items || []).forEach(item => {
        const key = String(item.order_id);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
      });
      rows.forEach(row => {
        const button = row.querySelector('.workflow-button[onclick*="openOrderWorkflow"], .row-actions button[onclick*="openOrderWorkflow"]');
        const match = button?.getAttribute('onclick')?.match(/openOrderWorkflow\(['"]([^'"]+)['"]\)/);
        const orderId = match?.[1];
        if (orderId) addAccordion(row, grouped.get(String(orderId)) || []);
      });
    } catch (error) {
      console.warn('Mobile order item accordion could not be loaded:', error);
    }
  }

  function start() {
    installStyle();
    sanitizeRows();
    enrichRows();
    const body = document.getElementById('ordersBody');
    if (!body) return;
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { sanitizeRows(); enrichRows(); }, 30);
    }).observe(body, {childList:true, subtree:true});
    setInterval(() => { sanitizeRows(); enrichRows(); }, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
