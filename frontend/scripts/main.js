window.BHATTI=window.BHATTI||{};

let activeProduct=null;
let activeProductQuantity=1;
let approvedReviews=[];
let reviewsLoading=false;
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
  try{
    await initAuth();
  }catch(error){
    console.error('BHATTI authentication initialization failed:',error);
  }
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