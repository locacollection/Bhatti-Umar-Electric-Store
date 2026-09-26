import {Router} from 'express';
import {requireAuth,requireAdmin} from '../middleware/auth.js';
import {supabase} from '../config/supabase.js';
const router=Router(); router.use(requireAuth,requireAdmin);

router.get('/summary',async(req,res,next)=>{try{
 const [{count:orders},{count:customers},{count:products},{count:reviews}]=await Promise.all([
  supabase.from('orders').select('*',{count:'exact',head:true}).neq('status','Cancelled'),
  supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','customer'),
  supabase.from('products').select('*',{count:'exact',head:true}),
  supabase.from('reviews').select('*',{count:'exact',head:true}).eq('status','pending')
 ]); res.json({data:{orders:orders||0,customers:customers||0,products:products||0,pending_reviews:reviews||0}});
}catch(e){next(e)}});

router.get('/orders',async(req,res,next)=>{try{const {data,error}=await supabase.from('orders').select('*,order_items(*)').order('created_at',{ascending:false});if(error)throw error;res.json({data:data||[]})}catch(e){next(e)}});

router.patch('/orders/:id',async(req,res,next)=>{try{
 const allowed=['Pending','Confirmed','Processing','Packed','Shipped','Out for Delivery','Delivered','Return Requested','Returned','Cancelled'];
 const pay=['Unpaid','Payment Pending','Partially Paid','Paid','Refund Pending','Failed','Refunded'];
 const patch={};
 if(allowed.includes(req.body.status))patch.status=req.body.status;
 if(pay.includes(req.body.payment_status))patch.payment_status=req.body.payment_status;
 if(req.body.internal_note!==undefined)patch.internal_note=String(req.body.internal_note).slice(0,500);
 if(patch.status==='Cancelled'){patch.cancelled_by=['Customer','Admin','System'].includes(req.body.cancelled_by)?req.body.cancelled_by:'Admin';patch.cancel_reason=String(req.body.cancel_reason||'Other').slice(0,120)}
 patch.updated_at=new Date().toISOString();
 const {data,error}=await supabase.from('orders').update(patch).eq('id',req.params.id).select('*').single();if(error)throw error;
 await supabase.from('audit_log').insert({actor_user_id:req.user.id,action:'order_updated',entity_type:'order',entity_id:data.id,metadata:patch});
 res.json({data});
}catch(e){next(e)}});

router.get('/customers',async(req,res,next)=>{try{const {data,error}=await supabase.from('profiles').select('id,full_name,phone,role,created_at').eq('role','customer').order('created_at',{ascending:false});if(error)throw error;res.json({data:data||[]})}catch(e){next(e)}});

router.get('/reviews',async(req,res,next)=>{try{const {data,error}=await supabase.from('reviews').select('*,profiles(full_name,email:id),products(name,sku)').order('created_at',{ascending:false});if(error)throw error;res.json({data:data||[]})}catch(e){next(e)}});

router.patch('/reviews/:id',async(req,res,next)=>{try{const status=['pending','approved','rejected'].includes(req.body.status)?req.body.status:'pending';const {data,error}=await supabase.from('reviews').update({status,updated_at:new Date().toISOString()}).eq('id',req.params.id).select('*').single();if(error)throw error;res.json({data})}catch(e){next(e)}});

router.get('/products',async(req,res,next)=>{try{const {data,error}=await supabase.from('products').select('*,inventory(quantity,reorder_level)').order('created_at',{ascending:false});if(error)throw error;res.json({data:data||[]})}catch(e){next(e)}});

router.post('/products',async(req,res,next)=>{try{const b=req.body;const {data,error}=await supabase.from('products').insert({name:String(b.name||'').slice(0,160),category:String(b.category||'').slice(0,80),price:Number(b.price)||0,description:String(b.description||'').slice(0,1000),sku:String(b.sku||'').slice(0,80)||null,image_url:String(b.image_url||'').slice(0,1000)||null,active:b.active!==false}).select('*').single();if(error)throw error;await supabase.from('inventory').insert({product_id:data.id,quantity:Math.max(0,Number(b.quantity)||0),reorder_level:Math.max(0,Number(b.reorder_level)||5)});res.status(201).json({data})}catch(e){next(e)}});

router.patch('/products/:id',async(req,res,next)=>{try{const b=req.body;const patch={};for(const k of ['name','category','description','sku','image_url'])if(b[k]!==undefined)patch[k]=String(b[k]).slice(0,k==='description'?1000:160);if(b.price!==undefined)patch.price=Math.max(0,Number(b.price)||0);if(b.active!==undefined)patch.active=Boolean(b.active);patch.updated_at=new Date().toISOString();const {data,error}=await supabase.from('products').update(patch).eq('id',req.params.id).select('*').single();if(error)throw error;if(b.quantity!==undefined||b.reorder_level!==undefined){const row={};if(b.quantity!==undefined)row.quantity=Math.max(0,Number(b.quantity)||0);if(b.reorder_level!==undefined)row.reorder_level=Math.max(0,Number(b.reorder_level)||0);row.updated_at=new Date().toISOString();await supabase.from('inventory').upsert({product_id:req.params.id,...row},{onConflict:'product_id'})}res.json({data})}catch(e){next(e)}});

router.delete('/products/:id',async(req,res,next)=>{try{const {error}=await supabase.from('products').update({active:false,updated_at:new Date().toISOString()}).eq('id',req.params.id);if(error)throw error;res.status(204).end()}catch(e){next(e)}});

export default router;