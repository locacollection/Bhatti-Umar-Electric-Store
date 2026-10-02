/* BHATTI catalogue editor UX + mobile workspace style loader. */
(() => {
  const loadMobileStyles = () => {
    if (document.getElementById('bhattiMobileUiCss')) return;
    const link = document.createElement('link');
    link.id = 'bhattiMobileUiCss';
    link.rel = 'stylesheet';
    link.href = '../styles/mobile-ui.css?v=20261002-mobile1';
    document.head.appendChild(link);
  };
  loadMobileStyles();

  const init = () => {
    const form = document.getElementById('productForm');
    const dialog = document.getElementById('productEditor');
    if (!form || !dialog) return;

    let savePending = false;
    let pollTimer = 0;
    let closeTimer = 0;
    let fallbackTimer = 0;

    const statusNodes = () => [
      document.getElementById('productEditorMessage'),
      document.getElementById('catalogMessage')
    ].filter(Boolean);

    const statusText = () => statusNodes().map(node => (node.textContent || '').trim()).filter(Boolean).join(' ').toLowerCase();
    const hasError = () => statusNodes().some(node => node.classList.contains('error') || /\b(error|failed|could not|unable|invalid|not saved|schema cache)\b/i.test(node.textContent || ''));
    const hasSuccess = () => { const text = statusText(); return !!text && !hasError() && /\b(saved|published|updated|created|deleted|success|successfully)\b/i.test(text); };

    const finishClose = () => {
      if (!dialog.open || hasError()) return;
      dialog.close();
      savePending = false;
      window.clearInterval(pollTimer);
      window.clearTimeout(closeTimer);
      window.clearTimeout(fallbackTimer);
    };

    const closeAfterSuccess = () => {
      if (!savePending || !dialog.open || hasError() || !hasSuccess()) return;
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(finishClose, 150);
    };

    const pollForCompletion = () => {
      window.clearInterval(pollTimer);
      pollTimer = window.setInterval(() => {
        if (!savePending || !dialog.open) { window.clearInterval(pollTimer); return; }
        if (hasError()) { window.clearInterval(pollTimer); window.clearTimeout(fallbackTimer); return; }
        closeAfterSuccess();
      }, 75);
    };

    form.addEventListener('submit', () => {
      savePending = true;
      window.clearTimeout(closeTimer);
      window.clearTimeout(fallbackTimer);
      pollForCompletion();
      fallbackTimer = window.setTimeout(() => {
        if (savePending && dialog.open && !hasError()) finishClose();
      }, 700);
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
    observer.observe(dialog, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:['class','disabled'] });

    dialog.addEventListener('close', () => {
      savePending = false;
      window.clearInterval(pollTimer);
      window.clearTimeout(closeTimer);
      window.clearTimeout(fallbackTimer);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
