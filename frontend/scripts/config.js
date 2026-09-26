window.LOCA = window.BHATTI = window.LOCA || window.BHATTI || {};
LOCA.esc = LOCA.escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
LOCA.money = n => "PKR " + Number(n || 0).toLocaleString("en-PK");
LOCA.SUPABASE_URL = "https://ewldqjmyijfhrdenwqfn.supabase.co";
LOCA.SUPABASE_KEY = "sb_publishable_s0cpLseFV1CSYGTGnqadMA_cTTRThO9";
LOCA.db = supabase.createClient(LOCA.SUPABASE_URL, LOCA.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
LOCA.currentUser = null; LOCA.profile = null; LOCA.products = []; LOCA.cart = {}; LOCA.authMode = "signin"; LOCA.cartSyncBusy = false;
