import React, { useState, useEffect } from 'react';
import { CheckCircle2, CircleAlert, Monitor, Gamepad2, Shield } from 'lucide-react';
import { gpuScore, findGpus } from '../data/gpuTiers.js';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default function BuyBadges({ appid, requirements, features }) {
  const [hw, setHw] = useState(null);
  const [deck, setDeck] = useState(null);

  useEffect(() => {
    window.gjallar.hardware().then(setHw).catch(() => {});
    if (appid) {
      window.gjallar.deckStatus(appid).then(setDeck).catch(() => {});
    }
  }, [appid]);

  // Determine performance verdict
  let verdict = null;
  let gpuComparison = null;
  let ramCheck = null;

  if (hw && requirements) {
    const recText = stripHtml(requirements.recommended || '');
    const minText = stripHtml(requirements.minimum || '');
    const bestGpuText = recText || minText;
    const gpus = findGpus(bestGpuText);
    const bestScore = gpus.length ? Math.max(...gpus.map((g) => g.score)) : null;
    const bestName = gpus.length ? gpus.find((g) => g.score === bestScore)?.name : null;

    if (bestScore != null && bestName) {
      const userScore = gpuScore(hw.gpu.name);
      if (userScore == null) {
        verdict = { label: "Can't tell", tagClass: 'tag' };
      } else {
        const ratio = userScore / bestScore;
        if (ratio >= 1.3) {
          verdict = { label: 'Runs great on your PC', tagClass: 'tag green' };
        } else if (ratio >= 1.0) {
          verdict = { label: 'Meets recommended', tagClass: 'tag green' };
        } else {
          // Check if user GPU meets the minimum score
          const minGpus = findGpus(minText);
          const minScore = minGpus.length ? Math.min(...minGpus.map((g) => g.score)) : null;
          verdict = minScore != null && userScore >= minScore
            ? { label: 'Meets minimum', tagClass: 'tag warn' }
            : { label: 'Below minimum', tagClass: 'tag bad' };
        }
        gpuComparison = { userGpu: hw.gpu.name, recGpu: bestName };
      }
    } else if (recText || minText) {
      // Fallback: compare by RAM at least
      verdict = { label: "Can't tell", tagClass: 'tag' };
    }

    // Parse RAM from recommended or minimum requirements
    const ramMatch = /(\d+)\s*GB\s*RAM/i.exec(recText || minText);
    if (ramMatch) {
      const needed = Number(ramMatch[1]);
      ramCheck = { meets: hw.ramGB >= needed, needed };
    }
  }

  // Anti-cheat badge
  const hasAntiCheat = features?.antiCheat && !/^(false|none)$/i.test(features.antiCheat);
  const antiCheatName = hasAntiCheat ? features.antiCheat : null;

  // Upscalers badge
  const upscalers = features?.upscaling && !/^(false|none)$/i.test(features.upscaling) ? features.upscaling.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [];
  const yes = (v) => v === true || /^(true|hackable)$/i.test(String(v || ''));

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 12 }}>Before you buy</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {verdict && <span className={verdict.tagClass}>{verdict.label}</span>}

        {/* RAM check */}
        {ramCheck && (
          <span className={ramCheck.meets ? 'tag green' : 'tag warn'}>
            {ramCheck.meets ? `Meets RAM (${ramCheck.needed} GB)` : `Needs ${ramCheck.needed} GB RAM — you have ${hw?.ramGB ?? '?'} GB`}
          </span>
        )}

        {/* Steam Deck status */}
        {deck && (
          <span className={
            deck === 'verified' ? 'tag green'
            : deck === 'playable' ? 'tag warn'
            : deck === 'unsupported' ? 'tag bad'
            : 'tag'
          }>
            {deck === 'verified' && <Gamepad2 size={12} style={{ marginRight: 3, verticalAlign: -2 }} />}
            Steam Deck {deck.charAt(0).toUpperCase() + deck.slice(1)}
          </span>
        )}

        {/* Anti-cheat */}
        {antiCheatName && (
          <span className="tag warn">
            <Shield size={12} style={{ marginRight: 3, verticalAlign: -2 }} />
            {antiCheatName}
          </span>
        )}

        {/* Upscalers */}
        {upscalers.map((u) => (
          <span key={u} className="tag blue">{u}</span>
        ))}

        {/* HDR */}
        {yes(features?.hdr) && <span className="tag violet">HDR</span>}

        {/* Ultrawide */}
        {yes(features?.ultrawide) && <span className="tag blue">Ultrawide{/hack/i.test(features.ultrawide) ? ' (with a fix)' : ''}</span>}
      </div>

      {/* Muted comparison line */}
      {(gpuComparison || ramCheck) && (
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
          {gpuComparison && <>Your GPU: {gpuComparison.userGpu} vs recommended: {gpuComparison.recGpu}</>}
          {gpuComparison && ramCheck && ' · '}
          {ramCheck && (ramCheck.meets ? `RAM OK (${hw?.ramGB} GB ≥ ${ramCheck.needed} GB)` : `RAM short — need ${ramCheck.needed} GB, have ${hw?.ramGB}`)}
        </p>
      )}
    </div>
  );
}
