(() => {
  'use strict';

  // Admin/Super Admin UX rule: opening an action, dialog, archive flow, or
  // editor must never summon the mobile keyboard. Users can still tap any
  // text field normally; only programmatic focus is suppressed.
  const textControls = 'input, textarea, select, [contenteditable="true"]';
  const nativeFocus = HTMLElement.prototype.focus;

  if (!HTMLElement.prototype.__bhattiNoAutoFocus) {
    HTMLElement.prototype.focus = function focus(options) {
      if (this.matches?.(textControls)) return;
      return nativeFocus.call(this, options);
    };
    Object.defineProperty(HTMLElement.prototype, '__bhattiNoAutoFocus', {
      value: true,
      configurable: false,
      enumerable: false
    });
  }

  const prepareDialogs = (root = document) => {
    root.querySelectorAll?.('dialog').forEach(dialog => {
      dialog.removeAttribute('autofocus');
      dialog.setAttribute('tabindex', '-1');

      // Give the browser a safe non-text focus target when a modal opens.
      // Manual taps on fields are unaffected by tabindex="-1".
      const controls = dialog.querySelectorAll(textControls);
      controls.forEach(control => control.removeAttribute('autofocus'));

      if (!dialog.querySelector(':scope > [autofocus]')) {
        const safeButton = dialog.querySelector('button:not([disabled]), [role="button"]');
        if (safeButton) safeButton.setAttribute('autofocus', '');
      }
    });
  };

  const start = () => {
    prepareDialogs();
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.matches?.('dialog')) prepareDialogs(node.parentNode || document);
            prepareDialogs(node);
          }
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
