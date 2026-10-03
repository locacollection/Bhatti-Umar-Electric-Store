(() => {
  'use strict';
  const db = window.BHATTI?.db;
  if (!db) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function installStyle() {
    if (document.getElementById('bhattiMobileOrdersStyle')) return;
    const style = document.createElement('style');
    style.id = 'bhattiMobileOrdersStyle';
    style.textContent = `
      .mobile-order-items-summary{display:grid;gap:3px;margin-top:5px;max-width:100%}
      .mobile-order-item-line{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#514940;font-size:10px;line-height:1.35}
      .mobile-order-item-line strong{font-weight:800;color:#29231e}
      .mobile-order-items-more{color:#8a8177;font-size:9px;line-height:1.3}
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
        #ordersSection .mobile-order-items-summary{max-width:calc(100vw - 105px);}
        #ordersSection .mobile-order-item-line{font-size:10px;}
      }
    `;
    document.head.appendChild(style);
  }

  async function enrichRows() {
    const body = document.getElementById('ordersBody');
    if (!body) return;
    const rows = [...body.querySelectorAll('tr')].filter(row => !row.classList.contains('mobile-order-items-enriched') && !row.hidden && row.querySelector('.row-actions'));
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
      const productIds = [...new Set((items || []).map(item => item.product_id).filter(Boolean).map(String))];
      let products = [];
      if (productIds.length) {
        const result = await db.from('products').select('id,name').in('id', productIds);
        if (!result.error) products = result.data || [];
      }
      const productMap = new Map(products.map(product => [String(product.id), product]));

      rows.forEach(row => {
        const button = row.querySelector('.workflow-button[onclick*="openOrderWorkflow"], .row-actions button[onclick*="openOrderWorkflow"]');
        const match = button?.getAttribute('onclick')?.match(/openOrderWorkflow\(['"]([^'"]+)['"]\)/);
        const orderId = match?.[1];
        const orderItems = (items || []).filter(item => String(item.order_id) === String(orderId));
        const itemsCell = row.querySelector('td:nth-child(3)');
        if (!itemsCell) return;

        const visibleItems = orderItems.slice(0, 4).map(item => {
          const product = productMap.get(String(item.product_id));
          const name = item.product_name || item.name || product?.name || 'Product';
          const quantity = Number(item.quantity || item.qty || 0);
          return `<span class="mobile-order-item-line"><strong>${esc(name)}</strong> × ${quantity}</span>`;
        });
        const remaining = orderItems.length - visibleItems.length;
        const summary = `<div class="mobile-order-items-summary">${visibleItems.join('')}${remaining > 0 ? `<span class="mobile-order-items-more">+${remaining} more · Inspect for full breakdown</span>` : ''}</div>`;
        itemsCell.insertAdjacentHTML('beforeend', summary);
        row.classList.add('mobile-order-items-enriched');
      });
    } catch (error) {
      console.warn('Mobile order item summary could not be loaded:', error);
    }
  }

  function start() {
    installStyle();
    enrichRows();
    const body = document.getElementById('ordersBody');
    if (!body) return;
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(enrichRows, 80);
    }).observe(body, {childList:true, subtree:true});
    setInterval(enrichRows, 5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
