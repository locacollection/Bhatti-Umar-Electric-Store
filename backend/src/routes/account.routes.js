import {Router} from 'express';
import {requireAuth} from '../middleware/auth.js';
import {supabase} from '../config/supabase.js';
const router=Router();

router.get('/profile',requireAuth,async(req,res,next)=>{try{
  const {data,error}=await supabase.from('profiles').select('id,full_name,phone,role,created_at').eq('id',req.user.id).single();
  if(error) throw error; res.json({data});
}catch(e){next(e)}});

router.patch('/profile',requireAuth,async(req,res,next)=>{try{
  const full_name=String(req.body.full_name||'').trim().slice(0,120);
  const phone=String(req.body.phone||'').trim().slice(0,40);
  const {data,error}=await supabase.from('profiles').update({full_name,phone,updated_at:new Date().toISOString()}).eq('id',req.user.id).select('id,full_name,phone,role').single();
  if(error) throw error; res.json({data});
}catch(e){next(e)}});

router.get('/addresses',requireAuth,async(req,res,next)=>{try{
  const {data,error}=await supabase.from('addresses').select('*').eq('user_id',req.user.id).order('is_default',{ascending:false}).order('created_at');
  if(error) throw error; res.json({data:data||[]});
}catch(e){next(e)}});

router.post('/addresses',requireAuth,async(req,res,next)=>{try{
  const row={user_id:req.user.id,label:String(req.body.label||'Home').slice(0,40),recipient_name:String(req.body.recipient_name||'').slice(0,120),phone:String(req.body.phone||'').slice(0,40),city:String(req.body.city||'').trim().slice(0,100),address_line:String(req.body.address_line||'').trim().slice(0,500),is_default:Boolean(req.body.is_default)};
  if(!row.city||!row.address_line) return res.status(400).json({error:'City and address are required'});
  if(row.is_default) await supabase.from('addresses').update({is_default:false}).eq('user_id',req.user.id);
  const {data,error}=await supabase.from('addresses').insert(row).select('*').single(); if(error) throw error; res.status(201).json({data});
}catch(e){next(e)}});

router.put('/addresses/:id',requireAuth,async(req,res,next)=>{try{
  const row={label:String(req.body.label||'Home').slice(0,40),recipient_name:String(req.body.recipient_name||'').slice(0,120),phone:String(req.body.phone||'').slice(0,40),city:String(req.body.city||'').trim().slice(0,100),address_line:String(req.body.address_line||'').trim().slice(0,500),is_default:Boolean(req.body.is_default),updated_at:new Date().toISOString()};
  if(row.is_default) await supabase.from('addresses').update({is_default:false}).eq('user_id',req.user.id);
  const {data,error}=await supabase.from('addresses').update(row).eq('id',req.params.id).eq('user_id',req.user.id).select('*').single(); if(error) throw error; res.json({data});
}catch(e){next(e)}});

router.delete('/addresses/:id',requireAuth,async(req,res,next)=>{try{
  const {error}=await supabase.from('addresses').delete().eq('id',req.params.id).eq('user_id',req.user.id); if(error) throw error; res.status(204).end();
}catch(e){next(e)}});

export default router;
