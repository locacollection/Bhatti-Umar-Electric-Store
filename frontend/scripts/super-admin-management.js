(() => {
  const db = window.BHATTI?.db;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  async function requireSuperAdmin() {
    if (!db) throw new Error("Supabase client did not initialize.");
    const { data: { user } = {}, error } = await db.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error("Your session has expired.");
    const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== "super_admin") throw new Error("Super Admin access is required.");
    return user;
  }

  async function token() {
    const { data, error } = await db.auth.getSession();
    if (error || !data.session?.access_token) throw new Error("Your session has expired. Sign in again.");
    return data.session.access_token;
  }

  function activateAccessTab() {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelector('.tab[data-tab="admin-management"]')?.classList.add("active");
    ["ordersSection","archiveSection","customersSection","usersSection","reviewsSection","productsSection","adminManagementSection"].forEach(id => {
      const el = $(id);
      if (el) el.style.display = id === "adminManagementSection" ? "block" : "none";
    });
    const title = $("pageTitle");
    if (title) title.textContent = "Manage administrator access.";
    loadAdmins();
  }

  async function loadAdmins() {
    const body = $("superAdminAdminsBody");
    if (!body) return;
    body.innerHTML = '<tr><td colspan="5">Loading administrator accounts…</td></tr>';
    try {
      await requireSuperAdmin();
      const authToken = await token();
      const { data, error } = await db.functions.invoke("super-admin-list-users", {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const admins = data?.administrators || [];
      $("adminManagementCount").textContent = `${admins.length} elevated account${admins.length === 1 ? "" : "s"} · Supabase Auth`;
      $("sideAdminCount").textContent = admins.filter(x => x.role === "admin").length;
      body.innerHTML = admins.map(admin => `
        <tr>
          <td><b>${esc(admin.identifier)}</b><br><span class="muted">${esc(admin.full_name || (admin.role === "super_admin" ? "Store owner" : "Administrator"))}</span></td>
          <td><strong>${esc(admin.email || "No Auth email")}</strong></td>
          <td><span class="status-chip ${admin.email_confirmed_at ? "order-delivered" : "order-pending"}">${admin.email_confirmed_at ? "Verified" : "Pending verification"}</span></td>
          <td>${admin.created_at ? new Date(admin.created_at).toLocaleDateString("en-PK") : "—"}</td>
          <td>${admin.role === "admin" ? `<button class="smallbtn danger-action" type="button" data-super-remove="${esc(admin.id)}" data-label="${esc(admin.identifier)}">Remove</button>` : '<span class="muted">Protected</span>'}</td>
        </tr>`).join("") || '<tr><td colspan="5">No administrator accounts found.</td></tr>';
    } catch (error) {
      body.innerHTML = `<tr><td colspan="5" class="empty">${esc(error.message || "Could not load administrator accounts.")}</td></tr>`;
      $("adminManagementCount").textContent = "Directory unavailable";
    }
  }

  async function createAdmin(event) {
    event.preventDefault();
    const email = $("superAdminEmail").value.trim().toLowerCase();
    const button = $("superAdminCreateButton");
    const message = $("superAdminCreateMessage");
    if (!email) return;
    button.disabled = true; button.textContent = "Sending…"; message.textContent = "";
    try {
      await requireSuperAdmin();
      const authToken = await token();
      const { data, error } = await db.functions.invoke("admin-create-user", {
        body: { email, role: "admin" },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      $("superAdminCreateForm").reset();
      message.textContent = `Invitation sent to ${data.email || email}.`;
      await loadAdmins();
    } catch (error) {
      message.textContent = error.message || "The administrator could not be created.";
      message.className = "error";
    } finally {
      button.disabled = false; button.textContent = "＋ Add Admin";
    }
  }

  async function removeAdmin(id, label, button) {
    const ok = window.confirm(`Remove ${label} from BHATTI administrator access? This deletes the Auth login and cannot be undone.`);
    if (!ok) return;
    button.disabled = true; button.textContent = "Removing…";
    try {
      await requireSuperAdmin();
      const authToken = await token();
      const { data, error } = await db.functions.invoke("admin-delete-user", {
        body: { user_id: id },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await loadAdmins();
    } catch (error) {
      window.alert(error.message || "Administrator could not be removed.");
      button.disabled = false; button.textContent = "Remove";
    }
  }

  document.querySelector('.tab[data-tab="admin-management"]')?.addEventListener("click", event => {
    event.stopPropagation();
    activateAccessTab();
  });
  $("refreshAdminManagement")?.addEventListener("click", loadAdmins);
  $("superAdminCreateForm")?.addEventListener("submit", createAdmin);
  $("superAdminAdminsBody")?.addEventListener("click", event => {
    const button = event.target.closest("[data-super-remove]");
    if (button) removeAdmin(button.dataset.superRemove, button.dataset.label, button);
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const { data: { user } = {} } = await db.auth.getUser();
      if (!user) return;
      const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "super_admin") {
        const tab = document.querySelector('.tab[data-tab="admin-management"]');
        tab?.remove();
        $("adminManagementSection")?.remove();
        return;
      }
      $("sideAdminCount").textContent = "—";
    } catch (error) {
      console.error("Super Admin management guard failed:", error);
    }
  });

  window.superAdminLoadAdmins = loadAdmins;
})();