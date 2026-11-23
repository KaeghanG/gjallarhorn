import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BODY_FONTS, HEAD_FONTS } from '../data/fonts.js';
import { THEME_PRESETS } from '../data/themePresets.js';
import CouchSplash from '../components/couch/CouchSplash.jsx';
import Splash, { SPLASH_STYLES } from '../components/couch/Splashes.jsx';
import ChatSettings from '../components/ChatSettings.jsx';
import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { PageHead, Switch, SectionHead, stagger, rise } from '../components/ui.jsx';
import { REGIONS } from '../api.js';

export default function SettingsPage({ settings, saveSettings, library }) {
  const [preview, setPreview] = useState(null); // splash style being previewed
  const [emuRoot, setEmuRoot] = useState('');

  const [saveRoot, setSaveRoot] = useState('');
  useEffect(() => {
    window.gjallar.emuRoot?.().then(setEmuRoot);
    window.gjallar.saveRoot().then(setSaveRoot);
  }, []);

  if (!settings) {
    return <div className="skeleton" style={{ height: 300 }} />;
  }

  const gameCount = library.games || [];
  const steamCount = gameCount.filter((g) => g.source === 'steam').length;
  const epicCount = gameCount.filter((g) => g.source === 'epic').length;
  const customCount = gameCount.filter((g) => g.source === 'custom').length;
  const wishlistCount = settings.wishlist?.length || 0;

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHead eyebrow="Settings" title="Settings" sub="Tune how Gjallarhorn looks and behaves." />

      <motion.div className="stats" variants={stagger} initial="hidden" animate="show">
        {[
          { n: steamCount, l: 'Steam games' },
          { n: epicCount, l: 'Epic games' },
          { n: customCount, l: 'Custom games' },
          { n: wishlistCount, l: 'Wishlist' },
        ].map((item) => (
          <motion.div variants={rise} className="glass stat" key={item.l}>
            <div className="n">{item.n}</div>
            <div className="l">{item.l}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="section">
        <SectionHead rune="ᚱ" title="Region" />
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Store region</div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
              Steam and Epic show prices and free games for this country. The cross-store comparison (CheapShark) is always in USD.
            </div>
          </div>
          <select className="input" value={settings.region || ''} onChange={(e) => saveSettings({ region: e.target.value })}>
            <option value="">Auto ({settings.detectedRegion || 'US'})</option>
            {REGIONS.map(([cc, name]) => <option key={cc} value={cc}>{name}</option>)}
          </select>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᛏ" title="Game Boost" />
        <div className="glass" style={{ padding: 20 }}>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 0 }}>Applied while a game launched from Gjallarhorn is running, undone automatically when you quit.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
            <div><div style={{ fontWeight: 800 }}>Open games on the screen I launched from</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>If a game opens on a different monitor, Gjallarhorn moves it to the monitor you clicked Launch on (or where your mouse was for the quick launcher).</div></div>
            <Switch on={settings.launchOnSameScreen !== false} onChange={(v) => saveSettings({ launchOnSameScreen: v })} />
          </div>
          {[
            ['priority', 'High CPU priority', 'Gives the game process High priority so background apps get out of its way.'],
            ['wallpaper', 'Pause Wallpaper Engine', 'Stops your animated wallpaper from using the GPU while you play, then resumes it.'],
          ].map(([k, t, d]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
              <div><div style={{ fontWeight: 800 }}>{t}</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{d}</div></div>
              <Switch on={settings.boost?.[k] !== false} onChange={(v) => saveSettings({ boost: { ...(settings.boost || {}), [k]: v } })} />
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᛒ" title="Save backups" />
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div><div style={{ fontWeight: 800 }}>Back up saves when I quit a game</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Versioned zips, newest 10 kept per game. Locations come from PCGamingWiki.</div></div>
            <Switch on={settings.autoBackup !== false} onChange={(v) => saveSettings({ autoBackup: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <code style={{ flex: 1, color: 'var(--ink-2)', wordBreak: 'break-all', userSelect: 'text' }}>{saveRoot}</code>
            <button className="btn" onClick={async () => { const p = await window.gjallar.pickFolder('Where should save backups go?'); if (p) { await saveSettings({ saveRoot: p }); setSaveRoot(p); } }}><FolderOpen size={15} />Change</button>
            <button className="btn ghost" onClick={() => window.gjallar.showPath(saveRoot)}>Open</button>
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᚲ" title="Steam chat" />
      <ChatSettings />
      <SectionHead rune="ᛊ" title="Store accounts" />
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Steam Web API key</div>
              <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                Free. Lets Library → "Not installed" list every game you own, with one-click installs.{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); window.gjallar.open('https://steamcommunity.com/dev/apikey'); }}>Get a key</a> (any domain name works, e.g. "localhost").
              </div>
            </div>
            <input className="input" type="password" style={{ width: 300 }} placeholder="Paste key" defaultValue={settings.steamKey || ''} onBlur={(e) => saveSettings({ steamKey: e.target.value.trim() })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontWeight: 800 }}>SteamID64</div>
              <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Leave empty to use the account last signed in to Steam on this PC. Epic games you own appear automatically when the Epic launcher is installed.</div>
            </div>
            <input className="input" style={{ width: 300 }} placeholder="Auto-detect" defaultValue={settings.steamId || ''} onBlur={(e) => saveSettings({ steamId: e.target.value.trim() })} />
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᛜ" title="Launcher" />
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div><div style={{ fontWeight: 800 }}>Quick launcher hotkey</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Opens a search box over anything, type a game, press Enter. (Alt+Space is taken by PowerToys Run.)</div></div>
            <select className="input" value={settings.quickHotkey || 'Control+Shift+Space'} onChange={async (e) => { await saveSettings({ quickHotkey: e.target.value }); window.gjallar.setHotkey(e.target.value); }}>
              {['Control+Shift+Space', 'Control+Alt+Space', 'Control+Shift+G', 'Alt+G', 'Super+Shift+G'].map((k) => <option key={k} value={k}>{k.replace('Control', 'Ctrl').replace('Super', 'Win')}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div><div style={{ fontWeight: 800 }}>Controller combo opens Couch mode from anywhere</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Hold the buttons ~1 second, even on the desktop or with Gjallarhorn in the tray. Xbox-style controllers directly; PlayStation/Switch while Steam is running.</div></div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: 12.5 }}>Back + Start</span>
              <Switch on={settings.globalPadCombo !== false} onChange={async (v) => { await saveSettings({ globalPadCombo: v }); window.gjallar.setPadCombo({ globalPadCombo: v }); }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div><div style={{ fontWeight: 800 }}>Free GPU memory from local AI when a game starts</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>If Ollama has models loaded, Gjallarhorn unloads them while you play (they reload on your next AI request).</div></div>
            <Switch on={settings.aiSwitch !== false} onChange={(v) => saveSettings({ aiSwitch: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div><div style={{ fontWeight: 800 }}>Keep running in the tray when closed</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>So the hotkey, price alerts and emulator update checks keep working. Quit from the tray icon.</div></div>
            <Switch on={settings.closeToTray !== false} onChange={(v) => saveSettings({ closeToTray: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div><div style={{ fontWeight: 800 }}>RetroAchievements</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Your username + web API key from retroachievements.org → Settings → Keys. Shows your retro progress on the Retro page.</div></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ width: 150 }} placeholder="Username" defaultValue={settings.raUser || ''} onBlur={(e) => saveSettings({ raUser: e.target.value.trim() })} />
              <input className="input" type="password" style={{ width: 200 }} placeholder="Web API key" defaultValue={settings.raKey || ''} onBlur={(e) => saveSettings({ raKey: e.target.value.trim() })} />
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᚲ" title="Key shops (G2A, Loaded / CDKeys)" />
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div><div style={{ fontWeight: 800 }}>Show key-shop prices</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Grey-market shops: often cheaper, but not authorized by publishers. Keys can be region-locked, and keys from fraud can be revoked. Always labelled "Key shop".</div></div>
            <Switch on={settings.showKeyshops !== false} onChange={(v) => saveSettings({ showKeyshops: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div><div style={{ fontWeight: 800 }}>GG.deals API key</div><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Free. G2A and Loaded block apps, so key-shop prices come from GG.deals, which tracks them. Log in at gg.deals → Settings → API.{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); window.gjallar.open('https://gg.deals/settings/'); }}>Open GG.deals</a></div></div>
            <input className="input" type="password" style={{ width: 300 }} placeholder="Paste key" defaultValue={settings.ggKey || ''} onBlur={(e) => saveSettings({ ggKey: e.target.value.trim() })} />
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᛞ" title="Price history" />
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 800 }}>IsThereAnyDeal API key</div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
              Free. Unlocks years of price history graphs. Sign in at isthereanydeal.com, open Settings → API / Apps, register an app, and paste its key here.{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); window.gjallar.open('https://isthereanydeal.com/apps/my/'); }}>Open ITAD</a>
            </div>
          </div>
          <input className="input" type="password" style={{ width: 300 }} placeholder="Paste key" defaultValue={settings.itadKey || ''} onBlur={(e) => saveSettings({ itadKey: e.target.value.trim() })} />
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᚨ" title="Appearance" />
        <div className="glass" style={{ padding: 20, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>Realm (theme)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              ['asgard', 'Asgard', 'Gold & aurora', ['#f0c869', '#3cf2b0', '#5c7cff']],
              ['niflheim', 'Niflheim', 'Ice & frost', ['#8fd8ff', '#00e6e6', '#a08cff']],
              ['muspelheim', 'Muspelheim', 'Fire & ember', ['#ff9a3c', '#ff3c1e', '#ff5082']],
              ['vanaheim', 'Vanaheim', 'Forest & life', ['#5fe0a0', '#2ec4b6', '#9be15d']],
            ].map(([id, name, sub, sw]) => {
              const on = (settings.realm || 'asgard') === id;
              return (
                <button key={id} onClick={() => saveSettings({ realm: id })} className="glass"
                  style={{ padding: 14, cursor: 'pointer', textAlign: 'left', borderColor: on ? sw[0] : 'var(--line)', boxShadow: on ? `0 0 24px -6px ${sw[0]}` : 'none', transition: 'all .25s' }}>
                  <div style={{ height: 46, borderRadius: 10, marginBottom: 10, background: `radial-gradient(60% 90% at 20% 20%, ${sw[1]}aa, transparent), radial-gradient(60% 90% at 80% 30%, ${sw[2]}aa, transparent), #070a16` }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: sw[0] }}>{name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{sub}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Reduce motion</div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Stops the aurora, shooting stars and Ken Burns zoom.</div>
          </div>
          <Switch on={settings.reduceMotion} onChange={(v) => saveSettings({ reduceMotion: v })} />
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᛟ" title="Couch mode intro" />
        <div className="glass" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPLASH_STYLES.map((o) => (
              <button key={o.id} className={`btn ${(settings.splashStyle || 'bifrost') === o.id ? 'gold' : ''}`} title={o.blurb} onClick={() => saveSettings({ splashStyle: o.id })}>{o.label}</button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12.5 }}>{(SPLASH_STYLES.find((o) => o.id === (settings.splashStyle || 'bifrost')) || {}).blurb}</div>
          <div><button className="btn sm" onClick={() => { const st = settings.splashStyle || 'bifrost'; setPreview(st); if (st === 'cinematic' || st === 'none') setTimeout(() => setPreview(null), 4800); }}>Preview</button></div>
        </div>
      </div>
      {createPortal(preview === 'cinematic' ? <CouchSplash key="pv" /> : preview ? <Splash key={preview} style={preview} onDone={() => setPreview(null)} /> : null, document.body)}

      <div className="section">
        <SectionHead rune="ᛞ" title="Theme & background" />
        <div className="glass" style={{ padding: 20, display: 'grid', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Presets</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {THEME_PRESETS.map((p) => (
                <button key={p.id} className="btn sm" style={{ borderColor: p.accent }} onClick={() => saveSettings({ bgMode: p.bgMode, accent: p.accent, bgDim: p.dim, uiBlur: p.blur, uiFont: p.uiFont, headFont: p.headFont, bgColor1: p.bgColor1, bgColor2: p.bgColor2 })}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: p.accent, display: 'inline-block' }} />{p.label}
                </button>
              ))}
            </div>
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 800 }}>Background</span>
            <select className="input" value={settings.bgMode || 'aurora'} onChange={(e) => saveSettings({ bgMode: e.target.value })}>
              <option value="aurora">Aurora & stars (default)</option>
              <option value="fire">Fire</option>
              <option value="embers">Rising embers</option>
              <option value="image">My own image / video</option>
              <option value="color">Colour gradient</option>
            </select>
          </label>
          {settings.bgMode === 'image' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn" onClick={async () => { const f = await window.gjallar.pickMedia('Choose a background image or video'); if (f) saveSettings({ bgImage: f }); }}>Choose file…</button>
              <span className="muted" style={{ fontSize: 12.5, overflowWrap: 'anywhere' }}>{settings.bgImage || 'PNG, JPG, GIF, WebP, MP4 or WebM'}</span>
            </div>
          )}
          {settings.bgMode === 'color' && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <label>Top <input type="color" value={settings.bgColor1 || '#0b1024'} onChange={(e) => saveSettings({ bgColor1: e.target.value })} /></label>
              <label>Bottom <input type="color" value={settings.bgColor2 || '#04060d'} onChange={(e) => saveSettings({ bgColor2: e.target.value })} /></label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <label>Accent colour <input type="color" value={settings.accent || '#f0c869'} onChange={(e) => saveSettings({ accent: e.target.value })} /></label>
            <button className="btn sm" onClick={() => saveSettings({ accent: null })}>Reset accent</button>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Darken background
              <input type="range" min="0" max="0.8" step="0.05" value={settings.bgDim ?? 0.2} onChange={(e) => saveSettings({ bgDim: Number(e.target.value) })} />
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Glass blur
              <input type="range" min="0" max="24" step="1" value={settings.uiBlur ?? 14} onChange={(e) => saveSettings({ uiBlur: Number(e.target.value) })} />
            </label>
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᚨ" title="Fonts" />
        <div className="glass" style={{ padding: 20, display: 'grid', gap: 16 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 800 }}>Text font</span>
            <select className="input" value={settings.uiFont || 'default'} onChange={(e) => saveSettings({ uiFont: e.target.value })}>
              {BODY_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 800 }}>Heading font</span>
            <select className="input" value={settings.headFont || 'default'} onChange={(e) => saveSettings({ headFont: e.target.value })}>
              {HEAD_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 800 }}>Text size</span>
            <select className="input" value={String(settings.uiScale || 1)} onChange={(e) => saveSettings({ uiScale: Number(e.target.value) })}>
              {[['0.9', 'Small'], ['1', 'Normal'], ['1.15', 'Large'], ['1.3', 'Extra large']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <div style={{ fontFamily: 'var(--font)', fontSize: 15 }}>The quick brown fox jumps over the lazy dog. <b style={{ fontFamily: 'var(--font-display)' }}>GJALLARHORN 0123</b></div>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᛟ" title="OptiScaler" />
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Default file name</div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Default file name OptiScaler is installed as. dxgi.dll works for most games.</div>
          </div>
          <select
            className="input"
            value={settings.optiscalerProxy}
            onChange={(e) => saveSettings({ optiscalerProxy: e.target.value })}
          >
            {['dxgi.dll', 'winmm.dll', 'version.dll', 'dbghelp.dll', 'd3d12.dll', 'wininet.dll', 'winhttp.dll'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᛖ" title="Emulators" />
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <code style={{ color: 'var(--ink-2)', wordBreak: 'break-all', userSelect: 'text' }}>{emuRoot}</code>
          <button
            className="btn"
            onClick={() => emuRoot && window.gjallar.showPath?.(emuRoot)}
          >
            <FolderOpen size={15} />Open folder
          </button>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᚷ" title="About" />
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div>Gjallarhorn is the horn Heimdall sounds at Ragnarök.</div>
            <br />
            <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Prices by CheapShark, fixes from PCGamingWiki, upscaling by OptiScaler.</div>
            <br />
            <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>It never downloads ROMs, BIOS or firmware.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
