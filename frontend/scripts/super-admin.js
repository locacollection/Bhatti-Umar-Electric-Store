(() => {
  const db = window.BHATTI?.db;
  async function redirectToSharedStudio() {
    try {
      if (!db) return;
      const { data: { user } = {} } = await db.auth.getUser();
      if (!user) {
        window.location.replace("index.html?auth=signin&from=super-admin");
        return;
      }
      const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (["admin", "super_admin"].includes(profile?.role)) {
        window.location.replace("admin/index.html");
        return;
      }
      window.location.replace("index.html");
    } catch (error) {
      console.error("Shared Studio routing failed:", error);
      window.location.replace("index.html?auth=signin");
    }
  }
  redirectToSharedStudio();
})();