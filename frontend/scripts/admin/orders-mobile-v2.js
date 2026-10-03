(() => {
  'use strict';

  // Compatibility shim.
  // The canonical mobile order-items renderer lives in orders-mobile.js.
  // This legacy V2 enhancer previously parsed the already-rendered summary
  // text (for example "10") and replaced the real item list with that count.
  // It must not mutate the Orders Items cell anymore.
  //
  // Keep this file in place because older page builds may still reference it,
  // but intentionally do nothing here so the canonical renderer remains the
  // single source of truth.
})();
