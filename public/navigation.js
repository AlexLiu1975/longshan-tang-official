(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  const year = document.querySelector('#year');

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 48);

  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open') ?? false;
    toggle.setAttribute('aria-expanded', String(open));
  });

  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
  if (year) year.textContent = new Date().getFullYear();
})();
