import {Router} from 'express';
import {requireAuth} from '../middleware/auth.js';
import {supabase} from '../config/supabase.js';
const router=Router();

router.get('/product/:productId',async(req,res,next)=>{try{
  const {data,error}=await supabase.from('reviews').select('id,rating,body,created_at,profiles(full_name)').eq('product_id',req.params.productId).eq('status','approved').order('created_at',{ascending:false});
  if(error) throw error; res.json({data:data||[]});
}catch(e){next(e)}});

router.post('/',requireAuth,async(req,res,next)=>{try{
  const product_id=String(req.body.product_id), order_id=String(req.body.order_id), rating=Number(req.body.rating), body=String(req.body.body||'').trim();
  if(!product_id||!order_id||rating<1||rating>5||body.length<10||body.length>800) return res.status(400).json({error:'Invalid review'});
  const {data:delivered}=await supabase.from('orders').select('id').eq('id',order_id).eq('user_id',req.user.id).eq('status','Delivered').maybeSingle();
  if(!delivered) return res.status(403).json({error:'Reviews are available after delivery'});
  const {data:item}=await supabase.from('order_items').select('id').eq('order_id',order_id).eq('product_id',product_id).maybeSingle();
  if(!item) return res.status(403).json({error:'Product was not part of this order'});
  const {data,error}=await supabase.from('reviews').insert({product_id,user_id:req.user.id,order_id,rating,body}).select('*').single();
  if(error) throw error; res.status(201).json({data});
}catch(e){next(e)}});

export default router;
