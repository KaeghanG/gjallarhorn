import { useEffect, useRef } from 'react';

// Controller + keyboard input as named buttons: up/down/left/right, a b x y, lb rb, lt rt, back start.
// Preferred source: native controller state pushed from the main process (Xbox, PlayStation, generic): works even when this window
// is NOT focused. Fallback: the browser Gamepad API, only while focused. Keyboard always works.
// handler(name, event?)  — event is the KeyboardEvent for keyboard input ('char' = a typed character).
// opts.onActivity() fires on ANY input (idle timers); opts.onPad(connected) reports controller presence.
const NATIVE_BTN = { 0: 0x1000, 1: 0x2000, 2: 0x4000, 3: 0x8000, 4: 0x100, 5: 0x200, 6: 0x10000, 7: 0x20000, 8: 0x20, 9: 0x10, 12: 0x1, 13: 0x2, 14: 0x4, 15: 0x8 };
const BUTTONS = [[0, 'a'], [1, 'b'], [2, 'x'], [3, 'y'], [4, 'lb'], [5, 'rb'], [6, 'lt'], [7, 'rt'], [8, 'back'], [9, 'start']];
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'a', Escape: 'b', Backspace: 'b', q: 'lb', e: 'rb', f: 'x', o: 'y', Tab: 'start', '/': 'back', PageUp: 'lt', PageDown: 'rt' };

export function usePadInput(handler, opts = {}) {
  const h = useRef(handler);
  h.current = handler;
  const o = useRef(opts);
  o.current = opts;

  useEffect(() => {
    const emit = (name, ev) => { o.current.onActivity?.(); h.current(name, ev); };
    const key = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // While typing (opts.charMode, e.g. the search keyboard) single letters are text, not shortcuts.
      const typing = o.current.charMode?.() && e.key.length === 1;
      const m = typing ? null : KEYS[e.key];
      if (m) { e.preventDefault(); emit(m, e); }
      else if (e.key.length === 1) emit('char', e);
    };
    addEventListener('keydown', key);

    const native = { s: null };
    const offPad = window.gjallar.onPadState((s) => {
      native.s = s.connected ? s : null;
      o.current.onPad?.(!!s.connected);
    });
    let prev = {}, next = 0;
    const tick = () => {
      const t = performance.now();
      let b = null, ax = 0, ay = 0;
      if (native.s) {
        const m = native.s.buttons;
        b = (i) => !!(m & (NATIVE_BTN[i] || 0));
        ax = native.s.lx / 10;
        ay = -native.s.ly / 10; // XInput: up is positive; the Gamepad API (and this code) has down positive
      } else {
        const p = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
        if (p && document.hasFocus()) {
          o.current.onPad?.(true);
          b = (i) => !!p.buttons[i]?.pressed;
          ax = p.axes[0] || 0;
          ay = p.axes[1] || 0;
        }
      }
      if (!b) { prev = {}; next = 0; return; }
      const dir = b(12) || ay < -0.5 ? 'up' : b(13) || ay > 0.5 ? 'down' : b(14) || ax < -0.5 ? 'left' : b(15) || ax > 0.5 ? 'right' : null;
      if (dir && t > next) { emit(dir); next = t + (prev.dir === dir ? 110 : 330); }
      if (!dir) next = 0;
      prev.dir = dir;
      for (const [i, name] of BUTTONS) {
        if (b(i) && !prev[i]) emit(name);
        prev[i] = b(i);
      }
    };
    // setInterval, not requestAnimationFrame: rAF stops when the window is covered or unfocused.
    const timer = setInterval(tick, 16);
    return () => { removeEventListener('keydown', key); clearInterval(timer); offPad(); };
  }, []);
}
