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
   Both Admin Studio and Super Admin Studio use this shared config file, so
   archived orders are treated identically in both workspaces. */
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

    document.querySelectorAll('#ordersBody tr').forEach(row=>{
      const orderCell=row.querySelector('td:first-child');
      const key=String(orderCell?.querySelector('b')?.textContent||'').trim();
      const archivedRow=archivedIds.has(key)||archivedNumbers.has(key);
      row.hidden=archivedRow;
    });

    const visibleRows=[...document.querySelectorAll('#ordersBody tr')].filter(row=>!row.hidden && row.querySelector('td'));
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
