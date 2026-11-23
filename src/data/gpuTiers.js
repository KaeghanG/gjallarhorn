// GPU tier database. T9 (round 3).
// Scores relative to GTX 1060 6 GB = 100 (raster performance proxy).

export const GPU_TIERS = [
  // --- RTX 5000 series (desktop) ---
  { match: /RTX\s*5090/gi, score: 720 },
  { match: /RTX\s*5080/gi, score: 430 },
  { match: /RTX\s*5070[^\d]*/gi, score: 360 },
  { match: /RTX\s*5060[^\d]*/gi, score: 240 },

  // --- RTX 5000 series (laptop / mobile) ---
  { match: /RTX\s*5090\s*(?:Laptop|Mobile)/gi, score: 600 },
  { match: /RTX\s*5080\s*(?:Laptop|Mobile)/gi, score: 340 },
  { match: /RTX\s*5070\s*(?:Laptop|Mobile)/gi, score: 290 },
  { match: /RTX\s*5060\s*(?:Laptop|Mobile)/gi, score: 230 },

  // --- RTX 4000 series (desktop) ---
  { match: /RTX\s*4090/gi, score: 640 },
  { match: /RTX\s*4080\s*SUPER/gi, score: 510 },
  { match: /RTX\s*4080/gi, score: 470 },
  { match: /RTX\s*4070[^\d]*/gi, score: 360 },
  { match: /RTX\s*4070[gT]?i/gi, score: 320 },
  { match: /RTX\s*4060[^\d]*/gi, score: 240 },

  // --- RTX 4000 series (laptop / mobile) ---
  { match: /RTX\s*4090\s*(?:Laptop|Mobile)/gi, score: 520 },
  { match: /RTX\s*4080\s*(?:Laptop|Mobile)/gi, score: 390 },
  { match: /RTX\s*4070\s*(?:Laptop|Mobile)/gi, score: 310 },
  { match: /RTX\s*4060\s*(?:Laptop|Mobile)/gi, score: 220 },

  // --- RTX 3000 series (desktop) ---
  { match: /RTX\s*3090[^\d]*/gi, score: 470 },
  { match: /RTX\s*3080[^\d]*/gi, score: 360 },
  { match: /RTX\s*3070[^\d]*/gi, score: 250 },
  { match: /RTX\s*3060[^\d]*/gi, score: 170 },

  // --- RTX 3000 series (laptop / mobile) ---
  { match: /RTX\s*3080\s*(?:Laptop|Mobile)/gi, score: 280 },
  { match: /RTX\s*3070\s*(?:Laptop|Mobile)/gi, score: 200 },
  { match: /RTX\s*3060\s*(?:Laptop|Mobile)/gi, score: 140 },

  // --- RTX 2000 series (desktop) ---
  { match: /RTX\s*2080[^\d]*/gi, score: 250 },
  { match: /RTX\s*2070[^\d]*/gi, score: 190 },
  { match: /RTX\s*2060[^\d]*/gi, score: 140 },

  // --- RX 9000 series (AMD) ---
  { match: /RX\s*9[0-9][0-9]/gi, score: 340 },

  // --- RX 7000 series (desktop) ---
  { match: /RX\s*79[0-9][0-9]\s*(?:XT|x2)?/gi, score: 310 },
  { match: /RX\s*7800\s*XT/gi, score: 270 },
  { match: /RX\s*7700\s*XT/gi, score: 240 },
  { match: /RX\s*7600/gi, score: 190 },

  // --- RX 7000 series (laptop) ---
  { match: /RX\s*(?:7[0-9]{2})\s*(?:Laptop|Mobile)/gi, score: 200 },

  // --- RX 6000 series (desktop) ---
  { match: /RX\s*69[0-9][0-9]\s*XT/gi, score: 280 },
  { match: /RX\s*6800\s*XT/gi, score: 240 },
  { match: /RX\s*6800/gi, score: 220 },
  { match: /RX\s*6700\s*XT/gi, score: 190 },
  { match: /RX\s*6600/gi, score: 175 },

  // --- RX 6000 series (laptop) ---
  { match: /RX\s*(?:6[0-9]{2})\s*(?:Laptop|Mobile)/gi, score: 150 },

  // --- RX 5000 series (desktop) ---
  { match: /RX\s*5700\s*XT/gi, score: 180 },
  { match: /RX\s*5700/gi, score: 160 },
  { match: /RX\s*5600\s*XT/gi, score: 145 },

  // --- RX 500 series (desktop) ---
  { match: /RX\s*590\b/gi, score: 115 },
  { match: /RX\s*580\b/gi, score: 105 },
  { match: /RX\s*570\b/gi, score: 90 },
  { match: /RX\s*5600\s*(?:XT)?/gi, score: 140 },
  { match: /RX\s*560\b/gi, score: 55 },

  // --- RX 500 series (laptop) ---
  { match: /RX\s*5[0-9]{2}\s*(?:Laptop|Mobile)/gi, score: 70 },

  // --- RX 400 series (desktop) ---
  { match: /RX\s*480\b/gi, score: 100 },
  { match: /RX\s*470\b/gi, score: 90 },

  // --- GTX 900 series ---
  { match: /GTX\s*980[^\d]*/gi, score: 130 },
  { match: /GTX\s*970/gi, score: 115 },
  { match: /GTX\s*960/gi, score: 95 },

  // --- GTX 1600 series ---
  { match: /GTX\s*1660\s*T[PSX]/gi, score: 135 },
  { match: /GTX\s*1660\s*SUPER/gi, score: 130 },
  { match: /GTX\s*1660/gi, score: 120 },
  { match: /GTX\s*1650[^\d]*/gi, score: 75 },

  // --- GTX 1000 series (6 GB variants first) ---
  { match: /GTX\s*1080[^\d]*/gi, score: 230 },
  { match: /GTX\s*1070[^\d]*/gi, score: 175 },
  { match: /GTX\s*1060\s*(?:6\s*GB|6GB)/gi, score: 100 },
  { match: /GTX\s*1060\s*(?:3\s*GB|3GB)/gi, score: 90 },
  { match: /GTX\s*1060/gi, score: 100 },

  // --- Intel Arc (desktop) ---
  { match: /Arc\s*A770/gi, score: 150 },
  { match: /Arc\s*A750/gi, score: 130 },
  { match: /Arc\s*B580/gi, score: 160 },
  { match: /Arc\s*A380/gi, score: 70 },

  // --- Intel Iris Xe / UHD (integrated) ---
  { match: /Iris\s*Xe/gi, score: 15 },
  { match: /UHD\s*Graphics/gi, score: 5 },
];

// Sort from longest pattern (most specific) to shortest.
GPU_TIERS.sort((a, b) => b.match.source.length - a.match.source.length);

/** @param {string} name GPU model name (e.g. 'NVIDIA GeForce RTX 3060') */
export function gpuScore(name) {
  if (!name) return null;
  for (const tier of GPU_TIERS) {
    // Fresh non-global regex: .test() on a /g regex keeps lastIndex and fails every other call.
    if (new RegExp(tier.match.source, 'i').test(name)) return tier.score;
  }
  return null;
}

/** @param {string} text Steam system-requirements block */
export function findGpus(text) {
  const result = [];
  if (!text) return result;
  for (const tier of GPU_TIERS) {
    const matches = [...text.matchAll(new RegExp(tier.match.source, 'gi'))];
    for (const m of matches) {
      // Patterns like /RTX\s*3060[^\d]*/ swallow trailing text: keep just the model name.
      const name = m[0].split(/\s+or\s+|[,/(]|\s+\d+\s*GB/i)[0].trim();
      result.push({ name, score: tier.score });
    }
  }
  // Deduplicate by name (a card may match multiple tiers).
  return [...new Map(result.map(r => [r.name, r])).values()];
}
