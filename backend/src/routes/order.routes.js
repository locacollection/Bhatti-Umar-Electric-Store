import {Router} from 'express';
import {requireAuth} from '../middleware/auth.js';
import {supabase} from '../config/supabase.js';
const router=Router();

router.post('/',requireAuth,async(req,res,next)=>{try{
  const b=req.body||{}, items=Array.isArray(b.items)?b.items.slice(0,50):[];
  if(!items.length) return res.status(400).json({error:'Your cart is empty'});
  const clean=items.map(x=>({product_id:String(x.product_id),quantity:Math.max(1,Math.min(100,Number(x.quantity)||1))}));
  const {data,error}=await supabase.rpc('create_order',{p_user_id:req.user.id,p_customer_name:String(b.customer_name||req.profile.full_name||'Customer').slice(0,120),p_customer_phone:String(b.customer_phone||req.profile.phone||'').slice(0,40),p_customer_email:String(req.user.email||b.customer_email||'').slice(0,200),p_city:String(b.city||'').slice(0,100),p_address_line:String(b.address_line||'').slice(0,500),p_payment_method:String(b.payment_method||'Cash on Delivery').slice(0,60),p_items:clean,p_note:String(b.note||'').slice(0,500)||null});
  if(error) throw error; res.status(201).json({data});
}catch(e){next(e)}});

router.get('/me',requireAuth,async(req,res,next)=>{try{
  const {data,error}=await supabase.from('orders').select('*,order_items(*)').eq('user_id',req.user.id).order('created_at',{ascending:false});
  if(error) throw error; res.json({data:data||[]});
}catch(e){next(e)}});

router.get('/:id',requireAuth,async(req,res,next)=>{try{
  const {data,error}=await supabase.from('orders').select('*,order_items(*)').eq('id',req.params.id).eq('user_id',req.user.id).single();
  if(error) throw error; res.json({data});
}catch(e){next(e)}});

export default router;
