/**
 * puzzleApi.js
 * Fetches live chess puzzles from the chess-puzzles-api (backed by the full Lichess puzzle database).
 * Supports filtering by theme, rating range, pagination, and tracks solved puzzle IDs to avoid repeats.
 *
 * Lichess puzzle format:
 *   FEN   = position BEFORE the opponent's "setup" move
 *   Moves = "opponentSetup player1 opponentReply1 player2 ..." (space-separated UCI)
 *
 * The first move in Moves is always the opponent's setup move that the engine auto-plays.
 * The player then needs to find every subsequent odd-indexed move.
 */

const API_BASE = 'https://chess-puzzles-api.vercel.app/puzzles';

// In-memory cache: cacheKey -> { puzzles: [], currentOffset: number, exhausted: bool }
const puzzleCache = {};

// How many puzzles to fetch per request (API max tested = 100)
const BATCH_SIZE = 100;

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * Returns a new shuffled array copy.
 */
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Supported themes (value = API theme string, label = display name)
 */
export const PUZZLE_THEMES = [
  { value: 'mixed',            label: 'All Themes',        icon: '♟️' },
  { value: 'fork',             label: 'Fork',              icon: '⚔️' },
  { value: 'pin',              label: 'Pin',               icon: '📌' },
  { value: 'skewer',           label: 'Skewer',            icon: '🗡️' },
  { value: 'mateIn1',          label: 'Mate in 1',         icon: '💀' },
  { value: 'mateIn2',          label: 'Mate in 2',         icon: '☠️' },
  { value: 'mateIn3',          label: 'Mate in 3',         icon: '👑' },
  { value: 'discoveredAttack', label: 'Discovered Attack', icon: '🔍' },
  { value: 'deflection',       label: 'Deflection',        icon: '↩️' },
  { value: 'sacrifice',        label: 'Sacrifice',         icon: '🎁' },
  { value: 'endgame',          label: 'Endgame',           icon: '🏁' },
  { value: 'middlegame',       label: 'Middlegame',        icon: '⚡' },
  { value: 'crushing',         label: 'Crushing',          icon: '💥' },
  { value: 'advantage',        label: 'Advantage',         icon: '📈' },
];

/**
 * Difficulty presets mapped to Lichess rating ranges
 */
export const DIFFICULTY_PRESETS = [
  { value: 'beginner',     label: 'Beginner',     minRating: 600,  maxRating: 1200 },
  { value: 'intermediate', label: 'Intermediate', minRating: 1200, maxRating: 1800 },
  { value: 'advanced',     label: 'Advanced',     minRating: 1800, maxRating: 2400 },
  { value: 'expert',       label: 'Expert',       minRating: 2400, maxRating: 3500 },
  { value: 'mixed',        label: 'Mixed Mode',   minRating: 600,  maxRating: 2400 },
];

/**
 * Mixed mode difficulty bands for gradual progression
 */
export const MIXED_BANDS = [
  { minRating: 600,  maxRating: 750,  label: '🌱 Warm Up' },
  { minRating: 750,  maxRating: 900,  label: '🟢 Easy Beginner' },
  { minRating: 900,  maxRating: 1050, label: '🟢 Beginner' },
  { minRating: 1050, maxRating: 1200, label: '🟢 Hard Beginner' },
  { minRating: 1200, maxRating: 1400, label: '🟡 Easy Intermediate' },
  { minRating: 1400, maxRating: 1600, label: '🟡 Intermediate' },
  { minRating: 1600, maxRating: 1800, label: '🟡 Hard Intermediate' },
  { minRating: 1800, maxRating: 2000, label: '🔴 Easy Advanced' },
  { minRating: 2000, maxRating: 2200, label: '🔴 Advanced' },
  { minRating: 2200, maxRating: 2400, label: '📓 Expert' }
];

/**
 * Convert a raw Lichess API puzzle object to the app's internal puzzle format.
 */
function convertLichessPuzzle(raw) {
  const moves = raw && raw.Moves ? raw.Moves.trim().split(/\s+/) : [];
  const setupMove = moves[0] || null; // opponent's move — auto-played by engine
  const solution = moves.slice(1);    // player + opponent alternating from here

  // Determine difficulty from rating
  let difficulty = 'intermediate';
  if (raw.Rating < 1200) difficulty = 'beginner';
  else if (raw.Rating < 1800) difficulty = 'intermediate';
  else if (raw.Rating < 2400) difficulty = 'advanced';
  else difficulty = 'expert';

  // Pick a readable theme label from the Themes string
  const themeList = raw.Themes ? raw.Themes.split(' ') : [];
  const skipTags = new Set(['short', 'long', 'master', 'masterVsMaster', 'crushing', 'advantage', 'equality', 'oneMove']);
  const primaryTheme = themeList.find(t => !skipTags.has(t)) || themeList[0] || 'tactics';

  return {
    id: `lichess_${raw.PuzzleId}`,
    lichessId: raw.PuzzleId,
    fen: raw.FEN,
    setupMove,
    solution,
    rating: raw.Rating,
    themes: themeList,
    theme: primaryTheme,
    difficulty,
    title: `${primaryTheme.charAt(0).toUpperCase() + primaryTheme.slice(1).replace(/([A-Z])/g, ' $1')} Tactic`,
    description: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} puzzle — Rating ${raw.Rating}. Find the best continuation!`,
    hints: [
      'Look for forcing moves: checks, captures, and threats.',
      `This is a ${primaryTheme.replace(/([A-Z])/g, ' $1').toLowerCase()} pattern. Think about how to exploit it.`,
      'Calculate all opponent responses before committing to your move.',
    ],
    notes: `Lichess puzzle #${raw.PuzzleId}. Source: ${raw.GameUrl || 'lichess.org'}`,
    isLichess: true,
    gameUrl: raw.GameUrl,
  };
}

/**
 * Build the API URL for a given theme and rating range at a specific offset.
 */
function buildUrl(theme, minRating, maxRating, offset = 0) {
  const params = new URLSearchParams({ limit: BATCH_SIZE, start: offset });
  if (theme && theme !== 'mixed') params.set('themes', theme);
  if (minRating) params.set('min_rating', minRating);
  if (maxRating) params.set('max_rating', maxRating);
  return `${API_BASE}?${params.toString()}`;
}

/**
 * Extract the puzzle array from the API response.
 * The API may return either a raw array or a wrapper `{ value: [...], Count: N }`.
 */
function extractPuzzleArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.value)) return raw.value;
  return [];
}

/**
 * Generate a random offset between 0 and maxOffset (inclusive).
 * Used to fetch different slices of the puzzle database on each request.
 */
function randomOffset(maxOffset = 500) {
  return Math.floor(Math.random() * (maxOffset + 1));
}

/**
 * Internal: fetch one page of puzzles from the API.
 * Uses a random offset for variety, with a retry at offset 0 if the random offset returns empty.
 * Returns converted array or empty array on failure.
 */
async function fetchPage(theme, preset, requestedOffset) {
  try {
    // Use a random offset for variety unless a specific offset was requested (pagination)
    const offset = requestedOffset > 0 ? requestedOffset : randomOffset(500);
    const url = buildUrl(theme, preset.minRating, preset.maxRating, offset);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const puzzles = extractPuzzleArray(raw);
    if (puzzles.length > 0) return puzzles.map(convertLichessPuzzle);

    // If random offset returned empty, retry at offset 0
    if (offset > 0) {
      const retryUrl = buildUrl(theme, preset.minRating, preset.maxRating, 0);
      const retryRes = await fetch(retryUrl);
      if (!retryRes.ok) throw new Error(`HTTP ${retryRes.status}`);
      const retryRaw = await retryRes.json();
      const retryPuzzles = extractPuzzleArray(retryRaw);
      if (retryPuzzles.length > 0) return retryPuzzles.map(convertLichessPuzzle);
    }

    return [];
  } catch (err) {
    console.error('Puzzle API fetch error:', err);
    return [];
  }
}

/**
 * Fetch puzzles with very gradual progression across all rating bands concurrently.
 */
export async function fetchMixedPuzzles(theme = 'mixed', count = 100) {
  const cacheKey = `${theme}_mixed`;
  puzzleCache[cacheKey] = { puzzles: [], currentOffset: 0, exhausted: false };

  const puzzlesPerBand = Math.ceil(count / MIXED_BANDS.length); // ~10 puzzles per band

  const fetchPromises = MIXED_BANDS.map(async (band, index) => {
    try {
      // Use a random offset per band for variety across rounds
      const offset = randomOffset(400);
      const url = buildUrl(theme, band.minRating, band.maxRating, offset);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      let puzzles = extractPuzzleArray(raw);

      // Retry at offset 0 if random offset returned empty
      if (puzzles.length === 0 && offset > 0) {
        const retryUrl = buildUrl(theme, band.minRating, band.maxRating, 0);
        const retryRes = await fetch(retryUrl);
        if (retryRes.ok) {
          const retryRaw = await retryRes.json();
          puzzles = extractPuzzleArray(retryRaw);
        }
      }

      if (puzzles.length === 0) return [];

      const converted = puzzles.map(convertLichessPuzzle);
      const shuffled = shuffleArray(converted);

      // Add mixed band metadata
      return shuffled.slice(0, puzzlesPerBand).map(p => ({
        ...p,
        mixedBandIndex: index,
        mixedBandLabel: band.label
      }));
    } catch (err) {
      console.error(`Error fetching mixed band ${band.label}:`, err);
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  let mixedPuzzles = results.flat();

  // Local fallback if API is offline
  if (mixedPuzzles.length === 0) {
    try {
      console.warn('Chess puzzles API unavailable for Mixed Mode. Falling back to local data.');
      const presets = ['beginner', 'intermediate', 'advanced'];
      const localDataPromises = presets.map(async (pVal) => {
        const res = await fetch(`/puzzles/${pVal}.json`);
        return res.ok ? res.json() : [];
      });
      const dataSets = await Promise.all(localDataPromises);
      const localPuzzles = dataSets.flat();

      const filteredData = theme === 'mixed'
        ? localPuzzles
        : localPuzzles.filter(p => (p.themes && p.themes.includes(theme)) || p.theme === theme);

      // Group the local dataset into the 10 MIXED_BANDS
      const bandsPuzzles = MIXED_BANDS.map(() => []);
      filteredData.forEach(p => {
        const ratingVal = p.rating || 0;
        const bandIndex = MIXED_BANDS.findIndex(b => ratingVal >= b.minRating && ratingVal <= b.maxRating);
        if (bandIndex !== -1) {
          bandsPuzzles[bandIndex].push(p);
        } else {
          bandsPuzzles[0].push(p);
        }
      });

      // For each band, shuffle and select puzzlesPerBand puzzles
      mixedPuzzles = [];
      bandsPuzzles.forEach((puzzles, index) => {
        const shuffledBand = shuffleArray(puzzles);
        const selected = shuffledBand.slice(0, puzzlesPerBand);
        selected.forEach(p => {
          mixedPuzzles.push({
            ...p,
            mixedBandIndex: index,
            mixedBandLabel: MIXED_BANDS[index].label
          });
        });
      });
    } catch (err) {
      console.error('Failed to load fallback local puzzles for mixed mode:', err);
    }
  }

  // Sort strictly by rating ascending so we get a beautiful progression!
  mixedPuzzles.sort((a, b) => a.rating - b.rating);

  puzzleCache[cacheKey].puzzles = mixedPuzzles;
  puzzleCache[cacheKey].currentOffset = mixedPuzzles.length;
  puzzleCache[cacheKey].exhausted = true; // Mixed mode queues are pre-built to 100 puzzles

  return mixedPuzzles;
}

/**
 * Fetch the initial batch of puzzles for a given theme and difficulty.
 * Subsequent pages are fetched via loadMorePuzzles().
 * Returns an array of converted app-format puzzle objects.
 */
export async function fetchPuzzlesByTheme(theme = 'mixed', difficulty = 'intermediate') {
  if (difficulty === 'mixed') {
    return fetchMixedPuzzles(theme, 100);
  }

  const preset = DIFFICULTY_PRESETS.find(d => d.value === difficulty) || DIFFICULTY_PRESETS[1];
  const cacheKey = `${theme}_${difficulty}`;

  // Reset cache for this key so we start fresh when filters change
  puzzleCache[cacheKey] = { puzzles: [], currentOffset: 0, exhausted: false };

  let page = await fetchPage(theme, preset, 0);

  // Fallback to local JSON files if live API is offline or returns empty
  if (page.length === 0) {
    try {
      console.warn(`Chess puzzles live API unavailable. Falling back to local public/puzzles/${difficulty}.json dataset.`);
      const localRes = await fetch(`/puzzles/${difficulty}.json`);
      if (localRes.ok) {
        const localData = await localRes.json();
        const filteredData = theme === 'mixed'
          ? localData
          : localData.filter(p => (p.themes && p.themes.includes(theme)) || p.theme === theme);
        
        // Shuffle the local dataset and slice first BATCH_SIZE
        page = shuffleArray(filteredData).slice(0, BATCH_SIZE);
      }
    } catch (err) {
      console.error('Failed to load fallback local puzzles:', err);
    }
  }

  if (page.length === 0) {
    try {
      const { PUZZLES } = await import('../data/puzzles.js');
      page = PUZZLES.map(p => ({
        ...p,
        isLichess: false,
        rating: p.rating || 1200
      }));
    } catch (err) {
      console.error('Failed to load static fallback puzzles:', err);
    }
  } else {
    // Shuffle the live API page as well so it's randomized
    page = shuffleArray(page);
  }

  puzzleCache[cacheKey].puzzles = page;
  puzzleCache[cacheKey].currentOffset = page.length;
  if (page.length < BATCH_SIZE) puzzleCache[cacheKey].exhausted = true;

  return page;
}

/**
 * Load the NEXT page of puzzles for an existing theme+difficulty cache key.
 * Appends to the existing cache and returns only the NEW puzzles added.
 * Call this when the user clicks "Load More".
 */
export async function loadMorePuzzles(theme = 'mixed', difficulty = 'intermediate') {
  if (difficulty === 'mixed') return []; // Mixed mode is pre-built to 100

  const preset = DIFFICULTY_PRESETS.find(d => d.value === difficulty) || DIFFICULTY_PRESETS[1];
  const cacheKey = `${theme}_${difficulty}`;

  if (!puzzleCache[cacheKey]) {
    // No cache yet — do initial fetch
    const puzzles = await fetchPuzzlesByTheme(theme, difficulty);
    return puzzles;
  }

  const cache = puzzleCache[cacheKey];
  if (cache.exhausted) return [];

  let page = await fetchPage(theme, preset, cache.currentOffset);

  if (page.length === 0) {
    // Try fetching more from local fallback
    try {
      const localRes = await fetch(`/puzzles/${difficulty}.json`);
      if (localRes.ok) {
        const localData = await localRes.json();
        const filteredData = theme === 'mixed'
          ? localData
          : localData.filter(p => (p.themes && p.themes.includes(theme)) || p.theme === theme);
        
        // Shuffle the remaining dataset slices
        const startIdx = cache.currentOffset;
        const remaining = filteredData.slice(startIdx);
        page = shuffleArray(remaining).slice(0, BATCH_SIZE);
      }
    } catch (err) {
      console.error('Failed to load fallback local puzzles for loadMore:', err);
    }

    if (page.length === 0) {
      cache.exhausted = true;
      return [];
    }
  } else {
    // Shuffle the live API page as well
    page = shuffleArray(page);
  }

  // Deduplicate by ID before appending
  const existingIds = new Set(cache.puzzles.map(p => p.id));
  const newPuzzles = page.filter(p => !existingIds.has(p.id));
  cache.puzzles = [...cache.puzzles, ...newPuzzles];
  cache.currentOffset += page.length;
  if (page.length < BATCH_SIZE) cache.exhausted = true;

  return newPuzzles;
}

/**
 * Get the next unseen puzzle for a given theme and difficulty.
 */
export async function getNextPuzzle(theme = 'mixed', difficulty = 'intermediate', solvedIds = new Set()) {
  const cacheKey = `${theme}_${difficulty}`;

  // Ensure cache exists
  if (!puzzleCache[cacheKey] || puzzleCache[cacheKey].puzzles.length === 0) {
    await fetchPuzzlesByTheme(theme, difficulty);
  }

  const cache = puzzleCache[cacheKey] || { puzzles: [], currentOffset: 0, exhausted: false };

  // Try to find an unseen puzzle in the current cache
  const unseen = cache.puzzles.filter(p => !solvedIds.has(p.id));
  if (unseen.length > 0) return unseen[0];

  // If mixed, it's a fixed queue, return null when completed
  if (difficulty === 'mixed') return null;

  // All current cache is exhausted — fetch the next page from Lichess
  const morePuzzles = await loadMorePuzzles(theme, difficulty);
  if (morePuzzles.length > 0) {
    const unseenNew = morePuzzles.filter(p => !solvedIds.has(p.id));
    if (unseenNew.length > 0) return unseenNew[0];
  }

  // For regular difficulties, if exhausted, roll random rating bands
  const preset = DIFFICULTY_PRESETS.find(d => d.value === difficulty) || DIFFICULTY_PRESETS[1];
  try {
    const ratingRange = preset.maxRating - preset.minRating;
    const randomMin = preset.minRating + Math.floor(Math.random() * (ratingRange / 2));
    const randomMax = randomMin + Math.floor(ratingRange / 2);
    const params = new URLSearchParams({ limit: BATCH_SIZE, min_rating: randomMin, max_rating: randomMax });
    if (theme && theme !== 'mixed') params.set('themes', theme);
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (res.ok) {
      const raw = await res.json();
      const puzzleArr = extractPuzzleArray(raw);
      if (puzzleArr.length > 0) {
        const converted = puzzleArr.map(convertLichessPuzzle);
        const fresh = converted.filter(p => !solvedIds.has(p.id));
        return fresh[0] || null;
      }
    }
  } catch {
    console.warn('Random band fetch failed.');
  }

  return null;
}

/**
 * Get the current cached puzzles for a given key without fetching.
 */
export function getCachedPuzzles(theme = 'mixed', difficulty = 'intermediate') {
  const cacheKey = `${theme}_${difficulty}`;
  return puzzleCache[cacheKey]?.puzzles || [];
}

/**
 * Check if more puzzles can be loaded for a given cache key.
 */
export function hasMorePuzzles(theme = 'mixed', difficulty = 'intermediate') {
  if (difficulty === 'mixed') return false;
  const cacheKey = `${theme}_${difficulty}`;
  return !puzzleCache[cacheKey]?.exhausted;
}

/**
 * Clear the entire in-memory puzzle cache (e.g. when starting a new session)
 */
export function clearPuzzleCache() {
  Object.keys(puzzleCache).forEach(key => delete puzzleCache[key]);
}
