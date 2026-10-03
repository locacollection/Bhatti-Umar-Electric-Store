(()=>{
  // Compatibility layer: the archive-delete RPC was failing in the live client.
  // Use the secured admin DELETE policy for archived orders instead, while keeping
  // the existing RPC API surface unchanged for the rest of the Studio.
  try{
    const client=window.BHATTI?.db||window.db;
    if(client?.rpc && !client.__bhattiArchiveDeleteCompat){
      const originalRpc=client.rpc.bind(client);
      client.rpc=async function(fn,args){
        if(fn==='admin_permanently_delete_archived_order' && args?.p_archive_id){
          const id=String(args.p_archive_id);
          const {data,error}=await client.from('orders').delete().eq('id',id).not('archived_at','is',null).select('*').maybeSingle();
          if(error) return {data:null,error};
          if(!data) return {data:null,error:{message:'Archived order was not deleted. It may already have been removed or is not archived.'}};
          return {data,error:null};
        }
        return originalRpc(fn,args);
      };
      client.__bhattiArchiveDeleteCompat=true;
    }
  }catch(error){console.warn('Archive delete compatibility layer could not initialize:',error)}
  const $=id=>document.getElementById(id);
  const clean=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let archivedOrders=[];
  function archivedItems(record){return Array.isArray(record?.items)?record.items:[]}
  function archivedActions(record){return Array.isArray(record?.customer_actions)?record.customer_actions:[]}
  function archiveSearchText(record){return [record.order_number,record.customer_name,record.customer_email,record.customer_phone,record.customer_city,record.status,record.payment_status,record.archive_reason].join(' ').toLowerCase()}
  function renderArchivedOrders(){
    const query=($('archiveSearch')?.value||'').trim().toLowerCase();
    const list=archivedOrders.filter(record=>archiveSearchText(record).includes(query));
    if($('archiveCount'))$('archiveCount').textContent=`${list.length} shown · ${archivedOrders.length} archived`;
    if($('sideArchiveCount'))$('sideArchiveCount').textContent=archivedOrders.length;
    if(!$('archiveBody'))return;
    $('archiveBody').innerHTML=list.length?list.map(record=>{
      const itemCount=archivedItems(record).reduce((sum,item)=>sum+Number(item.quantity||item.qty||0),0);
      return `<article class="archive-card"><div class="archive-card-top"><div><p class="kicker">Archived order</p><h3>${clean(record.order_number||record.original_order_id)}</h3><span>${new Date(record.archived_at).toLocaleString('en-PK')}</span></div><div class="archive-workflow">${orderStatusBadge(record.status)}${paymentStatusBadge(record.payment_status)}</div></div><div class="archive-facts"><div><span>Customer</span><strong>${clean(record.customer_name||'Unnamed customer')}</strong><small>${clean(record.customer_email||'No email')}</small></div><div><span>Order</span><strong>${itemCount} item${itemCount===1?'':'s'}</strong><small>${new Date(record.ordered_at||record.archived_at).toLocaleDateString('en-PK')}</small></div><div><span>Value</span><strong>${money(record.total)}</strong><small>${clean(record.payment_method||'Payment not recorded')}</small></div></div>${record.archive_reason?`<p class="archive-note"><b>Archive note</b>${clean(record.archive_reason)}</p>`:''}<div class="archive-actions"><button class="smallbtn" type="button" data-inspect-archive="${clean(record.id)}">Inspect snapshot</button><button class="smallbtn danger" type="button" data-delete-archive="${clean(record.id)}">Delete permanently</button></div></article>`;
    }).join(''):'<div class="archive-empty"><div>◇</div><h3>The Order Archive is empty.</h3><p>Orders removed from the live workflow will appear here with their customer, items and activity snapshot.</p></div>';
  }
  function ensureBulkArchiveControls(){
    const head=document.querySelector('#archiveSection .section-head .toolbar-actions');
    if(!head||head.querySelector('[data-select-all-archive]'))return;
    const selectAll=document.createElement('button');selectAll.className='btn alt';selectAll.type='button';selectAll.textContent='Select all';selectAll.dataset.selectAllArchive='';
    head.append(selectAll);
  }
  async function bulkDeleteArchived(ids){
    if(!ids.length)return;
    const approved=await confirmAction({eyebrow:'Permanent deletion',title:`Delete ${ids.length} archived order${ids.length===1?'':'s'}?`,message:'These archive records will be permanently erased and cannot be recovered.',confirmLabel:'Delete forever'});if(!approved)return;
    try{if(!await isCurrentUserAdmin())throw new Error('Your admin session has expired.');for(const id of ids){const{error}=await db.rpc('admin_permanently_delete_archived_order',{p_archive_id:id});if(error)throw error}archivedOrders=archivedOrders.filter(record=>!ids.includes(String(record.id)));renderArchivedOrders();await BHATTI.syncStudioOrders?.();adminNotify(`${ids.length} archived order${ids.length===1?'':'s'} deleted.`,{title:'Archive updated'})}catch(error){adminNotify(error.message||'Selected archive records could not be deleted.',{title:'Bulk deletion failed',tone:'error'})}
  }
  async function loadArchivedOrders({quiet=false}={}){
    if(!$('archiveBody'))return;
    if(!quiet)$('archiveBody').innerHTML='<div class="archive-empty"><p>Loading archived orders…</p></div>';
    const{data,error}=await db.from('orders').select('*').not('archived_at','is',null).order('archived_at',{ascending:false});
    if(error){archivedOrders=[];$('archiveBody').innerHTML=`<div class="archive-empty is-error"><h3>Archive unavailable.</h3><p>${clean(error.message)}</p></div>`;if(!quiet)adminNotify(error.message||'The Order Archive could not be loaded.',{title:'Archive unavailable',tone:'error'});return;}
    const ordersList=data||[],ids=ordersList.map(order=>order.id);let itemRows=[],auditRows=[];
    if(ids.length){const [itemsResult,auditResult]=await Promise.all([db.from('order_items').select('*').in('order_id',ids),db.from('audit_log').select('*').eq('entity_type','order').in('entity_id',ids).order('created_at',{ascending:false})]);if(itemsResult.error)throw itemsResult.error;if(auditResult.error)throw auditResult.error;itemRows=itemsResult.data||[];auditRows=auditResult.data||[];}
    archivedOrders=ordersList.map(order=>({...order,original_order_id:order.id,customer_city:order.city,customer_address:order.address_line,ordered_at:order.created_at,archive_reason:order.internal_note,items:itemRows.filter(item=>String(item.order_id)===String(order.id)),customer_actions:auditRows.filter(item=>String(item.entity_id)===String(order.id))}));
    renderArchivedOrders();
  }
  function closeArchiveDialog(){const dialog=$('archiveOrderDialog');if(dialog?.open)dialog.close()}
  function openArchiveOrder(orderId){const order=(orders||[]).find(entry=>String(entry.id)===String(orderId));if(!order)return;const record=typeof customer==='function'?customer(order):{};const count=(typeof items==='function'?items(order):[]).reduce((sum,item)=>sum+Number(item.quantity||item.qty||0),0);$('archiveOrderId').value=order.id;$('archiveOrderTitle').textContent=order.order_number||order.id;$('archiveOrderIntro').textContent=`${typeof customerName==='function'?customerName(record):(record.name||'Customer')} · ${money(order.total)}`;$('archiveOrderSummary').innerHTML=`<div><span>Customer</span><strong>${clean(typeof customerName==='function'?customerName(record):(record.name||'Customer'))}</strong><small>${clean(record.email||record.phone||'Contact details retained in snapshot')}</small></div><div><span>Order contents</span><strong>${count} item${count===1?'':'s'}</strong><small>${clean(order.status||'Pending')} · ${clean(order.payment_status||'Unpaid')}</small></div>`;$('archiveReason').value='';$('archiveMessage').textContent='';$('archiveMessage').className='';$('modal')?.classList.remove('open');closeOrderWorkflow?.();$('archiveOrderDialog').showModal();setTimeout(()=>$('archiveReason')?.focus(),40)}
  async function submitArchiveOrder(event){event.preventDefault();const id=$('archiveOrderId').value,reason=$('archiveReason').value.trim()||null,button=$('confirmArchiveOrder');button.disabled=true;button.textContent='Archiving…';$('archiveMessage').textContent='Moving order to the archive…';try{if(!await isCurrentUserAdmin())throw new Error('Your admin session has expired.');const{data,error}=await db.rpc('admin_archive_order',{p_order_id:id,p_reason:reason});if(error)throw error;const record=Array.isArray(data)?data[0]:data;closeArchiveDialog();await load();await loadArchivedOrders({quiet:true});await BHATTI.syncStudioOrders?.();adminNotify(`${record?.order_number||'Order'} was moved out of the live workflow.`,{title:'Order archived'})}catch(error){$('archiveMessage').textContent=error.message||'The order could not be archived.';$('archiveMessage').className='error';adminNotify($('archiveMessage').textContent,{title:'Archive failed',tone:'error',duration:6000})}finally{button.disabled=false;button.textContent='Move to Order Archive'}}
  function viewArchivedOrder(id){const record=archivedOrders.find(entry=>String(entry.id)===String(id));if(!record)return;const itemsHtml=archivedItems(record).map(item=>`<div class="item"><span>${clean(item.product_name||item.name||'Product')} × ${Number(item.quantity||item.qty||0)}</span><b>${money(Number(item.price||item.unit_price||0)*Number(item.quantity||item.qty||0))}</b></div>`).join('')||'<p class="muted">No item snapshot was available.</p>';const actionsHtml=archivedActions(record).length?`<div class="customer-action-timeline"><p class="kicker">Customer activity snapshot</p>${archivedActions(record).map(action=>`<div class="customer-action-entry"><div><strong>${clean(action.action_type)}</strong><span>${new Date(action.created_at).toLocaleString('en-PK')}</span></div><div>${action.reason?`<b>${clean(action.reason)}</b>`:''}${action.note?`<p>${clean(action.note)}</p>`:''}</div></div>`).join('')}</div>`:'';$('modalTitle').textContent=record.order_number||record.original_order_id;$('modalBody').innerHTML=`<div class="archive-snapshot-banner"><div><p class="kicker">Order Archive</p><strong>Read-only historical snapshot</strong><span>Archived ${new Date(record.archived_at).toLocaleString('en-PK')}</span></div><button class="smallbtn danger" type="button" data-delete-archive="${clean(record.id)}">Delete permanently</button></div><div class="order-detail-workflow"><div><small>Fulfilment at archive</small>${orderStatusBadge(record.status)}</div><div><small>Payment at archive</small>${paymentStatusBadge(record.payment_status)}</div></div><div class="grid"><div class="detail"><span>Customer</span>${clean(record.customer_name||'Unnamed customer')}</div><div class="detail"><span>Phone</span>${clean(record.customer_phone||'Not provided')}</div><div class="detail"><span>Email</span>${clean(record.customer_email||'Not provided')}</div><div class="detail"><span>City</span>${clean(record.customer_city||'Not provided')}</div><div class="detail"><span>Payment method</span>${clean(record.payment_method||'Not recorded')}</div><div class="detail"><span>Original order date</span>${new Date(record.ordered_at||record.archived_at).toLocaleString('en-PK')}</div><div class="detail" style="grid-column:1/-1"><span>Delivery address</span>${clean(record.customer_address||'Not provided')}</div>${record.archive_reason?`<div class="detail" style="grid-column:1/-1"><span>Archive note</span>${clean(record.archive_reason)}</div>`:''}</div>${actionsHtml}<div class="order-line-items">${itemsHtml}</div><div class="total"><span>Archived order total</span><b>${money(record.total)}</b></div>`;$('modal').classList.add('open')}
  async function permanentlyDeleteArchivedOrder(id){
    const record=archivedOrders.find(entry=>String(entry.id)===String(id));if(!record)return;
    const approved=await confirmAction({eyebrow:'Permanent deletion',title:'Delete archived order?',message:`${record.order_number||'This order'} will be permanently erased. This cannot be undone.`,confirmLabel:'Delete forever'});if(!approved)return;
    try{if(!await isCurrentUserAdmin())throw new Error('Your admin session has expired.');const{error}=await db.rpc('admin_permanently_delete_archived_order',{p_archive_id:id});if(error)throw error;archivedOrders=archivedOrders.filter(entry=>String(entry.id)!==String(id));$('modal')?.classList.remove('open');document.body.classList.remove('modal-lock');renderArchivedOrders();await BHATTI.syncStudioOrders?.();adminNotify(`${record.order_number||'Order'} was permanently deleted.`,{title:'Archive updated'})}catch(error){adminNotify(error.message||'The archived order could not be deleted.',{title:'Deletion failed',tone:'error'})}
  }
  $('archiveSearch')?.addEventListener('input',renderArchivedOrders);
  $('archiveBody')?.addEventListener('click',event=>{const inspect=event.target.closest('[data-inspect-archive]');if(inspect)return viewArchivedOrder(inspect.dataset.inspectArchive);const remove=event.target.closest('[data-delete-archive]');if(remove)return permanentlyDeleteArchivedOrder(remove.dataset.deleteArchive)});
  ensureBulkArchiveControls();
  document.querySelector('#archiveSection .toolbar-actions')?.addEventListener('click',event=>{if(event.target.closest('[data-select-all-archive]')){if($('archiveBody')){$('archiveBody').querySelectorAll('.archive-card').forEach(card=>card.dataset.selected='true');adminNotify('All visible archive records selected.',{title:'Archive selection'})}}});
  $('modalBody')?.addEventListener('click',event=>{const remove=event.target.closest('[data-delete-archive]');if(remove)return permanentlyDeleteArchivedOrder(remove.dataset.deleteArchive)});
  $('archiveOrderForm')?.addEventListener('submit',submitArchiveOrder);
  $('closeArchiveOrder')?.addEventListener('click',closeArchiveDialog);
  $('cancelArchiveOrder')?.addEventListener('click',closeArchiveDialog);
  $('archiveOrderDialog')?.addEventListener('cancel',event=>{event.preventDefault();closeArchiveDialog()});
  document.querySelectorAll('.tab').forEach(button=>button.addEventListener('click',()=>{const selected=button.dataset.tab==='archive';if($('archiveSection'))$('archiveSection').style.display=selected?'block':'none';if(selected){$('pageTitle').textContent='A clean archive, when the live book needs space.';loadArchivedOrders({quiet:true})}}));
  window.openArchiveOrder=openArchiveOrder;window.loadArchivedOrders=loadArchivedOrders;window.viewArchivedOrder=viewArchivedOrder;
})();