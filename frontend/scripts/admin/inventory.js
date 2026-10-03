(() => {
  const db = window.BHATTI?.db;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const placeholder = 'assets/product-placeholder.svg';
  let rows = [];
  let includeInactive = false;
  let selectedId = null;

  const money = value => 'PKR ' + Number(value || 0).toLocaleString('en-PK');
  const stockStatus = row => row.stock <= 0 ? ['out','Out of stock'] : row.stock <= row.reorder_level ? ['low','Low stock'] : ['healthy','In stock'];
  const imageFor = row => row.image_url || placeholder;

  function installAdminUX() {
    if ($('bhatti-admin-stock-grid-ux')) return;
    const style = document.createElement('style');
    style.id = 'bhatti-admin-stock-grid-ux';
    style.textContent = `
      .inventory-panel .inventory-table-wrap{display:none!important}
      .inventory-panel .inventory-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:18px}
      .inventory-panel .inventory-card{position:relative;display:flex;flex-direction:column;min-width:0;overflow:hidden;border:1px solid rgba(39,31,24,.10);border-radius:20px;background:#fffaf4;box-shadow:0 12px 30px rgba(35,26,19,.06);cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
      .inventory-panel .inventory-card:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(35,26,19,.10);border-color:rgba(189,152,99,.55)}
      .inventory-panel .inventory-thumb{aspect-ratio:1.08/1;background:#f3eee7;overflow:hidden;display:flex;align-items:center;justify-content:center}
      .inventory-panel .inventory-thumb img{width:100%;height:100%;object-fit:cover;display:block}
      .inventory-panel .inventory-card-body{padding:14px;display:grid;gap:8px}
      .inventory-panel .inventory-card-category{font-size:9px;letter-spacing:.10em;text-transform:uppercase;font-weight:800;color:#897d72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .inventory-panel .inventory-card-name{font-size:15px;line-height:1.2;font-weight:800;color:#29231e;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:36px}
      .inventory-panel .inventory-card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:#6f655d}
      .inventory-panel .inventory-card-stock{font-weight:800;color:#332b25}
      .inventory-panel .inventory-card-price{font-weight:800;color:#7c403c;font-size:13px}
      .inventory-panel .inventory-status{display:inline-flex;align-items:center;justify-content:center;min-height:28px;padding:0 9px;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.04em;white-space:nowrap;width:max-content}
      .inventory-panel .inventory-status.out{background:#fae9e7;color:#8f3d38}.inventory-panel .inventory-status.low{background:#fff2d7;color:#876522}.inventory-panel .inventory-status.healthy{background:#e9f1ed;color:#416b58}
      .inventory-panel .inventory-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:7px;border-top:1px solid rgba(39,31,24,.08)}
      .inventory-panel .inventory-open-hint{font-size:9px;font-weight:800;color:#7c403c;letter-spacing:.04em}
      .inventory-panel .inventory-inactive{font-size:8px;font-weight:800;color:#8f3d38;background:#fae9e7;border-radius:999px;padding:4px 7px}
      .inventory-panel .inventory-empty{grid-column:1/-1;padding:36px 20px;text-align:center;border:1px dashed rgba(39,31,24,.18);border-radius:18px;color:#756b62;background:#fffaf4}
      .inventory-panel .inventory-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:22px 0}
      .inventory-panel .inventory-stats>div{min-height:104px;padding:20px;border:1px solid rgba(39,31,24,.09);border-radius:18px;background:#fffaf4;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 10px 30px rgba(35,26,19,.045)}
      .inventory-panel .inventory-stats span{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#81766d}.inventory-panel .inventory-stats b{font-size:30px;line-height:1;color:#7c403c;letter-spacing:-.05em}
      .inventory-panel .catalog-toolbar{margin-top:22px;padding:18px 20px;border:1px solid rgba(39,31,24,.09);border-radius:18px;background:rgba(255,250,244,.7)}
      .inventory-panel .catalog-filters{gap:18px;align-items:end}.inventory-panel .catalog-filters label{min-width:210px}
      .bhatti-stock-toggle{display:flex;align-items:center;gap:9px;min-height:44px;padding:0 13px;border:1px solid rgba(39,31,24,.12);border-radius:12px;background:rgba(255,250,244,.82);color:#4b423a;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}.bhatti-stock-toggle input{width:17px;height:17px;accent-color:#7c403c}
      .stock-control-modal{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(13,15,15,.56);backdrop-filter:blur(8px)}
      .stock-control-modal.is-open{display:flex}.stock-control-sheet{width:min(720px,100%);max-height:min(90vh,820px);overflow:auto;background:#fffaf4;border:1px solid rgba(255,255,255,.55);border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.28);padding:20px}
      .stock-control-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:16px}.stock-control-title{display:grid;gap:5px}.stock-control-title small{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#897d72;font-weight:800}.stock-control-title h2{margin:0;font-size:26px;line-height:1.08;color:#29231e}.stock-control-close{width:42px;height:42px;border-radius:12px;border:1px solid rgba(39,31,24,.12);background:#fff;color:#29231e;font-size:24px;cursor:pointer}
      .stock-control-preview{display:grid;grid-template-columns:180px 1fr;gap:18px;padding:14px;border-radius:18px;background:#f4eee6;border:1px solid rgba(39,31,24,.08)}.stock-control-preview img{width:180px;height:180px;object-fit:cover;border-radius:14px;background:#fff}.stock-control-info{display:grid;align-content:start;gap:9px}.stock-control-info p{margin:0;color:#70665e;font-size:12px;line-height:1.45}.stock-control-info strong{color:#29231e}.stock-control-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.stock-control-field{display:grid;gap:7px}.stock-control-field label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.10em;color:#81766d}.stock-control-field input{width:100%;box-sizing:border-box;min-height:48px;border:1px solid rgba(39,31,24,.15);border-radius:12px;padding:0 13px;background:#fff;color:#29231e;font-size:16px;font-weight:700}.stock-control-field input:focus{outline:2px solid rgba(189,152,99,.5);outline-offset:1px}.stock-control-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.stock-control-actions button{min-height:46px;border-radius:12px;padding:0 18px;border:1px solid rgba(39,31,24,.14);font-weight:800;cursor:pointer}.stock-control-cancel{background:#fff;color:#29231e}.stock-control-save{background:#7c403c;color:#fff;border-color:#7c403c!important}.stock-control-message{min-height:18px;margin-top:8px;font-size:11px;color:#756b62}.stock-control-message.error{color:#9b3d36}
      @media(max-width:1000px){.inventory-panel .inventory-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.inventory-panel .inventory-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:700px){.inventory-panel .inventory-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.inventory-panel .inventory-card{border-radius:13px}.inventory-panel .inventory-card-body{padding:8px;gap:5px}.inventory-panel .inventory-card-name{font-size:11px;min-height:27px}.inventory-panel .inventory-card-category{font-size:7px}.inventory-panel .inventory-card-meta{font-size:8px;gap:3px}.inventory-panel .inventory-card-price{font-size:9px}.inventory-panel .inventory-status{min-height:20px;padding:0 5px;font-size:6px}.inventory-panel .inventory-open-hint{font-size:6px}.inventory-panel .inventory-inactive{font-size:6px;padding:3px 4px}.inventory-panel .inventory-card-footer{padding-top:4px}.inventory-panel .inventory-stats{grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.inventory-panel .inventory-stats>div{min-height:82px;padding:13px;border-radius:14px}.inventory-panel .inventory-stats b{font-size:23px}.inventory-panel .catalog-toolbar{padding:14px;margin-top:16px;border-radius:15px}.inventory-panel .catalog-filters{display:grid;grid-template-columns:1fr;gap:12px}.inventory-panel .catalog-filters label{min-width:0}.bhatti-stock-toggle{width:100%;box-sizing:border-box}.stock-control-modal{padding:10px;align-items:flex-end}.stock-control-sheet{max-height:92vh;border-radius:22px 22px 0 0;padding:16px}.stock-control-preview{grid-template-columns:110px 1fr;gap:12px}.stock-control-preview img{width:110px;height:110px}.stock-control-title h2{font-size:20px}.stock-control-fields{grid-template-columns:1fr 1fr}.stock-control-actions{position:sticky;bottom:0;background:#fffaf4;padding-top:10px}.stock-control-actions button{flex:1}.main .wrap{width:calc(100% - 24px)}.main{padding:28px 0 70px}.panel{padding:16px}.top,.topin{height:64px!important;min-height:64px!important}.topin{width:calc(100% - 24px)!important}.side-nav{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}.side-nav .tab{min-height:50px!important;height:50px!important;padding:5px 3px!important}.side-nav .tab b{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureInventoryToggle() {
    const toolbar = $('inventorySearch')?.closest('.catalog-filters');
    if (!toolbar || $('inventoryIncludeInactiveWrap')) return;
    const wrap = document.createElement('label'); wrap.className='bhatti-stock-toggle'; wrap.id='inventoryIncludeInactiveWrap';
    wrap.innerHTML='<input id="inventoryIncludeInactive" type="checkbox"> Include inactive products'; toolbar.appendChild(wrap);
    $('inventoryIncludeInactive')?.addEventListener('change', e => { includeInactive=Boolean(e.target.checked); renderInventory(); });
  }

  function ensureStockModal() {
    if ($('stockControlModal')) return;
    const modal=document.createElement('div'); modal.id='stockControlModal'; modal.className='stock-control-modal'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
    modal.innerHTML=`<div class="stock-control-sheet"><div class="stock-control-head"><div class="stock-control-title"><small>BHATTI / STOCK CONTROL</small><h2 id="stockControlName">Product</h2></div><button class="stock-control-close" type="button" id="stockControlClose" aria-label="Close stock control">×</button></div><div class="stock-control-preview"><img id="stockControlImage" alt=""><div class="stock-control-info"><p id="stockControlCategory"></p><p id="stockControlSku"></p><p id="stockControlPrice"></p><p id="stockControlDescription"></p><p id="stockControlStatus"></p></div></div><div class="stock-control-fields"><div class="stock-control-field"><label for="stockControlQuantity">Units on hand</label><input id="stockControlQuantity" type="number" min="0" step="1"></div><div class="stock-control-field"><label for="stockControlReorder">Reorder level</label><input id="stockControlReorder" type="number" min="0" step="1"></div></div><div class="stock-control-message" id="stockControlMessage"></div><div class="stock-control-actions"><button class="stock-control-cancel" type="button" id="stockControlCancel">Cancel</button><button class="stock-control-save" type="button" id="stockControlSave">Save stock</button></div></div>`;
    document.body.appendChild(modal);
    $('stockControlClose').onclick=closeStockControl; $('stockControlCancel').onclick=closeStockControl;
    modal.addEventListener('click',e=>{if(e.target===modal)closeStockControl()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))closeStockControl()});
    $('stockControlSave').onclick=saveSelectedStock;
  }

  function openStockControl(id){
    ensureStockModal(); const row=rows.find(x=>String(x.id)===String(id)); if(!row)return; selectedId=String(id);
    const [status,label]=stockStatus(row);
    $('stockControlName').textContent=row.name||'Product'; $('stockControlImage').src=imageFor(row); $('stockControlImage').onerror=()=>{$('stockControlImage').src=placeholder}; $('stockControlImage').alt=row.name||'Product';
    $('stockControlCategory').innerHTML=`<strong>Category:</strong> ${esc(row.category||'Uncategorised')}`;
    $('stockControlSku').innerHTML=`<strong>SKU:</strong> ${esc(row.sku||'No SKU')}`;
    $('stockControlPrice').innerHTML=`<strong>Price:</strong> ${money(row.price)}`;
    $('stockControlDescription').textContent=row.description||'No description available.';
    $('stockControlStatus').innerHTML=`<span class="inventory-status ${status}">${label} · ${Number(row.stock)} units</span>`;
    $('stockControlQuantity').value=Number(row.stock); $('stockControlReorder').value=Number(row.reorder_level); $('stockControlMessage').textContent=''; $('stockControlMessage').className='stock-control-message';
    $('stockControlModal').classList.add('is-open'); document.body.style.overflow='hidden';
  }

  function closeStockControl(){ if(!$('stockControlModal'))return; $('stockControlModal').classList.remove('is-open'); document.body.style.overflow=''; selectedId=null; }

  async function saveSelectedStock(){
    if(!selectedId||!db)return; const quantity=Math.max(0,Math.floor(Number($('stockControlQuantity').value)||0)); const reorder=Math.max(0,Math.floor(Number($('stockControlReorder').value)||0));
    const button=$('stockControlSave'); const msg=$('stockControlMessage'); button.disabled=true; button.textContent='Saving…'; msg.textContent='';
    try{
      const {error}=await db.rpc('admin_manage_inventory',{p_product_id:selectedId,p_quantity:quantity,p_reorder_level:reorder});
      if(error)throw error;
      const row=rows.find(x=>String(x.id)===selectedId); if(row){row.stock=quantity;row.reorder_level=reorder;row.updated_at=new Date().toISOString();}
      renderInventory(); closeStockControl();
      if($('inventoryMessage')){$('inventoryMessage').textContent='Stock updated successfully.';$('inventoryMessage').className='stock-empty-note';}
    }catch(error){msg.textContent=error.message||'Could not save stock.';msg.className='stock-control-message error';}
    finally{button.disabled=false;button.textContent='Save stock';}
  }

  function renderInventory(){
    const query=($('inventorySearch')?.value||'').trim().toLowerCase(); const filter=$('inventoryFilter')?.value||'all'; const source=includeInactive?rows:rows.filter(row=>Boolean(row.active));
    const list=source.filter(row=>{const text=`${row.name||''} ${row.sku||''} ${row.category||''}`.toLowerCase(); const search=!query||text.includes(query); const match=filter==='all'||(filter==='out'&&row.stock<=0)||(filter==='low'&&row.stock>0&&row.stock<=row.reorder_level)||(filter==='healthy'&&row.stock>row.reorder_level); return search&&match;});
    const body=$('inventoryBody'); if(!body)return;
    const grid=body.closest('.inventory-table-wrap')?.parentElement?.querySelector('.inventory-grid');
    if(grid)grid.remove();
    const wrap=document.createElement('div'); wrap.className='inventory-grid';
    if(!list.length){wrap.innerHTML='<div class="inventory-empty">No products match this stock view.</div>'; body.closest('.inventory-table-wrap')?.after(wrap);} else {
      wrap.innerHTML=list.map(row=>{const [status,label]=stockStatus(row);return `<button class="inventory-card" type="button" data-stock-open="${esc(row.id)}" aria-label="Open stock control for ${esc(row.name)}"><span class="inventory-thumb"><img src="${esc(imageFor(row))}" alt="${esc(row.name)}" loading="lazy"></span><span class="inventory-card-body"><span class="inventory-card-category">${esc(row.category||'Uncategorised')}</span><span class="inventory-card-name">${esc(row.name)}</span><span class="inventory-card-meta"><span class="inventory-card-stock">${Number(row.stock)} units</span><span class="inventory-card-price">${money(row.price)}</span></span><span class="inventory-status ${status}">${label}</span><span class="inventory-card-footer"><span class="inventory-open-hint">Open stock control ↗</span>${!row.active?'<span class="inventory-inactive">Inactive</span>':''}</span></span></button>`}).join('');
      body.closest('.inventory-table-wrap')?.after(wrap);
    }
    wrap.querySelectorAll('[data-stock-open]').forEach(card=>card.addEventListener('click',()=>openStockControl(card.dataset.stockOpen)));
    const visible=source; const out=visible.filter(x=>x.stock<=0).length; const low=visible.filter(x=>x.stock>0&&x.stock<=x.reorder_level).length; const units=visible.reduce((sum,x)=>sum+Number(x.stock||0),0);
    if($('inventoryStats'))$('inventoryStats').innerHTML=`<div><span>${includeInactive?'Visible products':'Active products'}</span><b>${visible.length}</b></div><div><span>Units on hand</span><b>${units}</b></div><div><span>Out of stock</span><b>${out}</b></div><div><span>Low stock</span><b>${low}</b></div>`;
    if($('inventoryMessage')&&!$('inventoryMessage').classList.contains('error')){$('inventoryMessage').textContent=includeInactive?'Showing active and inactive catalogue items.':'Showing active catalogue products only. Inactive products are excluded from live stock totals.';$('inventoryMessage').className='stock-empty-note';}
  }

  async function loadInventory(){
    const body=$('inventoryBody'); if(!body||!db)return; installAdminUX(); ensureInventoryToggle(); ensureStockModal(); body.innerHTML='<tr><td colspan="8" class="empty">Loading live stock…</td></tr>';
    try{
      const [{data:products,error:productError},{data:inventory,error:inventoryError}]=await Promise.all([db.from('products').select('id,name,sku,category,price,description,image_url,active').order('name'),db.from('inventory').select('product_id,quantity,reorder_level,updated_at')]);
      if(productError)throw productError;if(inventoryError)throw inventoryError; const stockMap=Object.fromEntries((inventory||[]).map(row=>[String(row.product_id),row]));
      rows=(products||[]).map(product=>({...product,stock:Math.max(0,Number(stockMap[String(product.id)]?.quantity??0)),reorder_level:Math.max(0,Number(stockMap[String(product.id)]?.reorder_level??0)),updated_at:stockMap[String(product.id)]?.updated_at||null})); renderInventory();
      const active=rows.filter(x=>Boolean(x.active)); if($('inventoryCount'))$('inventoryCount').textContent=`${active.length} active products · ${rows.length-active.length} inactive hidden by default`; if($('sideInventoryCount'))$('sideInventoryCount').textContent=active.length;
    }catch(error){body.innerHTML=`<tr><td colspan="8" class="empty">${esc(error.message||'Could not load inventory.')}</td></tr>`;if($('inventoryMessage')){$('inventoryMessage').textContent=error.message||'Could not load inventory.';$('inventoryMessage').className='error';}}
  }

  function activateInventoryTab(){installAdminUX();document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelector('.tab[data-tab="inventory"]')?.classList.add('active');['ordersSection','archiveSection','customersSection','usersSection','reviewsSection','productsSection','adminManagementSection','inventorySection'].forEach(id=>{const el=$(id);if(el)el.style.display=id==='inventorySection'?'block':'none';});if($('pageTitle'))$('pageTitle').textContent='Stock control, at a glance.';ensureInventoryToggle();loadInventory();}

  installAdminUX(); ensureStockModal(); document.querySelector('.tab[data-tab="inventory"]')?.addEventListener('click',activateInventoryTab); $('inventorySearch')?.addEventListener('input',renderInventory); $('inventoryFilter')?.addEventListener('change',renderInventory);
})();