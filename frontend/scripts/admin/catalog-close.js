/* BHATTI catalogue editor UX + mobile workspace style loader + shared elevated Studio. */
(() => {
  const loadMobileStyles = () => {
    if (document.getElementById('bhattiMobileUiCss')) return;
    const link = document.createElement('link');
    link.id = 'bhattiMobileUiCss';
    link.rel = 'stylesheet';
    link.href = '../styles/mobile-ui.css?v=20261002-mobile2';
    document.head.appendChild(link);
  };
  loadMobileStyles();

  const installMobileModalGuard = () => {
    if (document.getElementById('bhattiMobileModalFix')) return;
    const style = document.createElement('style');
    style.id = 'bhattiMobileModalFix';
    style.textContent = `
      body.modal-lock { overflow: hidden !important; }
      @media (max-width: 700px) {
        body.modal-lock { touch-action: none; }
        body.modal-lock .shell, body.modal-lock .top { pointer-events: none !important; }
        #modal.open { position: fixed !important; inset: 0 !important; z-index: 10000 !important; display: flex !important; align-items: flex-end !important; justify-content: center !important; padding: 12px !important; overflow: hidden !important; background: rgba(23,20,17,.58) !important; }
        #modal.open .modalbox { position: relative !important; z-index: 10001 !important; width: min(100%, 620px) !important; max-height: calc(100dvh - 24px) !important; margin: 0 !important; overflow: hidden !important; display:flex !important; flex-direction:column !important; border-radius: 22px !important; }
        #modal.open .modalhead { position: sticky !important; top: 0 !important; z-index: 5 !important; display: flex !important; align-items: center !important; justify-content: space-between !important; min-height: 62px !important; padding: 14px 16px !important; background: rgba(255,250,244,.97) !important; backdrop-filter: blur(16px) !important; border-bottom: 1px solid rgba(39,31,24,.1) !important; }
        #modal.open #closeModal { display: grid !important; place-items: center !important; flex: 0 0 42px !important; width: 42px !important; height: 42px !important; min-width: 42px !important; min-height: 42px !important; margin-left: 12px !important; border: 1px solid rgba(39,31,24,.16) !important; border-radius: 12px !important; background: #171411 !important; color: #fffaf4 !important; font-size: 24px !important; line-height: 1 !important; opacity: 1 !important; visibility: visible !important; }
        #modal.open #modalBody { padding: 16px !important; flex:1 1 auto !important; min-height:0 !important; overflow:auto !important; -webkit-overflow-scrolling:touch !important; }
        #modal.open .grid { grid-template-columns: 1fr !important; gap: 10px !important; }
        #modal.open .detail[style*="grid-column"] { grid-column: 1 !important; }
        #modal.open .order-detail-workflow { grid-template-columns: 1fr !important; gap: 10px !important; }
      }
    `;
    document.head.appendChild(style);

    const modal = document.getElementById('modal');
    const syncLock = () => document.body.classList.toggle('modal-lock', !!modal?.classList.contains('open'));
    const closeModal = () => {
      if (!modal) return;
      modal.classList.remove('open');
      document.body.classList.remove('modal-lock');
    };
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal?.classList.contains('open')) closeModal(); });
    if (modal) new MutationObserver(syncLock).observe(modal, { attributes:true, attributeFilter:['class'] });
  };

  const installArchiveDialogGuard = () => {
    if (document.getElementById('bhattiArchiveDialogFix')) return;
    const style = document.createElement('style');
    style.id = 'bhattiArchiveDialogFix';
    style.textContent = `
      @media (max-width:700px){
        body.archive-dialog-lock { overflow:hidden !important; touch-action:none !important; }
        body.archive-dialog-lock .shell, body.archive-dialog-lock .top { pointer-events:none !important; }
        #archiveOrderDialog[open] { z-index:10020 !important; }
        #archiveOrderDialog[open] .icon-close { opacity:1 !important; visibility:visible !important; pointer-events:auto !important; }
      }
    `;
    document.head.appendChild(style);

    const dialog = document.getElementById('archiveOrderDialog');
    if (!dialog) return;
    const sync = () => {
      const open = dialog.open || dialog.hasAttribute('open');
      document.body.classList.toggle('archive-dialog-lock', open);
    };
    const close = () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      dialog.removeAttribute('open');
      document.body.classList.remove('archive-dialog-lock');
    };
    const closeButton = dialog.querySelector('.icon-close,[id*="close"]');
    closeButton?.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); close(); }, true);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && (dialog.open || dialog.hasAttribute('open'))) { event.preventDefault(); close(); } }, true);
    new MutationObserver(sync).observe(dialog, { attributes:true, attributeFilter:['open','class'] });
    sync();
  };

  const installSharedStudio = async () => {
    const db = window.BHATTI?.db;
    if (!db) return;
    try {
      const { data: { user } = {}, error } = await db.auth.getUser();
      if (error || !user) return;
      const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profileError || profile?.role !== 'super_admin') return;
      const nav = document.querySelector('.side-nav');
      const wrap = document.querySelector('.wrap');
      if (!nav || !wrap || document.querySelector('.tab[data-tab="admin-management"]')) return;
      const tab = document.createElement('button');
      tab.className = 'tab'; tab.type = 'button'; tab.dataset.tab = 'admin-management';
      tab.innerHTML = '<span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2.5 21v-2a5.5 5.5 0 0 1 5.5-5.5h2"/><path d="M16 14v7M12.5 17.5h7"/></svg></span><span>Admin Dashboard</span><b id="sideAdminCount">0</b>';
      nav.appendChild(tab);
      const section = document.createElement('section');
      section.className='panel'; section.id='adminManagementSection'; section.style.display='none';
      section.innerHTML=`<div class="section-head"><div><p class="kicker">Super Admin only</p><h2>Admin Dashboard</h2><p class="muted" id="adminManagementCount">Loading administrator accounts…</p></div><button class="btn alt" type="button" id="refreshAdminManagement">↻ Refresh</button></div><div class="insight-strip"><div><b>Shared administrator workspace</b><span>Admins and Super Admins use the same orders, catalogue, inventory and customer tools.</span></div><div><b>Only one extra capability</b><span>This tab lets the Super Admin add or remove administrator access.</span></div></div><div class="create-admin-panel"><form id="superAdminCreateForm" class="admin-create-form"><div class="field"><label for="superAdminEmail">Administrator email</label><input id="superAdminEmail" type="email" required placeholder="admin@example.com"></div><div class="field"><label for="superAdminPassword">Temporary password <span class="muted">optional</span></label><input id="superAdminPassword" type="password" minlength="8" placeholder="Leave blank to generate"></div><div class="field"><button class="btn btn-primary" id="superAdminCreateButton" type="submit">＋ Create Admin</button><p id="superAdminCreateMessage" role="status"></p></div></form></div><div class="tablewrap"><table><thead><tr><th>Administrator</th><th>Email</th><th>Status</th><th>Created</th><th>Access</th></tr></thead><tbody id="superAdminAdminsBody"><tr><td colspan="5">Loading administrator accounts…</td></tr></tbody></table></div>`;
      wrap.appendChild(section);
      const hideAdminSection=()=>{section.style.display='none';tab.classList.remove('active');};
      document.addEventListener('click',event=>{const clickedTab=event.target.closest('.tab');if(!clickedTab||clickedTab===tab)return;hideAdminSection();},true);
      tab.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();document.querySelectorAll('.side-nav .tab').forEach(item=>item.classList.remove('active'));tab.classList.add('active');document.querySelectorAll('.main .panel').forEach(panel=>{panel.style.display='none';});section.style.display='block';const title=document.getElementById('pageTitle');if(title)title.textContent='Administrator access.';});
      await import('../super-admin-management.js?shared-studio=20261002');
      window.superAdminLoadAdmins?.();
    } catch(error){console.warn('Shared administrator dashboard could not initialize:',error);}
  };

  const installOrderDetailThumbnails = () => {
    if (document.getElementById('bhattiOrderThumbCss')) return;
    const style = document.createElement('style');
    style.id = 'bhattiOrderThumbCss';
    style.textContent = `
      .order-detail-items-title{margin:20px 0 10px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#766b61}
      .order-line-items.order-line-items-rich{display:grid;gap:10px;margin-top:8px}
      .order-line-items-rich .item{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px;border:1px solid rgba(39,31,24,.09);border-radius:14px;background:#fffaf4}
      .order-line-items-rich .item-thumb{width:56px;height:56px;border-radius:10px;object-fit:cover;background:#f1ece5;border:1px solid rgba(39,31,24,.08);display:block}
      .order-line-items-rich .item-info{min-width:0;display:grid;gap:4px}
      .order-line-items-rich .item-name{font-weight:800;color:#29231e;line-height:1.25;overflow-wrap:anywhere}
      .order-line-items-rich .item-meta{font-size:11px;color:#766b61}
      .order-line-items-rich .item-total{font-weight:800;color:#29231e;white-space:nowrap}
      .order-line-items-rich .item-placeholder{display:grid;place-items:center;width:56px;height:56px;border-radius:10px;background:#f1ece5;color:#998e84;font-size:18px;font-weight:800}
      @media(max-width:700px){
        #modal.open .order-detail-items-title{margin-top:16px}
        #modal.open .order-line-items-rich .item{grid-template-columns:50px minmax(0,1fr) auto;gap:9px;padding:9px}
        #modal.open .order-line-items-rich .item-thumb,#modal.open .order-line-items-rich .item-placeholder{width:50px;height:50px}
        #modal.open .order-line-items-rich .item-name{font-size:12px}
        #modal.open .order-line-items-rich .item-meta{font-size:10px}
        #modal.open .order-line-items-rich .item-total{font-size:12px}
      }
    `;
    document.head.appendChild(style);
  };

  const installOrderDetailOverride = () => {
    installOrderDetailThumbnails();
    const db = window.BHATTI?.db;
    if (!db || typeof window.viewOrder !== 'function') return;
    if (window.__bhattiThumbnailOrderViewInstalled) return;
    window.__bhattiThumbnailOrderViewInstalled = true;

    const originalViewOrder = window.viewOrder;
    window.viewOrder = async function(id) {
      try {
        const { data: order, error: orderError } = await db.from('orders').select('*').eq('id', id).maybeSingle();
        if (orderError || !order) { originalViewOrder(id); return; }

        const [{ data: itemRows, error: itemError }, { data: profile }] = await Promise.all([
          db.from('order_items').select('*').eq('order_id', id),
          order.user_id ? db.from('profiles').select('full_name,email,phone').eq('id', order.user_id).maybeSingle() : Promise.resolve({data:null})
        ]);
        const items = itemError ? [] : (itemRows || []);
        const productIds = [...new Set(items.map(item => item.product_id).filter(Boolean).map(String))];
        let productMap = new Map();
        if (productIds.length) {
          const { data: productRows } = await db.from('products').select('id,image_url,name,category,sku').in('id', productIds);
          productMap = new Map((productRows || []).map(product => [String(product.id), product]));
        }

        const escValue = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
        const moneyValue = value => 'PKR ' + Number(value || 0).toLocaleString('en-PK');
        const slug = value => String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
        const statusBadge = value => `<span class="status-chip order-${slug(value)}">${escValue(value || 'Pending')}</span>`;
        const paymentBadge = value => `<span class="status-chip payment-${slug(value)}">${escValue(value || 'Unpaid')}</span>`;
        const customerName = profile?.full_name || order.customer_name || 'Customer';
        const customerEmail = order.customer_email || profile?.email || order.email || 'Not provided';
        const customerPhone = order.customer_phone || profile?.phone || order.phone || 'Not provided';
        const address = order.address_line || order.address || 'Not provided';
        const city = order.city || 'Not provided';
        const cancelled = order.status === 'Cancelled' ? `<div class="cancellation-detail"><p class="kicker">Cancellation</p><div class="grid"><div class="detail"><span>Cancelled by</span>${escValue(order.cancelled_by || 'Not recorded')}</div><div class="detail"><span>Reason</span>${escValue(order.cancel_reason || 'Not recorded')}</div>${order.internal_note ? `<div class="detail" style="grid-column:1/-1"><span>Internal note</span>${escValue(order.internal_note)}</div>` : ''}</div></div>` : '';
        const fallbackImage = '../assets/product-placeholder.svg';
        const lineItems = items.map(item => {
          const product = productMap.get(String(item.product_id));
          const name = item.product_name || item.name || product?.name || 'Product';
          const quantity = Number(item.quantity || item.qty || 0);
          const unitPrice = Number(item.unit_price || item.price || 0);
          const total = unitPrice * quantity;
          const image = item.image_url || item.thumbnail_url || product?.image_url || fallbackImage;
          const imageMarkup = image ? `<img class="item-thumb" src="${escValue(image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage}'">` : '<span class="item-placeholder">□</span>';
          return `<div class="item"><span class="item-thumb-wrap">${imageMarkup}</span><div class="item-info"><span class="item-name">${escValue(name)}</span><span class="item-meta">${quantity} × ${moneyValue(unitPrice)}${product?.category ? ` · ${escValue(product.category)}` : ''}</span></div><b class="item-total">${moneyValue(total)}</b></div>`;
        }).join('');

        const body = document.getElementById('modalBody');
        const title = document.getElementById('modalTitle');
        if (!body || !title) { originalViewOrder(id); return; }
        title.textContent = order.order_number || order.order_no || order.id;
        body.innerHTML = `<div class="order-detail-workflow"><div><small>Fulfilment</small>${statusBadge(order.status)}</div><div><small>Payment</small>${paymentBadge(order.payment_status)}</div><div class="order-detail-actions"><button class="smallbtn workflow-button" onclick="openOrderWorkflow('${escValue(order.id)}')">Manage workflow</button><button class="smallbtn danger-action" onclick="openArchiveOrder('${escValue(order.id)}')">Archive order</button></div></div><div class="grid"><div class="detail"><span>Customer</span>${escValue(customerName)}</div><div class="detail"><span>Phone</span>${escValue(customerPhone)}</div><div class="detail"><span>Email</span>${escValue(customerEmail)}</div><div class="detail"><span>City</span>${escValue(city)}</div><div class="detail"><span>Payment method</span>${escValue(order.payment_method || 'COD')}</div><div class="detail"><span>Last workflow update</span>${new Date(order.status_updated_at || order.created_at).toLocaleString('en-PK')}</div><div class="detail" style="grid-column:1/-1"><span>Address</span>${escValue(address)}</div></div>${cancelled}<div class="order-detail-items-title">Items · ${items.reduce((sum,item)=>sum+Number(item.quantity||item.qty||0),0)}</div><div class="order-line-items order-line-items-rich">${lineItems || '<div class="empty">No order items found.</div>'}</div><div class="total"><span>Total</span><b>${moneyValue(order.total)}</b></div>`;
        document.getElementById('modal').classList.add('open');
        document.body.classList.add('modal-lock');
      } catch (error) {
        console.warn('Thumbnail order detail could not be rendered:', error);
        originalViewOrder(id);
      }
    };
  };

  const init = () => {
    installMobileModalGuard();
    installArchiveDialogGuard();
    installSharedStudio();
    installOrderDetailOverride();
    const form=document.getElementById('productForm');
    const dialog=document.getElementById('productEditor');
    if(!form||!dialog)return;
    let savePending=false,pollTimer=0,closeTimer=0,fallbackTimer=0;
    const statusNodes=()=>[document.getElementById('productEditorMessage'),document.getElementById('catalogMessage')].filter(Boolean);
    const statusText=()=>statusNodes().map(node=>(node.textContent||'').trim()).filter(Boolean).join(' ').toLowerCase();
    const hasError=()=>statusNodes().some(node=>node.classList.contains('error')||/\b(error|failed|could not|unable|invalid|not saved|schema cache)\b/i.test(node.textContent||''));
    const hasSuccess=()=>{const text=statusText();return !!text&&!hasError()&&/\b(saved|published|updated|created|deleted|success|successfully)\b/i.test(text);};
    const finishClose=()=>{if(!dialog.open||hasError())return;dialog.close();savePending=false;window.clearInterval(pollTimer);window.clearTimeout(closeTimer);window.clearTimeout(fallbackTimer);};
    const closeAfterSuccess=()=>{if(!savePending||!dialog.open||hasError()||!hasSuccess())return;window.clearTimeout(closeTimer);closeTimer=window.setTimeout(finishClose,150);};
    const pollForCompletion=()=>{window.clearInterval(pollTimer);pollTimer=window.setInterval(()=>{if(!savePending||!dialog.open){window.clearInterval(pollTimer);return;}if(hasError()){window.clearInterval(pollTimer);window.clearTimeout(fallbackTimer);return;}closeAfterSuccess();},75);};
    form.addEventListener('submit',()=>{savePending=true;window.clearTimeout(closeTimer);window.clearTimeout(fallbackTimer);pollForCompletion();fallbackTimer=window.setTimeout(()=>{if(savePending&&dialog.open&&!hasError())finishClose();},700);},true);
    const observer=new MutationObserver(()=>{if(!savePending)return;if(hasError()){window.clearInterval(pollTimer);window.clearTimeout(fallbackTimer);return;}closeAfterSuccess();});
    observer.observe(dialog,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class','disabled']});
    dialog.addEventListener('close',()=>{savePending=false;window.clearInterval(pollTimer);window.clearTimeout(closeTimer);window.clearTimeout(fallbackTimer);});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
