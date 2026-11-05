/* ================================================================
   諏訪市民吹奏楽団 — 共通スクリプト
   ----------------------------------------------------------------
   0. アクセス解析（Google アナリティクス 4）
   1. 共通パーツ（ヘッダー / フッター / 年ナビ）の読み込み
   2. ヘッダー高の計測
   3. モバイルメニューの開閉
   4. 年ナビの現在地強調
   5. ヒーロー背景のクロスフェード
   6. スクロール表示アニメーション
   7. Facebook 投稿の埋め込み
   8. トップページの演出（スクロール時のヘッダー / カウントダウン / 数字）
   ================================================================ */
(function () {
  'use strict';

  /* CSS 側の「JS があるときだけ隠す」判定用フラグ。
     読み込み直後に付けることで、JS が動かない環境では
     コンテンツが最初から見える状態を保つ。 */
  document.documentElement.classList.add('js');

  /* ==============================================================
     0. アクセス解析（Google アナリティクス 4）
     全ページがこのファイルを読み込むため、ここで一括して計測タグを入れる。
     ローカル確認中（localhost / ファイル直接表示）は計測しない。
     ============================================================== */
  (function loadAnalytics() {
    var GA_ID = 'G-YLQLQX6D2R';
    var host = location.hostname;
    if (location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host === '') return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  })();

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function resolveBaseHref() {
    var base = document.querySelector('base');
    return base ? (base.getAttribute('href') || './') : './';
  }

  /** リサイズ等の連続イベントを間引く */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait || 150);
    };
  }

  function isSameImageSet(current, next) {
    if (!current || !next || current.length !== next.length) return false;
    for (var i = 0; i < current.length; i += 1) {
      if (current[i] !== next[i]) return false;
    }
    return true;
  }

  /* ==============================================================
     1. 共通パーツの読み込み
     ============================================================== */
  /**
   * 部分テンプレートを読み込んで差し込む。
   * unwrap を true にすると、差し込み後にプレースホルダーの <div> を取り除き、
   * 中身を body 直下へ引き上げる。
   * これをしないと position:sticky のヘッダーが
   * プレースホルダーの高さぶんしか追従できない（＝すぐ画面外に消える）。
   */
  function injectHTML(targetId, url, unwrap) {
    var host = document.getElementById(targetId);
    if (!host) return Promise.resolve(null);

    return fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + url + ': ' + res.status);
        return res.text();
      })
      .then(function (html) {
        host.innerHTML = html;
        if (!unwrap) return host;

        var parent = host.parentNode;
        while (host.firstChild) {
          parent.insertBefore(host.firstChild, host);
        }
        parent.removeChild(host);
        return parent;
      })
      .catch(function (err) {
        console.error(err);
        return null;
      });
  }

  function loadSharedParts() {
    return Promise.all([
      injectHTML('include-header', 'common/header.html', true),
      injectHTML('include-footer', 'common/footer.html', true),
      injectHTML('concert-year-nav', 'concert/year-nav.html'),
      injectHTML('history-year-nav', 'history/year-nav.html')
    ]);
  }

  /* ==============================================================
     2. ヘッダー高の計測
     アンカーリンクのスクロール位置補正（CSS の scroll-margin-top）に使う。
     ============================================================== */
  function trackHeaderHeight() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var apply = function () {
      var h = Math.round(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--header-height', h + 'px');
    };

    apply();
    window.addEventListener('resize', debounce(apply, 120), { passive: true });
    window.addEventListener('orientationchange', apply);

    // Web フォント読み込み後にロゴ高さが変わるケースに追随
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(apply).catch(function () {});
    }
  }

  /* ==============================================================
     2b. スキップリンクの参照先を補正
     全ページで <base href> を使っているため、"#main" だけだと
     ベース URL（トップページ等）へ飛んでしまう。現在のパスを付け直す。
     ============================================================== */
  function fixSkipLink() {
    var links = document.querySelectorAll('.skip-link, .page-top');
    Array.prototype.forEach.call(links, function (link) {
      link.setAttribute('href', location.pathname + location.search + '#main');
    });
  }

  /* ==============================================================
     3. モバイルメニュー
     ============================================================== */
  function initMobileMenu() {
    var toggle = document.querySelector('.nav-toggle');
    var overlay = document.getElementById('mobile-menu');
    var closeBtn = document.querySelector('.menu-close');
    if (!toggle || !overlay || !closeBtn) return;

    var isOpen = function () { return overlay.classList.contains('open'); };

    function setState(open, moveFocus) {
      overlay.classList.toggle('open', open);
      overlay.setAttribute('aria-hidden', String(!open));
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      // 背面のスクロールを止める（iOS でメニュー越しに本文が動くのを防ぐ）
      document.body.classList.toggle('menu-open', open);
      if (moveFocus === false) return;
      if (open) {
        closeBtn.focus();
      } else {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () { setState(!isOpen(), true); });
    closeBtn.addEventListener('click', function () { setState(false, true); });

    // メニュー内のリンクを押したら閉じる（同一ページ内リンク対策）
    overlay.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setState(false, false);
    });

    // Esc キーで閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setState(false, true);
    });

    // 開いている間は Tab / Shift+Tab をメニュー内で循環させる（フォーカストラップ）
    var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), ' +
                    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusable() {
      return Array.prototype.filter.call(overlay.querySelectorAll(FOCUSABLE), function (el) {
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !isOpen()) return;
      var items = getFocusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      var current = document.activeElement;
      var inside = overlay.contains(current);

      if (e.shiftKey) {
        if (!inside || current === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // デスクトップ幅に戻ったら閉じる（メニューが開いたまま残るのを防ぐ）
    var desktop = window.matchMedia('(min-width: 1025px)');
    var onChange = function (e) { if (e.matches && isOpen()) setState(false, false); };
    if (desktop.addEventListener) {
      desktop.addEventListener('change', onChange);
    } else if (desktop.addListener) {
      desktop.addListener(onChange);
    }

    // 初期状態を明示（このときはフォーカスを動かさない）
    setState(false, false);
  }

  /* ==============================================================
     4. 年ナビの現在地強調
     ============================================================== */
  function enhanceYearNav(navHost, section, defaultHref) {
    if (!navHost) return;
    var anchors = Array.prototype.slice.call(navHost.querySelectorAll('a'));
    if (!anchors.length) return;

    function applyCurrent(anchor) {
      anchor.setAttribute('aria-current', 'page');
      anchor.classList.add('is-current');
    }

    var pathname = (location.pathname || '').replace(/\/+/g, '/');
    var sectionPath = section + '/';
    var idx = pathname.lastIndexOf('/' + sectionPath);
    var relative = idx >= 0
      ? pathname.slice(idx + 1)
      : pathname.replace(/^\/+/, '');

    var matched = anchors.filter(function (a) {
      return a.getAttribute('href') === relative;
    })[0];

    if (matched) {
      applyCurrent(matched);
      return;
    }

    var normalized = pathname.replace(/\/+$/, '');
    if (normalized.endsWith('/' + section) || normalized.endsWith('/' + sectionPath)) {
      var fallback = anchors.filter(function (a) {
        return a.getAttribute('href') === defaultHref;
      })[0];
      if (fallback) applyCurrent(fallback);
    }
  }

  /* ==============================================================
     5. ヒーロー背景のクロスフェード
     CSS には静止画のフォールバックを置き、JS が動くときだけ
     2 枚のレイヤーを重ねて滑らかに切り替える。
     ============================================================== */
  function initHero() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    hero.classList.add('loaded');

    var desktopImages = ['desktop1.jpg', 'desktop2.jpg', 'desktop3.jpg'];
    var mobileImages = ['mobile1.jpg', 'mobile2.jpg', 'mobile3.jpg',
                        'mobile4.jpg', 'mobile5.jpg', 'mobile6.jpg'];
    var getImagesForViewport = function (isMobile) {
      return isMobile ? mobileImages : desktopImages;
    };

    // CSS のブレークポイントと同じ基準でモバイル判定
    var mobileMQ = window.matchMedia('(max-width: 767.98px)');

    var media = document.createElement('div');
    media.className = 'hero-media';
    media.setAttribute('aria-hidden', 'true');

    var layers = [document.createElement('div'), document.createElement('div')];
    layers.forEach(function (layer) {
      layer.className = 'hero-layer';
      media.appendChild(layer);
    });
    hero.insertBefore(media, hero.firstChild);

    var images = getImagesForViewport(mobileMQ.matches);
    var index = 0;
    var active = 0;

    function show(i) {
      var next = (active + 1) % 2;
      layers[next].style.backgroundImage = 'url("' + resolveBaseHref() + 'img/' + images[i] + '")';
      layers[next].classList.add('is-active');
      layers[active].classList.remove('is-active');
      active = next;
    }

    show(index);

    // 端末幅が変わったら画像セットを差し替える
    var onBreakpointChange = function () {
      var nextImages = getImagesForViewport(mobileMQ.matches);
      if (isSameImageSet(images, nextImages)) return;
      images = nextImages;
      index = 0;
      show(index);
    };
    if (mobileMQ.addEventListener) {
      mobileMQ.addEventListener('change', onBreakpointChange);
    } else if (mobileMQ.addListener) {
      mobileMQ.addListener(onBreakpointChange);
    }

    // 動きを減らす設定のときは切り替えない
    if (prefersReducedMotion.matches) return;

    var timer = null;
    function start() {
      if (timer) return;
      timer = setInterval(function () {
        index = (index + 1) % images.length;
        show(index);
      }, 6000);
    }
    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }

    // 非表示タブでは止める（モバイルのバッテリー消費を抑える）
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    start();
  }

  /* ==============================================================
     6. スクロール表示アニメーション
     ============================================================== */
  function initReveal() {
    var targets = document.querySelectorAll('.fade-up, .card, .site-footer');

    // IntersectionObserver 非対応、または動きを減らす設定ならすぐ表示
    if (!('IntersectionObserver' in window) || prefersReducedMotion.matches) {
      Array.prototype.forEach.call(targets, function (el) {
        el.classList.add('visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

    Array.prototype.forEach.call(targets, function (el) {
      observer.observe(el);
    });
  }

  /* ==============================================================
     7. Facebook 投稿の埋め込み
     ページプラグイン（タイムライン）はログインしていない閲覧者に
     投稿が表示されないため、個別投稿（.fb-post）を公式 SDK で描画する。
     SDK が投稿の高さに合わせて iframe を自動で伸縮させる。
     ============================================================== */
  function initFacebookPlugin() {
    if (!document.querySelector('.fb-post')) return;
    if (document.getElementById('facebook-jssdk')) return;

    var js = document.createElement('script');
    js.id = 'facebook-jssdk';
    js.async = true;
    js.defer = true;
    js.crossOrigin = 'anonymous';
    js.src = 'https://connect.facebook.net/ja_JP/sdk.js#xfbml=1&version=v21.0';
    document.body.appendChild(js);
  }

  /* ==============================================================
     8. トップページの演出
     ============================================================== */
  /** 少しスクロールしたらヘッダーに影を付ける */
  function initHeaderShadow() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var apply = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    apply();
    window.addEventListener('scroll', apply, { passive: true });
  }

  /** data-countdown の日時までの残り日数を表示（過ぎたら非表示のまま） */
  function initCountdown() {
    var el = document.querySelector('[data-countdown]');
    if (!el) return;

    var target = new Date(el.getAttribute('data-countdown'));
    var days = Math.ceil((target - new Date()) / 86400000);
    if (isNaN(days) || days < 1) return;

    el.querySelector('.countdown-num').textContent = days;
    el.hidden = false;
  }

  /** 画面に入ったら数字を 0 から data-to までカウントアップ */
  function initCountUp() {
    var nums = document.querySelectorAll('.count-up');
    if (!nums.length || !('IntersectionObserver' in window) || prefersReducedMotion.matches) return;

    function run(el) {
      var to = parseInt(el.getAttribute('data-to'), 10);
      // 年号のような大きい数は途中から数える（0 からだと間延びする）
      var from = to > 1000 ? to - 40 : 0;
      var start = null;
      var duration = 1400;

      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (to - from) * eased);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    Array.prototype.forEach.call(nums, function (el) {
      observer.observe(el);
    });
  }

  function initSite() {
    loadSharedParts().then(function (results) {
      var concertNav = results[2];
      var historyNav = results[3];

      trackHeaderHeight();
      fixSkipLink();
      initMobileMenu();
      enhanceYearNav(concertNav, 'concert', 'concert/concert.html');
      enhanceYearNav(historyNav, 'history', 'history/history.html');

      initHero();
      initReveal();
      initFacebookPlugin();
      initHeaderShadow();
      initCountdown();
      initCountUp();
    });
  }

  /* ==============================================================
     起動
     ============================================================== */
  document.addEventListener('DOMContentLoaded', initSite);
})();
