import { supabase } from './supabaseClient.js';

(async () => {
  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();

  if (!sessionError && session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile?.role === 'super_admin') {
      window.location.replace('super-admin.html');
      return;
    }

    if (profile?.role === 'admin') {
      window.location.replace('admin/index.html');
    }
  }
})();
