(() => {
  // 導覽與網站地圖由此處統一維護，避免各頁連結不一致。
  const navRoot = document.querySelector('#main-nav');
  if (navRoot) {
    navRoot.innerHTML = "<a href=\"/\">首頁</a><div class=\"nav-dropdown\" data-section=\"about\"><span class=\"nav-dropdown-head\"><a class=\"nav-dropdown-label\" href=\"/pages/about.html\">認識隴善堂</a><button class=\"nav-dropdown-toggle\" type=\"button\" aria-label=\"展開認識隴善堂選單\" aria-haspopup=\"true\" aria-expanded=\"false\">⌄</button></span><div class=\"nav-submenu\"><a href=\"/pages/deity-visits.html\">神尊蒞臨</a></div></div><a href=\"/pages/news.html\">最新公告</a><a href=\"/pages/birthdays.html\">神佛聖誕</a><div class=\"nav-dropdown\" data-section=\"ai\"><span class=\"nav-dropdown-head\"><a class=\"nav-dropdown-label\" href=\"/pages/ai.html\">AI 智慧服務</a><button class=\"nav-dropdown-toggle\" type=\"button\" aria-label=\"展開 AI 智慧服務選單\" aria-haspopup=\"true\" aria-expanded=\"false\">⌄</button></span><div class=\"nav-submenu\"><a href=\"/pages/divination.html\">線上占卦</a><a href=\"/pages/twenty-eight-mansions.html\">二十八宿介紹</a><a href=\"/pages/twenty-eight-mansions.html#yanqin-chart\">二十八宿自動排盤</a><a href=\"/pages/AnnualFortune.html\">盲派串宮壓運｜流年排盤</a><a href=\"/pages/AnnualFortuneGuide.html\">流年排盤教學</a><a href=\"/pages/xiao-liu-ren.html\">小六壬起卦</a></div></div><a href=\"/pages/contact.html\">聯絡我們</a>";
    const current = window.location.pathname;
    navRoot.querySelectorAll('a').forEach(link => {
      if (link.pathname === current && !link.hash) link.setAttribute('aria-current', 'page');
    });
  }
  const footer = document.querySelector('footer');
  if (footer && !footer.querySelector('.site-map-link')) {
    const mapLink = document.createElement('p');
    mapLink.className = 'site-map-link';
    mapLink.innerHTML = '<a href="/pages/sitemap.html" style="color:#efcd82">網站地圖</a>';
    footer.appendChild(mapLink);
  }
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
