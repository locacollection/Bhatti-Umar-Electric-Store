(() => {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function installStyle() {
    if (document.getElementById('bhattiOrdersMobileV2Style')) return;
    const style = document.createElement('style');
    style.id = 'bhattiOrdersMobileV2Style';
    style.textContent = `
      @media (max-width:700px){
        #ordersSection .mobile-v2-items{margin-top:8px}
        #ordersSection .mobile-v2-items-toggle{width:100%;min-height:42px;padding:9px 12px;border:1px solid rgba(39,31,24,.12);border-radius:11px;background:#fffaf4;color:#29231e;display:flex;align-items:center;justify-content:space-between;gap:10px;font:inherit;font-size:11px;font-weight:800;text-align:left;cursor:pointer}
        #ordersSection .mobile-v2-items-toggle .chevron{font-size:15px;transition:transform .18s ease}
        #ordersSection .mobile-v2-items-toggle[aria-expanded="true"] .chevron{transform:rotate(180deg)}
        #ordersSection .mobile-v2-items-panel{display:none;margin-top:6px;padding:9px 11px;border-left:2px solid #d7a52a;border-radius:0 10px 10px 0;background:#faf6ef}
        #ordersSection .mobile-v2-items-panel.open{display:grid;gap:7px}
        #ordersSection .mobile-v2-item{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;min-width:0;font-size:11px;line-height:1.35;color:#514940}
        #ordersSection .mobile-v2-item-name{min-width:0;overflow-wrap:anywhere}
        #ordersSection .mobile-v2-item-qty{flex:0 0 auto;font-weight:800;color:#29231e;white-space:nowrap}
        #ordersSection .mobile-v2-hidden-original{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function getItemsFromCell(cell) {
    const raw = String(cell?.textContent || '').replace(/\s+/g, ' ').trim();
    const countMatch = raw.match(/\d+/);
    const count = countMatch ? Number(countMatch[0]) : 0;
    return { raw, count };
  }

  function parseNames(raw) {
    if (!raw) return [];
    return raw
      .split(/\n|•|\|/)
      .map(s => s.replace(/^items?\s*:?/i,'').trim())
      .filter(Boolean)
      .slice(0, 8)
      .map(text => {
        const match = text.match(/^(.*?)(?:\s*[×x]\s*(\d+))$/i);
        return { name: (match?.[1] || text).trim(), qty: match?.[2] ? Number(match[2]) : null };
      });
  }

  function enhanceRow(row) {
    if (!row || row.classList.contains('empty')) return;
    const cells = row.querySelectorAll(':scope > td');
    if (cells.length < 3) return;
    const cell = cells[2];
    if (!cell || cell.dataset.mobileV2Done === '1') return;

    const original = String(cell.textContent || '').replace(/\s+/g,' ').trim();
    const { count } = getItemsFromCell(cell);
    const parsed = parseNames(original);
    const itemCount = count || parsed.length || 0;
    const panelId = `mobile-v2-items-${Math.random().toString(36).slice(2,10)}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'mobile-v2-items';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mobile-v2-items-toggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls',panelId);
    toggle.innerHTML = `<span>View ${itemCount} item${itemCount === 1 ? '' : 's'}</span><span class="chevron" aria-hidden="true">⌄</span>`;

    const panel = document.createElement('div');
    panel.className = 'mobile-v2-items-panel';
    panel.id = panelId;
    panel.innerHTML = parsed.length
      ? parsed.map(item => `<div class="mobile-v2-item"><span class="mobile-v2-item-name">${esc(item.name)}</span><span class="mobile-v2-item-qty">${item.qty == null ? '' : `× ${item.qty}`}</span></div>`).join('')
      : `<div class="mobile-v2-item"><span class="mobile-v2-item-name">Open Inspect to view item details.</span></div>`;

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      panel.classList.toggle('open', !open);
    });

    wrapper.append(toggle,panel);
    cell.replaceChildren(wrapper);
    cell.dataset.mobileV2Done = '1';
  }

  function apply() {
    if (window.innerWidth > 700) return;
    document.querySelectorAll('#ordersBody > tr').forEach(enhanceRow);
  }

  function start() {
    installStyle();
    apply();
    const body = document.getElementById('ordersBody');
    if (!body) return;
    let timer;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(apply, 20);
    }).observe(body,{childList:true,subtree:true});
    window.addEventListener('resize',apply);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
