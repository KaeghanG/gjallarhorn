import React from 'react';
import { Download, Cloud } from 'lucide-react';

// Small status pills for a game: "Update" when Steam has an update queued, "Cloud" when cloud saves are on.
const pill = (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, color, background: `${color}22`, border: `1px solid ${color}55` });

export function UpdateBadge({ game }) {
  if (game?.updateRequired !== true) return null;
  return <span style={pill('#f0c869')}><Download size={12} />Update</span>;
}

export function CloudBadge({ game }) {
  if (game?.cloudSaves !== true) return null;
  return <span style={pill('#5c9cff')}><Cloud size={12} />Cloud</span>;
}

export default function StatusBadges({ game }) {
  if (game?.updateRequired !== true && game?.cloudSaves !== true) return null;
  return <div style={{ display: 'flex', gap: 6 }}><UpdateBadge game={game} /><CloudBadge game={game} /></div>;
}
