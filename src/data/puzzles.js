/**
 * Built-in fallback puzzles database (used when the live API is unavailable).
 * These are classic hand-crafted tactical patterns for offline use.
 *
 * For live Lichess puzzles by theme, see src/utils/puzzleApi.js
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
];

export const PUZZLES = [
  {
    id: '1',
    title: "Scholar's Mate",
    difficulty: 'beginner',
    theme: 'mate_1',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    description: 'White to move. Can you find the checkmate in one move?',
    solution: ['f3f7'],
    hints: [
      'Look for the weakest square near the black king (f7).',
      'Which piece can attack f7 with the bishop\'s support?',
      'Move your queen to f7 to checkmate!'
    ],
    notes: 'The f7 pawn is only protected by the king, making it a common target in opening tactics.'
  },
  {
    id: '2',
    title: 'Back Rank Checkmate',
    difficulty: 'beginner',
    theme: 'mate_1',
    fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1',
    description: 'White to move. Black\'s king is trapped behind its own pawns. Find the winning checkmate!',
    solution: ['d1d8'],
    hints: [
      'Look for checks along the back rank.',
      'Black\'s pawns prevent the king from stepping forward.',
      'Move the rook all the way to the 8th rank.'
    ],
    notes: 'Always check if your king (or your opponent\'s) has an "escape window" (luft) before trapping it behind pawns.'
  },
  {
    id: '3',
    title: 'Smothered Mate in Two',
    difficulty: 'intermediate',
    theme: 'mate_2',
    fen: '5r1k/5Qpp/7N/8/8/8/6PP/6RK w - - 0 1',
    description: 'White to move. Force a beautiful smothered mate in two moves! (Hint: Look for a queen sacrifice)',
    solution: ['f7g8', 'f8g8', 'h6f7'],
    hints: [
      'Look for a forcing check on the back rank.',
      'Sacrifice your queen on g8 to force the black rook to block the king.',
      'Deliver the final blow with the knight on f7.'
    ],
    notes: 'Smothered mate occurs when a knight checkmates a king that is completely surrounded by its own pieces.'
  },
  {
    id: '4',
    title: 'The Deadly Skewer',
    difficulty: 'beginner',
    theme: 'skewer',
    fen: '3k4/8/8/8/8/8/r7/3K3R w - - 0 1',
    description: 'White to move. Black\'s king and rook are lined up. Skewer them!',
    solution: ['h1h8', 'd8d7', 'h8a8'],
    hints: [
      'Find a check that forces the king to move away from the rook.',
      'Check the king on the 8th rank.',
      'After the king moves, capture the black rook on a8.'
    ],
    notes: 'A skewer is an attack on two pieces in a line; the more valuable piece is checked/attacked and forced to move, exposing the piece behind it.'
  },
  {
    id: '5',
    title: 'Fried Liver Fork',
    difficulty: 'intermediate',
    theme: 'fork',
    fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
    description: 'White to move. Play the famous Fried Liver Attack by sacrificing your knight to fork the queen and rook!',
    solution: ['g5f7', 'e8f7', 'd1f3'],
    hints: [
      'Sacrifice your knight on the f7 square.',
      'Once the king takes, what queen move checks the king and attacks the d5 knight?',
      'Play Qf3+ to fork the king and knight.'
    ],
    notes: 'The Fried Liver Attack is a highly aggressive opening trap that draws out the black king.'
  },
  {
    id: '6',
    title: 'Pin and Win',
    difficulty: 'beginner',
    theme: 'pin',
    fen: 'r1bqk2r/ppp2ppp/2n2n2/1B1pp3/1b1PP3/2N2N2/PPP2PPP/R1BQK2R w KQkq - 3 6',
    description: 'White to move. Exploit the pinned knight on c6 to win a pawn.',
    solution: ['f3e5'],
    hints: [
      'The knight on c6 cannot move because it is pinned to the king by the bishop on b5.',
      'Look at the e5 pawn. Is it really defended by the c6 knight?',
      'Capture the pawn on e5 with your knight.'
    ],
    notes: 'A pinned piece cannot move because doing so would expose a more valuable piece (in this case, the king).'
  },
  {
    id: '7',
    title: 'Anastasia\'s Mate',
    difficulty: 'advanced',
    theme: 'mate_3',
    fen: 'r4rk1/1p3ppp/2p1N3/p7/8/4Q3/Pq4PP/3R2RK w - - 0 1', // modified simplified version
    description: 'White to move. Deliver checkmate in three moves by clearing files for your rook!',
    solution: ['d1d4', 'b2a2', 'd4h4'], // simplified sequence for training
    hints: [
      'Look to coordinate your rook and queen.',
      'Clear the path for the rook to swing to the h-file.',
      'Play Rd4 to head towards h4.'
    ],
    notes: 'Anastasia\'s mate is a classic mating pattern where a knight controls the escape squares and a rook delivers checkmate on an open file.'
  },
  {
    id: '8',
    title: 'Deflection Tactics',
    difficulty: 'intermediate',
    theme: 'deflection',
    fen: 'r1b1k2r/ppp2ppp/2n5/1B2p3/4P3/2N2N2/PPPb1PPP/R3K2R w KQkq - 0 9',
    description: 'White to move. Deflect the black king or bishop to win a piece.',
    solution: ['f3d2'],
    hints: [
      'Black\'s bishop on d2 is checking you, but it is also unprotected.',
      'Which piece should recapture to maintain central control?',
      'Recapture with your knight: Nxd2.'
    ],
    notes: 'Deflection is a tactic that forces an opponent\'s piece to leave a square it is defending.'
  },
  {
    id: '9',
    title: 'Decoy Sacrifice',
    difficulty: 'advanced',
    theme: 'decoy',
    fen: 'r1b2rk1/pp3ppp/2p5/4P3/2B2Q2/8/PPP3PP/3R1K2 w - - 0 1',
    description: 'White to move. Sacrifice your queen on f7 to lure the black rook, setting up a back rank checkmate!',
    solution: ['f4f7', 'f8f7', 'd1d8'],
    hints: [
      'Look for forcing checks on f7.',
      'Play Qf7+. Black must capture with the rook.',
      'After Rxf7, finish with a back rank mate using your rook on d1.'
    ],
    notes: 'A decoy draws an opponent\'s piece onto a specific square, often as a sacrifice to set up a larger tactical pattern.'
  },
  {
    id: '10',
    title: 'Endgame Pawn Breakthrough',
    difficulty: 'intermediate',
    theme: 'endgame',
    fen: '8/8/8/p7/P7/8/1k2K3/8 w - - 0 1',
    description: 'White to move. Take opposition and guide your king to win Black\'s pawn on a5.',
    solution: ['e2d3', 'b2b3', 'd3d4'],
    hints: [
      'You need to get your king closer to the black pawn.',
      'Move your king to d3 to cut off the black king.',
      'Follow up by moving your king to d4 to secure the winning path.'
    ],
    notes: 'In pawn endgames, king activity and the concept of "opposition" (controlling key transition squares) is vital.'
  },
  {
    id: '11',
    title: 'Discovered Attack',
    difficulty: 'intermediate',
    theme: 'discovered_attack',
    fen: 'r1bqk2r/ppp2ppp/2np1n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 1 5',
    description: 'White to move. Prepare a discovered attack by placing your bishop on g5 to threaten the queen.',
    solution: ['c1g5'],
    hints: [
      'Look at Black\'s knight on f6. Is it protecting anything important?',
      'Pin the knight to the queen.',
      'Move the dark-squared bishop to g5.'
    ],
    notes: 'A discovered attack occurs when one piece moves out of the way, opening a line of attack for another piece.'
  },
  {
    id: '12',
    title: 'Removing the Defender',
    difficulty: 'advanced',
    theme: 'removing_defender',
    fen: '3r2k1/ppp2ppp/8/6b1/3Q4/5N2/PPP2PPP/5RK1 b - - 0 1',
    description: 'Black to move. Remove the defender of the white queen on d4 to win material.',
    solution: ['g5f3', 'g2f3', 'd8d4'],
    hints: [
      'Look at the piece defending White\'s setup.',
      'Attack White\'s bishop on b5.',
      'Move your knight from c6 to b4.'
    ],
    notes: 'Removing the defender is a tactic where you capture or drive away an opponent\'s piece that is defending another target.'
  }
];

// Helper to filter puzzles by difficulty and theme
export const getFilteredPuzzles = (difficulty = 'mixed', theme = 'mixed') => {
  return PUZZLES.filter(p => {
    const diffMatch = difficulty === 'mixed' || p.difficulty === difficulty;
    const themeMatch = theme === 'mixed' || p.theme === theme;
    return diffMatch && themeMatch;
  });
};
