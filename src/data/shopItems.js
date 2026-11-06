// Shop items catalog (non-Pokémon items).
// Categories: 'themes', 'celebrations', 'powerups', 'flair'

export const SHOP_CATEGORIES = [
  { id: 'themes', name: 'Board Themes', icon: '🎨' },
  { id: 'celebrations', name: 'Solve Effects', icon: '🎉' },
  { id: 'powerups', name: 'Power-Ups', icon: '✨' },
  { id: 'flair', name: 'Profile Flair', icon: '🏅' }
];

export const SHOP_ITEMS = [
  // Board Themes
  {
    id: 'theme_forest',
    name: 'Forest Board',
    category: 'themes',
    price: 60,
    icon: '🌲',
    description: 'A serene green board inspired by nature',
    isConsumable: false
  },
  {
    id: 'theme_castle',
    name: 'Castle Board',
    category: 'themes',
    price: 60,
    icon: '🏰',
    description: 'A warm wood-toned classic castle board',
    isConsumable: false
  },
  {
    id: 'theme_space',
    name: 'Space Board',
    category: 'themes',
    price: 100,
    icon: '🌌',
    description: 'A dark purple galaxy board with stardust squares',
    isConsumable: false
  },
  {
    id: 'theme_ice',
    name: 'Ice Kingdom Board',
    category: 'themes',
    price: 80,
    icon: '❄️',
    description: 'A cool blue board with frosted squares',
    isConsumable: false
  },
  {
    id: 'theme_volcano',
    name: 'Volcano Board',
    category: 'themes',
    price: 100,
    icon: '🌋',
    description: 'A fiery red-and-black volcanic board',
    isConsumable: false
  },
  {
    id: 'theme_ocean',
    name: 'Ocean Board',
    category: 'themes',
    price: 80,
    icon: '🌊',
    description: 'A deep blue ocean-inspired board with wave patterns',
    isConsumable: false
  },
  {
    id: 'theme_candy',
    name: 'Candy Board',
    category: 'themes',
    price: 70,
    icon: '🍬',
    description: 'A sweet pink and pastel candy-themed board',
    isConsumable: false
  },
  {
    id: 'theme_neon',
    name: 'Neon Board',
    category: 'themes',
    price: 120,
    icon: '💜',
    description: 'A vibrant neon-glow cyberpunk board that shines in the dark',
    isConsumable: false
  },

  // Celebrations
  {
    id: 'celebrate_fireworks',
    name: 'Fireworks Solve',
    category: 'celebrations',
    price: 40,
    icon: '🎆',
    description: 'Fireworks burst on your screen when you solve a puzzle!',
    isConsumable: false
  },
  {
    id: 'celebrate_confetti',
    name: 'Confetti Blast',
    category: 'celebrations',
    price: 40,
    icon: '🎉',
    description: 'A shower of colorful confetti falls down when solved!',
    isConsumable: false
  },
  {
    id: 'celebrate_starburst',
    name: 'Star Burst',
    category: 'celebrations',
    price: 60,
    icon: '⭐',
    description: 'Shiny golden stars explode outwards from the board on solve!',
    isConsumable: false
  },
  {
    id: 'celebrate_rainbow',
    name: 'Rainbow Rain',
    category: 'celebrations',
    price: 50,
    icon: '🌈',
    description: 'A colorful rainbow cascades across the screen on solve!',
    isConsumable: false
  },
  {
    id: 'celebrate_lightning',
    name: 'Lightning Strike',
    category: 'celebrations',
    price: 75,
    icon: '⚡',
    description: 'Electric lightning bolts flash around the board when solved!',
    isConsumable: false
  },

  // Power-Ups
  {
    id: 'powerup_skip',
    name: 'Extra Skip',
    category: 'powerups',
    price: 30,
    icon: '⏩',
    description: 'Gain 1 extra skip that can be used this round!',
    isConsumable: true
  },
  {
    id: 'powerup_double_coins',
    name: 'Double Coins',
    category: 'powerups',
    price: 50,
    icon: '💰',
    description: 'Earn double coins on your next solved puzzle!',
    isConsumable: true
  },
  {
    id: 'powerup_hint_token',
    name: 'Hint Token',
    category: 'powerups',
    price: 20,
    icon: '🔮',
    description: 'Get a free hint from your companion without spending coins!',
    isConsumable: true
  },
  {
    id: 'powerup_shield',
    name: 'Coin Shield',
    category: 'powerups',
    price: 35,
    icon: '🛡️',
    description: 'Protects your coins from the next wrong move penalty!',
    isConsumable: true
  },

  // Profile Flair
  {
    id: 'flair_gold_border',
    name: 'Gold Border',
    category: 'flair',
    price: 150,
    icon: '👑',
    description: 'A glowing gold border around your name on the leaderboard',
    isConsumable: false
  },
  {
    id: 'flair_diamond_border',
    name: 'Diamond Border',
    category: 'flair',
    price: 250,
    icon: '💎',
    description: 'A sparkling diamond animation around your leaderboard card',
    isConsumable: false
  },
  {
    id: 'flair_rainbow_border',
    name: 'Rainbow Border',
    category: 'flair',
    price: 200,
    icon: '🌈',
    description: 'A shifting rainbow gradient border around your card',
    isConsumable: false
  },
  {
    id: 'flair_crown',
    name: 'Crown Title',
    category: 'flair',
    price: 200,
    icon: '👑',
    description: 'Adds a prestigious "👑" title prefix before your name',
    isConsumable: false
  },
  {
    id: 'flair_lightning',
    name: 'Lightning Title',
    category: 'flair',
    price: 100,
    icon: '⚡',
    description: 'Adds a flashing "⚡" speed title prefix before your name',
    isConsumable: false
  },
  {
    id: 'flair_fire',
    name: 'Fire Title',
    category: 'flair',
    price: 120,
    icon: '🔥',
    description: 'Adds a blazing "🔥" title prefix before your name',
    isConsumable: false
  },
  {
    id: 'flair_star',
    name: 'Star Title',
    category: 'flair',
    price: 80,
    icon: '⭐',
    description: 'Adds a shining "⭐" title prefix before your name',
    isConsumable: false
  },
];

export const getShopItemById = (id) => SHOP_ITEMS.find(item => item.id === id);
export const getShopItemsByCategory = (category) => SHOP_ITEMS.filter(item => item.category === category);
