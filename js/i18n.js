/* js/i18n.js — đa ngôn ngữ cho sách Optimum
 * Nguồn gốc là tiếng Việt. Chọn ngôn ngữ khác => dịch toàn bộ chữ trên trang bằng
 * endpoint miễn phí của Google Dịch, lưu cache vào localStorage (lần sau không gọi mạng nữa).
 * Cách dùng: thêm <link rel="stylesheet" href="css/i18n.css"> và
 *            <script src="js/i18n.js"></script> (đặt SAU js/main.js).
 * Tắt dịch cho một phần tử: thêm thuộc tính data-no-i18n.
 */
(function () {
  'use strict';

  var SRC = 'vi';
  var KEY = 'optb.lang';
  var CACHE_PREFIX = 'optb.tr1.';
  var ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

  // c = mã hiển thị trong menu, g = mã gửi cho Google Dịch
  var LANGS = [
    { c: 'EN',  n: 'English',          g: 'en' },
    { c: 'VI',  n: 'Tiếng Việt',       g: 'vi' },
    { c: 'ZH',  n: '中文',              g: 'zh-CN' },
    { c: 'KO',  n: '한국어',             g: 'ko' },
    { c: 'RU',  n: 'Русский',          g: 'ru' },
    { c: 'UK',  n: 'Українська',       g: 'uk' },
    { c: 'ID',  n: 'Bahasa Indonesia', g: 'id' },
    { c: 'FIL', n: 'Filipino',         g: 'tl' },
    { c: 'HI',  n: 'हिन्दी',            g: 'hi' },
    { c: 'BN',  n: 'বাংলা',             g: 'bn' },
    { c: 'NG',  n: 'Hausa (Nigeria)',  g: 'ha' }
  ];

  // Font cho các hệ chữ mà Be Vietnam Pro / Fraunces không có
  var FONTS = {
    'zh-CN': { gf: 'Noto+Sans+SC:wght@400;500;700', fam: "'Noto Sans SC','PingFang SC','Microsoft YaHei'" },
    ko:      { gf: 'Noto+Sans+KR:wght@400;500;700', fam: "'Noto Sans KR','Malgun Gothic'" },
    ru:      { gf: 'Noto+Sans:wght@400;500;700',    fam: "'Noto Sans'" },
    uk:      { gf: 'Noto+Sans:wght@400;500;700',    fam: "'Noto Sans'" },
    hi:      { gf: 'Noto+Sans+Devanagari:wght@400;500;700', fam: "'Noto Sans Devanagari','Mangal'" },
    bn:      { gf: 'Noto+Sans+Bengali:wght@400;500;700',    fam: "'Noto Sans Bengali','Vrinda'" }
  };

  var SKIP = 'script,style,noscript,code,pre,canvas,svg,textarea,[data-no-i18n],.cv-title,.num,#i18n';
  var ATTRS = ['alt', 'aria-label', 'title'];

  var cache = {};            // { "câu tiếng Việt": "bản dịch" }
  var outs = new Set();      // mọi bản dịch đã tạo ra (để không dịch lại chính kết quả)
  var lastText = new WeakMap();   // text node -> chuỗi do mình đặt
  var lastAttr = new WeakMap();   // element   -> { attr: chuỗi do mình đặt }
  var busy = 0;
  var target;

  /* ---------- tiện ích ---------- */
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  var DIG = /[0-9\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF]+/g;
  function key(c) { return c.replace(/\d+/g, '0'); }
  function fill(tr, orig) {            // đặt lại đúng các số gốc vào bản dịch
    var nums = orig.match(/\d+/g);
    if (!nums) return tr;
    var cnt = (tr.match(DIG) || []).length;
    if (cnt !== nums.length) return null;
    var i = 0;
    return tr.replace(DIG, function () { return nums[i++]; });
  }
  function hasWords(s) { try { return /\p{L}{3,}/u.test(s); } catch (e) { return /[A-Za-zÀ-ỹ]{3,}/.test(s); } }

  function pick() {
    var q = (location.search.match(/[?&]lang=([\w-]+)/) || [])[1];
    var s = null;
    try { s = localStorage.getItem(KEY); } catch (e) {}
    return (q || s) ? byCode(String(q || s).toUpperCase()) : null;
  }
  function byCode(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].c === code) return LANGS[i];
    return null;
  }

  var cacheFor = null;
  function loadCache(g) {
    try { cache = JSON.parse(localStorage.getItem(CACHE_PREFIX + g) || '{}'); } catch (e) { cache = {}; }
    for (var k in cache) outs.add(cache[k]);
  }
  function ensureCache() {            // nạp cache đúng ngôn ngữ đích (một lần cho mỗi ngôn ngữ)
    if (cacheFor === target.g) return;
    cacheFor = target.g;
    loadCache(target.g);
  }
  var saveTimer;
  function saveCache(g) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(CACHE_PREFIX + g, JSON.stringify(cache)); } catch (e) {}
    }, 400);
  }

  function setBusy(d) {
    busy += d;
    document.documentElement.classList.toggle('i18n-busy', busy > 0);
  }

  /* ---------- gọi Google Dịch ---------- */
  function parse(d) {
    return d[0].map(function (s) { return (s && s[0]) || ''; }).join('');
  }
  function url(g) { return ENDPOINT + '?client=gtx&sl=' + SRC + '&tl=' + g + '&dt=t'; }

  function postGT(text, g) {
    return fetch(url(g), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'q=' + encodeURIComponent(text)
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(parse);
  }
  function getGT(text, g) {
    return fetch(url(g) + '&q=' + encodeURIComponent(text))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(parse);
  }

  function put(src, tr) {
    tr = norm(tr) || src;
    cache[src] = tr;
    outs.add(tr);
  }

  // Dịch một lô: ghép bằng \n, dịch một lần, tách lại. Lệch số dòng thì dịch từng câu.
  function doChunk(arr, g) {
    return postGT(arr.join('\n'), g).then(function (t) {
      var parts = t.split('\n');
      if (parts.length !== arr.length) throw new Error('mismatch');
      arr.forEach(function (s, i) { put(s, parts[i]); });
    }).catch(function () {
      return arr.reduce(function (p, s) {
        return p.then(function () {
          return getGT(s, g).then(function (t) { put(s, t); }).catch(function () {});
        });
      }, Promise.resolve());
    });
  }

  function chunk(list) {
    var out = [], cur = [], len = 0;
    list.forEach(function (s) {
      if (cur.length && (len + s.length > 2200 || cur.length >= 30)) { out.push(cur); cur = []; len = 0; }
      cur.push(s); len += s.length + 1;
    });
    if (cur.length) out.push(cur);
    return out;
  }

  function translateList(list, g) {
    var queue = chunk(list), workers = [];
    function work() {
      var c = queue.shift();
      if (!c) return Promise.resolve();
      return doChunk(c, g).then(work);
    }
    for (var i = 0; i < 3; i++) workers.push(work());
    return Promise.all(workers).then(function () { saveCache(g); });
  }

  /* ---------- duyệt DOM ---------- */
  function txtOk(n) {
    var p = n.parentElement;
    if (!p || p.closest(SKIP)) return false;
    var v = n.nodeValue;
    if (lastText.get(n) === v) return false;
    var c = norm(v);
    return hasWords(c) && !outs.has(c);
  }

  function collect(root, out) {
    if (root.nodeType === 3) { if (txtOk(root)) out.push({ n: root }); return; }
    if (root.nodeType !== 1 || (root.closest && root.closest(SKIP))) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) if (txtOk(n)) out.push({ n: n });
    var els = [root].concat([].slice.call(root.querySelectorAll('[alt],[aria-label],[title]')));
    els.forEach(function (el) {
      if (el.closest(SKIP)) return;
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        var v = el.getAttribute(a), l = lastAttr.get(el);
        if (l && l[a] === v) return;
        var c = norm(v);
        if (hasWords(c) && !outs.has(c)) out.push({ n: el, a: a });
      });
    });
  }

  function val(it) { return it.a ? it.n.getAttribute(it.a) : it.n.nodeValue; }

  function apply(items) {
    items.forEach(function (it) {
      var v = val(it), c = norm(v), tr = cache[key(c)];
      if (tr === undefined) return;
      tr = fill(tr, c);
      if (tr === null) return;
      if (it.a) {
        it.n.setAttribute(it.a, tr);
        var l = lastAttr.get(it.n) || {}; l[it.a] = tr; lastAttr.set(it.n, l);
      } else {
        var m = v.match(/^(\s*)[\s\S]*?(\s*)$/);
        var out = m[1] + tr + m[2];
        it.n.nodeValue = out;
        lastText.set(it.n, out);
      }
    });
  }

  function run(items) {
    var miss = {};
    items.forEach(function (it) { var c = key(norm(val(it))); if (cache[c] === undefined) miss[c] = 1; });
    var list = Object.keys(miss);
    if (!list.length) { apply(items); return Promise.resolve(); }
    setBusy(1);
    return translateList(list, target.g).then(function () { apply(items); })
      .then(function () { setBusy(-1); }, function () { setBusy(-1); });
  }

  /* ---------- chạy + theo dõi nội dung mới (sách dựng trang, HUD đổi chữ…) ---------- */
  var pending = [], timer;
  function schedule(items) {
    if (!items.length) return;
    pending = pending.concat(items);
    clearTimeout(timer);
    timer = setTimeout(function () { var b = pending; pending = []; run(b); }, 120);
  }

  function start() {
    ensureCache();
    var items = [];
    collect(document.body, items);
    run(items);

    new MutationObserver(function (muts) {
      var out = [];
      muts.forEach(function (m) {
        if (m.type === 'childList') [].forEach.call(m.addedNodes, function (n) { collect(n, out); });
        else if (m.type === 'characterData') collect(m.target, out);
        else if (m.type === 'attributes') collect(m.target, out);
      });
      schedule(out);
    }).observe(document.body, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
    fire();                            // báo cho mô hình 3D / SVG: ngôn ngữ đã chọn xong
  }

  /* ---------- font theo hệ chữ ---------- */
  function applyFont(l) {
    var f = FONTS[l.g];
    if (!f) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + f.gf + '&display=swap';
    document.head.appendChild(link);
    document.documentElement.style.setProperty('--i18n-font', f.fam + ",system-ui,sans-serif");
    document.documentElement.setAttribute('data-script', 'x');
  }

  /* ---------- menu chọn ngôn ngữ ---------- */
  function buildUI(cur) {
    var root = document.createElement('div');
    root.id = 'i18n';
    root.setAttribute('data-no-i18n', '');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'i18n-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Language');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg>' +
      '<b>' + cur.c + '</b>';

    var ul = document.createElement('ul');
    ul.id = 'i18n-list';
    ul.setAttribute('role', 'listbox');
    ul.hidden = true;

    LANGS.forEach(function (l) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.tabIndex = 0;
      li.dataset.c = l.c;
      if (l.c === cur.c) li.setAttribute('aria-selected', 'true');
      li.innerHTML = '<span class="cd">' + l.c + '</span><span class="nm">' + l.n + '</span><span class="ck">✓</span>';
      ul.appendChild(li);
    });

    var bar = document.createElement('i');
    bar.id = 'i18n-bar';

    root.appendChild(btn); root.appendChild(ul); root.appendChild(bar);
    document.body.appendChild(root);

    // không cho sách bắt sự kiện kéo/cuộn khi đang thao tác với menu
    ['pointerdown', 'wheel', 'touchstart', 'mousedown'].forEach(function (ev) {
      root.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
    });

    function toggle(open) {
      ul.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { toggle(ul.hidden); });
    document.addEventListener('pointerdown', function (e) { if (!root.contains(e.target)) toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });

    function choose(li) {
      var c = li.dataset.c;
      if (c === target.c) { toggle(false); return; }
      try { localStorage.setItem(KEY, c); } catch (e) {}
      // bỏ ?lang= trên URL để lựa chọn đã lưu có hiệu lực, rồi nạp lại từ bản tiếng Việt gốc
      if (/[?&]lang=/.test(location.search)) {
        var u = new URL(location.href); u.searchParams.delete('lang');
        history.replaceState(null, '', u.toString());
      }
      location.reload();
    }
    ul.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) choose(li); });
    ul.addEventListener('keydown', function (e) {
      var li = e.target.closest('li');
      if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); choose(li); }
    });
  }

  /* ---------- tự nhận ngôn ngữ theo quốc gia (IP) ---------- */
  var CC_KEY = 'optb.cc';
  // quốc gia -> mã ngôn ngữ trong menu. Nước không có trong bảng: dùng ngôn ngữ trình duyệt, không có nữa thì EN.
  var COUNTRY = {
    VN: 'VI',
    CN: 'ZH', TW: 'ZH', HK: 'ZH', MO: 'ZH',
    KR: 'KO', KP: 'KO',
    RU: 'RU', BY: 'RU', KZ: 'RU', KG: 'RU',
    UA: 'UK',
    ID: 'ID',
    PH: 'FIL',
    IN: 'HI',
    BD: 'BN',
    NG: 'NG'
  };
  // dịch vụ tra quốc gia miễn phí, có CORS; thử lần lượt, mỗi cái tối đa 2,5 giây
  var GEO = [
    { u: 'https://api.country.is/',                     f: function (d) { return d.country; } },
    { u: 'https://get.geojs.io/v1/ip/country.json',     f: function (d) { return d.country; } },
    { u: 'https://ipapi.co/country/',                   text: true }
  ];
  var BROWSER = { en: 'EN', vi: 'VI', zh: 'ZH', ko: 'KO', ru: 'RU', uk: 'UK', id: 'ID', fil: 'FIL', tl: 'FIL', hi: 'HI', bn: 'BN', ha: 'NG' };

  function fromBrowser() {
    var ls = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < ls.length; i++) {
      var code = BROWSER[String(ls[i]).toLowerCase().split('-')[0]];
      if (code) return byCode(code);
    }
    return null;
  }

  function fetchCountry(i) {
    if (i >= GEO.length) return Promise.resolve(null);
    var g = GEO[i], ac = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ac) ac.abort(); }, 2500);
    return fetch(g.u, ac ? { signal: ac.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error(r.status); return g.text ? r.text() : r.json(); })
      .then(function (d) {
        clearTimeout(t);
        var cc = String(g.text ? d : g.f(d)).trim().toUpperCase();
        if (!/^[A-Z]{2}$/.test(cc)) throw new Error('bad');
        return cc;
      })
      .catch(function () { clearTimeout(t); return fetchCountry(i + 1); });
  }

  function detectCountry() {           // nhớ kết quả 7 ngày để không gọi lại mỗi lần mở
    try {
      var o = JSON.parse(localStorage.getItem(CC_KEY) || 'null');
      if (o && Date.now() - o.t < 6048e5) return Promise.resolve(o.c);
    } catch (e) {}
    return fetchCountry(0).then(function (cc) {
      if (cc) { try { localStorage.setItem(CC_KEY, JSON.stringify({ c: cc, t: Date.now() })); } catch (e) {} }
      return cc;
    });
  }

  function langFor(cc) {
    if (cc && COUNTRY[cc]) return byCode(COUNTRY[cc]);
    return fromBrowser() || byCode('EN');
  }

  function updateUI() {
    var b = document.querySelector('#i18n-btn b');
    if (b) b.textContent = target.c;
    [].forEach.call(document.querySelectorAll('#i18n-list li'), function (li) {
      if (li.dataset.c === target.c) li.setAttribute('aria-selected', 'true');
      else li.removeAttribute('aria-selected');
    });
  }

  // chuyển ngôn ngữ ngay trên trang vừa mở (chưa dịch gì nên không cần nạp lại)
  function autoSwitch(l) {
    if (!l || l.c === target.c) return;
    target = l;
    document.documentElement.setAttribute('data-lang', l.c.toLowerCase());
    document.documentElement.lang = l.g;
    updateUI();
    if (l.g !== SRC) { applyFont(l); start(); }
  }

  /* ---------- khởi động ---------- */
  var chosen = pick();                 // ?lang= hoặc lựa chọn đã lưu của người dùng
  target = chosen || byCode('VI');
  var html = document.documentElement;
  html.setAttribute('data-lang', target.c.toLowerCase());
  html.lang = target.g;

  function boot() {
    buildUI(target);
    if (chosen) { if (target.g !== SRC) { applyFont(target); start(); } return; }
    // chưa từng chọn: đoán theo IP, lỗi thì theo ngôn ngữ trình duyệt
    detectCountry().then(function (cc) { autoSwitch(langFor(cc)); },
                         function () { autoSwitch(fromBrowser()); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ---------- API cho mô hình 3D (canvas) và hình SVG ----------
   * Hai thứ này không phải chữ trong DOM nên bộ duyệt DOM ở trên không dịch được.
   * Chúng dùng chung cache + Google Dịch ở trên qua:
   *   OPT_I18N.t(str)        → bản dịch đã có (đồng bộ); chưa có thì trả nguyên chuỗi gốc
   *   OPT_I18N.load([str…])  → Promise: dịch các chuỗi còn thiếu rồi bắn sự kiện 'opt-i18n'
   *   OPT_I18N.wants(str)    → chuỗi này có cần dịch không (tiếng Việt, hoặc thuật ngữ trong ALSO)
   */
  var VIET = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  var KEEP = { 'Muriel Médard': 1, 'Médard': 1 };               // tên riêng: không dịch
  var ALSO = {};                                                 // chữ Anh thông dụng cũng cần dịch (thêm/bớt tuỳ ý)
  ['execution', 'consensus', 'client', 'sidecar', 'validator', 'latency', 'marketplace', 'introduction',
   'research', 'waitlist', 'block', 'forward', 'roadmap', 'data layer', 'chain-agnostic', 'quick start',
   'theo docs', 'trading · ai agent', 'game · dapp', 'validator eth', 'length prefix + pad', 'encode · decode',
   'publish'].forEach(function (w) { ALSO[w] = 1; });

  function wants(s) {
    var c = norm(String(s == null ? '' : s));
    if (!c || KEEP[c] || !hasWords(c)) return false;
    return VIET.test(c) || ALSO[c.toLowerCase()] === 1;
  }
  function fire() { try { window.dispatchEvent(new CustomEvent('opt-i18n')); } catch (e) {} }

  function tSync(s) {
    if (target.g === SRC || !wants(s)) return s;
    ensureCache();
    var c = norm(s), tr = cache[key(c)];
    if (tr === undefined) return s;
    tr = fill(tr, c);
    if (tr === null) return s;
    var m = String(s).match(/^(\s*)[\s\S]*?(\s*)$/);
    return m[1] + tr + m[2];
  }

  function loadList(list) {
    if (target.g === SRC) return Promise.resolve();
    ensureCache();
    var miss = {};
    list.forEach(function (s) {
      if (!wants(s)) return;
      var k = key(norm(s));
      if (cache[k] === undefined) miss[k] = 1;
    });
    var ks = Object.keys(miss);
    if (!ks.length) return Promise.resolve();
    setBusy(1);
    var done = function () { setBusy(-1); fire(); };
    return translateList(ks, target.g).then(done, done);
  }

  // cho phép code khác gọi: OPT_I18N.lang()
  window.OPT_I18N = {
    lang: function () { return target.c; },
    langs: LANGS,
    isSource: function () { return target.g === SRC; },
    font: function () { var f = FONTS[target.g]; return f ? f.fam : ''; },
    wants: wants, t: tSync, load: loadList
  };
})();
