/**
 * csvParser.js
 * Client-side parser for standard Lichess chess puzzle CSV files.
 * Columns: PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays, Themes, GameUrl, OpeningTags
 */

export function parseLichessCsv(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header
  const header = parseCsvLine(lines[0]);
  const puzzleIdIdx = header.indexOf('PuzzleId');
  const fenIdx = header.indexOf('FEN');
  const movesIdx = header.indexOf('Moves');
  const ratingIdx = header.indexOf('Rating');
  const themesIdx = header.indexOf('Themes');
  const urlIdx = header.indexOf('GameUrl');

  if (fenIdx === -1 || movesIdx === -1) {
    throw new Error('CSV must contain FEN and Moves columns.');
  }

  const puzzles = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCsvLine(line);
    if (row.length <= Math.max(fenIdx, movesIdx)) continue;

    const puzzleId = puzzleIdIdx !== -1 ? row[puzzleIdIdx] : `custom_${i}`;
    const fen = row[fenIdx];
    const movesStr = row[movesIdx];
    const rating = ratingIdx !== -1 ? parseInt(row[ratingIdx], 10) || 1500 : 1500;
    const themesStr = themesIdx !== -1 ? row[themesIdx] || 'tactics' : 'tactics';
    const gameUrl = urlIdx !== -1 ? row[urlIdx] : '';

    const moves = movesStr.trim().split(/\s+/);
    if (moves.length === 0) continue;

    const setupMove = moves[0];
    const solution = moves.slice(1);

    let difficulty = 'intermediate';
    if (rating < 1200) difficulty = 'beginner';
    else if (rating < 1800) difficulty = 'intermediate';
    else difficulty = 'advanced';

    const themeList = themesStr.split(' ');
    const primaryTheme = themeList.find(t => !['short', 'long', 'master', 'masterVsMaster', 'crushing', 'advantage', 'equality', 'oneMove'].includes(t)) || themeList[0] || 'tactics';

    puzzles.push({
      id: `csv_${puzzleId}`,
      lichessId: puzzleId,
      fen,
      setupMove,
      solution,
      rating,
      themes: themeList,
      theme: primaryTheme,
      difficulty,
      title: `${primaryTheme.charAt(0).toUpperCase() + primaryTheme.slice(1).replace(/([A-Z])/g, ' $1')} Tactic`,
      description: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} puzzle — Rating ${rating}. Find the best continuation!`,
      hints: [
        'Look for forcing moves: checks, captures, and threats.',
        `This is a ${primaryTheme.replace(/([A-Z])/g, ' $1').toLowerCase()} pattern.`,
        'Check your pieces and calculate candidate moves carefully.'
      ],
      notes: `Lichess puzzle #${puzzleId} from uploaded CSV.`,
      isLichess: true,
      gameUrl: gameUrl || `https://lichess.org/training/${puzzleId}`,
    });
  }
  return puzzles;
}

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
