import {createClient} from '@supabase/supabase-js';
import {env} from './env.js';
export const supabase=env.supabaseUrl&&env.supabaseKey?createClient(env.supabaseUrl,env.supabaseKey,{auth:{autoRefreshToken:false,persistSession:false}}):null;