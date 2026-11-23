import React from 'react';

// Format ms → "h m" string.
const fmtTime = (ms) => {
  if (ms == null || ms <= 0) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};

// Compare sessions grouped by game name.
export default function GameCompare({ reports }) {
  if (!Array.isArray(reports) || reports.length === 0) return null;

  // Group sessions by name.
  const byName = {};
  for (const r of reports) {
    const name = r.name || 'Unknown';
    if (!byName[name]) byName[name] = [];
    byName[name].push(r);
  }

  const games = Object.entries(byName).map(([name, sessions]) => {
    let totalMin = 0;
    let tempSum = 0, tempCount = 0;
    let utilSum = 0, utilCount = 0;
    let powerSum = 0, powerCount = 0;
    let maxTemp = null;
    let maxVram = null;

    for (const s of sessions) {
      totalMin += s.minutes || 0;
      if (s.summary?.avgTemp != null) { tempSum += s.summary.avgTemp; tempCount++; }
      if (s.summary?.avgUtil != null) { utilSum += s.summary.avgUtil; utilCount++; }
      if (s.summary?.avgPower != null) { powerSum += s.summary.avgPower; powerCount++; }
      if (s.summary?.maxTemp != null) { maxTemp = maxTemp == null ? s.summary.maxTemp : Math.max(maxTemp, s.summary.maxTemp); }
      if (s.summary?.maxVram != null) { maxVram = maxVram == null ? s.summary.maxVram : Math.max(maxVram, s.summary.maxVram); }
    }

    return {
      name,
      sessions: sessions.length,
      totalMin,
      avgTemp: tempCount > 0 ? (tempSum / tempCount) : null,
      avgUtil: utilCount > 0 ? (utilSum / utilCount) : null,
      avgPower: powerCount > 0 ? (powerSum / powerCount) : null,
      maxTemp,
      maxVram,
    };
  });

  // Need at least 2 distinct games.
  if (games.length < 2) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Play at least two different games to compare them.
      </div>
    );
  }

  // Sort by total minutes desc.
  games.sort((a, b) => b.totalMin - a.totalMin);

  // Column maxima for bar widths (use the highest non-null value across all games).
  const colMax = {
    util: Math.max(...games.map((g) => g.avgUtil ?? 0)),
    temp: Math.max(...games.map((g) => g.maxTemp ?? 0)),
    power: Math.max(...games.map((g) => g.avgPower ?? 0)),
    vram: Math.max(...games.map((g) => g.maxVram ?? 0)),
  };

  // Render a cell with a background bar and the numeric value.
  const numCell = (value, pct) => {
    if (value == null || value <= 0) return <td style={tdStyle}>—</td>;
    return (
      <td style={tdStyle}>
        <span className="rp-bar" style={{ position: 'relative', display: 'inline-block', minWidth: 50 }}>
          <i style={{
            display: 'block',
            height: 4,
            width: `${Math.min(pct * 100, 100)}%`,
            background: 'var(--gold)',
            borderRadius: 2,
            opacity: 0.55,
          }} />
        </span>
        <span style={{ position: 'relative', marginLeft: 4 }}>{value}</span>
      </td>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20, color: 'var(--gold)' }}>Compare games</h2>
      <table className="rp-compare" style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 14,
        textAlign: 'left',
      }}>
        <thead>
          <tr style={{ borderBottom: `1px solid var(--line)` }}>
            <th style={thStyle}>Game</th>
            <th style={thStyle}>Sessions</th>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Avg GPU %</th>
            <th style={thStyle}>Avg temp</th>
            <th style={thStyle}>Max temp</th>
            <th style={thStyle}>Avg W</th>
            <th style={thStyle}>Peak VRAM (MB)</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.name} style={{ borderBottom: `1px solid var(--line)` }}>
              <td style={tdStyle}><b>{g.name}</b></td>
              <td style={tdStyle}>{g.sessions}</td>
              <td style={tdStyle}>{fmtTime(g.totalMin * 60000)}</td>
              {numCell(
                g.avgUtil != null ? `${Math.round(g.avgUtil)}%` : null,
                colMax.util > 0 ? (g.avgUtil / colMax.util) : 0,
              )}
              {numCell(
                g.avgTemp != null ? `${Math.round(g.avgTemp)}°C` : null,
                colMax.temp > 0 ? ((g.avgTemp ?? 0) / colMax.temp) : 0,
              )}
              {numCell(
                g.maxTemp != null ? `${Math.round(g.maxTemp)}°C` : null,
                colMax.temp > 0 ? ((g.maxTemp ?? 0) / colMax.temp) : 0,
              )}
              {numCell(
                g.avgPower != null ? `${Math.round(g.avgPower)}W` : null,
                colMax.power > 0 ? (g.avgPower / colMax.power) : 0,
              )}
              {numCell(
                g.maxVram != null ? `${Math.round(g.maxVram)} MB` : null,
                colMax.vram > 0 ? (g.maxVram / colMax.vram) : 0,
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = { padding: '8px 12px', fontWeight: 600, color: 'var(--gold)', whiteSpace: 'nowrap' };
const tdStyle = { padding: '8px 12px', whiteSpace: 'nowrap' };
