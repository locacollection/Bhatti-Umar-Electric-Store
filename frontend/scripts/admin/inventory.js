(() => {
  const db = window.BHATTI?.db;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  let rows = [];

  function money(value) {
    return "PKR " + Number(value || 0).toLocaleString("en-PK");
  }

  function activateInventoryTab() {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelector('.tab[data-tab="inventory"]')?.classList.add("active");
    ["ordersSection","archiveSection","customersSection","usersSection","reviewsSection","productsSection","adminManagementSection","inventorySection"].forEach(id => {
      const el = $(id);
      if (el) el.style.display = id === "inventorySection" ? "block" : "none";
    });
    const title = $("pageTitle");
    if (title) title.textContent = "Stock control, at a glance.";
    loadInventory();
  }

  async function loadInventory() {
    const body = $("inventoryBody");
    if (!body || !db) return;
    body.innerHTML = '<tr><td colspan="8" class="empty">Loading live stock…</td></tr>';
    try {
      const [{ data: products, error: productError }, { data: inventory, error: inventoryError }] = await Promise.all([
        db.from("products").select("id,name,sku,category,price,active").order("name"),
        db.from("inventory").select("product_id,quantity,reorder_level,updated_at")
      ]);
      if (productError) throw productError;
      if (inventoryError) throw inventoryError;

      const stockMap = Object.fromEntries((inventory || []).map(row => [String(row.product_id), row]));
      rows = (products || []).map(product => ({
        ...product,
        stock: stockMap[String(product.id)]?.quantity ?? 0,
        reorder_level: stockMap[String(product.id)]?.reorder_level ?? 0,
        updated_at: stockMap[String(product.id)]?.updated_at || null
      }));
      renderInventory();
      const count = $("inventoryCount");
      if (count) count.textContent = `${rows.length} products · ${rows.filter(x => x.active).length} active`;
      const badge = $("sideInventoryCount");
      if (badge) badge.textContent = rows.filter(x => x.active).length;
    } catch (error) {
      body.innerHTML = `<tr><td colspan="8" class="empty">${esc(error.message || "Could not load inventory.")}</td></tr>`;
      if ($("inventoryMessage")) {
        $("inventoryMessage").textContent = error.message || "Could not load inventory.";
        $("inventoryMessage").className = "error";
      }
    }
  }

  function renderInventory() {
    const query = ($("inventorySearch")?.value || "").trim().toLowerCase();
    const filter = $("inventoryFilter")?.value || "all";
    const list = rows.filter(row => {
      const text = `${row.name || ""} ${row.sku || ""} ${row.category || ""}`.toLowerCase();
      const matchesSearch = !query || text.includes(query);
      const matchesFilter =
        filter === "all" ||
        (filter === "out" && row.stock <= 0) ||
        (filter === "low" && row.stock > 0 && row.stock <= row.reorder_level) ||
        (filter === "healthy" && row.stock > row.reorder_level);
      return matchesSearch && matchesFilter;
    });

    $("inventoryBody").innerHTML = list.length ? list.map(row => {
      const status = row.stock <= 0 ? "out" : row.stock <= row.reorder_level ? "low" : "healthy";
      const label = status === "out" ? "Out of stock" : status === "low" ? "Low stock" : "In stock";
      return `<tr>
        <td><b>${esc(row.name)}</b><br><span class="muted">${esc(row.sku || "No SKU")}</span></td>
        <td>${esc(row.category || "Uncategorised")}</td>
        <td>${money(row.price)}</td>
        <td><span class="inventory-status ${status}">${label}</span></td>
        <td><input class="inventory-number" type="number" min="0" step="1" value="${Number(row.stock)}" data-stock-product="${esc(row.id)}" aria-label="Stock quantity for ${esc(row.name)}"></td>
        <td><input class="inventory-number" type="number" min="0" step="1" value="${Number(row.reorder_level)}" data-reorder-product="${esc(row.id)}" aria-label="Reorder level for ${esc(row.name)}"></td>
        <td>${row.updated_at ? new Date(row.updated_at).toLocaleString("en-PK") : "Not set"}</td>
        <td><button class="smallbtn inventory-save" type="button" data-inventory-save="${esc(row.id)}">Save</button></td>
      </tr>`;
    }).join("") : '<tr><td colspan="8" class="empty">No products match this stock view.</td></tr>';

    const active = rows.filter(x => x.active);
    const out = active.filter(x => x.stock <= 0).length;
    const low = active.filter(x => x.stock > 0 && x.stock <= x.reorder_level).length;
    $("inventoryStats") && ($("inventoryStats").innerHTML =
      `<div><span>Active products</span><b>${active.length}</b></div>
       <div><span>Units on hand</span><b>${active.reduce((sum,x)=>sum+Number(x.stock||0),0)}</b></div>
       <div><span>Out of stock</span><b>${out}</b></div>
       <div><span>Low stock</span><b>${low}</b></div>`);
  }

  async function saveInventory(id, button) {
    const stockInput = document.querySelector(`[data-stock-product="${CSS.escape(id)}"]`);
    const reorderInput = document.querySelector(`[data-reorder-product="${CSS.escape(id)}"]`);
    const quantity = Number(stockInput?.value);
    const reorderLevel = Number(reorderInput?.value);
    if (!Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(reorderLevel) || reorderLevel < 0) {
      window.adminNotify?.("Stock and reorder level must be whole numbers at or above zero.", { title: "Invalid stock values", tone: "error" });
      return;
    }

    button.disabled = true;
    button.textContent = "Saving…";
    try {
      const { data, error } = await db.rpc("admin_manage_inventory", {
        p_product_id: id,
        p_quantity: quantity,
        p_reorder_level: reorderLevel
      });
      if (error) throw error;
      const updated = Array.isArray(data) ? data[0] : data;
      const row = rows.find(x => String(x.id) === String(id));
      if (row) {
        row.stock = Number(updated?.quantity ?? quantity);
        row.reorder_level = Number(updated?.reorder_level ?? reorderLevel);
        row.updated_at = updated?.updated_at || new Date().toISOString();
      }
      renderInventory();
      window.adminNotify?.(`${row?.name || "Product"} · ${row?.stock ?? quantity} units on hand.`, { title: "Stock updated" });
    } catch (error) {
      window.adminNotify?.(error.message || "Stock could not be updated.", { title: "Stock update failed", tone: "error", duration: 6000 });
    } finally {
      button.disabled = false;
      button.textContent = "Save";
    }
  }

  document.querySelector('.tab[data-tab="inventory"]')?.addEventListener("click", activateInventoryTab);
  $("inventorySearch")?.addEventListener("input", renderInventory);
  $("inventoryFilter")?.addEventListener("change", renderInventory);
  $("inventoryRefresh")?.addEventListener("click", loadInventory);
  $("inventoryBody")?.addEventListener("click", event => {
    const button = event.target.closest("[data-inventory-save]");
    if (button) saveInventory(button.dataset.inventorySave, button);
  });
  window.adminInventoryLoad = loadInventory;
})();