import { Chess } from 'chess.js';

/**
 * Safe FEN parsing helper to prevent chess.js from throwing exceptions on partial FENs
 */
function safeCreateChess(rawFen) {
  if (!rawFen || rawFen === 'start') {
    return new Chess();
  }
  const cleanFen = String(rawFen).trim();
  try {
    return new Chess(cleanFen);
  } catch {
    const parts = cleanFen.split(/\s+/);
    if (parts.length < 6) {
      const fullParts = [
        parts[0],
        parts[1] || 'w',
        parts[2] || 'KQkq',
        parts[3] || '-',
        parts[4] || '0',
        parts[5] || '1',
      ];
      try {
        return new Chess(fullParts.join(' '));
      } catch {
        return new Chess();
      }
    }
    return new Chess();
  }
}

/**
 * Validate if a FEN string is syntactically valid
 */
export const isValidFen = (fen) => {
  if (!fen) return false;
  try {
    safeCreateChess(fen);
    return true;
  } catch {
    return false;
  }
};

/**
 * Parse a FEN string and get basic metadata
 * (e.g. side to move)
 */
export const getFenMetadata = (fen) => {
  if (!fen) return null;
  const game = safeCreateChess(fen);
  const parts = game.fen().split(/\s+/);
  return {
    sideToMove: parts[1] === 'w' ? 'white' : 'black',
    castling: parts[2],
    enPassant: parts[3],
    halfMoves: parseInt(parts[4], 10),
    fullMoves: parseInt(parts[5], 10),
  };
};

/**
 * Calculate the correct board orientation for the solving player.
 * - If setupMove exists, initial FEN active color is opponent's turn. Player solves AFTER setupMove, so player color is OPPOSITE of initial FEN turn.
 * - If no setupMove exists, initial FEN active color is the player's turn.
 */
export const getStudentBoardOrientation = (puzzle) => {
  if (!puzzle || !puzzle.fen) return 'white';
  if (puzzle.orientation) return puzzle.orientation;

  const game = safeCreateChess(puzzle.fen);
  const initialTurn = game.turn();

  if (puzzle.setupMove) {
    return initialTurn === 'w' ? 'black' : 'white';
  } else {
    return initialTurn === 'b' ? 'black' : 'white';
  }
};

/**
 * Custom logic hook or helper class to run chess puzzles.
 *
 * Supports both:
 *   - Classic format: puzzle.solution = ['e2e4', 'd7d5', ...]  (player moves first)
 *   - Lichess format: puzzle.setupMove = 'a6a5'  +  puzzle.solution = ['e5c7', ...]
 *     where setupMove is the opponent's first move that sets up the position,
 *     auto-played by the engine before the player gets to move.
 */
export class PuzzleEngine {
  constructor({ puzzle, onCorrectMove, onSolved, onIncorrectMove, onSetupComplete }) {
    this.puzzle = puzzle;
    this.onCorrectMove = onCorrectMove || (() => {});
    this.onSolved = onSolved || (() => {});
    this.onIncorrectMove = onIncorrectMove || (() => {});
    this.onSetupComplete = onSetupComplete || (() => {}); // called after the auto setup move plays

    // Normalize solution into an array of UCI move strings
    this.solution = Array.isArray(puzzle?.solution)
      ? puzzle.solution
      : (typeof puzzle?.solution === 'string' && puzzle.solution.trim()
          ? puzzle.solution.trim().split(/\s+/)
          : []);

    try {
      this.game = safeCreateChess(puzzle?.fen);
    } catch (e) {
      console.warn('Invalid FEN provided to PuzzleEngine, falling back to default FEN:', puzzle?.fen, e);
      this.game = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    }

    this.solutionIndex = 0;
    this.opponentMoving = false;
    this.completed = false;
    this.setupDone = false;

    // If this is a Lichess-format puzzle, schedule the setup move
    if (puzzle?.setupMove) {
      this._scheduleSetupMove();
    } else {
      this.setupDone = true;
    }
  }

  // Auto-play the opponent's setup move (Lichess format only)
  _scheduleSetupMove() {
    this.opponentMoving = true;
    setTimeout(() => {
      try {
        if (this.puzzle?.setupMove && this.puzzle.setupMove.length >= 4) {
          const from = this.puzzle.setupMove.substring(0, 2);
          const to = this.puzzle.setupMove.substring(2, 4);
          const promo = this.puzzle.setupMove.substring(4) || undefined;
          this.game.move({ from, to, promotion: promo });
        }
      } catch (e) {
        console.warn('Setup move failed:', this.puzzle?.setupMove, e);
      } finally {
        this.opponentMoving = false;
        this.setupDone = true;
        this.onSetupComplete(this.game.fen());
      }
    }, 800); // brief delay so the student sees the board before the opponent moves
  }

  // Get current board position (FEN)
  getFen() {
    return this.game.fen();
  }

  // Get side to move (white/black)
  getTurn() {
    return this.game.turn() === 'w' ? 'white' : 'black';
  }

  // Returns if puzzle is solved
  isSolved() {
    return this.completed;
  }

  // Returns if the setup move has finished playing
  isReady() {
    return this.setupDone && !this.opponentMoving;
  }

  // Checks if a move matches the expected solution step
  makeMove(sourceSquare, targetSquare) {
    if (this.opponentMoving || this.completed || !this.setupDone) {
      return { success: false, reason: 'Waiting for opponent or puzzle solved.' };
    }

    // Try verifying legality on a copy first
    const gameCopy = new Chess(this.game.fen());
    let moveResult = null;

    try {
      // Auto-promote to queen in puzzles if it's a promotion move
      const isPromotion = this.checkPromotion(gameCopy, sourceSquare, targetSquare);
      moveResult = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? 'q' : undefined,
      });
    } catch {
      return { success: false, reason: 'Illegal move.' };
    }

    if (!moveResult) {
      return { success: false, reason: 'Illegal move.' };
    }

    // Convert move to coordinate format to match solution (e.g. e2e4)
    const uciMove = moveResult.from + moveResult.to + (moveResult.promotion || '');
    const expectedMove = this.solution[this.solutionIndex];

    if (!expectedMove) {
      this.completed = true;
      this.onSolved();
      return { success: true, playerMove: moveResult, hasOpponentReply: false };
    }

    if (uciMove.toLowerCase() === expectedMove.toLowerCase()) {
      // Player move is correct!
      this.game = gameCopy;
      this.solutionIndex += 1;
      this.onCorrectMove(moveResult);

      const nextOpponentMove = this.solution[this.solutionIndex];

      if (nextOpponentMove && nextOpponentMove.length >= 4) {
        // There is an opponent response move!
        this.opponentMoving = true;
        this.solutionIndex += 1; // Increment solutionIndex past opponent move

        return {
          success: true,
          playerMove: moveResult,
          hasOpponentReply: true,
          opponentMovePromise: new Promise((resolve) => {
            setTimeout(() => {
              try {
                const from = nextOpponentMove.substring(0, 2);
                const to = nextOpponentMove.substring(2, 4);
                const promo = nextOpponentMove.substring(4) || undefined;

                const oppMoveResult = this.game.move({ from, to, promotion: promo });
                resolve(oppMoveResult);
              } catch (e) {
                console.warn('Opponent move failed:', nextOpponentMove, e);
                resolve(null);
              } finally {
                this.opponentMoving = false;
              }
            }, 600); // 600ms delay for realism
          }),
        };
      } else {
        // Correct move and solution complete!
        this.completed = true;
        this.onSolved();
        return { success: true, playerMove: moveResult, hasOpponentReply: false };
      }
    } else {
      // Legal move but incorrect solution path
      this.onIncorrectMove(uciMove);
      return { success: false, reason: 'Incorrect move.', isLegal: true };
    }
  }

  // Internal helper to check if a move would be a pawn promotion
  checkPromotion(gameInstance, from, to) {
    const piece = gameInstance.get(from);
    if (!piece || piece.type !== 'p') return false;

    const turn = gameInstance.turn();
    const rank = to.substring(1);
    return (turn === 'w' && rank === '8') || (turn === 'b' && rank === '1');
  }
}
