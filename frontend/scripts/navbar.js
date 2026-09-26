import { supabase } from "./supabaseClient.js";

export async function updateNavbar() {
  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
  let isAdmin = false;
  let adminIdentifier = "BHATTI / STUDIO";

  if (!sessionError && session?.user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    isAdmin = !profileError && ["admin", "super_admin"].includes(profile?.role);
    adminIdentifier = profile?.role === "super_admin" ? "SUPER ADMIN" : "ADMIN";
  }

  document.querySelectorAll(".admin-only-link, a[href*='admin.html']").forEach(link => link.remove());
  document.getElementById("adminBridge")?.remove();

  if (isAdmin) {
    const bridge = document.createElement("a");
    bridge.id = "adminBridge";
    bridge.href = "admin/index.html";
    bridge.className = "store-link admin-bridge";
    bridge.textContent = "Studio ↗";
    bridge.setAttribute("aria-label", adminIdentifier + " Studio");
    bridge.style.cssText = "display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 15px;border:1px solid var(--line);border-radius:999px;font:600 12px/1 DM Sans,sans-serif;color:inherit;text-decoration:none;";
    document.querySelector(".nav-actions")?.prepend(bridge);

    const accountButton = document.querySelector(".account-button");
    if (accountButton) {
      accountButton.title = adminIdentifier;
      accountButton.classList.add("admin-identity-badge");
    }
    const bagButton = document.querySelector(".bag-button");
    if (bagButton) bagButton.style.setProperty("display", "none", "important");
  }
}

updateNavbar();
