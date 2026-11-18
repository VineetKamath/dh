(() => {
  if (window.__dh) return; window.__dh = 1;
  const D = Document.prototype, W = window, def = Object.defineProperty;
  let fsEl = null;
  const el = () => fsEl || document.documentElement;
  const g = (o, k, fn) => { try { def(o, k, { get: fn, configurable: true }); } catch {} };

  // 1. Always report fullscreen
  ['fullscreenElement','webkitFullscreenElement','webkitCurrentFullScreenElement','mozFullScreenElement','msFullscreenElement']
    .forEach(k => g(D, k, el));
  ['fullscreen','webkitIsFullScreen','mozFullScreen','fullscreenEnabled','webkitFullscreenEnabled']
    .forEach(k => g(D, k, () => true));

  // requestFullscreen still works; exitFullscreen keeps the fake state
  ['requestFullscreen','webkitRequestFullscreen','webkitRequestFullScreen','mozRequestFullScreen','msRequestFullscreen'].forEach(k => {
    const orig = Element.prototype[k];
    if (!orig) return;
    Element.prototype[k] = function (...a) {
      fsEl = this;
      try { const r = orig.apply(this, a); return r && r.catch ? r.catch(() => {}) : r; }
      catch { return Promise.resolve(); }
    };
  });

  // 2. Always visible + focused
  g(D, 'hidden', () => false);
  g(D, 'webkitHidden', () => false);
  g(D, 'visibilityState', () => 'visible');
  g(D, 'webkitVisibilityState', () => 'visible');
  D.hasFocus = () => true;

  // 3. Screen size matches window (beats innerHeight === screen.height checks)
  g(Screen.prototype, 'width', () => W.innerWidth);
  g(Screen.prototype, 'height', () => W.innerHeight);
  g(Screen.prototype, 'availWidth', () => W.innerWidth);
  g(Screen.prototype, 'availHeight', () => W.innerHeight);
  g(W, 'outerWidth', () => W.innerWidth);
  g(W, 'outerHeight', () => W.innerHeight);
  g(W, 'screenX', () => 0); g(W, 'screenY', () => 0);
  g(W, 'screenLeft', () => 0); g(W, 'screenTop', () => 0);

  // 4. matchMedia display-mode fullscreen
  const mm = W.matchMedia.bind(W);
  W.matchMedia = q => {
    const r = mm(q);
    if (/display-mode\s*:\s*fullscreen/i.test(q)) {
      try { def(r, 'matches', { get: () => true }); } catch {}
    }
    return r;
  };

  // 5. Kill detection events
  const FS = ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange',
              'fullscreenerror','webkitfullscreenerror'];
  const VIS = ['visibilitychange','webkitvisibilitychange','blur','focusout','pagehide','mouseleave'];
  const isTop = t => t === W || t === document || t === document.documentElement || t === document.body;
  const blocked = (t, type) => FS.includes(type) || (VIS.includes(type) && isTop(t));

  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (blocked(this, type)) return;
    return add.call(this, type, fn, o);
  };
  // on* handler properties
  const sink = (o, k) => { try { def(o, k, { get: () => null, set: () => {}, configurable: true }); } catch {} };
  ['onfullscreenchange','onwebkitfullscreenchange','onmozfullscreenchange','onvisibilitychange','onblur','onfocusout','onpagehide','onmouseleave']
    .forEach(k => { sink(D, k); sink(W, k); });
  FS.forEach(k => sink(Element.prototype, 'on' + k.toLowerCase()));

  // Capture-phase backstop for listeners registered some other way
  [...FS, ...VIS].forEach(type => {
    add.call(W, type, e => { if (blocked(e.target, type)) e.stopImmediatePropagation(); }, true);
    add.call(document, type, e => { if (blocked(e.target, type)) e.stopImmediatePropagation(); }, true);
  });

  // 6. Keep Esc / F11 from reaching key-based detectors
  add.call(W, 'keydown', e => { if (e.key === 'Escape' || e.key === 'F11') e.stopImmediatePropagation(); }, true);
})();
