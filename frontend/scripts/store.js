window.BHATTI=window.BHATTI||{};

BHATTI.filter='All';
BHATTI.inventory=BHATTI.inventory||{};
BHATTI.getStock=function(id){return Math.max(0,Number(BHATTI.inventory[String(id)]??0));};
BHATTI.isOutOfStock=function(id){return BHATTI.getStock(id)<=0;};
BHATTI.money=n=>'PKR '+Number(n||0).toLocaleString('en-PK');
BHATTI.normalizeProduct=function(p){
  return {
    ...p,
    id:p.id,
    name:String(p.name||''),
    cat:String(p.category||''),
    category:String(p.category||''),
    price:Number(p.price||0),
    old:p.old_price!=null?Number(p.old_price):(p.compare_at_price!=null?Number(p.compare_at_price):null),
    new:Boolean(p.is_new||p.new_arrival||false),
    description:String(p.description||''),
    specs:(p.specs&&typeof p.specs==='object'&&!Array.isArray(p.specs))?p.specs:{},
    image:String(p.image_url||p.image||'')
  };
};
BHATTI.esc=BHATTI.escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
BHATTI.safeImage=value=>{
  if(!value||typeof value!=='string')return'assets/product-placeholder.svg';
  const trimmed=value.trim();
  if(trimmed.startsWith('assets/')||trimmed.startsWith('/assets/')||trimmed.startsWith('src/assets/'))return trimmed;
  try{
    const url=new URL(trimmed);
    if(url.protocol==='https:')return url.href;
  }catch{}
  return'assets/product-placeholder.svg';
};
BHATTI.catalogueThumb=function(product){
  const name=String(product?.name||'').toLowerCase();
  const category=String(product?.category||product?.cat||'').toLowerCase();
  if(/pvc|conduit|junction|elbow|tee/.test(name)||category.includes('conduit')||category.includes('pvc'))return'assets/catalogue/pvc.svg';
  if(/fan|regulator/.test(name)||category.includes('fan'))return'assets/catalogue/fans.svg';
  if(/mcb|rccb|rcbo|breaker|distribution board|db\b/.test(name)||category.includes('protection')||category.includes('circuit'))return'assets/catalogue/protection.svg';
  if(/switch|socket|plug|plate/.test(name)||category.includes('switch'))return'assets/catalogue/switches.svg';
  if(/wire|cable|conductor/.test(name)||category.includes('wire'))return'assets/catalogue/wiring.svg';
  return'assets/catalogue/lighting.svg';
};

BHATTI.productCard=function(p){
  const escape=BHATTI.escape,id=String(p.id),discount=p.old&&p.old>p.price?Math.round((p.old-p.price)/p.old*100):0,admin=BHATTI.profile?.role==='admin'&&!BHATTI.previewMode,adminPreview=BHATTI.previewMode&&['admin','super_admin'].includes(BHATTI.profile?.role);
  return `<article class="product" data-description="${escape(p.description||'')}">
    <div class="pic">
      <button class="product-image-button" type="button" onclick="openProduct('${id}')" aria-label="View ${escape(p.name)} details">
        <img loading="lazy" src="${escape(BHATTI.safeImage(p.image))}" alt="${escape(p.name)}" onerror="this.onerror=null;this.src='assets/product-placeholder.svg'">
      </button>
      <div class="product-badges">${p.new?'<span class="badge new-badge">New arrival</span>':''}${discount>0?`<span class="badge sale-badge">SAVE ${discount}%</span>`:''}</div>
      ${admin||adminPreview?`<button class="heart admin-edit-product" type="button" aria-label="Edit ${escape(p.name)}" onclick="openAdminProductEditor('${id}')">✎</button>`:`<button class="heart" type="button" aria-label="Add ${escape(p.name)} to bag" data-add-product="${escape(id)}">＋</button>`}
      <button class="quick-view" type="button" onclick="openProduct('${id}')">Quick view</button>
    </div>
    <div class="product-info">
      <div class="category-row"><span class="category">${escape(p.cat||'BHATTI edit')}</span><span class="delivery-pill">Trade delivery</span></div>
      <button class="product-title-button" type="button" onclick="openProduct('${id}')"><h3>${escape(p.name)}</h3></button>
      <div class="price">${BHATTI.money(p.price)}${p.old&&p.old>p.price?`<span class="old">${BHATTI.money(p.old)}</span>`:''}</div>
      ${admin||adminPreview?`<button class="add admin-edit-product" type="button" onclick="openAdminProductEditor('${id}')"><span aria-hidden="true">✎</span> Edit in Live Catalogue</button>`:`<button class="add" type="button" data-add-product="${escape(id)}"><span aria-hidden="true">＋</span> Add to bag</button>`}
    </div>
  </article>`;
};

BHATTI.matchesFilter=function(p){
  const category=String(p.cat||p.category||'').trim().toLowerCase();
  const name=String(p.name||'').trim().toLowerCase();
  const filter=String(BHATTI.filter||'All').trim();
  const normalized=filter.toLowerCase();
  if(filter==='All')return true;
  if(filter==='Sale')return Boolean(p.old&&p.old>p.price);
  if(normalized==='circuit protection'||normalized==='protection'){
    return category.includes('protection')||category.includes('circuit')||/\\b(mcb|mccb|rccb|rcbo|breaker|distribution board|db)\\b/.test(name);
  }
  if(normalized==='wiring'||normalized==='wires & cables'||normalized==='wires and cables'){
    return category.includes('wiring')||category.includes('wire')||category.includes('cable')||/\\b(wire|cable|conductor)\\b/.test(name);
  }
  if(normalized==='conduit & pvc'){
    return category.includes('conduit')||category.includes('pvc')||/\\b(pvc|conduit|junction|elbow|tee)\\b/.test(name);
  }
  if(normalized==='switches & sockets'){
    return category.includes('switch')||category.includes('socket')||/\\b(switch|socket|plug|plate)\\b/.test(name);
  }
  if(normalized==='fans'){
    return category.includes('fan')||/\\b(fan|regulator|exhaust)\\b/.test(name);
  }
  if(category===normalized)return true;
  return category.includes(normalized);
};

async function loadProducts(){
  const withTimeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' timed out')),ms))]);
  try{
    const {data,error}=await withTimeout(
      BHATTI.db.from('products').select('id,category_id,name,category,price,description,specs,sku,image_url,active,created_at,updated_at').eq('active',true).order('created_at',{ascending:false}),
      10000,'Catalogue request'
    );
    if(error)throw error;
    BHATTI.products=(data||[]).map(BHATTI.normalizeProduct);
  }catch(error){
    BHATTI.products=[];
    console.warn('Production catalogue load failed:',error.message);
  }

  // Inventory is optional enrichment. Never block the catalogue on it.
  BHATTI.inventory={};
  BHATTI.db.from('inventory').select('product_id,quantity').then(({data,error})=>{
    if(error){console.warn('Inventory enrichment unavailable:',error.message);return;}
    BHATTI.inventory=Object.fromEntries((data||[]).map(row=>[String(row.product_id),Math.max(0,Number(row.quantity)||0)]));
  }).catch(error=>console.warn('Inventory enrichment unavailable:',error.message));

  try{
    initStoreUI();
  }catch(error){
    console.error('Catalogue UI rendering failed:',error);
    const products=BHATTI.products||[];
    const cards=products.slice(0,12).map(BHATTI.productCard).join('');
    const best=document.getElementById('bestGrid');
    const grid=document.getElementById('grid');
    if(best)best.innerHTML=cards||'<p class="catalog-empty">No active products are available.</p>';
    if(grid)grid.innerHTML=cards||'<div class="search-empty"><h3>No active products are available.</h3><p>The catalogue connection is working, but no products could be rendered.</p></div>';
  }
  if(window.drawCart)drawCart();
}

function render(){
  const query=(document.getElementById('productSearch')?.value||'').trim().toLowerCase();
  let list=(BHATTI.products||[]).filter(BHATTI.matchesFilter).filter(p=>!query||`${p.name} ${p.cat} ${p.description||''}`.toLowerCase().includes(query));
  const sort=document.getElementById('sort')?.value||'featured';
  if(sort==='low')list=[...list].sort((a,b)=>a.price-b.price);
  if(sort==='high')list=[...list].sort((a,b)=>b.price-a.price);
  const grid=document.getElementById('grid'),count=document.getElementById('count');
  if(grid)grid.innerHTML=list.length?list.map(BHATTI.productCard).join(''):'<div class="search-empty"><h3>No matches just yet.</h3><p>Try another search or choose a different category.</p></div>';
  if(count)count.textContent=`${list.length} product${list.length===1?'':'s'}${BHATTI.filter==='All'?'':` · ${BHATTI.filter}`}`;
}

function featuredProducts(){
  const products=BHATTI.products||[],ordered=[
    ...products.filter(p=>p.old&&p.old>p.price),
    ...products.filter(p=>p.new),
    ...products
  ];
  return ordered.filter((product,index,list)=>list.findIndex(item=>String(item.id)===String(product.id))===index).slice(0,4);
}

function bindProductActions(){
  if(BHATTI.productActionsBound)return;
  BHATTI.productActionsBound=true;
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-add-product]');
    if(!button)return;
    event.preventDefault();
    const id=button.getAttribute('data-add-product');
    if(!id)return;
    if(typeof window.addQuantity!=='function'){
      BHATTI.notice?.({eyebrow:'Your bag',title:'Bag is still loading.',message:'Please try again in a moment.',tone:'error',action:'Close'});
      return;
    }
    const original=button.innerHTML;
    button.disabled=true;
    button.innerHTML='Adding…';
    try{await window.addQuantity(id,1,{open:true});}
    catch(error){BHATTI.notice?.({eyebrow:'Your bag',title:'This piece was not added.',message:error?.message||'Please try again.',tone:'error',action:'Close'});}
    finally{button.disabled=false;button.innerHTML=original;}
  });
}

function initStoreUI(){
  bindProductActions();
  const filters=document.getElementById('filters');
  if(filters){
    const fallback=[
      {id:'All',label:'All products',subcategories:[]},
      {id:'Lighting',label:'Lighting',subcategories:[]},
      {id:'Wiring',label:'Wiring',subcategories:[]},
      {id:'Wires & Cables',label:'Wires & Cables',subcategories:[]},
      {id:'Conduit & PVC',label:'Conduit & PVC',subcategories:[]},
      {id:'Switches & Sockets',label:'Switches & Sockets',subcategories:[]},
      {id:'Circuit Protection',label:'Circuit Protection',subcategories:[]},
      {id:'Protection',label:'Protection',subcategories:[]},
      {id:'Fans',label:'Fans',subcategories:[]},
      {id:'Sale',label:'Sale',subcategories:[]}
    ];
    const configured=Array.isArray(window.BHATTI.CATEGORY_TAXONOMY)&&window.BHATTI.CATEGORY_TAXONOMY.length?window.BHATTI.CATEGORY_TAXONOMY:fallback;
    const taxonomy=configured.some(item=>item.id==='Sale')?configured:[...configured,{id:'Sale',label:'Sale',subcategories:[]}];
    const activeMain=BHATTI.filter.includes(' - ')?BHATTI.filter.split(' - ')[0].trim():BHATTI.filter;
    const current=taxonomy.find(item=>item.id===activeMain);
    const available=taxonomy.filter(item=>item.id!=='All');
    let html='<div class="filter-console">';
    html+='<div class="filter-console-head"><div><span class="filter-kicker">CATALOGUE FILTER</span><strong>Find the right electricals.</strong><small>Filter the live catalogue without leaving the page.</small></div><button type="button" class="filter-reset '+(BHATTI.filter==='All'?'active':'')+'" onclick="setFilter(\'All\')">Reset <span>↺</span></button></div>';
    html+='<div class="filter-control-row">';
    html+='<div class="filter-control-label"><span>SYSTEM</span><b>Choose a range</b></div>';
    html+='<div class="filter-tabs"><button type="button" class="filter-tab '+(BHATTI.filter==='All'?'active':'')+'" onclick="setFilter(\'All\')">All products</button>';
    html+=available.map(item=>'<button type="button" class="filter-tab '+(BHATTI.filter===item.id||activeMain===item.id?'active':'')+'" data-category="'+BHATTI.escape(item.id)+'" onclick="setFilter(this.dataset.category)">'+BHATTI.escape(item.label||item.id)+'</button>').join('');
    html+='</div></div>';
    if(current&&current.subcategories?.length){
      html+='<div class="filter-subrow"><span>SUB-RANGE</span><div class="filter-tabs sub-tabs"><button type="button" class="filter-tab '+(BHATTI.filter===activeMain?'active':'')+'" data-category="'+BHATTI.escape(activeMain)+'" onclick="setFilter(this.dataset.category)">All '+BHATTI.escape(current.label||current.id)+'</button>';
      html+=current.subcategories.map(sub=>'<button type="button" class="filter-tab '+(BHATTI.filter===sub.id?'active':'')+'" data-category="'+BHATTI.escape(sub.id)+'" onclick="setFilter(this.dataset.category)">'+BHATTI.escape(sub.label)+'</button>').join('');
      html+='</div></div>';
    }
    html+='</div>';
    filters.innerHTML=html;
  }
  const newGrid=document.getElementById('newGrid');
  if(newGrid)newGrid.innerHTML=BHATTI.products.filter(p=>p.new).slice(0,4).map(BHATTI.productCard).join('')||'<p class="catalog-empty">New arrivals are on their way. Explore the full collection.</p>';
  const bestGrid=document.getElementById('bestGrid');
  if(bestGrid)bestGrid.innerHTML=featuredProducts().map(BHATTI.productCard).join('')||'<p class="catalog-empty">The live edit is being prepared.</p>';
  render();
  window.loadApprovedReviews?.();
  if(window.reveal)reveal();
}

function setFilter(category){BHATTI.filter=category;initStoreUI();}
function setFilterFromLink(category){
  setTimeout(()=>{
    BHATTI.filter=category;
    initStoreUI();
    document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
  },50);
}
function showSale(){setFilterFromLink('Sale');}
function searchProducts(){
  document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
  setTimeout(()=>document.getElementById('productSearch')?.focus({preventScroll:true}),450);
}

window.loadProducts=loadProducts;
window.render=render;
window.setFilter=setFilter;
window.setFilterFromLink=setFilterFromLink;
window.showSale=showSale;
window.searchProducts=searchProducts;


async function startCatalogue(){
  if(BHATTI.cataloguePromise)return BHATTI.cataloguePromise;
  BHATTI.cataloguePromise=loadProducts().catch(error=>{
    console.error('BHATTI catalogue startup failed:',error);
    const best=document.getElementById('bestGrid');
    const grid=document.getElementById('grid');
    const message='<div class="search-empty"><h3>Catalogue temporarily unavailable.</h3><p>Please refresh once. The storefront connection is still available.</p></div>';
    if(best&&best.textContent.includes('Loading'))best.innerHTML=message;
    if(grid&&!grid.innerHTML.trim())grid.innerHTML=message;
  });
  return BHATTI.cataloguePromise;
}
window.startCatalogue=startCatalogue;
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>startCatalogue(),{once:true});
}else{
  startCatalogue();
}
