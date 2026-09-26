import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Service-role access is server-only. Never expose this key to the browser.
export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
