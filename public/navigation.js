(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  const year = document.querySelector('#year');
  const dropdowns = [...document.querySelectorAll('.nav-dropdown')];

  const closeDropdowns = except => dropdowns.forEach(dropdown => {
    if (dropdown === except) return;
    dropdown.classList.remove('is-open');
    dropdown.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
  });

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 48);

  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open') ?? false;
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) closeDropdowns();
  });

  dropdowns.forEach(dropdown => {
    const dropdownToggle = dropdown.querySelector('.nav-dropdown-toggle');
    dropdownToggle?.addEventListener('click', event => {
      event.stopPropagation();
      const open = !dropdown.classList.contains('is-open');
      closeDropdowns(dropdown);
      dropdown.classList.toggle('is-open', open);
      dropdownToggle.setAttribute('aria-expanded', String(open));
    });
  });

  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    closeDropdowns();
  }));

  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-dropdown')) closeDropdowns();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeDropdowns();
    nav?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.focus();
  });

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
  if (year) year.textContent = new Date().getFullYear();
})();
