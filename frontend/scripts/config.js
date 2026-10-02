window.BHATTI = window.BHATTI || {};

BHATTI.esc = BHATTI.escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
BHATTI.money = n => "PKR " + Number(n || 0).toLocaleString("en-PK");

BHATTI.SUPABASE_URL = "https://ewldqjmyijfhrdenwqfn.supabase.co";
BHATTI.SUPABASE_KEY = "sb_publishable_s0cpLseFV1CSYGTGnqadMA_cTTRThO9";
BHATTI.db = supabase.createClient(BHATTI.SUPABASE_URL, BHATTI.SUPABASE_KEY, {
  auth: {
    persistSession: true,
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
BHATTI.currentUser = null;
BHATTI.profile = null;
BHATTI.products = [];
BHATTI.cart = {};
BHATTI.authMode = "signin";
BHATTI.cartSyncBusy = false;

/* Shared Studio live-order guard.
   Archived records must never remain in the live Orders workspace. */
BHATTI.syncStudioOrders = async function syncStudioOrders(){
  if(!document.getElementById('ordersBody')) return;
  try{
    const [{data:archived,error:archiveError},{data:live,error:liveError}]=await Promise.all([
      BHATTI.db.from('orders').select('id,order_number,archived_at').not('archived_at','is',null),
      BHATTI.db.from('orders').select('id,order_number,status,payment_status,total,created_at').is('archived_at',null).order('created_at',{ascending:false})
    ]);
    if(archiveError||liveError) throw archiveError||liveError;
    const archivedIds=new Set((archived||[]).map(row=>String(row.id)));
    const archivedNumbers=new Set((archived||[]).map(row=>String(row.order_number||'')).filter(Boolean));
    document.querySelectorAll('#ordersBody tr').forEach(row=>{
      const key=String(row.querySelector('td:first-child b')?.textContent||row.querySelector('td:first-child')?.textContent||'').trim();
      const archivedRow=archivedIds.has(key)||archivedNumbers.has(key);
      row.hidden=archivedRow;
      if(archivedRow) row.setAttribute('aria-hidden','true');
    });
    document.querySelectorAll('[data-order-id],[data-order-number]').forEach(row=>{
      const id=String(row.dataset.orderId||'');
      const number=String(row.dataset.orderNumber||'');
      if(archivedIds.has(id)||archivedNumbers.has(number)) row.remove();
    });
    const count=document.getElementById('orderCount');
    if(count) count.textContent=`${live.length} live · ${live.length} total`;
    const side=document.getElementById('sideOrderCount');
    if(side) side.textContent=live.length;
    const stats=document.querySelectorAll('#stats .stat b');
    if(stats.length>=4){
      const inProgress=live.filter(row=>!['Delivered','Cancelled','Returned'].includes(row.status)).length;
      const delivered=live.filter(row=>row.status==='Delivered').length;
      const revenue=live.filter(row=>row.payment_status==='Paid'&&!['Cancelled','Returned'].includes(row.status)).reduce((sum,row)=>sum+Number(row.total||0),0);
      stats[0].textContent=live.length;
      stats[1].textContent=inProgress;
      stats[2].textContent=delivered;
      stats[3].textContent=BHATTI.money(revenue);
    }
    const syncLabel=document.getElementById('topSyncLabel');
    if(syncLabel) syncLabel.textContent=`Live · ${live.length} orders`;
    return {live,archived};
  }catch(error){
    console.warn('Studio live-order synchronization failed:',error);
    return null;
  }
};

function installStudioIntegrityFixes(){
  if(document.getElementById('bhattiStudioIntegrityFixes')) return;
  const style=document.createElement('style');
  style.id='bhattiStudioIntegrityFixes';
  style.textContent=`
    #ordersBody tr[hidden]{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;}
    .storefront-command-side{display:none!important;}
    @media(max-width:700px){
      #archiveBody .archive-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      #archiveBody .archive-delete-button{border:1px solid rgba(170,50,35,.24);background:#fff1ed;color:#9d2d20;}
      #archiveBody .archive-delete-button:active{transform:translateY(1px);}
    }
  `;
  document.head.appendChild(style);

  const archiveBody=document.getElementById('archiveBody');
  const addArchiveDeleteControls=()=>{
    document.querySelectorAll('#archiveBody .archive-card').forEach(card=>{
      if(card.querySelector('[data-delete-archive]')) return;
      const inspect=card.querySelector('[data-inspect-archive]');
      if(!inspect) return;
      const id=inspect.dataset.inspectArchive;
      const button=document.createElement('button');
      button.type='button';
      button.className='smallbtn archive-delete-button';
      button.dataset.deleteArchive=id;
      button.textContent='Delete permanently';
      inspect.parentElement?.appendChild(button);
    });
  };
  const deleteArchived=async id=>{
    if(!id) return;
    const confirmed=typeof window.confirmAction==='function'
      ? await window.confirmAction({eyebrow:'Permanent deletion',title:'Delete archived order?',message:'This permanently removes the archived order record and cannot be undone.',confirmLabel:'Delete forever'})
      : window.confirm('Delete this archived order permanently? This cannot be undone.');
    if(!confirmed) return;
    try{
      const {error}=await BHATTI.db.rpc('admin_permanently_delete_archived_order',{p_archive_id:id});
      if(error) throw error;
      if(typeof window.loadArchivedOrders==='function') await window.loadArchivedOrders({quiet:true});
      else document.querySelector(`[data-delete-archive="${CSS.escape(id)}"]`)?.closest('.archive-card')?.remove();
      window.adminNotify?.('Archived order permanently deleted.',{title:'Archive updated'});
    }catch(error){
      window.adminNotify?.(error.message||'The archived order could not be deleted.',{title:'Deletion failed',tone:'error'});
    }
  };
  document.addEventListener('click',event=>{
    const remove=event.target.closest('[data-delete-archive]');
    if(remove){event.preventDefault();event.stopImmediatePropagation();deleteArchived(remove.dataset.deleteArchive);}
  },true);
  if(archiveBody)new MutationObserver(addArchiveDeleteControls).observe(archiveBody,{childList:true,subtree:true});
  addArchiveDeleteControls();

  /* Preview -> exact catalogue item. The preview already sends editProduct=id;
     this bridge opens Catalogue and activates that exact product editor. */
  const params=new URLSearchParams(window.location.search);
  const editProduct=params.get('editProduct');
  if(editProduct && document.getElementById('productEditor')){
    let attempts=0;
    const openExact=()=>{
      attempts++;
      const catalogueTab=document.querySelector('.side-nav .tab[data-tab="products"]');
      if(catalogueTab && !catalogueTab.classList.contains('active')) catalogueTab.click();
      const target=document.querySelector(`[data-edit-product="${CSS.escape(editProduct)}"]`);
      if(target){target.click();clearInterval(timer);return true;}
      if(attempts>=120) clearInterval(timer);
      return false;
    };
    const timer=setInterval(openExact,100);
    openExact();
  }
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installStudioIntegrityFixes,{once:true});
else installStudioIntegrityFixes();

if(document.getElementById('ordersBody')){
  window.addEventListener('load',()=>setTimeout(()=>BHATTI.syncStudioOrders(),250));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)BHATTI.syncStudioOrders();});
  setInterval(()=>BHATTI.syncStudioOrders(),30000);
  const observerTarget=document.getElementById('ordersBody');
  if(observerTarget){
    let timer=null;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>BHATTI.syncStudioOrders(),120);
    }).observe(observerTarget,{childList:true,subtree:true});
  }
}
