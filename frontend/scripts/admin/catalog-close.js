/* BHATTI catalogue editor UX: close the editor after a confirmed successful save/publish. */
(() => {
  const init = () => {
    const form = document.getElementById('productForm');
    const dialog = document.getElementById('productEditor');
    const message = document.getElementById('productEditorMessage');
    if (!form || !dialog || !message) return;

    let savePending = false;
    let closeTimer = 0;

    const isSuccess = () => {
      const text = (message.textContent || '').trim().toLowerCase();
      if (!savePending || !text || message.classList.contains('error')) return false;
      return /\b(saved|published|updated|created|deleted)\b/.test(text) && !/\b(error|failed|could not|unable|invalid|not saved)\b/.test(text);
    };

    const closeAfterSuccess = () => {
      if (!isSuccess() || !dialog.open) return;
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        if (!isSuccess() || !dialog.open) return;
        dialog.close();
        savePending = false;
        message.textContent = '';
        message.classList.remove('error');
      }, 700);
    };

    form.addEventListener('submit', () => {
      savePending = true;
      window.clearTimeout(closeTimer);
    }, true);

    const observer = new MutationObserver(closeAfterSuccess);
    observer.observe(message, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    dialog.addEventListener('close', () => {
      savePending = false;
      window.clearTimeout(closeTimer);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
