import React, { useEffect, useState } from 'react';
import { Save, Clipboard, TriangleAlert, Monitor } from 'lucide-react';
import { SectionHead, useToast } from './ui.jsx';
import { suggestArgs, hardwareArgs } from '../data/launchArgs.js';

const SOURCE_PATTERNS = /counter-strike|half-life|portal|left 4 dead|team fortress|deadlock|dota/i;

function isSourceGame(game) {
  if (game.source !== 'steam') return false;
  const name = (game.name || '').toLowerCase();
  const dir = (game.dir || '').toLowerCase();
  return SOURCE_PATTERNS.test(name) || SOURCE_PATTERNS.test(dir);
}

function resolveEngine(game, engine) {
  if (isSourceGame(game)) return 'source';
  return engine;
}

export default function LaunchOptions({ game, engine }) {
  const toast = useToast();
  const [currentArgs, setCurrentArgs] = useState('');
  const [saving, setSaving] = useState(false);

  const resolvedEngine = resolveEngine(game, engine);
  const [hw, setHw] = useState(null);
  // Chips generated from THIS user's monitor first, then the general catalog.
  const suggestions = [...hardwareArgs(resolvedEngine, hw), ...suggestArgs(resolvedEngine)];

  // Args can be multi-word ("-screen-fullscreen 1"), so match on padded strings, not a token Set.
  const padded = ` ${currentArgs.trim().replace(/\s+/g, ' ')} `;
  const activeSet = { has: (a) => padded.includes(` ${a} `) };

  useEffect(() => {
    window.gjallar.getLaunchArgs(game.key).then(setCurrentArgs, () => setCurrentArgs(''));
    window.gjallar.hardware().then(setHw).catch(() => {});
  }, [game.key]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await window.gjallar.setLaunchArgs(game.key, currentArgs.trim());
      toast({ kind: 'ok', title: 'Launch options saved', body: game.name });
    } catch (e) {
      toast({ kind: 'bad', title: 'Save failed', body: e.message });
    }
    setSaving(false);
  };

  const toggleArg = (arg) => {
    if (activeSet.has(arg)) {
      setCurrentArgs(padded.replace(` ${arg} `, ' ').trim());
    } else {
      setCurrentArgs((currentArgs + ' ' + arg).trim());
    }
  };

  const cautioned = suggestions.filter((s) => s.caution && activeSet.has(s.arg));

  return (
    <div style={{ marginBottom: 30 }}>
      <SectionHead rune="ᚱ" title="Launch options" />
      <div className="panel">
        <textarea
          className="input"
          rows={4}
          value={currentArgs}
          onChange={(e) => setCurrentArgs(e.target.value)}
          placeholder="Extra command-line arguments…"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13, resize: 'vertical' }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn gold" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : <><Save size={14} /> Save</>}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Suggestions for {resolvedEngine === 'unknown' ? 'this game' : `${resolvedEngine[0].toUpperCase() + resolvedEngine.slice(1)} games`}
            {hw?.primary ? ` · chips with a screen icon are made for your ${hw.primary.width}×${hw.primary.height} ${hw.primary.refresh} Hz monitor` : ''}.
            Hover a chip to see what it does. Not every game supports every flag.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map((s) => (
              <button
                key={s.arg}
                className={`chip ${activeSet.has(s.arg) ? 'on' : ''}`}
                onClick={() => toggleArg(s.arg)}
                title={`${s.desc}${s.caution ? '\nCaution: ' + s.caution : ''}`}
              >
                {s.yours && <Monitor size={12} />}{s.label}
              </button>
            ))}
          </div>
        </div>

        {cautioned.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {cautioned.map((c) => (
              <div key={c.arg} className="warnbox" title={c.desc}>
                <TriangleAlert size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <span><b>{c.label}</b> — {c.caution}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          {game.source === 'steam' ? (
            <>
              <p className="muted" style={{ fontSize: 12.5, margin: '0 0 8px' }}>
                Steam may ask you to confirm launching with arguments. Prefer Steam&rsquo;s own Properties box?
              </p>
              <button
                className="btn sm ghost"
                onClick={() => navigator.clipboard.writeText(currentArgs.trim())}
              >
                <Clipboard size={13} /> Copy for Steam
              </button>
            </>
          ) : (
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              For custom games these arguments are passed directly to the executable on launch.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
