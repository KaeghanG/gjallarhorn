import React, { useEffect, useRef, useState } from 'react';

// Launch-profile editor: create, name, edit args, pick active.
const DEBOUNCE = 500;

export default function ProfileEditor({ gameKey, onChange }) {
  const [profiles, setProfiles] = useState([]);
  const [active, setActive] = useState(null);
  const [err, setErr] = useState('');
  const timerRef = useRef(0);

  // Load existing profiles from backend.
  useEffect(() => {
    let dead = false;
    window.gjallar.profilesGet(gameKey)
      .then((data) => {
        if (dead) return;
        setProfiles(Array.isArray(data?.profiles) ? data.profiles : []);
        setActive(data?.active ?? null);
      })
      .catch((e) => setErr(e.message || String(e)));
    return () => { dead = true; };
  }, [gameKey]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Debounced auto-save.
  const save = (nextProfiles, nextActive) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      window.gjallar.profilesSet(gameKey, { profiles: nextProfiles, active: nextActive })
        .then(() => {
          setErr('');
          onChange?.({ profiles: nextProfiles, active: nextActive });
        })
        .catch((e) => setErr(e.message || String(e)));
    }, DEBOUNCE);
  };

  // Update a single field on a profile.
  const setField = (idx, key, val) => {
    const next = profiles.map((p, i) => i === idx ? { ...p, [key]: val } : p);
    setProfiles(next);
    save(next, active);
  };

  // Reorder / add / delete.
  const addProfile = () => {
    const n = profiles.length + (active == null ? 1 : 0);
    const next = [...profiles, { id: Date.now().toString(36), name: `Profile ${n}`, args: '' }];
    setProfiles(next);
    save(next, active);
  };

  const delProfile = (idx) => {
    const next = profiles.filter((_, i) => i !== idx);
    const newActive = active === profiles[idx]?.id ? null : active;
    setProfiles(next);
    setActive(newActive);
    save(next, newActive);
  };

  const pick = (id) => {
    const next = id == null ? null : id;
    setActive(next);
    save(profiles, next);
  };

  // Build card list: "Default" on top, then user profiles.
  const cards = [];
  if (active == null) {
    cards.push({ kind: 'default' });
  }
  profiles.forEach((p, i) => {
    cards.push({ kind: 'user', ...p, idx: i });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Help */}
      <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
        The active profile's arguments are added when you press Play.
      </p>

      {err && <div className="err">{err}</div>}

      {/* Profile cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Default card */}
        <div
          className="glass"
          onClick={() => pick(null)}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
            opacity: active == null ? 1 : 0.6,
            borderLeft: active == null ? `3px solid var(--gold)` : '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active == null ? 'var(--gold)' : 'var(--muted)'}`,
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            {active == null && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)' }} />}
          </span>
          <b style={{ fontSize: 14 }}>Default (no extra arguments)</b>
        </div>

        {/* User profiles */}
        {cards.filter((c) => c.kind === 'user').map((c) => (
          <div
            key={c.id}
            className="glass"
            style={{
              padding: 0,
              cursor: 'pointer',
              opacity: active === c.id ? 1 : 0.6,
              borderLeft: active === c.id ? `3px solid var(--gold)` : '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
              borderBottom: '1px solid var(--line)', cursor: 'pointer',
            }} onClick={() => pick(c.id)}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active === c.id ? 'var(--gold)' : 'var(--muted)'}`,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                {active === c.id && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)' }} />}
              </span>
              <input
                className="input"
                value={c.name}
                onChange={(e) => setField(c.idx, 'name', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{ height: 32, flex: 1, margin: 0, padding: '0 10px', fontSize: 13 }}
                placeholder="Profile name"
              />
              <button className="btn sm danger" onClick={(e) => { e.stopPropagation(); delProfile(c.idx); }} style={{ height: 28 }}>
                Delete
              </button>
            </div>

            {/* Args row */}
            <div style={{ padding: '10px 16px' }}>
              <input
                className="input"
                value={c.args}
                onChange={(e) => setField(c.idx, 'args', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="-windowed -dx11 -nosplash"
                style={{ height: 34, flex: 1, margin: 0 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button className="btn sm" onClick={addProfile}>Add profile</button>
    </div>
  );
}
