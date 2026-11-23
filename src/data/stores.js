// Store trust registry. Every price Gjallarhorn shows carries one of these badges so users know what they're buying from.
// official   = the platform/publisher itself
// authorized = sells keys supplied by publishers/distributors (authorized resellers)
// keyshop    = grey market: keys of unverified origin, may be region-locked or (rarely) revoked by the publisher
// Researched 2026-11-22. CDKeys rebranded to Loaded (loaded.com) in 2025.
export const TRUST = {
  official: { label: 'Official', cls: 'green', desc: 'The platform or publisher itself.' },
  authorized: { label: 'Authorized', cls: 'blue', desc: 'Authorized reseller: keys come from the publisher or its distributors.' },
  keyshop: { label: 'Key shop', cls: 'warn', desc: 'Grey market: not authorized by publishers. Keys can be region-locked, and keys from fraud can be revoked.' },
};

// CheapShark store IDs → trust tier.
export const STORE_TRUST = {
  1: 'official', // Steam
  7: 'official', // GOG
  11: 'official', // Humble Store (official partner store)
  13: 'official', // Ubisoft Store
  25: 'official', // Epic Games Store
  31: 'official', // Blizzard
  2: 'authorized', // GamersGate
  3: 'authorized', // GreenManGaming
  15: 'authorized', // Fanatical
  21: 'authorized', // WinGameStore
  23: 'authorized', // GameBillet
  27: 'authorized', // Gamesplanet
  30: 'authorized', // IndieGala
  35: 'authorized', // DreamGame
};
export const trustOf = (storeID) => STORE_TRUST[storeID] || 'authorized';

// Key shops the user asked for. Both block automated price checks, so Gjallarhorn shows GG.deals' lowest key-shop price
// (GG.deals tracks these shops) and links to a search on each site.
export const KEYSHOPS = [
  {
    id: 'loaded', name: 'Loaded (formerly CDKeys)', reputation: 'Well reviewed (around 4.7/5 from 200k+ reviews). Sells keys itself rather than hosting random sellers. Check the region before buying.',
    search: (q) => `https://www.loaded.com/catalogsearch/result/?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'g2a', name: 'G2A', reputation: 'Marketplace: anyone can sell, like eBay. Cheapest but riskiest: buy from highly rated sellers, keys from fraud can be revoked.',
    search: (q) => `https://www.g2a.com/search?query=${encodeURIComponent(q)}`,
  },
];
