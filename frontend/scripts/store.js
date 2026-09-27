window.BHATTI=window.BHATTI||{};

BHATTI.filter='All';
BHATTI.inventory=BHATTI.inventory||{};
BHATTI.getStock=function(id){return Math.max(0,Number(BHATTI.inventory[String(id)]??0));};
BHATTI.isOutOfStock=function(id){return BHATTI.getStock(id)<=0;};
BHATTI.money=n=>'PKR '+Number(n||0).toLocaleString('en-PK');
BHATTI.normalizeProduct=function(p){
  return {...p,id:p.id,name:p.name||'',cat:p.category||'',category:p.category||'',price:Number(p.price||0),old:p.old_price!=null?Number(p.old_price):null,new:!!p.is_new,description:p.description||'',image:p.image_url||''};
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

BHATTI.productCard=function(p){
  const escape=BHATTI.escape,id=String(p.id),discount=p.old&&p.old>p.price?Math.round((p.old-p.price)/p.old*100):0,admin=BHATTI.profile?.role==='admin';
  return `<article class="product" data-description="${escape(p.description||'')}">
    <div class="pic">
      <button class="product-image-button" type="button" onclick="openProduct('${id}')" aria-label="View ${escape(p.name)} details">
        <img loading="lazy" src="${escape(BHATTI.safeImage(p.image))}" alt="${escape(p.name)}" onerror="this.onerror=null;this.src='assets/product-placeholder.svg'">
      </button>
      <div class="product-badges">${p.new?'<span class="badge new-badge">New arrival</span>':''}${discount>0?`<span class="badge sale-badge">SAVE ${discount}%</span>`:''}</div>
      ${admin?`<button class="heart admin-edit-product" type="button" aria-label="Edit ${escape(p.name)}" onclick="openAdminProductEditor('${id}')">✎</button>`:`<button class="heart" type="button" aria-label="Add ${escape(p.name)} to bag" data-add-product="${escape(id)}">＋</button>`}
      <button class="quick-view" type="button" onclick="openProduct('${id}')">Quick view</button>
    </div>
    <div class="product-info">
      <div class="category-row"><span class="category">${escape(p.cat||'BHATTI edit')}</span><span class="delivery-pill">Trade delivery</span></div>
      <button class="product-title-button" type="button" onclick="openProduct('${id}')"><h3>${escape(p.name)}</h3></button>
      <div class="price">${BHATTI.money(p.price)}${p.old&&p.old>p.price?`<span class="old">${BHATTI.money(p.old)}</span>`:''}</div>
      ${admin?`<button class="add admin-edit-product" type="button" onclick="openAdminProductEditor('${id}')"><span aria-hidden="true">✎</span> Edit in Admin Studio</button>`:`<button class="add" type="button" data-add-product="${escape(id)}"><span aria-hidden="true">＋</span> Add to bag</button>`}
    </div>
  </article>`;
};

BHATTI.matchesFilter=function(p){
  const category=(p.cat||'').toLowerCase(),filter=BHATTI.filter;
  if(filter==='All')return true;
  if(filter==='Sale')return Boolean(p.old&&p.old>p.price);
  if(category===filter.toLowerCase())return true;
  if(filter.includes(' - ')){
    const subcategory=filter.split(' - ')[1].trim().toLowerCase();
    return category.includes(subcategory)||p.name.toLowerCase().includes(subcategory);
  }
  if(filter==='Women')return category.includes('women')||category.includes('woman')||category.includes('ladies');
  if(filter==='Men')return !category.includes('women')&&/\b(men|man|mens|male)\b/.test(category);
  if(filter==='Footwear')return/footwear|shoe|chappal|khussa|sandal|slide|peshawari|loafer|heel/.test(category);
  if(filter==='Accessories')return/accessor|bag|jewell|jewelry|scarf|stole|wallet|belt|cap|clutch|watch/.test(category);
  if(filter==='Fragrance')return/fragrance|perfume|attar|oudh|mist|scent/.test(category);
  if(filter==='Kids')return/kid|teen|boy|girl|child/.test(category);
  return category.includes(filter.toLowerCase());
};

async function loadProducts(){
  try{
    const[{data,error},{data:inventory,error:inventoryError}]=await Promise.all([
      BHATTI.db.from('products').select('*').eq('active',true).order('id'),
      BHATTI.db.from('inventory').select('product_id,quantity')
    ]);
    if(inventoryError)throw inventoryError;
    if(error)throw error;
    BHATTI.products=(data||[]).map(BHATTI.normalizeProduct);
    BHATTI.inventory=Object.fromEntries((inventory||[]).map(row=>[String(row.product_id),Math.max(0,Number(row.quantity)||0)]));
    initStoreUI();
  }catch(error){
    BHATTI.products=[];
    initStoreUI();
    console.warn('Production catalogue load failed:',error.message);
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
    const configured=window.BHATTI.CATEGORY_TAXONOMY||[{id:'All',label:'All',subcategories:[]},{id:'Lighting',label:'Lighting',subcategories:[]},{id:'Wiring',label:'Wiring',subcategories:[]},{id:'Wires & Cables',label:'Wires & Cables',subcategories:[]},{id:'Conduit & PVC',label:'Conduit & PVC',subcategories:[]},{id:'Switches & Sockets',label:'Switches & Sockets',subcategories:[]},{id:'Circuit Protection',label:'Circuit Protection',subcategories:[]},{id:'Protection',label:'Protection',subcategories:[]},{id:'Fans',label:'Fans',subcategories:[]}];
    const taxonomy=configured.some(item=>item.id==='Sale')?configured:[...configured,{id:'Sale',label:'Sale',subcategories:[]}];
    let activeMain='All';
    if(BHATTI.filter!=='All')activeMain=BHATTI.filter.includes(' - ')?BHATTI.filter.split(' - ')[0].trim():BHATTI.filter;
    const current=taxonomy.find(item=>item.id===activeMain),hasSubcategories=current&&current.subcategories?.length;
    let html='<div class="main-filters">'+taxonomy.map(item=>`<button type="button" class="filter ${item.id===activeMain?'active':''}" data-category="${BHATTI.escape(item.id)}" onclick="setFilter(this.dataset.category)">${BHATTI.escape(item.label||item.id)}</button>`).join('')+'</div>';
    if(hasSubcategories){
      html+='<div class="sub-filters"><span class="sub-filter-label">Explore '+BHATTI.escape(current.label||current.id)+':</span><button class="sub-chip '+(BHATTI.filter===activeMain?'active':'')+'" data-category="'+BHATTI.escape(activeMain)+'" onclick="setFilter(this.dataset.category)">All '+BHATTI.escape(current.label||current.id)+'</button>'+current.subcategories.map(sub=>`<button class="sub-chip ${BHATTI.filter===sub.id?'active':''}" data-category="${BHATTI.escape(sub.id)}" onclick="setFilter(this.dataset.category)">${BHATTI.escape(sub.label)}</button>`).join('')+'</div>';
    }
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
