import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { saveCustomPuzzle } from '../firebase/db';
import { Trash, Save, RotateCcw, X } from 'lucide-react';

const PIECE_PALETTE = [
  { type: 'p', color: 'w', label: '♙' },
  { type: 'n', color: 'w', label: '♘' },
  { type: 'b', color: 'w', label: '♗' },
  { type: 'r', color: 'w', label: '♖' },
  { type: 'q', color: 'w', label: '♕' },
  { type: 'k', color: 'w', label: '♔' },
  { type: 'p', color: 'b', label: '♟' },
  { type: 'n', color: 'b', label: '♞' },
  { type: 'b', color: 'b', label: '♝' },
  { type: 'r', color: 'b', label: '♜' },
  { type: 'q', color: 'b', label: '♛' },
  { type: 'k', color: 'b', label: '♚' },
];

const THEMES = [
  { value: 'mate_1', label: 'Mate in 1' },
  { value: 'mate_2', label: 'Mate in 2' },
  { value: 'mate_3', label: 'Mate in 3' },
  { value: 'fork', label: 'Fork' },
  { value: 'pin', label: 'Pin' },
  { value: 'skewer', label: 'Skewer' },
  { value: 'double_attack', label: 'Double Attack' },
  { value: 'discovered_attack', label: 'Discovered Attack' },
  { value: 'deflection', label: 'Deflection' },
  { value: 'decoy', label: 'Decoy' },
  { value: 'clearance', label: 'Clearance' },
  { value: 'removing_defender', label: 'Removing Defender' },
  { value: 'endgame', label: 'Endgame' },
];

export default function CustomPuzzleEditor({ onClose, onSaved }) {
  const [boardFen, setBoardFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [sideToMove, setSideToMove] = useState('w'); // 'w' or 'b'
  
  // Editor state
  const [selectedPiece, setSelectedPiece] = useState(null); // {type, color} or 'eraser'
  const [isRecording, setIsRecording] = useState(false);
  const [recordedMoves, setRecordedMoves] = useState([]); // array of coordinate strings e.g. ['e2e4']
  const [moveSequenceSan, setMoveSequenceSan] = useState([]); // friendly names e.g. ['e4']
  const [recordingStartingFen, setRecordingStartingFen] = useState('');

  // Puzzle metadata
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [theme, setTheme] = useState('mate_1');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Internal chess game instance for editor
  const [chessInstance, setChessInstance] = useState(new Chess());

  // Initialize board fen representation
  useEffect(() => {
    try {
      const chess = new Chess(boardFen);
      setChessInstance(chess);
    } catch {
      console.warn('Invalid FEN loaded:', boardFen);
    }
  }, [boardFen]);

  const handleSquareClick = (square) => {
    if (isRecording) return; // Cannot place pieces during recording

    const newChess = new Chess(chessInstance.fen());
    
    if (selectedPiece === 'eraser') {
      newChess.remove(square);
    } else if (selectedPiece) {
      newChess.put({ type: selectedPiece.type, color: selectedPiece.color }, square);
    }

    // Preserve side to move in FEN
    const tokens = newChess.fen().split(' ');
    tokens[1] = sideToMove;
    const finalFen = tokens.join(' ');
    
    setBoardFen(finalFen);
  };

  const handleSideToMoveChange = (side) => {
    setSideToMove(side);
    const tokens = chessInstance.fen().split(' ');
    tokens[1] = side;
    setBoardFen(tokens.join(' '));
  };

  const handleResetBoard = () => {
    if (confirm('Reset to standard starting position?')) {
      setBoardFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      setRecordedMoves([]);
      setMoveSequenceSan([]);
    }
  };

  const handleClearBoard = () => {
    if (confirm('Remove all pieces from the board?')) {
      setBoardFen('8/8/8/8/8/8/8/8 w - - 0 1');
      setRecordedMoves([]);
      setMoveSequenceSan([]);
    }
  };

  // Recording moves handler
  const handlePieceDrop = (sourceSquare, targetSquare) => {
    if (!isRecording) {
      // If not recording, we just drag pieces around to edit the board
      const newChess = new Chess(chessInstance.fen());
      const pieceObj = newChess.get(sourceSquare);
      if (pieceObj) {
        newChess.remove(sourceSquare);
        newChess.put(pieceObj, targetSquare);
        const tokens = newChess.fen().split(' ');
        tokens[1] = sideToMove;
        setBoardFen(tokens.join(' '));
      }
      return true;
    }

    // If recording, we validate legal moves and append to solution
    const newChess = new Chess(chessInstance.fen());
    try {
      // check promotion
      const isPromo = pieceIsPawnAndPromoting(newChess, sourceSquare, targetSquare);
      const move = newChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromo ? 'q' : undefined
      });

      if (move) {
        const uci = move.from + move.to + (move.promotion || '');
        setRecordedMoves([...recordedMoves, uci]);
        setMoveSequenceSan([...moveSequenceSan, move.san]);
        setChessInstance(newChess);
        setBoardFen(newChess.fen());
        return true;
      }
    } catch {
      console.warn('Illegal move during solution recording');
    }
    return false;
  };

  const pieceIsPawnAndPromoting = (game, from, to) => {
    const p = game.get(from);
    if (!p || p.type !== 'p') return false;
    const rank = to.substring(1);
    return (p.color === 'w' && rank === '8') || (p.color === 'b' && rank === '1');
  };

  const toggleRecording = () => {
    if (!isRecording) {
      // Starting recording: initialize recorder with the current FEN state
      setIsRecording(true);
      setRecordingStartingFen(boardFen);
    } else {
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    // Reset board position back to the FEN before recording started
    if (recordingStartingFen) {
      setBoardFen(recordingStartingFen);
    }
    setRecordedMoves([]);
    setMoveSequenceSan([]);
    setIsRecording(false);
  };

  const handleUndoMove = () => {
    if (recordedMoves.length === 0) return;

    // Pop the last move
    const newRecordedMoves = recordedMoves.slice(0, -1);
    const newMoveSequenceSan = moveSequenceSan.slice(0, -1);

    // Replay remaining moves from starting state to rebuild chessInstance
    const tempChess = new Chess(recordingStartingFen);
    for (const uci of newRecordedMoves) {
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promo = uci.substring(4) || undefined;
      tempChess.move({ from, to, promotion: promo });
    }

    setRecordedMoves(newRecordedMoves);
    setMoveSequenceSan(newMoveSequenceSan);
    setChessInstance(tempChess);
    setBoardFen(tempChess.fen());
  };

  const handleSavePuzzle = async () => {
    if (!title.trim()) {
      alert('Please enter a puzzle title.');
      return;
    }
    if (recordedMoves.length === 0) {
      alert('Please record at least one solution move.');
      return;
    }

    const puzzleData = {
      title: title.trim(),
      fen: boardFen,
      solution: recordedMoves,
      difficulty,
      theme,
      description: description.trim() || 'Find the winning moves.',
      notes: notes.trim(),
    };

    try {
      await saveCustomPuzzle(puzzleData);
      alert('Puzzle saved to personal library successfully!');
      onSaved();
      onClose();
    } catch {
      alert('Error saving custom puzzle.');
    }
  };

  return (
    <div style={styles.overlay}>
      <div className="glass-panel" style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2>Create Custom Chess Puzzle</h2>
          <button onClick={onClose} style={styles.closeBtn} className="btn btn-secondary">
            <X size={18} />
          </button>
        </div>

        <div style={styles.modalContent}>
          {/* Left Column: Board and Piece Editing */}
          <div style={styles.boardCol}>
            <div style={styles.boardWrapper}>
              <Chessboard
                position={boardFen.split(' ')[0]}
                onPieceDrop={handlePieceDrop}
                onSquareClick={handleSquareClick}
                arePiecesDraggable={true}
                boardWidth={520}
                customBoardStyle={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              />
            </div>

            {/* Side to Move & Editing Tools */}
            <div style={styles.toolbar} className="glass-panel">
              <div style={styles.toolSection}>
                <span style={styles.sectionLabel}>Piece Palette</span>
                <div style={styles.paletteGrid}>
                  {PIECE_PALETTE.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPiece(p)}
                      style={{
                        ...styles.paletteButton,
                        border: selectedPiece?.type === p.type && selectedPiece?.color === p.color 
                          ? '2px solid var(--accent-primary)' 
                          : '1px solid var(--border-color)'
                      }}
                      title={`Place ${p.color === 'w' ? 'White' : 'Black'} ${p.type.toUpperCase()}`}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{p.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedPiece('eraser')}
                    style={{
                      ...styles.paletteButton,
                      backgroundColor: selectedPiece === 'eraser' ? 'hsl(0, 80%, 90%)' : 'var(--bg-tertiary)',
                      border: selectedPiece === 'eraser' ? '2px solid hsl(0, 84%, 50%)' : '1px solid var(--border-color)',
                      color: selectedPiece === 'eraser' ? 'red' : 'inherit'
                    }}
                    title="Eraser tool (Click a piece on board to remove)"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              <div style={styles.toolSection}>
                <span style={styles.sectionLabel}>Side to Move</span>
                <div style={styles.toggleRow}>
                  <button
                    onClick={() => handleSideToMoveChange('w')}
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: sideToMove === 'w' ? 'white' : 'var(--bg-tertiary)',
                      color: sideToMove === 'w' ? 'black' : 'var(--text-secondary)',
                      fontWeight: sideToMove === 'w' ? '600' : '400',
                    }}
                  >
                    White
                  </button>
                  <button
                    onClick={() => handleSideToMoveChange('b')}
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: sideToMove === 'b' ? 'black' : 'var(--bg-tertiary)',
                      color: sideToMove === 'b' ? 'white' : 'var(--text-secondary)',
                      fontWeight: sideToMove === 'b' ? '600' : '400',
                    }}
                  >
                    Black
                  </button>
                </div>
              </div>

              <div style={styles.btnRow}>
                <button onClick={handleResetBoard} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  <RotateCcw size={14} />
                  Reset Board
                </button>
                <button onClick={handleClearBoard} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'red' }}>
                  <Trash size={14} />
                  Clear Board
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata and Solution Recording */}
          <div style={styles.formCol}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Puzzle Title</label>
              <input
                type="text"
                placeholder="e.g. Back Rank Blunder"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input-field"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="input-field"
                >
                  {THEMES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Solution Recording Panel */}
            <div style={styles.recordPanel} className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Solution Moves</span>
                <span style={{ 
                  ...styles.statusBadge, 
                  backgroundColor: isRecording ? 'hsl(0, 80%, 93%)' : 'hsl(200, 80%, 93%)',
                  color: isRecording ? 'red' : 'hsl(200, 80%, 35%)' 
                }}>
                  {isRecording ? '● Recording Solution' : 'Idle'}
                </span>
              </div>

              {recordedMoves.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                  No moves recorded yet. Setup the starting board position, click "Start Recording", then drag pieces to make the solution moves.
                </p>
              ) : (
                <div style={styles.movesList}>
                  {moveSequenceSan.map((m, idx) => (
                    <span key={idx} style={styles.moveToken}>
                      {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}
                      <strong>{m}</strong>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  onClick={toggleRecording}
                  className={`btn ${isRecording ? 'btn-danger' : 'btn-accent'}`}
                  style={{ flex: 2, padding: '0.5rem' }}
                >
                  {isRecording ? 'Stop' : 'Start Recording'}
                </button>
                {isRecording && (
                  <button
                    onClick={handleUndoMove}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.5rem' }}
                    disabled={recordedMoves.length === 0}
                  >
                    Undo
                  </button>
                )}
                <button
                  onClick={resetRecording}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.5rem' }}
                  disabled={recordedMoves.length === 0}
                >
                  Clear
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Instructions / Description</label>
              <textarea
                placeholder="e.g. Find the checkmate in 2 moves."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                rows="2"
                style={{ resize: 'none' }}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Coach Explanatory Notes (Optional)</label>
              <textarea
                placeholder="e.g. This is a common trap in the Italian Game where black fails to protect the f7 pawn."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                rows="2"
                style={{ resize: 'none' }}
              />
            </div>

            <button
              onClick={handleSavePuzzle}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.9rem' }}
            >
              <Save size={18} />
              Save Puzzle to Library
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '1rem',
  },
  modal: {
    width: '100%',
    maxWidth: '920px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-secondary)',
    padding: '2rem',
    borderRadius: 'var(--radius-lg)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--border-color)',
  },
  closeBtn: {
    padding: '0.5rem',
    borderRadius: '50%',
  },
  modalContent: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  boardCol: {
    flex: '1.2 1 400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'center',
  },
  boardWrapper: {
    width: '100%',
    maxWidth: '400px',
  },
  toolbar: {
    width: '100%',
    maxWidth: '400px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
  },
  toolSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  sectionLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
  },
  paletteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '0.25rem',
  },
  paletteButton: {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  toggleRow: {
    display: 'flex',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    padding: '0.2rem',
    border: '1px solid var(--border-color)',
  },
  toggleBtn: {
    flex: 1,
    padding: '0.4rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '0.85rem',
    transition: 'all 0.15s ease',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  formCol: {
    flex: '1 1 380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
  },
  recordPanel: {
    padding: '1rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
  },
  statusBadge: {
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
  },
  movesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    minHeight: '44px',
    alignItems: 'center',
  },
  moveToken: {
    fontSize: '0.9rem',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
  }
};
export { PIECE_PALETTE, THEMES };
