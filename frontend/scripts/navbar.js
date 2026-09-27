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

  const isRoleStorefront = /(?:^|\/)super-admin-store\.html$|(?:^|\/)admin-store\.html$/.test(window.location.pathname);
  if (!isRoleStorefront) {
    document.querySelectorAll(".admin-link, footer a[href*='admin/']").forEach(link => link.remove());
  }
  document.getElementById("adminBridge")?.remove();
  document.getElementById("adminFooterBridge")?.remove();

  if (isAdmin) {
    const bridge = document.createElement("a");
    bridge.id = "adminBridge";
    bridge.href = "admin-store.html";
    bridge.className = "store-link admin-bridge";
    bridge.textContent = role === "super_admin" ? "Super Admin Store ↗" : "Admin Store ↗";
    bridge.title = role === "super_admin" ? "Super Admin Studio" : "Admin Studio";
    document.querySelector(".nav-actions")?.prepend(bridge);
    const footerBridge=document.createElement("a");
    footerBridge.id="adminFooterBridge";
    footerBridge.href="admin-store.html";
    footerBridge.textContent=role === "super_admin" ? "Super Admin Store" : "Admin Store";
    document.querySelector("footer .footer-top")?.appendChild(footerBridge);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateNavbar, { once: true });
} else {
  updateNavbar();
}

supabase.auth.onAuthStateChange(() => {
  setTimeout(updateNavbar, 0);
});
