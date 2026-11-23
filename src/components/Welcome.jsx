import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, FolderPlus, Globe, KeyRound, Joystick, Sparkles, Cpu } from 'lucide-react';
import { HornLogo } from './Shell.jsx';
import { REGIONS } from '../api.js';

// First-run setup for new users (public app: every user has their own PC, Steam account and folders).
export default function Welcome({ settings, saveSettings, onDone }) {
  const [step, setStep] = useState(0);
  const [hw, setHw] = useState(null);
  const [folders, setFolders] = useState(settings.romFolders || []);
  useEffect(() => { window.gjallar.hardware().then(setHw).catch(() => {}); }, []);

  const finish = async () => { await saveSettings({ onboarded: true }); onDone(); };
  const addFolder = async () => {
    const p = await window.gjallar.pickFolder('Pick a folder with your games / ROMs');
    if (p && !folders.includes(p)) { const next = [...folders, p]; setFolders(next); saveSettings({ romFolders: next }); }
  };

  const steps = [
    <>
      <HornLogo size={72} />
      <div className="eyebrow" style={{ marginTop: 18 }}>Welcome</div>
      <h2 className="h-title" style={{ fontSize: 34 }}>Sound the horn</h2>
      <p className="muted" style={{ fontSize: 15, lineHeight: 1.7 }}>One launcher for every store: your Steam and Epic library, prices from every shop, retro games, emulators, and tweaks tuned to your PC. Four quick steps, all optional.</p>
    </>,
    <>
      <Cpu size={40} color="var(--gold)" />
      <h2 className="h-title" style={{ marginTop: 14 }}>Your PC</h2>
      <p className="muted">Gjallarhorn tunes every game to this machine. Here's what it found:</p>
      {hw ? (
        <dl className="kv" style={{ fontSize: 14 }}>
          <dt>GPU</dt><dd>{hw.gpu.name}{hw.gpu.vramMB ? ` · ${Math.round(hw.gpu.vramMB / 1024)} GB` : ''}{hw.hybrid ? ' (+ integrated GPU)' : ''}</dd>
          <dt>Screen</dt><dd>{hw.primary.width}×{hw.primary.height} @ {hw.primary.refresh} Hz</dd>
          <dt>CPU</dt><dd>{hw.cpu.name}</dd>
          <dt>RAM</dt><dd>{hw.ramGB} GB{hw.laptop ? ' · laptop' : ''}</dd>
          <dt>Best upscaler</dt><dd>{hw.tune.upscaler}</dd>
        </dl>
      ) : <div className="skeleton" style={{ height: 120 }} />}
    </>,
    <>
      <Globe size={40} color="var(--gold)" />
      <h2 className="h-title" style={{ marginTop: 14 }}>Your region</h2>
      <p className="muted">Steam and Epic prices and free games follow this country.</p>
      <select className="input" style={{ width: '100%' }} defaultValue={settings.region || ''} onChange={(e) => saveSettings({ region: e.target.value })}>
        <option value="">Auto ({settings.detectedRegion || 'US'})</option>
        {REGIONS.map(([cc, name]) => <option key={cc} value={cc}>{name}</option>)}
      </select>
    </>,
    <>
      <KeyRound size={40} color="var(--gold)" />
      <h2 className="h-title" style={{ marginTop: 14 }}>Your Steam library</h2>
      <p className="muted">Installed games show up automatically. To also list games you own but haven't installed (and see achievements), paste a free Steam Web API key. Optional.</p>
      <input className="input" type="password" style={{ width: '100%' }} placeholder="Steam Web API key" defaultValue={settings.steamKey || ''} onBlur={(e) => saveSettings({ steamKey: e.target.value.trim() })} />
      <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={() => window.gjallar.open('https://steamcommunity.com/dev/apikey')}>Get a key (any domain name works, e.g. localhost)</button>
    </>,
    <>
      <Joystick size={40} color="var(--gold)" />
      <h2 className="h-title" style={{ marginTop: 14 }}>Retro games</h2>
      <p className="muted">Point Gjallarhorn at the folders where you keep your own game files. Optional. Gjallarhorn never downloads ROMs, BIOS or firmware.</p>
      <button className="btn" onClick={addFolder}><FolderPlus size={15} />Add folder</button>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {folders.map((f) => <code key={f} style={{ fontSize: 12, color: 'var(--ink-2)' }}>{f}</code>)}
      </div>
    </>,
    <>
      <Sparkles size={44} color="var(--gold)" />
      <h2 className="h-title" style={{ marginTop: 14 }}>You're ready</h2>
      <p className="muted" style={{ lineHeight: 1.8 }}>
        Tips: press <b>{(settings.quickHotkey || 'Control+Shift+Space').replace('Control', 'Ctrl').replace('Super', 'Win')}</b> anywhere to launch a game in a second. Hold <b>Start + Select</b> on a controller for Couch mode.
        Open any game in your Library to tune it for your PC.
      </p>
    </>,
  ];
  const last = step === steps.length - 1;

  return (
    <motion.div className="scrim" style={{ alignItems: 'center', zIndex: 70 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="sheet glass" style={{ width: 640, padding: 40, minHeight: 470, display: 'flex', flexDirection: 'column' }}
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 24 }}>
        <div style={{ flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
          <button className="btn ghost" onClick={finish}>Skip</button>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 8 }}>
            {steps.map((_, i) => <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 8, background: i === step ? 'var(--gold)' : 'var(--line-hi)', transition: 'all .3s' }} />)}
          </div>
          {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}><ArrowLeft size={15} />Back</button>}
          <button className="btn gold" onClick={() => (last ? finish() : setStep(step + 1))}>{last ? 'Enter Gjallarhorn' : 'Next'}<ArrowRight size={15} /></button>
        </div>
      </motion.div>
    </motion.div>
  );
}
