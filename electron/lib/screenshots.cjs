'use strict';

const fs = require('fs');
const path = require('path');

/**
 * List screenshots from Steam userdata + extra directories.
 * @param {{ steamRoot: string, steamUserDirs?: string[], extraDirs?: string[], limit?: number }} opts
 * @returns {Promise<{ file: string, name: string, appid: string|null, mtime: number, size: number }[]>}
 */
async function list({ steamRoot, steamUserDirs = [], extraDirs = [], limit = 120 }) {
  const results = [];
  const seen = new Set();
  const imgExt = /\.(jpg|jpeg|png)$/i;

  // Helper: scan the screenshots folder under a specific user + appid
  function scanAppScreenshots(userDir) {
    if (!userDir || !fs.existsSync(userDir)) return;
    try {
      const ids = fs.readdirSync(userDir, { withFileTypes: true });
      for (const idEntry of ids) {
        if (!idEntry.isDirectory()) continue;
        const appIdPath = path.join(userDir, idEntry.name, '760', 'remote');
        if (!fs.existsSync(appIdPath)) continue;
        const apps = fs.readdirSync(appIdPath, { withFileTypes: true });
        for (const app of apps) {
          if (!app.isDirectory()) continue;
          const ssDir = path.join(appIdPath, app.name, 'screenshots');
          // Files here belong to a specific appid
          scanDir(ssDir, app.name);
        }
      }
    } catch { return; }
  }

  // Helper: add files from a directory (non-recursive) with optional appid tag
  function scanDir(dir, taggedAppid) {
    if (!dir || !fs.existsSync(dir)) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name);
      if (!imgExt.test(ext)) continue;
      const fullPath = path.join(dir, entry.name);
      if (seen.has(fullPath)) continue;
      seen.add(fullPath);
      let stat;
      try { stat = fs.statSync(fullPath); } catch { continue; }
      if (!stat.isFile()) continue;
      results.push({
        file: fullPath,
        name: entry.name,
        appid: taggedAppid ?? null,
        mtime: stat.mtimeMs,
        size: stat.size,
      });
    }
  }

  // Scan Steam userdata: <steamRoot>/userdata/<id>/760/remote/<appid>/screenshots/*.jpg|png
  if (steamRoot) {
    const ud = path.join(steamRoot, 'userdata');
    scanAppScreenshots(ud);
  }

  // Scan additional user directories that follow the same userdata structure
  for (const ud of steamUserDirs) {
    scanAppScreenshots(ud);
  }

  // Scan extra directories (non-recursive, any jpg/png)
  for (const dir of extraDirs) {
    scanDir(dir);
  }

  // Sort newest first, apply limit
  results.sort((a, b) => b.mtime - a.mtime);
  return results.slice(0, limit);
}

/**
 * Convert an OS path to a file:/// URL with forward slashes and percent-encoding.
 * @param {string} p
 * @returns {string}
 */
function toFileUrl(p) {
  // Normalize separators to forward slashes first
  const normalized = p.replace(/\\/g, '/');
  // Split into segments, percent-encode each segment, rejoin
  const segments = normalized.split('/');
  const encoded = segments.map(seg => encodeURIComponent(seg)).join('/');
  return 'file:///' + encoded;
}

module.exports = { list, toFileUrl };
