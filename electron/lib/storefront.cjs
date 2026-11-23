// Steam store browsing for couch-mode "Store" tab.
const net = require('./net.cjs');

/**
 * Fetch featured / top sellers / new releases / coming soon from the Steam store API.
 * @param {string} [cc='us'] - 2-letter country code.
 * @returns {Promise<Array<{id: string, title: string, items: Array<{appid: number, name: string, image: string|null, discountPercent: number|null, price: number|null, original: number|null, currency: string}>}>>}
 */
const okCc = (cc) => (/^[a-z]{2}$/i.test(cc || '') ? cc.toLowerCase() : 'us');
async function featured(cc = 'us') {
  cc = okCc(cc);
  const url = `https://store.steampowered.com/api/featuredcategories?cc=${cc}&l=english`;
  const data = await net.get(url, { disk: 3600e3 });

  const sections = ['specials', 'top_sellers', 'new_releases', 'coming_soon'];
  const titles = {
    specials: 'Specials',
    top_sellers: 'Top Sellers',
    new_releases: 'New Releases',
    coming_soon: 'Coming Soon',
  };

  const result = [];
  for (const key of sections) {
    const list = data[key];
    if (!list || !Array.isArray(list.items) || list.items.length === 0) continue;

    const items = list.items
      .slice(0, 20)
      .map((item) => ({
        appid: item.id,
        name: item.name ?? '',
        image: item.large_capsule_image ?? item.header_image ?? null,
        discountPercent: item.discount_percent ?? null,
        price: item.final_price != null ? Math.round(item.final_price / 100 * 100) / 100 : null,
        original: item.original_price != null ? Math.round(item.original_price / 100 * 100) / 100 : null,
        currency: item.currency ?? 'usd',
      }));

    result.push({ id: key, title: titles[key] ?? key, items });
  }

  return result;
}

/**
 * Search the Steam store by term.
 * @param {string} term - Search query.
 * @param {string} [cc='us'] - 2-letter country code.
 * @returns {Promise<Array<{appid: number, name: string, image: string|null, price: number|null, original: number|null, currency: string}>>}
 */
async function search(term, cc = 'us') {
  cc = okCc(cc);
  const encoded = encodeURIComponent(term);
  const url = `https://store.steampowered.com/api/storesearch/?term=${encoded}&l=english&cc=${cc}`;
  const data = await net.get(url, { disk: 1800e3 });

  return (data.items ?? [])
    .slice(0, 20)
    .map((item) => ({
      appid: item.id,
      name: item.name ?? '',
      image: item.tiny_image ?? null,
      price: item.price?.final != null ? Math.round(item.price.final / 100 * 100) / 100 : null,
      original: item.price?.initial != null ? Math.round(item.price.initial / 100 * 100) / 100 : null,
      currency: item.price?.currency ?? 'usd',
    }));
}

module.exports = { featured, search };
