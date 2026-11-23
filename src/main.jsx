import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource-variable/manrope';
import './styles.css';
import './couch.css';
import './couch2.css';
import './themes.css';
import App from './App.jsx';
import Splash from './components/Splash.jsx';

// The same bundle powers the small quick-launcher window (opened with ?quick=1 by the global hotkey).
const QuickLauncher = lazy(() => import('./components/QuickLauncher.jsx'));
const quick = new URLSearchParams(location.search).has('quick');
// ...and the in-game menu window (?overlay=1), which must be see-through.
const Overlay = lazy(() => import('./components/Overlay.jsx'));
const overlay = new URLSearchParams(location.search).has('overlay');
if (overlay) { document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent'; }

// Button hints follow the connected controller: PlayStation pads show ✕ ○ □ △ instead of A B X Y (CSS keys off data-pad).
const setPad = (t) => { document.documentElement.dataset.pad = t || 'xbox'; };
window.gjallar?.padType?.().then(setPad).catch(() => {});
window.gjallar?.onPadType?.(setPad);

createRoot(document.getElementById('root')).render(
  overlay ? <Suspense fallback={null}><Overlay /></Suspense> : quick ? <Suspense fallback={null}><QuickLauncher /></Suspense> : <><App /><Splash /></>
);
