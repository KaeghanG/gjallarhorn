// Humble Bundle has no public API. /bundles is a Next.js page where each bundle tile is made of
// several <a href="/games/<slug>"> anchors: image, description ("... N Items • $X Value"), title, countdown.
const net = require('./net.cjs');

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

async function bundles() {
  const html = await net.get('https://www.humblebundle.com/bundles', { asText: true, browser: true });
  const map = new Map();
  const re = /<a\b[^>]*href="\/(games|books|software)\/([^"?#]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, category, slug, inner] = m;
    const id = `${category}/${slug}`;
    if (!map.has(id)) map.set(id, { id, category, slug, url: `https://www.humblebundle.com/${id}`, texts: [], image: null });
    const b = map.get(id);
    if (!b.image) {
      const img = inner.match(/hb-prd\.imgix\.net%2F([^&"]+)/);
      if (img) b.image = `https://hb-prd.imgix.net/${decodeURIComponent(img[1])}?w=800&auto=format`;
    }
    const text = decode(inner.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (text) b.texts.push(text);
  }
  const out = [];
  for (const b of map.values()) {
    const desc = b.texts.find((t) => /Items?\s*•/.test(t)) || '';
    const title = b.texts.find((t) => t !== desc && !/^[\d:\s]+$/.test(t) && t.length < 120) || b.slug.replace(/-/g, ' ');
    const items = desc.match(/(\d+)\s+Items?/);
    const value = desc.match(/\$([\d,.]+)\s+Value/);
    const blurb = desc.replace(/\d+\s+Items?\s*•.*$/, '').replace(/^Pay What You Want\s*/, '').trim();
    out.push({
      id: b.id, category: b.category, url: b.url, image: b.image, title,
      blurb, items: items ? Number(items[1]) : null, value: value ? `$${value[1]}` : null,
      pwyw: /Pay What You Want/i.test(desc),
    });
  }
  return out.filter((b) => b.image);
}

module.exports = { bundles };
