window.BHATTI = window.BHATTI || {};

BHATTI.esc = BHATTI.escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
BHATTI.money = n => "PKR " + Number(n || 0).toLocaleString("en-PK");
BHATTI.SUPABASE_URL = "https://ewldqjmyijfhrdenwqfn.supabase.co";
BHATTI.SUPABASE_KEY = "sb_publishable_s0cpLseFV1CSYGTGnqadMA_cTTRThO9";
BHATTI.db = supabase.createClient(BHATTI.SUPABASE_URL, BHATTI.SUPABASE_KEY, {auth:{persistSession:true,storage:window.localStorage,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
BHATTI.currentUser = null; BHATTI.profile = null; BHATTI.products = []; BHATTI.cart = {}; BHATTI.authMode = "signin"; BHATTI.cartSyncBusy = false;

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
    const liveIds=new Set((live||[]).map(row=>String(row.id)));
    const liveNumbers=new Set((live||[]).map(row=>String(row.order_number||'')).filter(Boolean));

    document.querySelectorAll('#ordersBody tr').forEach(row=>{
      const orderCell=row.querySelector('td:first-child');
      const key=String(orderCell?.querySelector('b')?.textContent||'').trim();
      const isLive=liveIds.has(key)||liveNumbers.has(key);
      row.hidden=!isLive;
      if(!isLive) row.setAttribute('aria-hidden','true');
    });
    if(live.length===0){
      const body=document.getElementById('ordersBody');
      if(body) body.innerHTML='<tr><td colspan="7" class="empty">No live orders.</td></tr>';
    }

    const count=document.getElementById('orderCount'); if(count) count.textContent=`${live.length} live · ${live.length} total`;
    const side=document.getElementById('sideOrderCount'); if(side) side.textContent=live.length;
    const stats=document.querySelectorAll('#stats .stat b');
    if(stats.length>=4){
      const inProgress=live.filter(row=>!['Delivered','Cancelled','Returned'].includes(row.status)).length;
      const delivered=live.filter(row=>row.status==='Delivered').length;
      const revenue=live.filter(row=>row.payment_status==='Paid'&&!['Cancelled','Returned'].includes(row.status)).reduce((sum,row)=>sum+Number(row.total||0),0);
      stats[0].textContent=live.length; stats[1].textContent=inProgress; stats[2].textContent=delivered; stats[3].textContent=BHATTI.money(revenue);
    }
    const syncLabel=document.getElementById('topSyncLabel'); if(syncLabel) syncLabel.textContent=`Live · ${live.length} orders`;
    return {live,archived};
  }catch(error){console.warn('Studio live-order synchronization failed:',error);return null;}
};

function installStudioIntegrityFixes(){
  if(document.getElementById('bhattiStudioIntegrityFixes')) return;
  const style=document.createElement('style'); style.id='bhattiStudioIntegrityFixes';
  style.textContent=`
    #ordersBody tr[hidden]{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important}
    .storefront-command-side{display:none!important}
    @media(max-width:700px){
      .side-nav{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(2,minmax(50px,auto))!important;gap:7px!important;width:100%!important;overflow:visible!important}
      .side-nav .tab{width:100%!important;min-width:0!important;min-height:54px!important;height:auto!important;padding:7px 4px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:3px!important;text-align:center!important;white-space:normal!important;font-size:9px!important;line-height:1.15!important}
      .side-nav .tab .nav-icon{width:22px!important;height:22px!important;flex:0 0 22px!important}
      .side-nav .tab b{position:absolute!important;top:4px!important;right:4px!important;min-width:17px!important;padding:2px 4px!important;font-size:8px!important}
      .shell,.main{min-width:0!important;overflow-x:hidden!important}
      .wrap{min-width:0!important;max-width:100%!important}
    }
  `;
  document.head.appendChild(style);

  const archiveBody=document.getElementById('archiveBody');
  const addArchiveDeleteControls=()=>document.querySelectorAll('#archiveBody .archive-card').forEach(card=>{
    if(card.querySelector('[data-delete-archive]')) return;
    const inspect=card.querySelector('[data-inspect-archive]'); if(!inspect) return;
    const actions=card.querySelector('.archive-actions'); if(!actions) return;
    const button=document.createElement('button'); button.type='button'; button.className='smallbtn archive-delete-button danger-action'; button.dataset.deleteArchive=inspect.dataset.inspectArchive; button.textContent='Delete permanently'; actions.appendChild(button);
  });
  const deleteArchived=async id=>{
    if(!id)return;
    const confirmed=typeof window.confirmAction==='function'?await window.confirmAction({eyebrow:'Permanent deletion',title:'Delete archived order?',message:'This permanently removes the archived order record and cannot be undone.',confirmLabel:'Delete forever'}):window.confirm('Delete this archived order permanently?');
    if(!confirmed)return;
    try{const{error}=await BHATTI.db.rpc('admin_permanently_delete_archived_order',{p_archive_id:id});if(error)throw error;await window.loadArchivedOrders?.({quiet:true});window.BHATTI?.syncStudioOrders?.();window.adminNotify?.('Archived order permanently deleted.',{title:'Archive updated'})}catch(error){window.adminNotify?.(error.message||'The archived order could not be deleted.',{title:'Deletion failed',tone:'error'})}
  };
  document.addEventListener('click',event=>{const remove=event.target.closest('[data-delete-archive]');if(remove){event.preventDefault();event.stopImmediatePropagation();deleteArchived(remove.dataset.deleteArchive)}},true);
  if(archiveBody)new MutationObserver(addArchiveDeleteControls).observe(archiveBody,{childList:true,subtree:true}); addArchiveDeleteControls();

  const editProduct=new URLSearchParams(window.location.search).get('editProduct');
  if(editProduct&&document.getElementById('productEditor')){
    BHATTI.db.from('products').select('id,name').eq('id',editProduct).maybeSingle().then(({data})=>{
      const targetName=String(data?.name||'').trim().toLowerCase(); if(!targetName)return;
      let attempts=0; const timer=setInterval(()=>{
        attempts++;
        document.querySelector('.side-nav .tab[data-tab="products"]')?.click();
        const cards=[...document.querySelectorAll('#productsBody .catalog-card')];
        const card=cards.find(item=>item.textContent.toLowerCase().includes(targetName));
        const edit=card&&[...card.querySelectorAll('button,a')].find(el=>/edit/i.test(`${el.textContent||''} ${el.getAttribute('aria-label')||''} ${el.title||''}`));
        if(edit){edit.click();clearInterval(timer)} else if(attempts>=150)clearInterval(timer);
      },100);
    }).catch(error=>console.warn('Preview edit target lookup failed:',error));
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installStudioIntegrityFixes,{once:true});else installStudioIntegrityFixes();

if(document.getElementById('ordersBody')){
  window.addEventListener('load',()=>setTimeout(()=>BHATTI.syncStudioOrders(),250));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)BHATTI.syncStudioOrders()});
  setInterval(()=>BHATTI.syncStudioOrders(),30000);
  const observerTarget=document.getElementById('ordersBody');
  if(observerTarget){let timer=null;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>BHATTI.syncStudioOrders(),120)}).observe(observerTarget,{childList:true,subtree:true});}
}
