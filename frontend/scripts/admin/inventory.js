(() => {
  const db = window.BHATTI?.db;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  let rows = [];
  let includeInactive = false;

  function money(value) {
    return "PKR " + Number(value || 0).toLocaleString("en-PK");
  }

  function installAdminUX() {
    if (document.getElementById("bhatti-admin-spacious-ux")) return;
    const style = document.createElement("style");
    style.id = "bhatti-admin-spacious-ux";
    style.textContent = `
      /* BHATTI Studio: spacious operations layout */
      .bhatti-stock-toggle{display:flex;align-items:center;gap:9px;min-height:44px;padding:0 13px;border:1px solid rgba(39,31,24,.12);border-radius:12px;background:rgba(255,250,244,.82);color:#4b423a;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}
      .bhatti-stock-toggle input{width:17px;height:17px;accent-color:#7c403c}
      .inventory-panel .catalog-toolbar{margin-top:22px;padding:18px 20px;border:1px solid rgba(39,31,24,.09);border-radius:18px;background:rgba(255,250,244,.7)}
      .inventory-panel .catalog-filters{gap:18px;align-items:end}
      .inventory-panel .catalog-filters label{min-width:210px}
      .inventory-panel .inventory-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:22px 0}
      .inventory-panel .inventory-stats>div{min-height:104px;padding:20px;border:1px solid rgba(39,31,24,.09);border-radius:18px;background:#fffaf4;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 10px 30px rgba(35,26,19,.045)}
      .inventory-panel .inventory-stats span{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#81766d}
      .inventory-panel .inventory-stats b{font-size:30px;line-height:1;color:#7c403c;letter-spacing:-.05em}
      .inventory-panel .inventory-table-wrap{margin-top:18px;border-radius:18px;overflow:auto}
      .inventory-panel .inventory-table-wrap table{min-width:980px}
      .inventory-panel .inventory-table-wrap th{padding:15px 16px}
      .inventory-panel .inventory-table-wrap td{padding:18px 16px;vertical-align:middle}
      .inventory-panel .inventory-number{width:92px;min-height:42px;padding:8px 10px;border:1px solid rgba(39,31,24,.13);border-radius:11px;background:#fff;font-size:14px}
      .inventory-panel .inventory-number:focus{outline:2px solid rgba(189,152,99,.55);outline-offset:2px}
      .inventory-panel .inventory-status{display:inline-flex;align-items:center;min-height:34px;padding:0 12px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.05em;white-space:nowrap}
      .inventory-panel .inventory-status.out{background:#fae9e7;color:#8f3d38}
      .inventory-panel .inventory-status.low{background:#fff2d7;color:#876522}
      .inventory-panel .inventory-status.healthy{background:#e9f1ed;color:#416b58}
      .inventory-panel .stock-empty-note{margin:12px 0 0;color:#756b62;font-size:11px}
      .inventory-panel .insight-strip{margin-top:0;margin-bottom:0}
      .main .wrap{width:min(1480px,calc(100% - 72px))}
      .main{padding-top:58px;padding-bottom:110px}
      .head{margin-bottom:42px}
      .panel{padding:34px}
      .section-head{margin-bottom:30px}
      .stats{gap:18px;margin-bottom:28px}
      .stat{min-height:150px;padding:26px}
      @media(max-width:1000px){
        .main .wrap{width:min(100% - 40px,920px)}
        .inventory-panel .inventory-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:700px){
        .main{padding:28px 0 70px}
        .main .wrap{width:calc(100% - 24px)}
        .head{margin-bottom:24px;display:block}
        .head h1{font-size:clamp(36px,10vw,50px);line-height:1.02;margin-bottom:12px}
        .head-date{display:block;width:max-content;margin-top:14px}
        .panel{padding:20px;border-radius:20px!important}
        .section-head{display:block;margin-bottom:20px}
        .toolbar-actions{margin-top:16px;display:grid;grid-template-columns:1fr;gap:10px}
        .toolbar-actions>*{width:100%;min-width:0}
        .stats{grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
        .stat{min-height:126px;padding:18px;border-radius:18px!important}
        .stat b{font-size:27px}
        .inventory-panel .inventory-stats{grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}
        .inventory-panel .inventory-stats>div{min-height:92px;padding:16px;border-radius:15px}
        .inventory-panel .inventory-stats b{font-size:25px}
        .inventory-panel .catalog-toolbar{padding:14px;margin-top:16px;border-radius:15px}
        .inventory-panel .catalog-filters{display:grid;grid-template-columns:1fr;gap:12px}
        .inventory-panel .catalog-filters label{min-width:0}
        .bhatti-stock-toggle{justify-content:flex-start;width:100%;box-sizing:border-box}
        .inventory-panel .inventory-table-wrap{margin-top:14px}
        .inventory-panel .inventory-table-wrap table{min-width:880px}
        /* Compact the mobile studio chrome so the actual working canvas has more room. */
        .top,.topin{height:64px!important;min-height:64px!important}
        .topin{width:calc(100% - 24px)!important}
        .studio-brand b{font-size:20px!important}
        .studio-brand span{font-size:7px!important}
        .topright{gap:6px!important}
        .sync-status,.store-link{display:none!important}
        .top .storefront-command-top{min-height:42px!important;padding:0 10px!important;border-radius:12px!important}
        .top .storefront-command-top strong{font-size:9px!important}
        .top .storefront-command-top small{font-size:6px!important}
        .top .storefront-command-icon{width:28px!important;height:28px!important}
        .top .btn.alt{min-height:40px!important;padding:0 10px!important;font-size:10px!important}
        .shell{min-height:calc(100vh - 64px)!important}
        .sidebar{top:64px!important;height:auto!important;max-height:none!important;padding:14px 12px 12px!important}
        .sidebar-intro{display:none!important}
        .storefront-command-side{min-height:74px!important;margin-bottom:14px!important;padding:12px!important;border-radius:16px!important}
        .storefront-command-side .storefront-command-icon{width:40px!important;height:40px!important}
        .storefront-command-side strong{font-size:12px!important}
        .storefront-command-side em{font-size:9px!important}
        .side-nav{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;margin-top:0!important}
        .side-nav .tab{min-height:50px!important;height:50px!important;padding:5px 3px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:2px!important;border-radius:10px!important;text-align:center!important;font-size:8px!important}
        .side-nav .tab .nav-icon{width:18px!important;height:18px!important}
        .side-nav .tab .nav-icon svg{width:15px!important;height:15px!important}
        .side-nav .tab b{display:none!important}
        .sidebar-foot{display:none!important}
      }
      @media(max-width:390px){
        .side-nav{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important}
        .side-nav .tab{min-height:46px!important;height:46px!important;font-size:7px!important}
        .storefront-command-side{min-height:68px!important}
        .panel{padding:16px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureInventoryToggle() {
    const toolbar = $("inventorySearch")?.closest(".catalog-filters");
    if (!toolbar || $("inventoryIncludeInactiveWrap")) return;
    const wrap = document.createElement("label");
    wrap.className = "bhatti-stock-toggle";
    wrap.id = "inventoryIncludeInactiveWrap";
    wrap.innerHTML = '<input id="inventoryIncludeInactive" type="checkbox"> Include inactive products';
    toolbar.appendChild(wrap);
    $("inventoryIncludeInactive")?.addEventListener("change", event => {
      includeInactive = Boolean(event.target.checked);
      renderInventory();
    });
  }

  function activateInventoryTab() {
    installAdminUX();
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelector('.tab[data-tab="inventory"]')?.classList.add("active");
    ["ordersSection","archiveSection","customersSection","usersSection","reviewsSection","productsSection","adminManagementSection","inventorySection"].forEach(id => {
      const el = $(id);
      if (el) el.style.display = id === "inventorySection" ? "block" : "none";
    });
    const title = $("pageTitle");
    if (title) title.textContent = "Stock control, at a glance.";
    ensureInventoryToggle();
    loadInventory();
  }

  async function loadInventory() {
    const body = $("inventoryBody");
    if (!body || !db) return;
    installAdminUX();
    ensureInventoryToggle();
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
        stock: Math.max(0, Number(stockMap[String(product.id)]?.quantity ?? 0)),
        reorder_level: Math.max(0, Number(stockMap[String(product.id)]?.reorder_level ?? 0)),
        updated_at: stockMap[String(product.id)]?.updated_at || null
      }));
      renderInventory();
      const active = rows.filter(x => Boolean(x.active));
      const count = $("inventoryCount");
      if (count) count.textContent = `${active.length} active products · ${rows.length - active.length} inactive hidden by default`;
      const badge = $("sideInventoryCount");
      if (badge) badge.textContent = active.length;
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
    const source = includeInactive ? rows : rows.filter(row => Boolean(row.active));
    const list = source.filter(row => {
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
        <td><b>${esc(row.name)}</b><br><span class="muted">${esc(row.sku || "No SKU")}</span>${!row.active ? '<br><span class="muted">Inactive catalogue item</span>' : ''}</td>
        <td>${esc(row.category || "Uncategorised")}</td>
        <td>${money(row.price)}</td>
        <td><span class="inventory-status ${status}">${label}</span></td>
        <td><input class="inventory-number" type="number" min="0" step="1" value="${Number(row.stock)}" data-stock-product="${esc(row.id)}" aria-label="Stock quantity for ${esc(row.name)}"></td>
        <td><input class="inventory-number" type="number" min="0" step="1" value="${Number(row.reorder_level)}" data-reorder-product="${esc(row.id)}" aria-label="Reorder level for ${esc(row.name)}"></td>
        <td>${row.updated_at ? new Date(row.updated_at).toLocaleString("en-PK") : "Not set"}</td>
        <td><button class="smallbtn inventory-save" type="button" data-inventory-save="${esc(row.id)}">Save</button></td>
      </tr>`;
    }).join("") : '<tr><td colspan="8" class="empty">No products match this stock view.</td></tr>';

    const visible = source;
    const out = visible.filter(x => x.stock <= 0).length;
    const low = visible.filter(x => x.stock > 0 && x.stock <= x.reorder_level).length;
    const units = visible.reduce((sum, x) => sum + Number(x.stock || 0), 0);
    $("inventoryStats") && ($("inventoryStats").innerHTML =
      `<div><span>${includeInactive ? "Visible products" : "Active products"}</span><b>${visible.length}</b></div>
       <div><span>Units on hand</span><b>${units}</b></div>
       <div><span>Out of stock</span><b>${out}</b></div>
       <div><span>Low stock</span><b>${low}</b></div>`);

    const note = $("inventoryMessage");
    if (note && !note.classList.contains("error")) {
      note.textContent = includeInactive
        ? "Showing active and inactive catalogue items. Zero-stock inactive products are labelled so they are not confused with live storefront stock."
        : "Showing active catalogue products only. Inactive products are excluded from the live stock totals.";
      note.className = "stock-empty-note";
    }
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

  installAdminUX();
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