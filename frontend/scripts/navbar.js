import { supabase } from "./supabaseClient.js";

async function updateNavbar() {
  await supabase.auth.getSession();

  const isRoleStorefront = /(?:^|\/)super-admin-store\.html$|(?:^|\/)admin-store\.html$/.test(window.location.pathname);
  if (!isRoleStorefront) {
    document.querySelectorAll(".admin-link, footer a[href*='admin/']").forEach(link => link.remove());
  }

  // Legacy dynamic Admin Store / Super Admin Store bridges are intentionally not
  // injected. Studio and storefront pages already have their dedicated command
  // buttons, so a second role-store link only duplicates navigation.
  document.getElementById("adminBridge")?.remove();
  document.getElementById("adminFooterBridge")?.remove();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateNavbar, { once: true });
} else {
  updateNavbar();
}

supabase.auth.onAuthStateChange(() => {
  setTimeout(updateNavbar, 0);
});
