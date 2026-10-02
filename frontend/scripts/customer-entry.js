import { supabase } from './supabaseClient.js';

(async () => {
  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();

  if (!sessionError && session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (['admin', 'super_admin'].includes(profile?.role)) {
      // Both elevated roles use one synchronized Studio. Super Admin only gets
      // one additional Administrator Access tab inside that shared workspace.
      window.location.replace('admin/index.html');
    }
  }
})();