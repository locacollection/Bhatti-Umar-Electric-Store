/* BHATTI catalogue editor UX: close the editor after a confirmed successful save/publish. */
(() => {
  const init = () => {
    const form = document.getElementById('productForm');
    const dialog = document.getElementById('productEditor');
    if (!form || !dialog) return;

    let savePending = false;
    let pollTimer = 0;
    let closeTimer = 0;
    let fallbackTimer = 0;
    let saveStartedAt = 0;

    const statusNodes = () => [
      document.getElementById('productEditorMessage'),
      document.getElementById('catalogMessage')
    ].filter(Boolean);

    const statusText = () => statusNodes()
      .map(node => (node.textContent || '').trim())
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const hasError = () => statusNodes().some(node =>
      node.classList.contains('error') || /\b(error|failed|could not|unable|invalid|not saved|schema cache)\b/i.test(node.textContent || '')
    );

    const hasSuccess = () => {
      const text = statusText();
      return !!text && !hasError() && /\b(saved|published|updated|created|deleted|success|successfully)\b/i.test(text);
    };

    const finishClose = () => {
      if (!dialog.open || hasError()) return;
      dialog.close();
      savePending = false;
      saveStartedAt = 0;
      window.clearInterval(pollTimer);
      window.clearTimeout(closeTimer);
      window.clearTimeout(fallbackTimer);
      statusNodes().forEach(node => {
        node.textContent = '';
        node.classList.remove('error');
      });
    };

    const closeAfterSuccess = () => {
      if (!savePending || !dialog.open || hasError() || !hasSuccess()) return;
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(finishClose, 450);
    };

    const pollForCompletion = () => {
      window.clearInterval(pollTimer);
      pollTimer = window.setInterval(() => {
        if (!savePending || !dialog.open) {
          window.clearInterval(pollTimer);
          return;
        }
        if (hasError()) {
          window.clearInterval(pollTimer);
          window.clearTimeout(fallbackTimer);
          return;
        }
        closeAfterSuccess();
        if (Date.now() - saveStartedAt > 20000) window.clearInterval(pollTimer);
      }, 100);
    };

    form.addEventListener('submit', () => {
      savePending = true;
      saveStartedAt = Date.now();
      window.clearTimeout(closeTimer);
      window.clearTimeout(fallbackTimer);
      pollForCompletion();

      // The catalogue save routine can complete successfully without writing
      // a status message. After a generous mobile/network grace period, close
      // the editor unless an explicit validation/database error was reported.
      fallbackTimer = window.setTimeout(() => {
        if (savePending && dialog.open && !hasError()) finishClose();
      }, 8000);
    }, true);

    const observer = new MutationObserver(() => {
      if (!savePending) return;
      if (hasError()) {
        window.clearInterval(pollTimer);
        window.clearTimeout(fallbackTimer);
        return;
      }
      closeAfterSuccess();
    });
    observer.observe(dialog, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'disabled']
    });

    dialog.addEventListener('close', () => {
      savePending = false;
      saveStartedAt = 0;
      window.clearInterval(pollTimer);
      window.clearTimeout(closeTimer);
      window.clearTimeout(fallbackTimer);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
