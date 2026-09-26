import { supabase } from "./supabaseClient.js";

async function updateNavbar() {
  const { data: { session } = {} } = await supabase.auth.getSession();
  let isAdmin = false;
  let role = "";

  if (session?.user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
    role = profile?.role || "";
    isAdmin = ["admin", "super_admin"].includes(role);
  }

  document.querySelectorAll(".admin-link, footer a[href*='admin/']").forEach(link => link.remove());
  document.getElementById("adminBridge")?.remove();

  if (isAdmin) {
    const bridge = document.createElement("a");
    bridge.id = "adminBridge";
    bridge.href = "admin/index.html";
    bridge.className = "store-link admin-bridge";
    bridge.textContent = "Studio ↗";
    bridge.title = role === "super_admin" ? "Super Admin Studio" : "Admin Studio";
    document.querySelector(".nav-actions")?.prepend(bridge);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateNavbar, { once: true });
} else {
  updateNavbar();
}
