// Theme presets for Gjallarhorn realm picker.
// Plain data only — no imports.

/** @type {{ id: string, label: string, bgMode: 'aurora' | 'fire' | 'embers' | 'color', accent: string, dim: number, blur: number, uiFont: string, headFont: string, bgColor1: string, bgColor2: string }[]} */
export const THEME_PRESETS = [

  // ── Asgard (default aurora) ────────────────────────────────────────
  {
    id: 'asgard',
    label: 'Asgard',
    bgMode: 'aurora',
    accent: '#f0c869',
    dim: 0.35,
    blur: 16,
    uiFont: 'default',
    headFont: 'default',
    bgColor1: '#0a0e27',
    bgColor2: '#1a0a2e',
  },

  // ── Muspelheim (fire realm) ───────────────────────────────────────
  {
    id: 'muspelheim',
    label: 'Muspelheim',
    bgMode: 'fire',
    accent: '#ff7a2f',
    dim: 0.4,
    blur: 18,
    uiFont: 'default',
    headFont: 'default',
    bgColor1: '#1a0a00',
    bgColor2: '#2e0a0a',
  },

  // ── Ember Hall ────────────────────────────────────────────────────
  {
    id: 'ember-hall',
    label: 'Ember Hall',
    bgMode: 'embers',
    accent: '#ffb347',
    dim: 0.35,
    blur: 16,
    uiFont: 'default',
    headFont: 'bodyfont',
    bgColor1: '#0f0a00',
    bgColor2: '#1e0e00',
  },

  // ── Frost Giant (Niflheim) ────────────────────────────────────────
  {
    id: 'frost-giant',
    label: 'Frost Giant',
    bgMode: 'color',
    accent: '#6cc4ff',
    dim: 0.3,
    blur: 20,
    uiFont: 'default',
    headFont: 'default',
    bgColor1: '#0a1520',
    bgColor2: '#0f2030',
  },

  // ── Valkyrie ──────────────────────────────────────────────────────
  {
    id: 'valkyrie',
    label: 'Valkyrie',
    bgMode: 'aurora',
    accent: '#ff6f9c',
    dim: 0.35,
    blur: 16,
    uiFont: 'default',
    headFont: 'default',
    bgColor1: '#0a0e27',
    bgColor2: '#2e0a1e',
  },

  // ── Midnight ──────────────────────────────────────────────────────
  {
    id: 'midnight',
    label: 'Midnight',
    bgMode: 'color',
    accent: '#8f9bff',
    dim: 0.35,
    blur: 18,
    uiFont: 'default',
    headFont: 'default',
    bgColor1: '#0a0a2e',
    bgColor2: '#151540',
  },

  // ── Jungle ────────────────────────────────────────────────────────
  {
    id: 'jungle',
    label: 'Jungle',
    bgMode: 'aurora',
    accent: '#3cf2b0',
    dim: 0.35,
    blur: 16,
    uiFont: 'default',
    headFont: 'default',
    bgColor1: '#0a1a0e',
    bgColor2: '#0f2a1e',
  },

  // ── Blood Moon ────────────────────────────────────────────────────
  {
    id: 'blood-moon',
    label: 'Blood Moon',
    bgMode: 'fire',
    accent: '#ff3b4a',
    dim: 0.4,
    blur: 18,
    uiFont: 'default',
    headFont: 'default',
    bgColor1: '#1a0505',
    bgColor2: '#2e0a0a',
  },

  // ── Terminal ──────────────────────────────────────────────────────
  {
    id: 'terminal',
    label: 'Terminal',
    bgMode: 'color',
    accent: '#3cff7a',
    dim: 0.2,
    blur: 8,
    uiFont: 'cascadia',
    headFont: 'consolas',
    bgColor1: '#0a0a0a',
    bgColor2: '#0f1a0f',
  },

  // ── Paper (aged parchment) ────────────────────────────────────────
  {
    id: 'paper',
    label: 'Paper',
    bgMode: 'color',
    accent: '#e6c58a',
    dim: 0.3,
    blur: 12,
    uiFont: 'default',
    headFont: 'georgia',
    bgColor1: '#1e1810',
    bgColor2: '#2a2218',
  },

  // ── Neon (synthwave) ──────────────────────────────────────────────
  {
    id: 'neon',
    label: 'Neon',
    bgMode: 'color',
    accent: '#ff4fd8',
    dim: 0.3,
    blur: 20,
    uiFont: 'cascadia',
    headFont: 'default',
    bgColor1: '#0a0515',
    bgColor2: '#150a20',
  },

  // ── Mono (minimal greys) ──────────────────────────────────────────
  {
    id: 'mono',
    label: 'Mono',
    bgMode: 'color',
    accent: '#d0d0d0',
    dim: 0.3,
    blur: 14,
    uiFont: 'default',
    headFont: 'default',
    bgColor1: '#0a0a0a',
    bgColor2: '#151515',
  },

]
