/* === Shared header/footer injection (added) === */
async function injectHTML(targetId, url) {
  const host = document.getElementById(targetId);
  if (!host) return null;
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    host.innerHTML = await res.text();
    return host;
  } catch (e) {
    console.error(e);
    return null;
  }
}

function initHeaderInteractions() {
  if (document.body.dataset.headerInited === '1') return;
  const navToggle = document.querySelector('.nav-toggle');
  const overlay   = document.getElementById('mobile-menu');
  const closeBtn  = document.querySelector('.menu-close');
  if (!navToggle || !overlay || !closeBtn) return;

  navToggle.addEventListener('click', () => {
    const isOpen = !overlay.classList.contains('open');
    overlay.classList.toggle('open', isOpen);
    overlay.setAttribute('aria-hidden', String(!isOpen));
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
  });

  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'メニューを開く');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024 && overlay.classList.contains('open')) {
      closeBtn.click();
    }
  }, { passive: true });

  document.body.dataset.headerInited = '1';
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    injectHTML('include-header', 'common/header.html'),
    injectHTML('include-footer', 'common/footer.html')
  ]);
  initHeaderInteractions();

  // Inject year navigation blocks (concert/history) when placeholders exist
  const [concertNav, historyNav] = await Promise.all([
    injectHTML('concert-year-nav', 'concert/year-nav.html'),
    injectHTML('history-year-nav', 'history/year-nav.html')
  ]);

  const enhanceYearNav = (navHost, section, defaultHref) => {
    if (!navHost) return;
    const anchors = Array.from(navHost.querySelectorAll('a'));
    if (!anchors.length) return;

    const applyCurrent = (anchor) => {
      anchor.setAttribute('aria-current', 'page');
      anchor.classList.add('is-current');
    };

    const pathname = (location.pathname || '').replace(/\/+/g, '/');
    const sectionPath = `${section}/`;
    const idx = pathname.lastIndexOf(`/${sectionPath}`);
    const relative = idx >= 0
      ? pathname.slice(idx + 1)
      : pathname.replace(/^\/+/, '');

    const matched = anchors.find(a => a.getAttribute('href') === relative);
    if (matched) {
      applyCurrent(matched);
      return;
    }

    const normalized = pathname.replace(/\/+$/, '');
    if (
      normalized.endsWith(`/${section}`) ||
      normalized.endsWith(`/${sectionPath}`)
    ) {
      const fallback = anchors.find(a => a.getAttribute('href') === defaultHref);
      if (fallback) applyCurrent(fallback);
    }
  };

  enhanceYearNav(concertNav, 'concert', 'concert/concert.html');
  enhanceYearNav(historyNav, 'history', 'history/history.html');

  // Sticky (JS-driven): ブラウザ差を無視して常にスクロール量で固定化を制御
  (function initStickyFixed() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    // ヘッダー高をCSS変数へ反映（固定化時のレイアウトジャンプ防止）
    const setHeaderHeight = () => {
      const h = header.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    };
    setHeaderHeight();
    window.addEventListener('resize', setHeaderHeight, { passive: true });

    // スクロールで .is-fixed を付与／削除
    const onScroll = () => {
      const sc = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (sc > 0) {
        if (!header.classList.contains('is-fixed')) {
          header.classList.add('is-fixed');
        }
        document.body.style.paddingTop =
          getComputedStyle(document.documentElement).getPropertyValue('--header-height');
      } else {
        header.classList.remove('is-fixed');
        document.body.style.paddingTop = '';
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  // -------------------------------
  // (nav interactions are initialized in initHeaderInteractions() after injection)
  // -------------------------------

  // -------------------------------
  // 2. Hero Text Animation
  // -------------------------------
  const hero = document.querySelector('.hero');
  window.addEventListener('load', () => {
    if (hero) hero.classList.add('loaded');
  });

  // -------------------------------
  // 3. Background Cross-Fade
  // -------------------------------
  if (hero) {
    const desktopLayers = ['desktop1.jpg', 'desktop2.jpg', 'desktop3.jpg'];
    const mobileLayers  = ['mobile1.jpg','mobile2.jpg','mobile3.jpg','mobile4.jpg','mobile5.jpg','mobile6.jpg'];

    // Viewport width helper (iPad Safariでツールバー表示/非表示によるレイアウト変動に強い)
    const getViewportWidth = () => {
      const vv = window.visualViewport;
      return Math.min(window.innerWidth, vv ? Math.round(vv.width) : window.innerWidth);
    };

    // CSSと同じ判定に合わせる（767.98px以下をモバイル）
    const isMobileMQ = () => window.matchMedia('(max-width: 767.98px)').matches;

    // PC/Tablet判定（背景fixedはPCのみ）
    const isPC = () => getViewportWidth() >= 1367;

    // 現在のレイヤーセット
    let layers = isMobileMQ() ? mobileLayers : desktopLayers;
    let idx = 0;

    function applyBg() {
      // 背景attachmentはPCのみfixed、その他はscroll
      const attachment = isPC() ? 'fixed' : 'scroll';
      const repeat = 'no-repeat';
      hero.style.background = `
        linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)),
        url('img/${layers[idx]}') center / cover ${repeat} ${attachment}
      `;
    }

    // 初期適用
    applyBg();

    // リサイズ/向き変更/ビューポート変化に反応（iPad Safari対策）
    let rafId = null;
    const onResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const nextLayers = isMobileMQ() ? mobileLayers : desktopLayers;
        if (nextLayers !== layers) {
          layers = nextLayers;
          idx = 0; // セットが変わったら先頭に戻す
        }
        applyBg();
      });
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize, { passive: true });
    }

    // 4秒ごとに背景を巡回
    setInterval(() => {
      idx = (idx + 1) % layers.length;
      applyBg();
    }, 4000);
  }

  // -------------------------------
  // 4. Scroll-triggered Fade-in (IntersectionObserver)
  // -------------------------------
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  // Observe fade-up elements and cards
  document.querySelectorAll('.fade-up, .card').forEach(el => {
    observer.observe(el);
  });

  // Also observe footer for fade-in
  const footer = document.querySelector('.site-footer');
  if (footer) observer.observe(footer);

  // -------------------------------
  // 5. Close mobile menu on resize
  // -------------------------------
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      const overlay = document.getElementById('mobile-menu');
      const closeBtn = document.querySelector('.menu-close');
      if (overlay && closeBtn && overlay.classList.contains('open')) {
        closeBtn.click();
      }
    }
  });
  // -------------------------------
  // 6. Facebook Page Plugin (iframe) responsive sizing
  // -------------------------------
  (function(){
    const fbEl = document.getElementById('fbPage');
    if (!fbEl) return; // Facebook iframe が無いページはスキップ

    const FB_PAGE_URL = 'https%3A%2F%2Fwww.facebook.com%2FSuwaCityWindBand';
    const BASE = `https://www.facebook.com/plugins/page.php?href=${FB_PAGE_URL}&tabs=timeline&hide_cover=false&show_facepile=true&adapt_container_width=false`;

    const getVW = () => {
      const vv = window.visualViewport;
      return Math.min(window.innerWidth, vv ? Math.round(vv.width) : window.innerWidth);
    };
    const pickWidth  = vw => (vw <= 767 ? 300 : (vw <= 1024 ? 420 : 500));
    const pickHeight = vw => (vw <= 767 ? 560 : (vw <= 1024 ? 640 : 700));

    const applySrc = () => {
      const vw = getVW();
      const w = pickWidth(vw);
      const h = pickHeight(vw);
      fbEl.src = `${BASE}&width=${w}&height=${h}`;
      fbEl.style.height = h + 'px';
    };

    // 初期適用とイベント登録
    applySrc();
    window.addEventListener('resize', applySrc, { passive: true });
    window.addEventListener('orientationchange', applySrc);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', applySrc, { passive: true });
    }
  })();
});
