// Football Cards catalog with player ratings, positions, real player photos/artwork, pricing, and booster packs.

export const FOOTBALL_BOOSTER_PACK_PRICE = 150;
export const FOOTBALL_DUPLICATE_REFUND = 30;

export const FOOTBALL_CARDS_CATALOG = [
  // ── LEGENDARY SUPERSTARS (500 - 650 COINS) ──
  {
    id: 'card_messi',
    name: 'Lionel Messi',
    shortName: 'Messi',
    title: 'The GOAT 🐐',
    rating: 94,
    position: 'RW',
    club: 'Inter Miami',
    country: 'Argentina 🇦🇷',
    rarity: 'legendary',
    price: 650,
    photoUrl: '/cards/messi.jpg',
    cardColor: 'linear-gradient(135deg, #ffd700, #ffa500)',
    description: '8x Ballon d\'Or Winner, World Cup Champion, and widely hailed as the greatest footballer of all time.',
    stats: { PAC: 85, SHO: 92, PAS: 94, DRI: 96, DEF: 35, PHY: 68 }
  },
  {
    id: 'card_ronaldo',
    name: 'Cristiano Ronaldo',
    shortName: 'Ronaldo',
    title: 'The Rocket ⚡',
    rating: 94,
    position: 'ST',
    club: 'Al Nassr',
    country: 'Portugal 🇵🇹',
    rarity: 'legendary',
    price: 650,
    photoUrl: '/cards/ronaldo.jpg',
    cardColor: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    description: '5x Ballon d\'Or Winner and all-time leading goalscorer in international & European football history. SIUUU!',
    stats: { PAC: 87, SHO: 94, PAS: 80, DRI: 88, DEF: 34, PHY: 88 }
  },
  {
    id: 'card_mbappe',
    name: 'Kylian Mbappé',
    shortName: 'Mbappé',
    title: 'Speed Demon 🚀',
    rating: 93,
    position: 'ST',
    club: 'Real Madrid',
    country: 'France 🇫🇷',
    rarity: 'legendary',
    price: 600,
    photoUrl: '/cards/mbappe.jpg',
    cardColor: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    description: 'World Cup Winner and World Cup Final hat-trick hero with blisteringly explosive pace and lethal finishing.',
    stats: { PAC: 97, SHO: 90, PAS: 82, DRI: 92, DEF: 36, PHY: 78 }
  },
  {
    id: 'card_haaland',
    name: 'Erling Haaland',
    shortName: 'Haaland',
    title: 'Goal Machine 🤖',
    rating: 92,
    position: 'ST',
    club: 'Manchester City',
    country: 'Norway 🇳🇴',
    rarity: 'legendary',
    price: 580,
    photoUrl: '/cards/haaland.jpg',
    cardColor: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    description: 'Treble winner and Premier League single-season goal record breaker. Pure physical dominance in the box.',
    stats: { PAC: 89, SHO: 93, PAS: 66, DRI: 80, DEF: 45, PHY: 88 }
  },
  {
    id: 'card_debruyne',
    name: 'Kevin De Bruyne',
    shortName: 'De Bruyne',
    title: 'Master Passer 🎯',
    rating: 91,
    position: 'CM',
    club: 'Manchester City',
    country: 'Belgium 🇧🇪',
    rarity: 'legendary',
    price: 540,
    photoUrl: '/cards/debruyne.jpg',
    cardColor: 'linear-gradient(135deg, #38bdf8, #6366f1)',
    description: 'The premier playmaker in modern football with surgical passing vision and thunderbolt long-range goals.',
    stats: { PAC: 72, SHO: 88, PAS: 95, DRI: 87, DEF: 65, PHY: 78 }
  },
  {
    id: 'card_vinicius',
    name: 'Vinícius Jr',
    shortName: 'Vinícius',
    title: 'Samba Flash ⚡',
    rating: 91,
    position: 'LW',
    club: 'Real Madrid',
    country: 'Brazil 🇧🇷',
    rarity: 'legendary',
    price: 540,
    photoUrl: '/cards/vinicius.jpg',
    cardColor: 'linear-gradient(135deg, #eab308, #ec4899)',
    description: '2x Champions League final goalscorer and dazzling Brazilian dribbling wizard.',
    stats: { PAC: 96, SHO: 85, PAS: 81, DRI: 93, DEF: 29, PHY: 68 }
  },
  {
    id: 'card_salah',
    name: 'Mohamed Salah',
    shortName: 'Salah',
    title: 'Egyptian King 👑',
    rating: 90,
    position: 'RW',
    club: 'Liverpool FC',
    country: 'Egypt 🇪🇬',
    rarity: 'legendary',
    price: 500,
    photoUrl: '/cards/salah.jpg',
    cardColor: 'linear-gradient(135deg, #ef4444, #f59e0b)',
    description: 'Liverpool legend, Premier League Golden Boot winner, and Egyptian national hero.',
    stats: { PAC: 90, SHO: 89, PAS: 84, DRI: 89, DEF: 45, PHY: 76 }
  },

  // ── EPIC STARS (400 - 480 COINS) ──
  {
    id: 'card_bellingham',
    name: 'Jude Bellingham',
    shortName: 'Bellingham',
    title: 'Golden Boy 🌟',
    rating: 89,
    position: 'CAM',
    club: 'Real Madrid',
    country: 'England 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    rarity: 'epic',
    price: 450,
    photoUrl: '/cards/bellingham.jpg',
    cardColor: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    description: 'Champions League winner, La Liga Player of the Season, and midfield sensation.',
    stats: { PAC: 80, SHO: 83, PAS: 85, DRI: 88, DEF: 78, PHY: 84 }
  },
  {
    id: 'card_neymar',
    name: 'Neymar Jr',
    shortName: 'Neymar',
    title: 'Samba Maestro 🎨',
    rating: 89,
    position: 'LW',
    club: 'Al Hilal',
    country: 'Brazil 🇧🇷',
    rarity: 'epic',
    price: 450,
    photoUrl: '/cards/neymar.jpg',
    cardColor: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    description: 'Brazil\'s all-time top scorer and world-renowned flair specialist and entertainer.',
    stats: { PAC: 86, SHO: 83, PAS: 87, DRI: 93, DEF: 37, PHY: 61 }
  },
  {
    id: 'card_kane',
    name: 'Harry Kane',
    shortName: 'Kane',
    title: 'Sniper Striker 🎯',
    rating: 89,
    position: 'ST',
    club: 'Bayern Munich',
    country: 'England 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    rarity: 'epic',
    price: 430,
    photoUrl: '/cards/kane.jpg',
    cardColor: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    description: 'England\'s all-time top scorer, European Golden Shoe winner, and world-class finisher.',
    stats: { PAC: 68, SHO: 93, PAS: 85, DRI: 82, DEF: 47, PHY: 82 }
  },
  {
    id: 'card_modric',
    name: 'Luka Modrić',
    shortName: 'Modrić',
    title: 'Midfield Maestro 🎩',
    rating: 88,
    position: 'CM',
    club: 'Real Madrid',
    country: 'Croatia 🇭🇷',
    rarity: 'epic',
    price: 400,
    photoUrl: '/cards/modric.jpg',
    cardColor: 'linear-gradient(135deg, #f59e0b, #ec4899)',
    description: 'Ballon d\'Or Winner and 6x UEFA Champions League champion with unmatched tempo control.',
    stats: { PAC: 74, SHO: 76, PAS: 89, DRI: 88, DEF: 72, PHY: 66 }
  },
  {
    id: 'card_valverde',
    name: 'Federico Valverde',
    shortName: 'Valverde',
    title: 'El Halcón 🦅',
    rating: 88,
    position: 'CM',
    club: 'Real Madrid',
    country: 'Uruguay 🇺🇾',
    rarity: 'epic',
    price: 400,
    photoUrl: '/cards/valverde.jpg',
    cardColor: 'linear-gradient(135deg, #7c3aed, #d946ef)',
    description: 'Relentless box-to-box engine with blistering pace and missile-like long shots.',
    stats: { PAC: 88, SHO: 84, PAS: 85, DRI: 84, DEF: 80, PHY: 85 }
  },

  // ── RARE CONTENDERS (240 - 350 COINS) ──
  {
    id: 'card_musiala',
    name: 'Jamal Musiala',
    shortName: 'Musiala',
    title: 'Bambi Dribbler 🦌',
    rating: 87,
    position: 'CAM',
    club: 'Bayern Munich',
    country: 'Germany 🇩🇪',
    rarity: 'rare',
    price: 350,
    photoUrl: '/cards/musiala.jpg',
    cardColor: 'linear-gradient(135deg, #7c3aed, #c026d3)',
    description: 'Mesmerizing tight-space dribbler and German national team superstar.',
    stats: { PAC: 86, SHO: 81, PAS: 83, DRI: 91, DEF: 38, PHY: 65 }
  },
  {
    id: 'card_saka',
    name: 'Bukayo Saka',
    shortName: 'Saka',
    title: 'Starboy 🌟',
    rating: 86,
    position: 'RW',
    club: 'Arsenal FC',
    country: 'England 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    rarity: 'rare',
    price: 300,
    photoUrl: '/cards/saka.jpg',
    cardColor: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
    description: 'Arsenal\'s talisman with lethal cut-in goals and pinpoint crossing delivery.',
    stats: { PAC: 87, SHO: 83, PAS: 82, DRI: 87, DEF: 60, PHY: 74 }
  },
  {
    id: 'card_pedri',
    name: 'Pedri',
    shortName: 'Pedri',
    title: 'Golden Foot 🦶',
    rating: 86,
    position: 'CM',
    club: 'FC Barcelona',
    country: 'Spain 🇪🇸',
    rarity: 'rare',
    price: 300,
    photoUrl: '/cards/pedri.jpg',
    cardColor: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    description: 'Silky smooth conductor with phenomenal football intelligence and 360-degree vision.',
    stats: { PAC: 78, SHO: 72, PAS: 88, DRI: 89, DEF: 68, PHY: 64 }
  },
  {
    id: 'card_rodrygo',
    name: 'Rodrygo',
    shortName: 'Rodrygo',
    title: 'Clutch King ⚡',
    rating: 86,
    position: 'RW',
    club: 'Real Madrid',
    country: 'Brazil 🇧🇷',
    rarity: 'rare',
    price: 290,
    photoUrl: '/cards/rodrygo.jpg',
    cardColor: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    description: 'Ice-cold big match performer with crucial European knockout goals.',
    stats: { PAC: 88, SHO: 84, PAS: 81, DRI: 88, DEF: 32, PHY: 62 }
  },
  {
    id: 'card_palmer',
    name: 'Cole Palmer',
    shortName: 'Palmer',
    title: 'Cold Palmer 🥶',
    rating: 85,
    position: 'CAM',
    club: 'Chelsea FC',
    country: 'England 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    rarity: 'rare',
    price: 260,
    photoUrl: '/cards/palmer.jpg',
    cardColor: 'linear-gradient(135deg, #0284c7, #2563eb)',
    description: 'Premier League Young Player of the Season with ice in his veins from any distance.',
    stats: { PAC: 80, SHO: 85, PAS: 86, DRI: 85, DEF: 45, PHY: 68 }
  },
  {
    id: 'card_alvarez',
    name: 'Julián Álvarez',
    shortName: 'Álvarez',
    title: 'La Araña 🕷️',
    rating: 85,
    position: 'ST',
    club: 'Atlético Madrid',
    country: 'Argentina 🇦🇷',
    rarity: 'rare',
    price: 250,
    photoUrl: '/cards/alvarez.jpg',
    cardColor: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    description: 'World Cup, Copa América, and Champions League champion with tireless pressing and clutch goals.',
    stats: { PAC: 85, SHO: 84, PAS: 78, DRI: 83, DEF: 52, PHY: 78 }
  },

  // ── COMMON / WONDERKIDS (120 - 200 COINS) ──
  {
    id: 'card_yamal',
    name: 'Lamine Yamal',
    shortName: 'Yamal',
    title: 'Wonderkid 💎',
    rating: 84,
    position: 'RW',
    club: 'FC Barcelona',
    country: 'Spain 🇪🇸',
    rarity: 'common',
    price: 180,
    photoUrl: '/cards/yamal.jpg',
    cardColor: 'linear-gradient(135deg, #10b981, #3b82f6)',
    description: 'Euro 2024 Champion and Young Player of the Tournament with unbelievable left-footed curve shots.',
    stats: { PAC: 88, SHO: 78, PAS: 81, DRI: 87, DEF: 32, PHY: 60 }
  },
  {
    id: 'card_gavi',
    name: 'Gavi',
    shortName: 'Gavi',
    title: 'Pitbull 🐾',
    rating: 83,
    position: 'CM',
    club: 'FC Barcelona',
    country: 'Spain 🇪🇸',
    rarity: 'common',
    price: 150,
    photoUrl: '/cards/gavi.jpg',
    cardColor: 'linear-gradient(135deg, #10b981, #059669)',
    description: 'Tenacious Golden Boy award winner with ferocious ball recovery and relentless energy.',
    stats: { PAC: 76, SHO: 68, PAS: 79, DRI: 84, DEF: 74, PHY: 77 }
  },
  {
    id: 'card_mainoo',
    name: 'Kobbie Mainoo',
    shortName: 'Mainoo',
    title: 'Midfield Prodigy ✨',
    rating: 81,
    position: 'CM',
    club: 'Manchester United',
    country: 'England 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    rarity: 'common',
    price: 130,
    photoUrl: '/cards/mainoo.jpg',
    cardColor: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    description: 'FA Cup winner with calm composure beyond his years in the center of the park.',
    stats: { PAC: 74, SHO: 70, PAS: 80, DRI: 83, DEF: 76, PHY: 75 }
  },
  {
    id: 'card_endrick',
    name: 'Endrick',
    shortName: 'Endrick',
    title: 'Bobby Flash ⚡',
    rating: 80,
    position: 'ST',
    club: 'Real Madrid',
    country: 'Brazil 🇧🇷',
    rarity: 'common',
    price: 120,
    photoUrl: '/cards/endrick.jpg',
    cardColor: 'linear-gradient(135deg, #10b981, #f59e0b)',
    description: 'Sensational Brazilian teenage striker with dynamite in his left boot.',
    stats: { PAC: 87, SHO: 81, PAS: 68, DRI: 80, DEF: 32, PHY: 80 }
  }
];

export const getFootballCardById = (id) => FOOTBALL_CARDS_CATALOG.find(card => card.id === id);

/**
 * Rolls a random card for Booster Pack
 * Weights: Legendary 8%, Epic 22%, Rare 40%, Common 30%
 */
export const rollFootballBoosterPack = (ownedCardIds = []) => {
  const rand = Math.random();
  let targetRarity = 'common';

  if (rand < 0.08) {
    targetRarity = 'legendary';
  } else if (rand < 0.30) {
    targetRarity = 'epic';
  } else if (rand < 0.70) {
    targetRarity = 'rare';
  } else {
    targetRarity = 'common';
  }

  const rarityCards = FOOTBALL_CARDS_CATALOG.filter(c => c.rarity === targetRarity);
  const pool = rarityCards.length > 0 ? rarityCards : FOOTBALL_CARDS_CATALOG;

  // Prefer unowned cards within the rolled rarity tier if possible
  const unownedInRarity = pool.filter(c => !ownedCardIds.includes(c.id));
  const selectionPool = unownedInRarity.length > 0 ? unownedInRarity : pool;

  const chosen = selectionPool[Math.floor(Math.random() * selectionPool.length)];
  const isDuplicate = ownedCardIds.includes(chosen.id);

  return {
    ...chosen,
    isDuplicate,
    refundCoins: isDuplicate ? FOOTBALL_DUPLICATE_REFUND : 0,
  };
};
