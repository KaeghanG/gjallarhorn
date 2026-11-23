// Fonts the user can pick. Stacks fall back to the bundled defaults, so a font that isn't installed just looks like the default.
export const BODY_FONTS = [
  { id: 'default', label: 'Manrope (default)', stack: "'Manrope Variable', 'Segoe UI', system-ui, sans-serif" },
  { id: 'segoe', label: 'Segoe UI', stack: "'Segoe UI', system-ui, sans-serif" },
  { id: 'arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet MS', stack: "'Trebuchet MS', sans-serif" },
  { id: 'tahoma', label: 'Tahoma', stack: 'Tahoma, sans-serif' },
  { id: 'calibri', label: 'Calibri', stack: "Calibri, 'Segoe UI', sans-serif" },
  { id: 'cascadia', label: 'Cascadia Code (mono)', stack: "'Cascadia Code', Consolas, monospace" },
  { id: 'consolas', label: 'Consolas (mono)', stack: 'Consolas, monospace' },
  { id: 'georgia', label: 'Georgia (serif)', stack: 'Georgia, serif' },
  { id: 'comic', label: 'Comic Sans MS', stack: "'Comic Sans MS', cursive" },
  { id: 'dyslexic', label: 'Lexend / Atkinson (readable)', stack: "Lexend, 'Atkinson Hyperlegible', Verdana, sans-serif" },
];
export const HEAD_FONTS = [
  { id: 'default', label: 'Cinzel (default)', stack: "'Cinzel', 'Times New Roman', serif" },
  ...BODY_FONTS.filter((f) => f.id !== 'default'),
  { id: 'impact', label: 'Impact', stack: 'Impact, Haettenschweiler, sans-serif' },
  { id: 'bodyfont', label: 'Same as body', stack: 'inherit' },
];
export function applyFonts(s) {
  const r = document.documentElement.style;
  const b = BODY_FONTS.find((f) => f.id === s?.uiFont) || BODY_FONTS[0];
  const h = HEAD_FONTS.find((f) => f.id === s?.headFont) || HEAD_FONTS[0];
  r.setProperty('--font', b.stack);
  r.setProperty('--font-display', h.id === 'bodyfont' ? b.stack : h.stack);
  if (s?.accent && /^#[0-9a-f]{6}$/i.test(s.accent)) {
    r.setProperty('--gold', s.accent);
    r.setProperty('--gold-hi', `color-mix(in srgb, ${s.accent} 60%, #fff)`);
    r.setProperty('--gold-deep', `color-mix(in srgb, ${s.accent} 60%, #000)`);
  } else { r.removeProperty('--gold'); r.removeProperty('--gold-hi'); r.removeProperty('--gold-deep'); }
  if (s?.uiBlur != null) r.setProperty('--glass-blur', `${Number(s.uiBlur) || 0}px`); else r.removeProperty('--glass-blur');
  r.setProperty('font-size', `${Math.round(16 * (Number(s?.uiScale) || 1))}px`);
}
