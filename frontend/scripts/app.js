const API_BASE = window.BHATTI_API_BASE || 'http://localhost:4000';
const fallbackProducts = [
  {name:'LED Bulb 12W',category:'Lighting',price:280,description:'Energy-saving LED bulb.',image_icon:'💡'},
  {name:'Electrical Wire',category:'Wires & Cables',price:1850,description:'Reliable electrical wire.',image_icon:'〰'},
  {name:'Universal Socket',category:'Switches & Sockets',price:350,description:'Universal wall socket.',image_icon:'▣'},
  {name:'MCB Breaker',category:'Breakers',price:650,description:'Circuit protection breaker.',image_icon:'⏚'},
  {name:'Exhaust Fan',category:'Fans',price:4200,description:'Ventilation fan.',image_icon:'✣'},
  {name:'PVC Conduit',category:'PVC',price:180,description:'PVC conduit for cable routing.',image_icon:'◯'},
  {name:'Ceiling Fan',category:'Fans',price:7800,description:'Everyday ceiling fan.',image_icon:'✣'},
  {name:'LED Bulb 20W',category:'Lighting',price:420,description:'Brighter LED bulb.',image_icon:'💡'},
  {name:'Flexible Cable',category:'Wires & Cables',price:1450,description:'Flexible electrical cable.',image_icon:'〰'}
];
const categories=[['Lighting','LED bulbs & energy saving bulbs','💡'],['Wires & Cables','House wiring & cables','〰'],['Switches & Sockets','Sockets & accessories','▣'],['Breakers','MCBs & protection','⏚'],['Fans','Fans & exhaust fans','✣'],['PVC','Pipes & conduits','◯']];
let products=[...fallbackProducts];let filter='All';
const money=n=>'PKR '+Number(n||0).toLocaleString();const $=s=>document.querySelector(s);
function renderFilters(){const f=['All',...categories.map(x=>x[0])];$('#filters').innerHTML=f.map(x=>'<button class="'+(x===filter?'active':'')+'" data-filter="'+x+'">'+x+'</button>').join('');document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderFilters();renderProducts()})}
function renderCategories(){$('#categoriesGrid').innerHTML=categories.map(c=>'<button class="category" data-cat="'+c[0]+'"><span class="icon">'+c[2]+'</span><strong>'+c[0]+'</strong><small>'+c[1]+'</small></button>').join('');document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{filter=b.dataset.cat;renderFilters();renderProducts();document.querySelector('#products').scrollIntoView({behavior:'smooth'})})}
function renderProducts(){const list=products.filter(p=>filter==='All'||p.category===filter);$('#productGrid').innerHTML=list.map((p,i)=>'<article class="product"><div class="product-art">'+(p.image_icon||'⚡')+'</div><div class="product-body"><small>'+p.category+'</small><h3>'+p.name+'</h3><p>'+(p.description||'Quality electrical product. Confirm current stock and final price with the store.')+'</p><strong>'+money(p.price)+'</strong><br><button data-add="'+i+'">Add to cart</button></div></article>').join('');document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const cart=JSON.parse(localStorage.getItem('bhatti-cart')||'[]');cart.push(list[+b.dataset.add]);localStorage.setItem('bhatti-cart',JSON.stringify(cart));updateCart()})}
async function loadProducts(){try{const response=await fetch(API_BASE+'/api/products');if(!response.ok)throw new Error('API '+response.status);const body=await response.json();if(Array.isArray(body.data)&&body.data.length){products=body.data;renderProducts();}}catch(error){console.warn('Backend API unavailable; showing catalog fallback.',error)}}
function updateCart(){$('#cartCount').textContent=JSON.parse(localStorage.getItem('bhatti-cart')||'[]').length}
$('.menu').onclick=()=>document.querySelector('nav').classList.toggle('open');$('#cartButton').onclick=()=>alert('Cart is stored locally. Backend checkout will be added with the order API.');$('#year').textContent=new Date().getFullYear();renderCategories();renderFilters();renderProducts();updateCart();loadProducts();
