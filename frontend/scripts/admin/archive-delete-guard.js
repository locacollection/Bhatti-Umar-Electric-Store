(() => {
  const getDb = () => window.BHATTI?.db;
  const getId = element => String(element?.dataset?.deleteArchive || '');
  const notify = (message, tone = 'error') => window.adminNotify?.(message, { title: tone === 'error' ? 'Deletion failed' : 'Archive updated', tone });
  const confirmDelete = async (count) => {
    const message = count === 1
      ? 'This permanently removes the archived order record and cannot be undone.'
      : `This permanently removes ${count} archived order records and cannot be undone.`;
    if (typeof window.confirmAction === 'function') {
      return window.confirmAction({ eyebrow: 'Permanent deletion', title: `Delete ${count} archived order${count === 1 ? '' : 's'}?`, message, confirmLabel: 'Delete forever' });
    }
    return window.confirm(message);
  };
  const deleteOne = async id => {
    const db = getDb();
    if (!db || !id) return false;
    const { error } = await db.rpc('admin_permanently_delete_archived_order', { p_archive_id: id });
    if (error) {
      notify(error.message || 'The archived order could not be deleted.');
      return false;
    }
    return true;
  };
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-delete-archive]');
    if (button) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = getId(button);
      if (!(await confirmDelete(1))) return;
      button.disabled = true;
      const ok = await deleteOne(id);
      button.disabled = false;
      if (!ok) return;
      await window.loadArchivedOrders?.({ quiet: true });
      window.adminNotify?.('Archived order permanently deleted.', { title: 'Archive updated', tone: 'success' });
      return;
    }
    const bulk = event.target.closest('#archiveDeleteSelected');
    if (!bulk) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const ids = [...document.querySelectorAll('#archiveBody .archive-select-check:checked')]
      .map(input => String(input.dataset.archiveId || ''))
      .filter(Boolean);
    if (!ids.length || !(await confirmDelete(ids.length))) return;
    bulk.disabled = true;
    let failed = 0;
    for (const id of ids) if (!(await deleteOne(id))) failed++;
    await window.loadArchivedOrders?.({ quiet: true });
    bulk.disabled = false;
    if (failed) notify(`${ids.length - failed} deleted; ${failed} could not be deleted.`);
    else window.adminNotify?.(`${ids.length} archived order${ids.length === 1 ? '' : 's'} permanently deleted.`, { title: 'Archive updated', tone: 'success' });
  }, true);
})();
