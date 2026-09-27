import { supabase } from "./supabaseClient.js";

export async function protectAdminRoute() {
  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    window.location.replace("index.html?auth=login");
    return false;
  }

  const userId = session.user.id;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    window.location.replace("../index.html?auth=signin");
    return false;
  }

  if (profile?.role === "super_admin") {
    window.location.replace("../super-admin.html");
    return false;
  }

  if (profile?.role !== "admin") {
    window.location.replace("../index.html");
    return false;
  }

  return true;
}

export const adminGuardReady = protectAdminRoute();
