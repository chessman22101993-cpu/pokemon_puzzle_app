import { Chess } from 'chess.js';

/**
 * Normalizes and parses raw text input into a valid Standard Algebraic Notation (SAN) move.
 * Handles:
 * - SAN variants: "Nf3", "nf3", "NF3", "e4", "O-O", "o-o"
 * - Natural text: "knight to f3", "knight f3", "bishop b2", "rook f3", "pawn e4", "king to g1"
 * - Piece names: knight, bishop, rook, queen, king, pawn
 * - Coordinate moves: "g1f3", "e2e4", "b1c3"
 * 
 * @param {string} rawInput - The raw string typed by the student
 * @param {string|Chess} fenOrInstance - Current FEN position string or Chess instance
 * @returns {{ success: boolean, san?: string, move?: object, error?: string, suggestions?: string[] }}
 */
export function parseStudentMove(rawInput, fenOrInstance) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { success: false, error: 'Please enter a move.' };
  }

  let chess;
  try {
    if (typeof fenOrInstance === 'string') {
      chess = new Chess(fenOrInstance);
    } else if (fenOrInstance && typeof fenOrInstance.moves === 'function') {
      chess = fenOrInstance;
    } else {
      chess = new Chess();
    }
  } catch (e) {
    return { success: false, error: 'Invalid board position.' };
  }

  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) {
    return { success: false, error: 'No legal moves in this position.' };
  }

  const cleanInput = rawInput.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleanInput) {
    return { success: false, error: 'Please enter a move.' };
  }

  // 1. Check exact SAN match (case-insensitive)
  for (const m of legalMoves) {
    if (m.san.toLowerCase() === cleanInput) {
      return { success: true, san: m.san, move: m };
    }
  }

  // 2. Check coordinate match (e.g. "g1f3", "e2e4", "g1-f3")
  const coordInput = cleanInput.replace(/[-x\s]/g, '');
  if (coordInput.length >= 4) {
    const fromSquare = coordInput.slice(0, 2);
    const toSquare = coordInput.slice(2, 4);
    const promo = coordInput.length > 4 ? coordInput[4] : undefined;

    for (const m of legalMoves) {
      if (m.from === fromSquare && m.to === toSquare) {
        if (!promo || (m.promotion && m.promotion.toLowerCase() === promo)) {
          return { success: true, san: m.san, move: m };
        }
      }
    }
  }

  // 3. Piece name mapping
  const pieceNameMap = {
    knight: 'n',
    kight: 'n',
    knigth: 'n',
    horse: 'n',
    n: 'n',

    bishop: 'b',
    bichop: 'b',
    b: 'b',

    rook: 'r',
    rok: 'r',
    castle: 'r',
    r: 'r',

    queen: 'q',
    quen: 'q',
    q: 'q',

    king: 'k',
    k: 'k',

    pawn: 'p',
    pon: 'p',
    p: 'p',
  };

  // Check castling natural text
  if (cleanInput.includes('castle short') || cleanInput.includes('kingside castle') || cleanInput === 'short castle' || cleanInput === 'oo' || cleanInput === 'o-o') {
    const castleShort = legalMoves.find(m => m.san === 'O-O');
    if (castleShort) return { success: true, san: 'O-O', move: castleShort };
  }
  if (cleanInput.includes('castle long') || cleanInput.includes('queenside castle') || cleanInput === 'long castle' || cleanInput === 'ooo' || cleanInput === 'o-o-o') {
    const castleLong = legalMoves.find(m => m.san === 'O-O-O');
    if (castleLong) return { success: true, san: 'O-O-O', move: castleLong };
  }

  // Extract piece and square from text (e.g., "knight to f3", "knight f3", "rook f3", "pawn e4")
  const tokens = cleanInput.replace(/\bto\b/g, '').split(' ').filter(Boolean);
  let targetSquare = null;
  let detectedPiece = null;

  for (const token of tokens) {
    if (/^[a-h][1-8]$/.test(token)) {
      targetSquare = token;
    } else if (pieceNameMap[token]) {
      detectedPiece = pieceNameMap[token];
    }
  }

  // If no explicit piece found, but we have a target square (e.g. "f3", "e4")
  if (targetSquare) {
    const matchingMoves = legalMoves.filter(m => {
      if (m.to !== targetSquare) return false;
      if (detectedPiece) return m.piece === detectedPiece;
      return true;
    });

    if (matchingMoves.length === 1) {
      return { success: true, san: matchingMoves[0].san, move: matchingMoves[0] };
    }

    if (matchingMoves.length > 1) {
      // Ambiguous move: return suggestions
      const suggestions = matchingMoves.map(m => m.san);
      return {
        success: false,
        error: `Ambiguous move! Did you mean: ${suggestions.join(' or ')}?`,
        suggestions,
      };
    }
  }

  // Fallback: check if the string contains a valid target square anywhere
  const squareMatch = cleanInput.match(/[a-h][1-8]/);
  if (squareMatch) {
    const sq = squareMatch[0];
    const matchingMoves = legalMoves.filter(m => m.to === sq);
    if (matchingMoves.length === 1) {
      return { success: true, san: matchingMoves[0].san, move: matchingMoves[0] };
    }
    if (matchingMoves.length > 1) {
      return {
        success: false,
        error: `Which piece to ${sq}? (${matchingMoves.map(m => m.san).join(', ')})`,
        suggestions: matchingMoves.map(m => m.san),
      };
    }
  }

  return {
    success: false,
    error: `"${rawInput}" is not recognized as a valid move in this position.`,
  };
}
