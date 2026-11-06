import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
import path from 'node:path';

const ZST_FILE = 'lichess_db_puzzle.csv.zst';
const OUTPUT_DIR = path.join('public', 'puzzles');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const fileStream = fs.createReadStream(ZST_FILE, { start: 12 });
const decompressor = zlib.createZstdDecompress();
const rl = readline.createInterface({
  input: fileStream.pipe(decompressor),
  crlfDelay: Infinity
});

const LIMIT = 2000;
const puzzles = {
  beginner: [],
  intermediate: [],
  advanced: []
};

let lineCount = 0;
let solvedCount = 0;

console.log('Starting puzzle extraction from lichess_db_puzzle.csv.zst...');

function parseCsvLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

rl.on('line', (line) => {
  lineCount++;
  if (lineCount === 1) {
    // Header line, skip it
    return;
  }

  const row = parseCsvLine(line);
  if (row.length < 9) return;

  const puzzleId = row[0];
  const fen = row[1];
  const movesStr = row[2];
  const rating = parseInt(row[3], 10);
  const popularity = parseInt(row[5], 10);
  const nbPlays = parseInt(row[6], 10);
  const themesStr = row[7] || '';
  const gameUrl = row[8] || '';

  // Quality filters: popularity >= 85 and NbPlays >= 100
  if (popularity < 85 || nbPlays < 100) return;

  const moves = movesStr.trim().split(/\s+/);
  if (moves.length === 0) return;

  const setupMove = moves[0];
  const solution = moves.slice(1);

  // Group by difficulty
  let category = '';
  if (rating < 1200) {
    category = 'beginner';
  } else if (rating >= 1200 && rating < 1800) {
    category = 'intermediate';
  } else {
    category = 'advanced';
  }

  if (puzzles[category].length >= LIMIT) {
    // Check if we are done with all categories
    if (
      puzzles.beginner.length >= LIMIT &&
      puzzles.intermediate.length >= LIMIT &&
      puzzles.advanced.length >= LIMIT
    ) {
      rl.close();
      fileStream.destroy();
      return;
    }
    return;
  }

  const themeList = themesStr.split(' ');
  const primaryTheme = themeList.find(t => !['short', 'long', 'master', 'masterVsMaster', 'crushing', 'advantage', 'equality', 'oneMove'].includes(t)) || themeList[0] || 'tactics';

  const title = `${primaryTheme.charAt(0).toUpperCase() + primaryTheme.slice(1).replace(/([A-Z])/g, ' $1')} Tactic`;
  const description = `${category.charAt(0).toUpperCase() + category.slice(1)} puzzle — Rating ${rating}. Find the best continuation!`;

  puzzles[category].push({
    id: `lichess_${puzzleId}`,
    lichessId: puzzleId,
    fen,
    setupMove,
    solution,
    rating,
    themes: themeList,
    theme: primaryTheme,
    difficulty: category,
    title,
    description,
    hints: [
      'Look for forcing moves: checks, captures, and threats.',
      `This is a ${primaryTheme.replace(/([A-Z])/g, ' $1').toLowerCase()} pattern. Think about how to exploit it.`,
      'Calculate all opponent responses before committing to your move.',
    ],
    notes: `Lichess puzzle #${puzzleId}. Source: ${gameUrl || 'lichess.org'}`,
    isLichess: true,
    gameUrl
  });

  solvedCount++;
  if (solvedCount % 200 === 0) {
    console.log(`Extracted: Beginner: ${puzzles.beginner.length}/${LIMIT}, Intermediate: ${puzzles.intermediate.length}/${LIMIT}, Advanced: ${puzzles.advanced.length}/${LIMIT}`);
  }
});

rl.on('close', () => {
  console.log('Finished reading file. Writing puzzle files...');

  for (const [category, list] of Object.entries(puzzles)) {
    const filePath = path.join(OUTPUT_DIR, `${category}.json`);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
    console.log(`Saved ${list.length} puzzles to ${filePath}`);
  }

  console.log('Puzzle extraction completed successfully!');
});

rl.on('error', (err) => {
  console.error('Error during decompression or reading:', err);
});
