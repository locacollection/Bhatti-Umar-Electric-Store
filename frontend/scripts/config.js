window.BHATTI = window.BHATTI || {};

BHATTI.esc = BHATTI.escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
BHATTI.money = n => "PKR " + Number(n || 0).toLocaleString("en-PK");
BHATTI.SUPABASE_URL = "https://ewldqjmyijfhrdenwqfn.supabase.co";
BHATTI.SUPABASE_KEY = "sb_publishable_s0cpLseFV1CSYGTGnqadMA_cTTRThO9";
BHATTI.db = supabase.createClient(BHATTI.SUPABASE_URL, BHATTI.SUPABASE_KEY, {auth:{persistSession:true,storage:window.localStorage,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
BHATTI.currentUser = null; BHATTI.profile = null; BHATTI.products = []; BHATTI.cart = {}; BHATTI.authMode = "signin"; BHATTI.cartSyncBusy = false;

/*
 * Orders are rendered by Admin/Super Admin core.js from the authoritative
 * orders query.  This helper intentionally does NOT mutate #ordersBody.
 * The previous implementation hid rendered rows after a second query, so a
 * transient/permission-delayed live query could make valid orders flash and
 * then disappear after refresh.  Keeping this as a read-only helper removes
 * that race while retaining the live/archive diagnostic information.
 */
BHATTI.syncStudioOrders = async function syncStudioOrders(){
  if(!document.getElementById('ordersBody')) return null;
  try{
    const [{data:archived,error:archiveError},{data:live,error:liveError}]=await Promise.all([
      BHATTI.db.from('orders').select('id,order_number,archived_at').not('archived_at','is',null),
      BHATTI.db.from('orders').select('id,order_number,status,payment_status,total,created_at').is('archived_at',null).order('created_at',{ascending:false})
    ]);
    if(archiveError||liveError) throw archiveError||liveError;
    const syncLabel=document.getElementById('topSyncLabel');
    if(syncLabel) syncLabel.textContent=`Live · ${live.length} orders`;
    return {live:live||[],archived:archived||[]};
  }catch(error){
    console.warn('Studio live-order synchronization check failed:',error);
    return null;
  }
};

function installStudioIntegrityFixes(){
  if(document.getElementById('bhattiStudioIntegrityFixes')) return;
  const style=document.createElement('style'); style.id='bhattiStudioIntegrityFixes';
  style.textContent=`
    #ordersBody tr[hidden]{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important}
    .storefront-command-side{display:none!important}
    #archiveBulkToolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
    #archiveBulkToolbar .archive-bulk-status{font-size:13px;color:#665f57;margin-right:auto}
    #archiveBulkToolbar button{min-height:44px}
    .archive-card.archive-selected{outline:3px solid rgba(226,170,42,.55)!important;outline-offset:2px}
    .archive-select-wrap{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-weight:700;font-size:13px}
    .archive-select-wrap input{width:22px;height:22px;accent-color:#e4aa2a}
    .archive-delete-selected[disabled]{opacity:.45;cursor:not-allowed}
    @media(max-width:700px){
      .side-nav{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(2,minmax(50px,auto))!important;gap:7px!important;width:100%!important;overflow:visible!important}
      .side-nav .tab{width:100%!important;min-width:0!important;min-height:54px!important;height:auto!important;padding:7px 4px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:3px!important;text-align:center!important;white-space:normal!important;font-size:9px!important;line-height:1.15!important}
      .side-nav .tab .nav-icon{width:22px!important;height:22px!important;flex:0 0 22px!important}
      .side-nav .tab b{position:absolute!important;top:4px!important;right:4px!important;min-width:17px!important;padding:2px 4px!important;font-size:8px!important}
      .shell,.main{min-width:0!important;overflow-x:hidden!important}
      .wrap{min-width:0!important;max-width:100%!important}
      #archiveBulkToolbar{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #archiveBulkToolbar .archive-bulk-status{grid-column:1/-1;margin:0}
      .archive-select-wrap{margin-bottom:14px}
    }
  `;
  document.head.appendChild(style);

  const archiveBody=document.getElementById('archiveBody');
  let archiveSelection=new Set();
  let archiveActionBusy=false;
  let archiveToastTimer=null;

  const notifyOnce=(message,options={})=>{
    clearTimeout(archiveToastTimer);
    archiveToastTimer=setTimeout(()=>window.adminNotify?.(message,options),80);
  };

  const getArchiveId=card=>String(card?.querySelector('[data-inspect-archive]')?.dataset.inspectArchive||card?.querySelector('[data-delete-archive]')?.dataset.deleteArchive||'');

  const renderArchiveBulkToolbar=()=>{
    const section=document.getElementById('archiveSection');
    if(!section)return;
    let toolbar=document.getElementById('archiveBulkToolbar');
    if(!toolbar){
      toolbar=document.createElement('div');
      toolbar.id='archiveBulkToolbar';
      toolbar.innerHTML='<span class="archive-bulk-status" id="archiveBulkStatus">No archived orders selected</span><button type="button" class="btn alt" id="archiveSelectMultiple">☐ Select multiple</button><button type="button" class="btn alt" id="archiveSelectAll">☐ Select all</button><button type="button" class="btn danger-action archive-delete-selected" id="archiveDeleteSelected" disabled>Delete selected</button>';
      const body=document.getElementById('archiveBody');
      body?.parentNode?.insertBefore(toolbar,body);
    }
    const selectedCount=archiveSelection.size;
    const cards=[...document.querySelectorAll('#archiveBody .archive-card')];
    const visibleIds=cards.map(getArchiveId).filter(Boolean);
    const allSelected=visibleIds.length>0&&visibleIds.every(id=>archiveSelection.has(id));
    const selectAll=document.getElementById('archiveSelectAll');
    const selectMultiple=document.getElementById('archiveSelectMultiple');
    const deleteSelected=document.getElementById('archiveDeleteSelected');
    const status=document.getElementById('archiveBulkStatus');
    if(status)status.textContent=selectedCount?`${selectedCount} archived order${selectedCount===1?'':'s'} selected`:'No archived orders selected';
    if(selectMultiple)selectMultiple.textContent=selectedCount?'☑ Selection mode on':'☐ Select multiple';
    if(selectAll){selectAll.textContent=allSelected?'☑ Deselect all':'☐ Select all';selectAll.setAttribute('aria-pressed',String(allSelected));}
    if(deleteSelected){deleteSelected.disabled=selectedCount===0||archiveActionBusy;deleteSelected.textContent=archiveActionBusy?'Deleting…':`Delete selected${selectedCount?` (${selectedCount})`:''}`;}
    cards.forEach(card=>{
      const id=getArchiveId(card); if(!id)return;
      card.classList.toggle('archive-selected',archiveSelection.has(id));
      let wrap=card.querySelector('.archive-select-wrap');
      if(!wrap){
        wrap=document.createElement('label');wrap.className='archive-select-wrap';
        wrap.innerHTML='<input type="checkbox" class="archive-select-check" aria-label="Select archived order"><span>Select archived order</span>';
        const first=card.firstElementChild; if(first)card.insertBefore(wrap,first); else card.appendChild(wrap);
      }
      const checkbox=wrap.querySelector('input');
      checkbox.checked=archiveSelection.has(id);
      checkbox.dataset.archiveId=id;
    });
  };

  const addArchiveDeleteControls=()=>{
    document.querySelectorAll('#archiveBody .archive-card').forEach(card=>{
      if(card.querySelector('[data-delete-archive]'))return;
      const inspect=card.querySelector('[data-inspect-archive]');
      const actions=card.querySelector('.archive-actions');
      if(!inspect||!actions)return;
      const button=document.createElement('button');button.type='button';button.className='smallbtn archive-delete-button danger-action';button.dataset.deleteArchive=inspect.dataset.inspectArchive;button.textContent='Delete permanently';actions.appendChild(button);
    });
    renderArchiveBulkToolbar();
  };

  const deleteArchived=async id=>{
    if(!id||archiveActionBusy)return false;
    try{const{error}=await BHATTI.db.rpc('admin_permanently_delete_archived_order',{p_archive_id:id});if(error)throw error;archiveSelection.delete(String(id));return true}catch(error){notifyOnce(error.message||'The archived order could not be deleted.',{title:'Deletion failed',tone:'error'});return false}
  };

  const deleteSelectedArchives=async()=>{
    if(archiveActionBusy||!archiveSelection.size)return;
    const ids=[...archiveSelection];
    const confirmed=typeof window.confirmAction==='function'?await window.confirmAction({eyebrow:'Permanent deletion',title:`Delete ${ids.length} archived order${ids.length===1?'':'s'}?`,message:'This permanently removes the selected archive records and cannot be undone.',confirmLabel:'Delete forever'}):window.confirm(`Delete ${ids.length} archived order${ids.length===1?'':'s'} permanently?`);
    if(!confirmed)return;
    archiveActionBusy=true;renderArchiveBulkToolbar();
    try{
      let failed=0;
      for(const id of ids){const ok=await deleteArchived(id);if(!ok)failed++;}
      if(typeof window.loadArchivedOrders==='function')await window.loadArchivedOrders({quiet:true});
      renderArchiveBulkToolbar();
      notifyOnce(failed?`${ids.length-failed} deleted; ${failed} could not be deleted.`:`${ids.length} archived order${ids.length===1?'':'s'} permanently deleted.`,{title:'Archive updated',tone:failed?'error':'success'});
    }finally{archiveActionBusy=false;renderArchiveBulkToolbar();}
  };

  document.addEventListener('click',event=>{
    const selectMultiple=event.target.closest('#archiveSelectMultiple');
    if(selectMultiple){event.preventDefault();event.stopImmediatePropagation();const checks=document.querySelectorAll('#archiveBody .archive-select-check');const visible=[...checks];if(!archiveSelection.size){visible.forEach(c=>archiveSelection.add(String(c.dataset.archiveId||'')))}else{archiveSelection.clear()}renderArchiveBulkToolbar();return;}
    const selectAll=event.target.closest('#archiveSelectAll');
    if(selectAll){event.preventDefault();event.stopImmediatePropagation();const ids=[...document.querySelectorAll('#archiveBody .archive-card')].map(getArchiveId).filter(Boolean);const allSelected=ids.length>0&&ids.every(id=>archiveSelection.has(id));if(allSelected)archiveSelection.clear();else ids.forEach(id=>archiveSelection.add(id));renderArchiveBulkToolbar();return;}
    const bulkDelete=event.target.closest('#archiveDeleteSelected');
    if(bulkDelete){event.preventDefault();event.stopImmediatePropagation();deleteSelectedArchives();return;}
    const check=event.target.closest('.archive-select-check');
    if(check){event.stopPropagation();const id=String(check.dataset.archiveId||'');if(check.checked)archiveSelection.add(id);else archiveSelection.delete(id);renderArchiveBulkToolbar();return;}
    const remove=event.target.closest('[data-delete-archive]');
    if(remove){event.preventDefault();event.stopImmediatePropagation();const id=remove.dataset.deleteArchive;const run=async()=>{const confirmed=typeof window.confirmAction==='function'?await window.confirmAction({eyebrow:'Permanent deletion',title:'Delete archived order?',message:'This permanently removes the archived order record and cannot be undone.',confirmLabel:'Delete forever'}):window.confirm('Delete this archived order permanently?');if(!confirmed)return;archiveActionBusy=true;renderArchiveBulkToolbar();const ok=await deleteArchived(id);if(ok&&typeof window.loadArchivedOrders==='function')await window.loadArchivedOrders({quiet:true});archiveActionBusy=false;renderArchiveBulkToolbar();if(ok)notifyOnce('Archived order permanently deleted.',{title:'Archive updated',tone:'success'})};run();return;}
  },true);

  if(archiveBody)new MutationObserver(()=>{addArchiveDeleteControls()}).observe(archiveBody,{childList:true,subtree:true});
  addArchiveDeleteControls();

  const editProduct=new URLSearchParams(window.location.search).get('editProduct');
  if(editProduct&&document.getElementById('productEditor')){
    BHATTI.db.from('products').select('id,name').eq('id',editProduct).maybeSingle().then(({data})=>{
      const targetName=String(data?.name||'').trim().toLowerCase();if(!targetName)return;
      let attempts=0;const timer=setInterval(()=>{attempts++;document.querySelector('.side-nav .tab[data-tab="products"]')?.click();const cards=[...document.querySelectorAll('#productsBody .catalog-card')];const card=cards.find(item=>item.textContent.toLowerCase().includes(targetName));const edit=card&&[...card.querySelectorAll('button,a')].find(el=>/edit/i.test(`${el.textContent||''} ${el.getAttribute('aria-label')||''} ${el.title||''}`));if(edit){edit.click();clearInterval(timer)}else if(attempts>=150)clearInterval(timer)},100);
    }).catch(error=>console.warn('Preview edit target lookup failed:',error));
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installStudioIntegrityFixes,{once:true});else installStudioIntegrityFixes();

/* Do not run a second DOM reconciliation loop for Orders. Core load/render is authoritative. */
