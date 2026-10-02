/* BHATTI catalogue editor UX: close the editor after a confirmed successful save/publish. */
(() => {
  const init = () => {
    const form = document.getElementById('productForm');
    const dialog = document.getElementById('productEditor');
    if (!form || !dialog) return;

    let savePending = false;
    let pollTimer = 0;
    let closeTimer = 0;
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

    const closeNow = () => {
      if (!dialog.open || hasError() || !hasSuccess()) return;
      window.clearTimeout(closeTimer);
      window.clearInterval(pollTimer);
      closeTimer = window.setTimeout(() => {
        if (!dialog.open || hasError() || !hasSuccess()) return;
        dialog.close();
        savePending = false;
        saveStartedAt = 0;
        statusNodes().forEach(node => {
          node.textContent = '';
          node.classList.remove('error');
        });
      }, 450);
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
          return;
        }
        if (hasSuccess()) {
          closeNow();
          return;
        }
        // Never close a still-running save. Give slow mobile/Supabase requests
        // up to 20 seconds to report their result.
        if (Date.now() - saveStartedAt > 20000) {
          window.clearInterval(pollTimer);
        }
      }, 100);
    };

    form.addEventListener('submit', () => {
      savePending = true;
      saveStartedAt = Date.now();
      window.clearTimeout(closeTimer);
      pollForCompletion();
    }, true);

    // Catch success/error messages even when the catalogue code changes the
    // status node through innerHTML rather than textContent.
    const observer = new MutationObserver(() => {
      if (savePending) {
        if (hasError()) {
          window.clearInterval(pollTimer);
          return;
        }
        if (hasSuccess()) closeNow();
      }
    });
    observer.observe(dialog, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });

    dialog.addEventListener('close', () => {
      savePending = false;
      saveStartedAt = 0;
      window.clearInterval(pollTimer);
      window.clearTimeout(closeTimer);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
