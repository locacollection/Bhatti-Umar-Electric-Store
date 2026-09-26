window.BHATTI = window.BHATTI || {};

BHATTI.esc = BHATTI.escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
BHATTI.money = n => "PKR " + Number(n || 0).toLocaleString("en-PK");

BHATTI.SUPABASE_URL = "https://ewldqjmyijfhrdenwqfn.supabase.co";
BHATTI.SUPABASE_KEY = "sb_publishable_s0cpLseFV1CSYGTGnqadMA_cTTRThO9";
BHATTI.db = supabase.createClient(BHATTI.SUPABASE_URL, BHATTI.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
BHATTI.currentUser = null;
BHATTI.profile = null;
BHATTI.products = [];
BHATTI.cart = {};
BHATTI.authMode = "signin";
BHATTI.cartSyncBusy = false;
