import 'dotenv/config';
export const env={port:Number(process.env.PORT||4000),supabaseUrl:process.env.SUPABASE_URL||'',supabaseKey:process.env.SUPABASE_SERVICE_ROLE_KEY||''};
export function requireBackendEnv(){if(!env.supabaseUrl||!env.supabaseKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');}