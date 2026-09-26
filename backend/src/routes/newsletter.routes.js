import {Router} from 'express';
import {supabase} from '../config/supabase.js';
const router=Router();
router.post('/',async(req,res,next)=>{try{const email=String(req.body.email||'').trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'Valid email required'});const {error}=await supabase.from('newsletter_subscribers').upsert({email,active:true},{onConflict:'email'});if(error)throw error;res.status(201).json({ok:true});}catch(e){next(e)}});
export default router;
