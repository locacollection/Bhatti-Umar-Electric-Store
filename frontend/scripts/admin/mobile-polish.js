(() => {
  'use strict';

  // Shared mobile UX layer for Admin + Super Admin Studio.
  // This is intentionally additive: it improves layout/interaction without
  // replacing existing business logic.
  const STYLE_ID = 'bhatti-admin-mobile-polish';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html,body{max-width:100%;overflow-x:hidden}
      @media(max-width:700px){
        .wrap{width:calc(100% - 20px)!important}
        .main{padding:18px 0 70px!important}
        .head{margin-bottom:18px!important;align-items:flex-start!important}
        .head h1{font-size:32px!important;line-height:1.02!important}
        .head-copy{font-size:12px!important}

        /* Mobile navigation: 4 columns, wrapping rows; never a horizontal page scroller. */
        .side-nav{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:7px!important;margin-top:14px!important}
        .side-nav .tab{min-width:0!important;min-height:58px!important;padding:7px 4px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:4px!important;text-align:center!important;border-radius:12px!important;font-size:10px!important}
        .side-nav .tab .nav-icon{width:23px!important;height:23px!important}
        .side-nav .tab .nav-icon svg{width:17px!important;height:17px!important}
        .side-nav .tab b{position:absolute!important;top:4px!important;right:4px!important;min-width:17px!important;padding:2px 4px!important;font-size:8px!important}
        .sidebar{padding:14px 10px 16px!important}
        .sidebar-intro{padding:0 5px 12px!important}
        .sidebar-intro h2{font-size:22px!important}
        .sidebar-foot{display:none!important}

        /* Keep the studio chrome compact on phones. */
        .top{height:62px!important}
        .topin{width:calc(100% - 18px)!important;height:62px!important;gap:7px!important}
        .studio-brand b{font-size:19px!important}
        .studio-brand span{display:none!important}
        .topright{gap:6px!important}
        .sync-status{display:none!important}
        .store-link{min-height:42px!important;padding:0 10px!important;font-size:9px!important;max-width:205px!important}
        .top .btn.alt{min-height:38px!important;padding:0 10px!important;font-size:10px!important}

        /* Compact operational cards. */
        .panel{padding:18px!important;border-radius:20px!important}
        .section-head{margin-bottom:15px!important}
        .section-head h2{font-size:27px!important}
        .stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important;margin-bottom:14px!important}
        .stat{min-height:102px!important;padding:15px!important;border-radius:17px!important}
        .stat b{margin-top:13px!important;font-size:25px!important}

        .toolbar-actions{gap:8px!important;align-items:stretch!important}
        .search-control{min-height:46px!important}
        .toolbar-actions select,.toolbar-actions .btn,.toolbar-actions .search-control{min-height:46px!important}

        /* Mobile filter disclosure: keep the search visible and move secondary
           filters/actions into a compact dropdown instead of a tall stack. */
        .bhatti-mobile-disclosure{width:100%;margin:0!important}
        .bhatti-mobile-disclosure summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;padding:0 14px;border:1px solid rgba(39,31,24,.12);border-radius:12px;background:#fffaf4;color:#352e28;font-size:12px;font-weight:700;cursor:pointer;user-select:none}
        .bhatti-mobile-disclosure summary::-webkit-details-marker{display:none}
        .bhatti-mobile-disclosure summary::after{content:'⌄';font-size:18px;line-height:1;transition:transform .2s ease;color:#786f66}
        .bhatti-mobile-disclosure[open] summary::after{transform:rotate(180deg)}
        .bhatti-mobile-disclosure .bhatti-disclosure-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding-top:8px}
        .bhatti-mobile-disclosure .bhatti-disclosure-body>*{min-width:0}
        .bhatti-mobile-disclosure .bhatti-disclosure-body select,.bhatti-mobile-disclosure .bhatti-disclosure-body .btn{width:100%;min-height:46px!important}
        .bhatti-mobile-disclosure .bhatti-disclosure-body .catalog-filters{display:grid;grid-template-columns:1fr;gap:8px;width:100%}
        .bhatti-mobile-disclosure .bhatti-disclosure-body .catalog-filters label{min-width:0}
        .bhatti-mobile-disclosure .bhatti-disclosure-body .catalog-filters input,.bhatti-mobile-disclosure .bhatti-disclosure-body .catalog-filters select{width:100%;min-height:46px}
        .bhatti-mobile-disclosure .bhatti-disclosure-body .sync-button{grid-column:1/-1}
        #ordersSection .toolbar-actions>.bhatti-mobile-disclosure .bhatti-disclosure-body,
        #archiveSection .toolbar-actions>.bhatti-mobile-disclosure .bhatti-disclosure-body{grid-template-columns:1fr}

        /* Inventory/catalog cards: visual-first 3-column phone grid. */
        #inventorySection .inventory-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
        #inventorySection .inventory-grid,
        #inventorySection .catalog-grid,
        #inventorySection [class*="inventory-grid"]{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}
        #inventorySection [class*="inventory-card"],
        #inventorySection .catalog-card{min-width:0!important;padding:9px!important;border-radius:14px!important;cursor:pointer!important}
        #inventorySection [class*="inventory-card"] img,
        #inventorySection .catalog-card img{display:block!important;width:100%!important;aspect-ratio:1/1!important;object-fit:contain!important;border-radius:10px!important;background:#fff!important}
        #inventorySection [class*="inventory-card"] h3,
        #inventorySection .catalog-card h3{font-size:11px!important;line-height:1.25!important;margin:8px 0 3px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
        #inventorySection [class*="inventory-card"] p,
        #inventorySection .catalog-card p{font-size:9px!important;line-height:1.3!important;margin:0!important}

        /* Dialogs / editors become mobile sheets instead of desktop windows. */
        dialog{max-width:calc(100vw - 20px)!important;width:calc(100vw - 20px)!important;max-height:calc(100dvh - 20px)!important;margin:auto!important;border-radius:22px!important;padding:0!important;overflow:auto!important}
        dialog::backdrop{background:rgba(12,10,8,.58)!important;backdrop-filter:blur(5px)}
        .modalbox,.product-editor,.order-workflow-dialog,.admin-confirm-dialog,.profile-drawer{max-width:calc(100vw - 20px)!important;width:calc(100vw - 20px)!important;max-height:calc(100dvh - 20px)!important;overflow:auto!important;border-radius:22px!important}
        .dialog-head,.modal-head,.editor-head{position:sticky!important;top:0!important;z-index:4!important;background:rgba(255,250,244,.96)!important;backdrop-filter:blur(16px)!important}
        dialog button[aria-label*="Close"],dialog .close,.modalbox .close,.product-editor .close,.order-workflow-dialog .close{min-width:44px!important;min-height:44px!important;border-radius:12px!important;flex:0 0 auto!important}

        /* Order/action controls stay visible and easy to tap. */
        .row-actions{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}
        .row-actions .smallbtn{min-height:44px!important}
        .smallbtn{min-height:42px!important}
        .user-actions{min-width:0!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}

        /* Address/contact action buttons get distinct edit vs destructive affordances. */
        [class*="address"] .danger-action,
        [id*="address"] .danger-action,
        button[onclick*="deleteAddress"],button[onclick*="removeAddress"]{border-color:rgba(161,63,58,.28)!important;color:#9a3631!important;background:#fff7f5!important}
        [class*="address"] button:not(.danger-action),
        [id*="address"] button:not(.danger-action){min-height:42px!important;border-radius:11px!important}

        /* Avoid giant text/spacing in operational views. */
        .kicker{font-size:9px!important;letter-spacing:.15em!important}
        .muted{font-size:11px!important}
      }

      @media(max-width:420px){
        .side-nav{grid-template-columns:repeat(4,minmax(0,1fr))!important}
        .side-nav .tab{font-size:9px!important;min-height:55px!important}
        #inventorySection .inventory-grid,
        #inventorySection .catalog-grid,
        #inventorySection [class*="inventory-grid"]{gap:6px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceInventory() {
    const section = document.getElementById('inventorySection');
    if (!section) return;
    const candidates = section.querySelectorAll('[data-product-id], [data-id], .inventory-card, .catalog-card');
    candidates.forEach(card => {
      if (!(card instanceof HTMLElement)) return;
      card.setAttribute('tabindex', card.getAttribute('tabindex') || '0');
      card.setAttribute('role', card.getAttribute('role') || 'button');
    });
  }

  function addDisclosure(container, label, nodes) {
    if (!container || container.querySelector(':scope > .bhatti-mobile-disclosure')) return;
    const details = document.createElement('details');
    details.className = 'bhatti-mobile-disclosure';
    const summary = document.createElement('summary');
    summary.textContent = label;
    const body = document.createElement('div');
    body.className = 'bhatti-disclosure-body';
    nodes.forEach(node => body.appendChild(node));
    details.appendChild(summary);
    details.appendChild(body);
    container.appendChild(details);
  }

  function enhanceToolbar(toolbar) {
    if (!toolbar || toolbar.dataset.mobileDisclosureReady === '1') return;
    const controls = Array.from(toolbar.children).filter(node => node instanceof HTMLElement);
    const secondary = controls.filter(node => !node.classList.contains('search-control'));
    if (!secondary.length) return;
    toolbar.dataset.mobileDisclosureReady = '1';
    addDisclosure(toolbar, 'Filters & actions', secondary);
  }

  function enhanceCatalogToolbar(toolbar) {
    if (!toolbar || toolbar.dataset.mobileDisclosureReady === '1') return;
    const children = Array.from(toolbar.children).filter(node => node instanceof HTMLElement);
    if (!children.length) return;
    toolbar.dataset.mobileDisclosureReady = '1';
    addDisclosure(toolbar, 'Filters & catalogue actions', children);
  }

  function enhanceMobileDropdowns() {
    if (window.matchMedia && !window.matchMedia('(max-width:700px)').matches) return;
    document.querySelectorAll('.toolbar-actions').forEach(enhanceToolbar);
    document.querySelectorAll('.catalog-toolbar').forEach(enhanceCatalogToolbar);
  }

  function keepDialogsUsable() {
    document.querySelectorAll('dialog').forEach(dialog => {
      if (!dialog.dataset.mobilePolished) {
        dialog.dataset.mobilePolished = '1';
        dialog.addEventListener('click', event => {
          // Only the backdrop closes a dialog; clicking the sheet itself never does.
          if (event.target === dialog) event.stopPropagation();
        });
      }
    });
  }

  function start() {
    installStyle();
    enhanceInventory();
    enhanceMobileDropdowns();
    keepDialogsUsable();
    const observer = new MutationObserver(() => {
      enhanceInventory();
      enhanceMobileDropdowns();
      keepDialogsUsable();
    });
    observer.observe(document.body, {childList:true, subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
