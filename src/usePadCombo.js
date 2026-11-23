import { useEffect } from 'react';

// Standard gamepad mapping: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 8 Select, 9 Start, 12-15 D-pad.
export default function usePadCombo(onCombo) {
  useEffect(() => {
    let raf, since = 0;
    const tick = () => {
      const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
      const held = document.hasFocus() && pads.some((p) => p.buttons[8]?.pressed && p.buttons[9]?.pressed);
      if (held) { since ||= performance.now(); if (performance.now() - since > 700) { since = Infinity; onCombo(); } }
      else since = 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onCombo]);
}

