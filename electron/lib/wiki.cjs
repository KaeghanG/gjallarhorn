// PCGamingWiki lookup: finds the page for a game and pulls out its fixes and feature flags.
const net = require('./net.cjs');
const API = 'https://www.pcgamingwiki.com/w/api.php';

function clean(s) {
  let t = s;
  for (let i = 0; i < 4; i++) t = t.replace(/\{\{(?:[^{}]|\{[^{}]*\})*\}\}/g, (m) => {
    // keep the readable part of a few common templates
    const inner = m.slice(2, -2);
    const parts = inner.split('|');
    const name = parts[0].trim().toLowerCase();
    if (/^(file|folder|code|key|term|p)$/.test(name) || name.startsWith('file')) return parts.slice(1).join(' ');
    if (/^(ii|--|-|\+\+|\+|=)$/.test(name)) return '';
    return '';
  });
  return t
    .replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\[(https?:\/\/\S+)\s+([^\]]+)\]/g, '$2')
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/^[#*:]+\s*/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function field(text, name) {
  const m = text.match(new RegExp(`\\|[ \\t]*${name}[ \\t]*=[ \\t]*([^\\n]*)`, 'i'));
  const v = m ? clean(m[1]).trim() : '';
  return v && !/^(unknown|n\/a)$/i.test(v) ? v : null;
}

async function findPage({ name }) {
  if (!name) return null;
  const base = String(name).replace(/[™®©]/g, '').replace(/\s+/g, ' ').trim();
  const titleCase = base.toLowerCase().replace(/(^|[\s:-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
  // 1) direct title match (follows wiki redirects)
  const t = await net.get(`${API}?action=query&titles=${encodeURIComponent([base, titleCase].join('|'))}&redirects=1&format=json&formatversion=2`);
  const page = (t.query?.pages || []).find((p) => !p.missing && p.ns === 0);
  if (page) return page.title;
  // 2) full-text search
  const s = await net.get(`${API}?action=query&list=search&srsearch=${encodeURIComponent(base)}&srlimit=5&format=json`);
  const hits = s.query?.search || [];
  const exact = hits.find((h) => h.title.toLowerCase() === base.toLowerCase());
  return (exact || hits[0])?.title || null;
}

async function lookup({ appid, name }) {
  const page = await findPage({ appid, name });
  if (!page) return { found: false };
  const p = await net.get(`${API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`);
  const wt = p.parse?.wikitext || '';
  const engines = [...wt.matchAll(/\{\{Infobox game\/row\/engine\|([^|}]+)/g)].map((m) => m[1].trim());

  // Split by == headings == and keep the useful sections' subsections.
  const sections = [];
  const re = /^(={2,4})\s*(.+?)\s*\1\s*$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(wt))) heads.push({ level: m[1].length, title: m[2], start: m.index, bodyStart: re.lastIndex });
  let parent = null;
  heads.forEach((h, i) => {
    if (h.level === 2) parent = h.title;
    if (!/essential improvements|issues fixed|issues unresolved|other information/i.test(parent || '')) return;
    if (h.level === 2) return;
    const body = clean(wt.slice(h.bodyStart, heads[i + 1]?.start ?? wt.length));
    if (body.length > 20) sections.push({ group: parent, title: clean(h.title), body: body.slice(0, 1200) });
  });

  return {
    found: true,
    page,
    url: `https://www.pcgamingwiki.com/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`,
    engines,
    features: {
      upscaling: field(wt, 'upscaling tech'),
      frameGen: field(wt, 'frame gen tech'),
      hdr: field(wt, 'hdr'),
      ultrawide: field(wt, 'ultrawidescreen'),
      highFps: field(wt, '120\\+ fps'),
      api: field(wt, 'direct3d versions'),
      antiCheat: field(wt, 'anticheat'),
    },
    sections: sections.slice(0, 14),
  };
}

module.exports = { lookup, findPage };
