// Renderer-side data layer. All network goes through the main process (window.gjallar).
const g = () => window.gjallar;
const CS = 'https://www.cheapshark.com/api/1.0';
const STEAM_CDN = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps';

export const steamImg = {
  header: (id) => `${STEAM_CDN}/${id}/header.jpg`,
  hero: (id) => `${STEAM_CDN}/${id}/library_hero.jpg`,
  cover: (id) => `${STEAM_CDN}/${id}/library_600x900_2x.jpg`,
  capsule: (id) => `${STEAM_CDN}/${id}/capsule_616x353.jpg`,
};

// ---------- Region ----------
// Steam and Epic prices follow the user's region; CheapShark only has USD.
let REGION = 'US';
export const setRegion = (cc) => { REGION = (cc || 'US').toUpperCase(); };
export const getRegion = () => REGION;
export const REGIONS = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'], ['IT', 'Italy'],
  ['NL', 'Netherlands'], ['PL', 'Poland'], ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['IE', 'Ireland'],
  ['AU', 'Australia'], ['NZ', 'New Zealand'], ['BR', 'Brazil'], ['MX', 'Mexico'], ['AR', 'Argentina'], ['JP', 'Japan'], ['KR', 'South Korea'],
  ['IN', 'India'], ['TR', 'Türkiye'], ['ZA', 'South Africa'], ['PH', 'Philippines'], ['SG', 'Singapore'],
];

// USD (CheapShark) prices.
export const money = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  return n === 0 ? 'Free' : `$${n.toFixed(2)}`;
};
// Regional prices (Steam gives cents + currency code).
export const moneyIn = (cents, currency) => {
  const n = Number(cents) / 100;
  if (!isFinite(n)) return '—';
  if (n === 0) return 'Free';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency || ''}`.trim();
  }
};

// ---------- CheapShark (prices from every store) ----------
let storesP = null;
export function stores() {
  if (!storesP) {
    storesP = g()
      .fetchJson(`${CS}/stores`)
      .then((list) =>
        Object.fromEntries(
          list.map((s) => [
            s.storeID,
            { id: s.storeID, name: s.storeName, active: !!s.isActive, icon: `https://www.cheapshark.com${s.images.icon}`, logo: `https://www.cheapshark.com${s.images.logo}` },
          ])
        )
      )
      .catch((e) => {
        storesP = null;
        throw e;
      });
  }
  return storesP;
}

export const searchGames = (title) => g().fetchJson(`${CS}/games?title=${encodeURIComponent(title)}&limit=30`);
export const gameById = (id) => g().fetchJson(`${CS}/games?id=${id}`);
export const gamesByIds = (ids) => g().fetchJson(`${CS}/games?ids=${ids.join(',')}`, { fresh: true });
export const gameBySteam = async (appid) => {
  const r = await g().fetchJson(`${CS}/games?steamAppID=${appid}`);
  return r?.[0] || null;
};
export const dealLink = (dealID) => `https://www.cheapshark.com/redirect?dealID=${dealID}`;

export function deals({ sort = 'Deal Rating', stores: storeIds = '1,7,11,15,25,3', page = 0, max = 60, aaa = false, title = '' } = {}) {
  const q = new URLSearchParams({ sortBy: sort, storeID: storeIds, pageSize: '60', pageNumber: String(page), upperPrice: String(max), onSale: '1' });
  if (aaa) q.set('AAA', '1');
  if (title) q.set('title', title);
  return g().fetchJson(`${CS}/deals?${q}`);
}

// ---------- Steam ----------
export const steamFeatured = () => g().fetchJson(`https://store.steampowered.com/api/featuredcategories?cc=${REGION}&l=english`, { disk: 3600e3 });
export async function steamDetails(appid) {
  const r = await g().fetchJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=${REGION}&l=english`, { disk: 24 * 3600e3 });
  return r?.[appid]?.success ? r[appid].data : null;
}
export const steamUrl = (appid) => `https://store.steampowered.com/app/${appid}`;

// ---------- Epic free games ----------
export async function epicFree() {
  const r = await g().fetchJson(`https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=${REGION}&allowCountries=${REGION}`);
  const els = r?.data?.Catalog?.searchStore?.elements || [];
  const pick = (e, types) => e.keyImages?.find((k) => types.includes(k.type))?.url;
  return els
    .map((e) => {
      const now = e.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0];
      const next = e.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0];
      const isFreeNow = now && now.discountSetting?.discountPercentage === 0;
      const isFreeNext = next && next.discountSetting?.discountPercentage === 0;
      if (!isFreeNow && !isFreeNext) return null;
      const slug = e.catalogNs?.mappings?.[0]?.pageSlug || e.productSlug || e.urlSlug;
      return {
        id: e.id,
        title: e.title,
        image: pick(e, ['OfferImageWide', 'DieselStoreFrontWide', 'featuredMedia', 'Thumbnail']) || e.keyImages?.[0]?.url,
        tall: pick(e, ['OfferImageTall', 'DieselStoreFrontTall']),
        now: !!isFreeNow,
        start: (isFreeNow ? now : next).startDate,
        end: (isFreeNow ? now : next).endDate,
        original: e.price?.totalPrice?.fmtPrice?.originalPrice,
        url: slug ? `https://store.epicgames.com/en-US/p/${slug}` : 'https://store.epicgames.com/en-US/free-games',
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.now - a.now);
}

export const timeLeft = (iso) => {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return 'ended';
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((ms % 36e5) / 6e4)}m`;
};

export const bytes = (n) => {
  if (!n) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i > 2 ? 1 : 0)} ${u[i]}`;
};
