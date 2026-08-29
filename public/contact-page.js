(() => {
  const links = window.SITE_CONFIG?.links || (typeof SITE_CONFIG !== 'undefined' ? SITE_CONFIG.links : {});
  document.querySelectorAll('[data-site-link]').forEach(node => {
    const key = node.dataset.siteLink;
    const url = links?.[key];
    if (!url) {
      node.href = '#';
      node.classList.add('pending');
      node.addEventListener('click', e => e.preventDefault());
      return;
    }
    node.href = url;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  });
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
