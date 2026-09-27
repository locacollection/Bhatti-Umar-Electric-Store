window.BHATTI=window.BHATTI||{};

let activeProduct=null;
let activeProductQuantity=1;
let approvedReviews=[];
let reviewsLoading=false;

function openProduct(id){
  const product=(BHATTI.products||[]).find(item=>String(item.id)===String(id));
  if(!product)return;
  activeProduct=product;
  activeProductQuantity=1;
  const image=document.getElementById('productModalImage');
  if(image){image.src=BHATTI.safeImage(product.image);image.alt=product.name;}
  const category=document.getElementById('productModalCategory');
  if(category)category.textContent='BHATTI ELECTRIC STORE / '+String(product.cat||product.category||'PRODUCT').toUpperCase();
  const name=document.getElementById('productModalName'); if(name)name.textContent=product.name;
  const price=document.getElementById('productModalPrice'); if(price)price.innerHTML='<strong>'+BHATTI.money(product.price)+'</strong>';
  const description=document.getElementById('productModalDescription'); if(description)description.textContent=product.description||'Electrical item available from Bhatti Electric Store.';
  const details=document.getElementById('productModalDetails');
  if(details){
    const specs=product.specs&&typeof product.specs==='object'?product.specs:{};
    const rows=Object.entries(specs).map(([key,value])=>'<div class="product-spec-row"><b>'+BHATTI.escape(String(key).replace(/_/g,' '))+'</b><span>'+BHATTI.escape(value)+'</span></div>').join('');
    details.innerHTML=(rows?'<div class="product-specs">'+rows+'</div>':'')+'<p class="product-detail-description">'+BHATTI.escape(product.description||'')+'</p>';
  }
  const quantity=document.getElementById('productModalQuantity'); if(quantity)quantity.textContent='1';
  const add=document.getElementById('productAddButton');
  if(add)add.onclick=()=>window.addQuantity?.(product.id,activeProductQuantity,{open:true});
  const buy=document.getElementById('productBuyButton');
  if(buy)buy.onclick=()=>window.addQuantity?.(product.id,activeProductQuantity,{open:true});
  document.getElementById('productModal')?.classList.add('open');
  document.body.classList.add('lock');
}
function closeProduct(){document.getElementById('productModal')?.classList.remove('open');if(!document.querySelector('.modal-layer.open,.checkout-modal.open,.bag-drawer.open,.site-notice-layer.open'))document.body.classList.remove('lock');activeProduct=null;}
function changeProductQuantity(delta){activeProductQuantity=Math.max(1,Math.min(20,activeProductQuantity+Number(delta||0)));const el=document.getElementById('productModalQuantity');if(el)el.textContent=String(activeProductQuantity);}
function initExperience(){
  document.getElementById('productReviewForm')?.addEventListener('submit',submitProductReview);
  document.getElementById('productModal')?.addEventListener('click',event=>{if(event.target.id==='productModal')closeProduct();});
  document.getElementById('infoModal')?.addEventListener('click',event=>{if(event.target.id==='infoModal')closeStoreInfo();});
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(document.getElementById('productModal')?.classList.contains('open'))closeProduct();
    if(document.getElementById('infoModal')?.classList.contains('open'))closeStoreInfo();
  });
}

window.openProduct=openProduct;
window.closeProduct=closeProduct;
window.changeProductQuantity=changeProductQuantity;
window.loadApprovedReviews=loadApprovedReviews;
window.openStoreInfo=openStoreInfo;
window.closeStoreInfo=closeStoreInfo;

import('./navbar.js?v=20260927-no-role-store-bridge-1').catch(error=>console.warn('Navbar access check could not start:',error));

document.addEventListener('DOMContentLoaded',async()=>{
  initExperience();
  const catalogueTask=window.startCatalogue?startCatalogue():loadProducts();
  try{await initAuth();}catch(error){console.error('BHATTI authentication initialization failed:',error);}
  await catalogueTask;
  const originalCheckout=window.openCheckout;
  if(originalCheckout)window.openCheckout=async()=>{
    if(BHATTI.profile?.role==='admin'){
      BHATTI.notice?.({eyebrow:'Catalogue Preview Mode',title:'Checkout is disabled for admins.',message:'Admins can inspect the storefront but cannot place orders.',action:'Continue browsing'});
      return;
    }
    return originalCheckout();
  };
});