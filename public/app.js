(() => {
  const byId = id => document.getElementById(id);
  const grid = byId('service-grid');

  const resolveHref = href => {
    if (!href.startsWith('external:')) return { href, pending: false };
    const key = href.split(':')[1];
    const value = SITE_CONFIG.links[key] || '';
    return { href: value || '#', pending: !value };
  };

  SITE_CONFIG.services.forEach(service => {
    const link = document.createElement('a');
    const resolved = resolveHref(service.href);
    link.className = `service-card${resolved.pending ? ' pending' : ''}`;
    link.href = resolved.href;
    if (resolved.pending) {
      link.setAttribute('aria-disabled', 'true');
      link.addEventListener('click', e => e.preventDefault());
    }
    link.innerHTML = `<div class="icon" aria-hidden="true">${service.icon}</div><h3>${service.title}</h3><p>${service.subtitle}${resolved.pending ? '・連結設定中' : ''}</p>`;
    grid.appendChild(link);
  });

  const bindExternal = (id, key) => {
    const node = byId(id);
    const url = SITE_CONFIG.links[key];
    if (!node) return;
    if (url) {
      node.href = url;
      node.classList.remove('pending');
      node.target = '_blank';
      node.rel = 'noopener noreferrer';
      const em = node.querySelector('em');
      if (em) em.textContent = '立即前往';
    } else {
      node.addEventListener('click', e => e.preventDefault());
    }
  };
  bindExternal('line-official', 'lineOfficial');
  bindExternal('line-community', 'lineCommunity');

  const toggle = document.querySelector('.menu-toggle');
  const nav = byId('main-nav');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  byId('year').textContent = new Date().getFullYear();
})();
