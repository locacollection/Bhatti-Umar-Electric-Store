import { supabase } from '../config/supabase.js';

export async function requireAuth(req,res,next){
  try{
    const header=req.headers.authorization||'';
    const token=header.startsWith('Bearer ')?header.slice(7):'';
    if(!token) return res.status(401).json({error:'Authentication required'});
    const {data,error}=await supabase.auth.getUser(token);
    if(error||!data.user) return res.status(401).json({error:'Invalid or expired session'});
    const {data:profile}=await supabase.from('profiles').select('id,full_name,phone,role').eq('id',data.user.id).maybeSingle();
    req.user=data.user; req.profile=profile||{id:data.user.id,role:'customer'};
    next();
  }catch(e){next(e)}
}

export function requireAdmin(req,res,next){
  if(!['admin','super_admin'].includes(req.profile?.role)) return res.status(403).json({error:'Admin access required'});
  next();
}

export function requireSuperAdmin(req,res,next){
  if(req.profile?.role!=='super_admin') return res.status(403).json({error:'Super admin access required'});
  next();
}
