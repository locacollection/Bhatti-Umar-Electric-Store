(() => {
  'use strict';
  const db = window.BHATTI?.db;
  if (!db || !window.BHATTI) return;

  // The previous integrity sync was allowed to hide rendered rows by comparing
  // DOM text with database IDs. On mobile that comparison can fail even when
  // the database correctly reports one live order. This sync is read-only:
  // the canonical order loader owns rendering and this layer only updates counts.
  BHATTI.syncStudioOrders = async function syncStudioOrdersSafely() {
    if (!document.getElementById('ordersBody')) return null;
    try {
      const [{ data: archived, error: archiveError }, { data: live, error: liveError }] = await Promise.all([
        db.from('orders').select('id,order_number,archived_at').not('archived_at', 'is', null),
        db.from('orders').select('id,order_number,status,payment_status,total,created_at').is('archived_at', null).order('created_at', { ascending: false })
      ]);
      if (archiveError || liveError) throw archiveError || liveError;

      const liveRows = live || [];
      const body = document.getElementById('ordersBody');

      // Never hide or replace rendered rows here. The main order loader is the
      // single source of truth for the order list.
      if (body) {
        body.querySelectorAll('tr[hidden], tr[aria-hidden="true"]').forEach(row => {
          row.hidden = false;
          row.removeAttribute('aria-hidden');
        });
      }

      const count = document.getElementById('orderCount');
      if (count) count.textContent = `${liveRows.length} live · ${liveRows.length} total`;
      const side = document.getElementById('sideOrderCount');
      if (side) side.textContent = liveRows.length;

      const stats = document.querySelectorAll('#stats .stat b');
      if (stats.length >= 4) {
        const inProgress = liveRows.filter(row => !['Delivered', 'Cancelled', 'Returned'].includes(row.status)).length;
        const delivered = liveRows.filter(row => row.status === 'Delivered').length;
        const revenue = liveRows.filter(row => row.payment_status === 'Paid' && !['Cancelled', 'Returned'].includes(row.status)).reduce((sum, row) => sum + Number(row.total || 0), 0);
        stats[0].textContent = liveRows.length;
        stats[1].textContent = inProgress;
        stats[2].textContent = delivered;
        stats[3].textContent = BHATTI.money(revenue);
      }

      const syncLabel = document.getElementById('topSyncLabel');
      if (syncLabel) syncLabel.textContent = `Live · ${liveRows.length} orders`;

      // If the count is non-zero but the renderer has not produced a row yet,
      // ask the canonical loader to render it. Do not clear the list on zero.
      if (liveRows.length && body && !body.querySelector('tr:not(.empty)')) {
        if (typeof window.load === 'function') {
          clearTimeout(window.__bhattiOrderRenderRetry);
          window.__bhattiOrderRenderRetry = setTimeout(() => window.load(), 120);
        }
      }

      return { live: liveRows, archived: archived || [] };
    } catch (error) {
      console.warn('Safe studio order sync failed:', error);
      return null;
    }
  };

  // Remove any stale hiding immediately if the older integrity code ran first.
  const reveal = () => {
    const body = document.getElementById('ordersBody');
    if (!body) return;
    body.querySelectorAll('tr[hidden], tr[aria-hidden="true"]').forEach(row => {
      row.hidden = false;
      row.removeAttribute('aria-hidden');
    });
  };
  reveal();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal, { once: true });
})();
