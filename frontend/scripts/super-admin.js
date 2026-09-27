(() => {
  const db = window.BHATTI?.db;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  async function sessionToken() {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    if (!data.session?.access_token) throw new Error("Your session has expired. Sign in again.");
    return data.session.access_token;
  }

  async function verifySuperAdmin() {
    const { data: { user } = {}, error } = await db.auth.getUser();
    if (error || !user) return false;
    const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;
    return profile?.role === "super_admin";
  }

  async function loadAdmins() {
    const body = $("adminsBody");
    body.innerHTML = '<tr><td colspan="5">Loading administrator accounts…</td></tr>';
    try {
      const token = await sessionToken();
      const { data, error } = await db.functions.invoke("super-admin-list-users", { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const admins = data?.administrators || [];
      $("saCount").textContent = `${admins.length} elevated account${admins.length === 1 ? "" : "s"} · emails verified from Supabase Auth`;
      body.innerHTML = admins.map(admin => `
        <tr>
          <td><div class="account-name"><b>${esc(admin.identifier)}</b><small>${esc(admin.full_name || (admin.role === "super_admin" ? "Store owner" : "Administrator"))}</small></div></td>
          <td><strong>${esc(admin.email || "No Auth email")}</strong></td>
          <td><span class="status ${admin.email_confirmed_at ? "verified" : "pending"}">${admin.email_confirmed_at ? "Verified" : "Pending verification"}</span></td>
          <td>${admin.created_at ? new Date(admin.created_at).toLocaleDateString("en-PK") : "—"}</td>
          <td>${admin.role === "admin" ? `<button class="remove" type="button" data-remove="${esc(admin.id)}" data-label="${esc(admin.identifier)}">Remove</button>` : '<span class="protected">Protected</span>'}</td>
        </tr>`).join("") || '<tr><td colspan="5">No administrator accounts found.</td></tr>';
    } catch (error) {
      body.innerHTML = `<tr><td colspan="5" class="error-cell">${esc(error.message || "Could not load administrator accounts.")}</td></tr>`;
      $("saCount").textContent = "Directory unavailable";
    }
  }

  async function createAdmin(event) {
    event.preventDefault();
    const email = $("newAdminEmail").value.trim().toLowerCase();
    const button = $("createAdminButton"), message = $("createMessage");
    button.disabled = true; button.textContent = "Sending…"; message.textContent = "";
    try {
      const token = await sessionToken();
      const { data, error } = await db.functions.invoke("admin-create-user", {
        body: { email, role: "admin" },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      $("createAdminForm").reset();
      message.textContent = `Invitation sent to ${data.email}.`;
      await loadAdmins();
    } catch (error) {
      message.textContent = error.message || "The administrator could not be created.";
    } finally {
      button.disabled = false; button.textContent = "＋ Add Admin";
    }
  }

  async function removeAdmin(id, label, button) {
    if (!confirm(`Remove ${label} from BHATTI administrator access? This deletes the Auth login and cannot be undone.`)) return;
    button.disabled = true; button.textContent = "Removing…";
    try {
      const token = await sessionToken();
      const { data, error } = await db.functions.invoke("admin-delete-user", {
        body: { user_id: id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await loadAdmins();
    } catch (error) {
      alert(error.message || "Administrator could not be removed.");
      button.disabled = false; button.textContent = "Remove";
    }
  }

  async function init() {
    try {
      const { data: { session } = {} } = await db.auth.getSession();
      if (!session) { window.location.replace("index.html?auth=signin&from=super-admin"); return; }
      if (!await verifySuperAdmin()) {
        const { data: { user } = {} } = await db.auth.getUser();
        if (user) { const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle(); if (profile?.role === "admin") { window.location.replace("admin-store.html"); return; } }
        window.location.replace("index.html");
        return;
      }
      $("saLogin").hidden = true; $("saApp").hidden = false;
      await loadAdmins();
    } catch (error) { $("saLoginMessage").textContent = error.message || "Access could not be verified."; }
  }

  $("saLoginButton").addEventListener("click", () => { window.location.href = "index.html?auth=signin&from=super-admin"; });
  $("saLogout").addEventListener("click", async () => { const { error } = await db.auth.signOut(); if (error) { $("saLoginMessage").textContent = error.message || "Could not sign out."; return; } window.location.replace("index.html?auth=signin"); });
  $("refreshAdmins").addEventListener("click", loadAdmins);
  $("createAdminForm").addEventListener("submit", createAdmin);
  $("adminsBody").addEventListener("click", event => {
    const button = event.target.closest("[data-remove]");
    if (button) removeAdmin(button.dataset.remove, button.dataset.label, button);
  });
  init();
})();