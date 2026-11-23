// Community-sourced performance notes for specific Steam games, shown on the game page. Hardware-agnostic: nothing here names a user's PC.
// Each tip says how strong the evidence is, because most "FPS boost" advice online is anecdotal.
// evidence: 'reported' = repeated user reports, 'mixed' = helps some people only.
export const GAME_TIPS = {
  '1245620': [ // Elden Ring
    { evidence: 'mixed', text: 'On Intel hybrid CPUs (12th gen and newer) the game can land on efficiency cores and stutter. Turn on "Prefer performance cores" above and see if it smooths out.' },
    { evidence: 'reported', text: 'Setting the NVIDIA driver shader cache size to Unlimited is the most reported stutter fix.' },
  ],
  '730': [ // Counter-Strike 2
    { evidence: 'reported', text: 'Most CS2 launch options are placebo (-novid does nothing in CS2). In-game graphics settings make a bigger difference.' },
  ],
  '570': [ // Dota 2
    { evidence: 'mixed', text: 'Launch options help little here. The in-game Vulkan option is the usual advice.' },
  ],
  '1643320': [ // STALKER 2
    { evidence: 'reported', text: 'Unreal Engine 5 stutter: community guides suggest -dx11 on weaker GPUs, or staying on DX12 and letting shaders finish compiling at first start. -nothreadtimeout prevents crashes when a render thread is slow.' },
  ],
  '1501750': [ // Lords of the Fallen
    { evidence: 'mixed', text: 'Community guides report fewer stutters with -NoVerifyGC on GPUs with 8 GB+ of VRAM. It is not guaranteed and can hide crashes.' },
  ],
  '1172710': [ // Dune: Awakening
    { evidence: 'mixed', text: 'Players report that deleting the stale pipeline cache (in the game local app data folder) before launching can fix hitching after a patch.' },
  ],
};
export const EVIDENCE = { reported: 'Reported by many players', mixed: 'Helps some people, not everyone' };
