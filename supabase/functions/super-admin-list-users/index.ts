import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");
    if (!url || !serviceRoleKey) return json({ error: "Server configuration is incomplete." }, 500);
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication is required." }, 401);

    const adminClient = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: authData, error: authError } = await adminClient.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return json({ error: "Your Super Admin session has expired." }, 401);

    const { data: actor, error: actorError } = await adminClient
      .from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (actorError) throw actorError;
    if (actor?.role !== "super_admin") return json({ error: "Only the Super Admin can view administrator accounts." }, 403);

    const { data: profiles, error: profileError } = await adminClient
      .from("profiles").select("id,full_name,role,created_at").in("role", ["admin","super_admin"]).order("created_at", { ascending: true });
    if (profileError) throw profileError;

    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    const usersById = new Map((usersData.users || []).map(user => [user.id, user]));

    const administrators = (profiles || []).map((profile, index) => {
      const user = usersById.get(profile.id);
      return {
        id: profile.id,
        identifier: profile.role === "super_admin" ? "SUPER_ADMIN" : `ADMIN_BHATTI${(profiles || []).filter(p => p.role === "admin").findIndex(p => p.id === profile.id) + 1}`,
        role: profile.role,
        full_name: profile.full_name || "",
        email: user?.email || "",
        email_confirmed_at: user?.email_confirmed_at || null,
        created_at: profile.created_at,
      };
    });
    return json({ administrators });
  } catch (error) {
    console.error("super-admin-list-users", error);
    return json({ error: error instanceof Error ? error.message : "Administrator list could not be loaded." }, 500);
  }
});