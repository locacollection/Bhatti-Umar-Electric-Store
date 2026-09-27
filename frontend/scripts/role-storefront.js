import { supabase } from "./supabaseClient.js";

const db = supabase;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
let products = [];

async function getRole() {
  const { data: { user } = {}, error } = await db.auth.getUser();
  if (error || !user) return { user: null, role: null };
  const { data: profile, error: profileError } = await db.from("profiles").select("role,full_name").eq("id", user.id).maybeSingle();
  if (profileError) throw profileError;
  return { user, role: profile?.role || null, full_name: profile?.full_name || user.email || "" };
}

function render() {
  const query = ($("storeSearch")?.value || "").trim().toLowerCase();
  const list = products.filter(p => !query || `${p.name || ""} ${p.category || ""} ${p.description || ""}`.toLowerCase().includes(query));
  $("storeCount").textContent = `${list.length} product${list.length === 1 ? "" : "s"} · catalogue preview`;
  $("storeGrid").innerHTML = list.map(p => `
    <article class="store-product">
      <div class="store-product-image"><img src="${esc(p.image_url || "assets/product-placeholder.svg")}" alt="${esc(p.name || "Electrical product")}" onerror="this.onerror=null;this.src='assets/product-placeholder.svg'"></div>
      <div class="store-product-copy">
        <span>${esc(p.category || "Electrical")}</span>
        <h3>${esc(p.name || "Unnamed product")}</h3>
        <strong>PKR ${Number(p.price || 0).toLocaleString("en-PK")}</strong>
        <p>${esc(p.description || "Live catalogue item.")}</p>
      </div>
    </article>`).join("") || "<p class='store-empty'>No catalogue matches found.</p>";
}

async function loadProducts() {
  const { data, error } = await db.from("products").select("id,name,category,price,image_url,description").eq("active", true).order("id");
  if (error) throw error;
  products = data || [];
  render();
}

async function signOut() {
  const { error } = await db.auth.signOut();
  if (error) { $("storeMessage").textContent = error.message; return; }
  window.location.replace("index.html?auth=signin");
}

async function init() {
  try {
    const { user, role, full_name } = await getRole();
    if (!user) { window.location.replace("index.html?auth=signin"); return; }
    if (!["admin", "super_admin"].includes(role)) { window.location.replace("index.html"); return; }

    $("storeRole").textContent = role === "super_admin" ? "SUPER ADMIN STOREFRONT" : "ADMIN STOREFRONT";
    $("storeIdentity").textContent = full_name;
    $("storeTitle").innerHTML = role === "super_admin" ? "Power for<br><em>the people who run it.</em>" : "Power for<br><em>real work.</em>";
    $("adminStudioLink").href = "admin/index.html";
    $("dashboardLink").hidden = role !== "super_admin";
    $("dashboardLink").href = "super-admin.html";
    $("storeApp").hidden = false;
    await loadProducts();
  } catch (error) {
    $("storeMessage").textContent = error.message || "Administrative storefront could not be verified.";
  }
}

$("storeSearch").addEventListener("input", render);
$("logoutButton").addEventListener("click", signOut);
init();
