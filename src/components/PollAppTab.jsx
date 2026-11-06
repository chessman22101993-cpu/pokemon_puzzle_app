import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import ChessboardWrapper from './ChessboardWrapper';
import FloatingPollWidget from './FloatingPollWidget';
import { parseStudentMove } from '../utils/chessMoveParser';
import { 
  updatePollState, 
  listenToPollState, 
  submitPollVote, 
  clearPollVotes,
  startPollSession
} from '../firebase/db';
import { 
  BarChart2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  SkipBack, 
  SkipForward, 
  Maximize2,
  Trash2,
  Sparkles,
  Play,
  RotateCcw,
  Radio,
  RefreshCw,
  Move
} from 'lucide-react';

export default function PollAppTab({ classId, isCoach = false, student = null }) {
  // Board State
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const [fen, setFen] = useState(START_FEN);
  const [game, setGame] = useState(() => new Chess());
  const [moveHistory, setMoveHistory] = useState([]);
  const [moveIndex, setMoveIndex] = useState(-1);
  const [votes, setVotes] = useState({});
  const [orientation, setOrientation] = useState('white');
  const [freeDragMode, setFreeDragMode] = useState(false);

  // Ref to track current FEN to avoid stale closures in Firebase listener
  const fenRef = React.useRef(fen);
  // Ref to skip Firebase echo of our own writes
  const selfUpdateRef = React.useRef(false);

  // Keep fenRef in sync
  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  // Coach Modal & Import States
  const [showPgnModal, setShowPgnModal] = useState(false);
  const [showFenModal, setShowFenModal] = useState(false);
  const [showLichessModal, setShowLichessModal] = useState(false);
  const [pgnInput, setPgnInput] = useState('');
  const [fenInput, setFenInput] = useState('');
  const [lichessInput, setLichessInput] = useState('');
  const [showFloatingWidget, setShowFloatingWidget] = useState(false);
  const [importError, setImportError] = useState('');

  // Lichess Live Syncing State
  const [liveSyncTarget, setLiveSyncTarget] = useState('');
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // Student Chat / Move State
  const [studentInput, setStudentInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [myVote, setMyVote] = useState(null);

  // Listen to live Poll State from Firebase
  useEffect(() => {
    if (!classId) return;
    const unsub = listenToPollState(classId, (pollState) => {
      if (!pollState) return;

      // Skip if this is the echo of our own write
      if (isCoach && selfUpdateRef.current) {
        selfUpdateRef.current = false;
        return;
      }

      if (pollState.fen && pollState.fen !== fenRef.current) {
        fenRef.current = pollState.fen;
        setFen(pollState.fen);
        try {
          setGame(new Chess(pollState.fen));
        } catch (e) {}
      }
      if (pollState.orientation) {
        setOrientation(pollState.orientation);
      }
      if (pollState.votes) {
        setVotes(pollState.votes);
        if (student && pollState.votes[student.id]) {
          setMyVote(pollState.votes[student.id].moveSan);
        }
      } else {
        setVotes({});
      }
      if (pollState.moveHistory) {
        setMoveHistory(pollState.moveHistory);
      }
      if (typeof pollState.moveIndex === 'number') {
        setMoveIndex(pollState.moveIndex);
      }
    });
    return unsub;
  }, [classId, isCoach, student?.id]);

  // Coach updates board and syncs to DB
  const broadcastBoardChange = async (newGameInstance, newHistory = moveHistory, newIndex = moveIndex) => {
    const newFen = newGameInstance.fen();
    fenRef.current = newFen;
    setFen(newFen);
    setGame(newGameInstance);
    setMoveHistory(newHistory);
    setMoveIndex(newIndex);

    // Mark self-update so listener skips the echo
    selfUpdateRef.current = true;
    await updatePollState(classId, {
      fen: newFen,
      moveHistory: newHistory,
      moveIndex: newIndex,
      lastUpdated: Date.now(),
    });
  };

  // Reset board to standard starting position
  const handleResetBoard = async () => {
    const g = new Chess();
    setGame(g);
    setFen(START_FEN);
    setMoveHistory([]);
    setMoveIndex(-1);
    setIsLiveSyncing(false);
    setLiveSyncTarget('');
    await broadcastBoardChange(g, [], -1);
    await clearPollVotes(classId);
  };

  // Toggle Board Flip
  const handleToggleOrientation = () => {
    const nextOrient = orientation === 'white' ? 'black' : 'white';
    setOrientation(nextOrient);
    if (isCoach) {
      updatePollState(classId, { orientation: nextOrient });
    }
  };

  // Coach moves piece on board (supports normal legal move & free drag placement)
  const handleCoachPieceDrop = (sourceSquare, targetSquare, _piece) => {
    if (!isCoach) return false;
    try {
      // Always use the latest FEN from the ref
      let fenToUse = fenRef.current;
      let g = new Chess(fenToUse);
      const piece = g.get(sourceSquare);
      if (!piece) return false;

      // Free Placement Mode (Direct Board Editing)
      if (freeDragMode) {
        g.remove(sourceSquare);
        g.put(piece, targetSquare);
        broadcastBoardChange(g, moveHistory, moveIndex);
        return true;
      }

      // Adapt turn in FEN to moving piece color if needed for smooth coach demo
      if (piece.color !== g.turn()) {
        const parts = fenToUse.split(' ');
        parts[1] = piece.color;
        fenToUse = parts.join(' ');
        g = new Chess(fenToUse);
      }

      const isPawnPromotion = piece.type === 'p' && (targetSquare.endsWith('8') || targetSquare.endsWith('1'));
      const moveObj = { from: sourceSquare, to: targetSquare };
      if (isPawnPromotion) {
        moveObj.promotion = 'q';
      }

      const move = g.move(moveObj);
      if (move) {
        const updatedHistory = moveHistory.slice(0, moveIndex + 1);
        updatedHistory.push(move.san);
        broadcastBoardChange(g, updatedHistory, updatedHistory.length - 1);
        return true;
      }
    } catch (e) {
      console.warn('Invalid coach move:', e);
    }
    return false;
  };

  // PGN Import Handler
  const handleImportPgn = () => {
    if (!pgnInput.trim()) return;
    try {
      const g = new Chess();
      g.loadPgn(pgnInput.trim());
      const history = g.history();
      
      setGame(g);
      setShowPgnModal(false);
      setPgnInput('');
      setImportError('');
      broadcastBoardChange(g, history, history.length - 1);
    } catch (e) {
      setImportError('Invalid PGN format. Please check the PGN string.');
    }
  };

  // FEN Import Handler
  const handleImportFen = () => {
    if (!fenInput.trim()) return;
    try {
      const g = new Chess(fenInput.trim());
      setShowFenModal(false);
      setFenInput('');
      setImportError('');
      broadcastBoardChange(g, [], -1);
    } catch (e) {
      setImportError('Invalid FEN position string.');
    }
  };

  // Helper to fetch Lichess game by Username, Analysis link, Study link, or Game ID
  const fetchLichessPgn = async (inputStr) => {
    const trimmed = inputStr.trim();
    if (!trimmed) throw new Error('Please enter a Lichess username, analysis link, or study URL.');

    // 1. Check if input is a Lichess Study URL (e.g. https://lichess.org/study/AbCdEfGh/12345678)
    const studyMatch = trimmed.match(/lichess\.org\/study\/([a-zA-Z0-9]{8,12})(?:\/([a-zA-Z0-9]{8,12}))?/);
    if (studyMatch) {
      const studyId = studyMatch[1];
      const chapterId = studyMatch[2];
      const apiUrl = chapterId 
        ? `https://lichess.org/api/study/${studyId}/${chapterId}.pgn`
        : `https://lichess.org/api/study/${studyId}.pgn`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`Could not fetch Lichess Study "${studyId}". Ensure study is public.`);
      return await res.text();
    }

    // 2. Check if input is a Lichess Game or Analysis Board URL
    const gameMatch = trimmed.match(/lichess\.org\/(?:analysis\/)?([a-zA-Z0-9]{8,12})/);
    let gameId = gameMatch ? gameMatch[1] : null;

    if (!gameId && /^[a-zA-Z0-9]{8,12}$/.test(trimmed) && !/^[a-zA-Z]+$/.test(trimmed)) {
      gameId = trimmed;
    }

    if (gameId) {
      const res = await fetch(`https://lichess.org/api/game/export/${gameId}?moves=true`);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) return text;
      }
    }

    // 3. Treat input as Lichess Username (e.g., "MagnusCarlsen")
    const username = trimmed;
    try {
      const liveRes = await fetch(`https://lichess.org/api/user/${username}/current-game`);
      if (liveRes.ok) {
        const livePgn = await liveRes.text();
        if (livePgn && livePgn.trim()) return livePgn;
      }
    } catch (e) {}

    // Fallback: Most recent public game by user
    const recentRes = await fetch(`https://lichess.org/api/games/user/${username}?max=1&moves=true`);
    if (!recentRes.ok) {
      throw new Error(`Could not fetch Lichess game or analysis for "${username}". Check the spelling or link.`);
    }
    const recentPgn = await recentRes.text();
    if (!recentPgn || !recentPgn.trim()) {
      throw new Error(`No public games found for "${username}".`);
    }
    return recentPgn;
  };

  // Lichess Connection Handler
  const handleConnectLichess = async () => {
    if (!lichessInput.trim()) return;
    setSyncStatus('Connecting to Lichess...');
    try {
      const pgnText = await fetchLichessPgn(lichessInput);
      const g = new Chess();
      g.loadPgn(pgnText);
      const history = g.history();

      setLiveSyncTarget(lichessInput.trim());
      setIsLiveSyncing(true);
      setShowLichessModal(false);
      setSyncStatus(`Live Syncing: ${lichessInput.trim()}`);
      broadcastBoardChange(g, history, history.length - 1);
    } catch (e) {
      setImportError(e.message || 'Could not fetch Lichess game.');
      setSyncStatus('');
    }
  };

  // Auto-polling effect for Live Lichess Sync (runs every 3s when enabled)
  useEffect(() => {
    if (!isLiveSyncing || !liveSyncTarget || !isCoach) return;
    const interval = setInterval(async () => {
      try {
        const pgnText = await fetchLichessPgn(liveSyncTarget);
        const g = new Chess();
        g.loadPgn(pgnText);
        const history = g.history();
        const newFen = g.fen();

        if (newFen !== fen) {
          broadcastBoardChange(g, history, history.length - 1);
        }
      } catch (e) {
        console.warn('Lichess live poll sync error:', e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isLiveSyncing, liveSyncTarget, fen, isCoach]);

  // Student Move Submission Handler
  const handleStudentSubmitMove = async (e) => {
    e.preventDefault();
    if (!studentInput.trim() || !student) return;

    setFeedback(null);
    const parseResult = parseStudentMove(studentInput, fen);

    if (parseResult.success) {
      const moveSan = parseResult.san;
      setMyVote(moveSan);
      setFeedback({
        type: 'success',
        message: `Vote recorded for move "${moveSan}"!`,
      });
      setStudentInput('');

      await submitPollVote(classId, student.id, student.name, moveSan);
    } else {
      setFeedback({
        type: 'error',
        message: parseResult.error,
        suggestions: parseResult.suggestions,
      });
    }
  };

  // Coach plays top voted move directly
  const handlePlayTopVotedMove = async () => {
    const sortedTallies = Object.entries(tallies).sort((a, b) => b[1] - a[1]);
    if (sortedTallies.length === 0) return;
    const topMove = sortedTallies[0][0];

    try {
      const g = new Chess(fen);
      const move = g.move(topMove);
      if (move) {
        const updatedHistory = moveHistory.slice(0, moveIndex + 1);
        updatedHistory.push(move.san);
        await broadcastBoardChange(g, updatedHistory, updatedHistory.length - 1);
        await clearPollVotes(classId);
      }
    } catch (e) {
      console.warn(`Could not execute move ${topMove}:`, e);
    }
  };

  // Compute vote tallies
  const voteList = Object.values(votes || {});
  const totalVotes = voteList.length;
  const tallies = {};
  voteList.forEach(v => {
    if (v.moveSan) {
      tallies[v.moveSan] = (tallies[v.moveSan] || 0) + 1;
    }
  });
  const sortedTallies = Object.entries(tallies).sort((a, b) => b[1] - a[1]);

  return (
    <div style={styles.pollAppContainer} className="animate-slide-up">
      {/* Header Bar */}
      <div style={styles.pollHeader} className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={styles.iconBadge}>
            <BarChart2 size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
              Interactive Move Polls
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              {isCoach 
                ? 'Control the board, stream PGNs/Lichess games, and watch live student move votes!' 
                : 'Suggest your move in the chat box. Correct notation will be tallied live!'}
            </p>
          </div>
        </div>

        {/* Control Tools */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isCoach && (
            <button 
              onClick={() => startPollSession(classId)} 
              style={{ ...styles.btnSecondary, background: 'var(--accent-primary)', color: '#fff', border: 'none' }} 
              className="glass-panel"
              title="Push live poll page to all student screens"
            >
              <Radio size={16} /> Sync & Start Poll Session
            </button>
          )}

          <button 
            onClick={handleToggleOrientation} 
            style={styles.btnSecondary} 
            className="glass-panel"
            title="Flip board orientation"
          >
            <RotateCcw size={16} /> Flip ({orientation === 'white' ? 'White' : 'Black'})
          </button>

          {isCoach && (
            <button 
              onClick={handleResetBoard} 
              style={{
                ...styles.btnSecondary,
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                fontWeight: '700',
              }} 
              className="glass-panel"
              title="Reset chessboard to standard starting position"
            >
              <RefreshCw size={16} /> Reset Board
            </button>
          )}

          {isCoach && (
            <>
              <button 
                onClick={() => setFreeDragMode(!freeDragMode)} 
                style={{
                  ...styles.btnSecondary,
                  border: freeDragMode ? '1.5px solid #f59e0b' : '1px solid var(--border-color)',
                  color: freeDragMode ? '#f59e0b' : 'var(--text-primary)',
                }}
                className="glass-panel"
                title="Toggle free drag placement (move any piece to any square)"
              >
                <Move size={16} /> Free Drag: {freeDragMode ? 'ON' : 'OFF'}
              </button>

              <button onClick={() => { setImportError(''); setShowPgnModal(true); }} style={styles.btnSecondary} className="glass-panel">
                <FileText size={16} /> PGN
              </button>

              <button onClick={() => { setImportError(''); setShowFenModal(true); }} style={styles.btnSecondary} className="glass-panel">
                FEN
              </button>

              <button 
                onClick={() => { setImportError(''); setShowLichessModal(true); }} 
                style={{
                  ...styles.btnSecondary,
                  border: isLiveSyncing ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                }} 
                className="glass-panel"
              >
                <Globe size={16} color={isLiveSyncing ? "#10b981" : "var(--accent-primary)"} /> 
                {isLiveSyncing ? 'Syncing Lichess 🔴' : 'Sync Lichess'}
              </button>

              <button 
                onClick={() => setShowFloatingWidget(!showFloatingWidget)} 
                style={{
                  ...styles.btnSecondary,
                  border: showFloatingWidget ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)'
                }}
                className="glass-panel"
              >
                <Maximize2 size={16} /> Overlay
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live Sync Banner */}
      {isLiveSyncing && isCoach && (
        <div style={styles.liveBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={styles.liveBadge}>LIVE</span>
            <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Auto-streaming Lichess updates for: <strong>{liveSyncTarget}</strong>
            </span>
          </div>
          <button 
            onClick={() => {
              setIsLiveSyncing(false);
              setLiveSyncTarget('');
            }}
            style={styles.btnStopSync}
          >
            Stop Sync
          </button>
        </div>
      )}

      {/* Main Grid: Left Chessboard & Right Poll/Chat Panel */}
      <div style={styles.mainGrid}>
        {/* Left Column: Board */}
        <div style={styles.boardColumn}>
          <div style={styles.boardWrapper}>
            <ChessboardWrapper 
              position={fen || START_FEN} 
              onMove={isCoach ? handleCoachPieceDrop : () => false}
              arePiecesDraggable={isCoach}
              interactive={isCoach}
              orientation={orientation}
              maxWidth="806px"
            />
          </div>

          {/* Move Navigation Controls (For Coach) */}
          {isCoach && moveHistory.length > 0 && (
            <div style={styles.navBar}>
              <button 
                onClick={() => {
                  const g = new Chess();
                  broadcastBoardChange(g, moveHistory, -1);
                }} 
                style={styles.navBtn}
                title="First move"
              >
                <SkipBack size={16} />
              </button>
              <button 
                onClick={() => {
                  if (moveIndex > 0) {
                    const g = new Chess();
                    for (let i = 0; i < moveIndex; i++) {
                      g.move(moveHistory[i]);
                    }
                    broadcastBoardChange(g, moveHistory, moveIndex - 1);
                  } else if (moveIndex === 0) {
                    const g = new Chess();
                    broadcastBoardChange(g, moveHistory, -1);
                  }
                }} 
                style={styles.navBtn}
                title="Previous move"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                Move {moveIndex + 1} of {moveHistory.length}
              </span>
              <button 
                onClick={() => {
                  if (moveIndex < moveHistory.length - 1) {
                    const g = new Chess(fen);
                    g.move(moveHistory[moveIndex + 1]);
                    broadcastBoardChange(g, moveHistory, moveIndex + 1);
                  }
                }} 
                style={styles.navBtn}
                title="Next move"
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => {
                  const g = new Chess();
                  moveHistory.forEach(m => g.move(m));
                  broadcastBoardChange(g, moveHistory, moveHistory.length - 1);
                }} 
                style={styles.navBtn}
                title="Last move"
              >
                <SkipForward size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Poll Graph & Student Input */}
        <div style={styles.panelColumn} className="glass-panel">
          {/* Live Poll Graph Section */}
          <div style={styles.pollSection}>
            <div style={styles.pollSectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#f59e0b" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  Live Move Suggestions ({totalVotes})
                </h3>
              </div>
              {isCoach && totalVotes > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handlePlayTopVotedMove} style={styles.btnAction} title="Play top voted move">
                    <Play size={14} /> Play #1
                  </button>
                  <button onClick={() => clearPollVotes(classId)} style={styles.btnClear} title="Clear votes">
                    <Trash2 size={14} /> Reset
                  </button>
                </div>
              )}
            </div>

            {/* Poll Bar List */}
            <div style={styles.pollBarsContainer}>
              {sortedTallies.length === 0 ? (
                <div style={styles.emptyPollBox}>
                  <BarChart2 size={32} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    No student suggestions submitted yet.
                  </p>
                </div>
              ) : (
                sortedTallies.map(([move, count]) => {
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <div key={move} style={styles.barCard}>
                      <div style={styles.barMeta}>
                        <span style={styles.moveTitle}>{move}</span>
                        <span style={styles.voteCount}>{count} votes ({pct}%)</span>
                      </div>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Student Chat / Move Parser Input Box */}
          {!isCoach && (
            <div style={styles.studentChatBox}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                Suggest Your Move:
              </h4>

              {myVote && (
                <div style={styles.currentVoteBadge}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>Your current vote: <strong style={{ color: 'var(--accent-primary)' }}>{myVote}</strong></span>
                </div>
              )}

              <form onSubmit={handleStudentSubmitMove} style={styles.inputForm}>
                <input
                  type="text"
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value)}
                  placeholder="Type move (e.g., Nf3, knight to f3, e4)..."
                  style={styles.textInput}
                />
                <button type="submit" style={styles.btnPrimary}>
                  <Send size={16} /> Submit
                </button>
              </form>

              {/* Feedback messages */}
              {feedback && (
                <div style={{
                  ...styles.feedbackBox,
                  backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  borderColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                }}>
                  {feedback.type === 'success' ? (
                    <CheckCircle2 size={18} color="#10b981" />
                  ) : (
                    <AlertCircle size={18} color="#ef4444" />
                  )}
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {feedback.message}
                    </span>
                    {feedback.suggestions && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                        {feedback.suggestions.map(sug => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setStudentInput(sug)}
                            style={styles.suggestionChip}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Student Roster Breakdown (Coach view) */}
          {isCoach && (
            <div style={styles.rosterVotesSection}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>
                INDIVIDUAL STUDENT RESPONSES ({voteList.length})
              </h4>
              <div style={styles.rosterVotesList}>
                {voteList.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Waiting for student votes...</span>
                ) : (
                  voteList.map(v => (
                    <div key={v.studentId || v.studentName} style={styles.studentVoteRow}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{v.studentName}</span>
                      <span style={styles.moveBadge}>{v.moveSan}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Overlay Widget */}
      {isCoach && showFloatingWidget && (
        <FloatingPollWidget 
          votes={votes}
          onClose={() => setShowFloatingWidget(false)}
          onPlayMove={(moveSan) => {
            try {
              const g = new Chess(fen);
              if (g.move(moveSan)) {
                const updatedHistory = moveHistory.slice(0, moveIndex + 1);
                updatedHistory.push(moveSan);
                broadcastBoardChange(g, updatedHistory, updatedHistory.length - 1);
                clearPollVotes(classId);
              }
            } catch (e) {}
          }}
          onClearVotes={() => clearPollVotes(classId)}
        />
      )}

      {/* Import PGN Modal */}
      {showPgnModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard} className="glass-panel animate-float">
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Import PGN Game</h3>
            <textarea
              rows={6}
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
              placeholder="Paste PGN here (e.g. 1. e4 e5 2. Nf3 Nc6...)"
              style={styles.modalTextarea}
            />
            {importError && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.5rem', fontWeight: 600 }}>{importError}</div>}
            <div style={styles.modalFooter}>
              <button onClick={() => { setImportError(''); setShowPgnModal(false); }} style={styles.btnSecondary}>Cancel</button>
              <button onClick={handleImportPgn} style={styles.btnPrimary}>Load PGN</button>
            </div>
          </div>
        </div>
      )}

      {/* Import FEN Modal */}
      {showFenModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard} className="glass-panel animate-float">
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Import FEN Position</h3>
            <input
              type="text"
              value={fenInput}
              onChange={(e) => setFenInput(e.target.value)}
              placeholder="Paste FEN string..."
              style={styles.modalInput}
            />
            {importError && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.5rem', fontWeight: 600 }}>{importError}</div>}
            <div style={styles.modalFooter}>
              <button onClick={() => { setImportError(''); setShowFenModal(false); }} style={styles.btnSecondary}>Cancel</button>
              <button onClick={handleImportFen} style={styles.btnPrimary}>Load FEN</button>
            </div>
          </div>
        </div>
      )}

      {/* Lichess Sync Modal */}
      {showLichessModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard} className="glass-panel animate-float">
            <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Globe color="var(--accent-primary)" /> Sync Lichess (Username or Link)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              Enter your <strong>Lichess Username</strong> (e.g., <code>MagnusCarlsen</code>) or paste any <strong>Game Link/ID</strong>. The board will fetch moves live every 3 seconds!
            </p>
            <input
              type="text"
              value={lichessInput}
              onChange={(e) => setLichessInput(e.target.value)}
              placeholder="Enter Lichess username or game link..."
              style={styles.modalInput}
            />
            {importError && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.5rem', fontWeight: 600 }}>{importError}</div>}
            <div style={styles.modalFooter}>
              <button onClick={() => { setImportError(''); setShowLichessModal(false); }} style={styles.btnSecondary}>Cancel</button>
              <button onClick={handleConnectLichess} style={styles.btnPrimary}>
                <RefreshCw size={14} /> Start Live Auto-Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pollAppContainer: {
    padding: '0.5rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  pollHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  iconBadge: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: 'var(--accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    borderRadius: '12px',
  },
  liveBadge: {
    backgroundColor: '#10b981',
    color: '#fff',
    fontSize: '0.72rem',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  btnStopSync: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '0.78rem',
    cursor: 'pointer',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '1.25rem',
    alignItems: 'start',
  },
  boardColumn: {
    padding: '1.25rem',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  boardWrapper: {
    width: '100%',
    maxWidth: '620px',
  },
  navBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  navBtn: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelColumn: {
    padding: '1.25rem',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  pollSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  pollSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnAction: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  btnClear: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#ef4444',
    padding: '6px 12px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  pollBarsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  emptyPollBox: {
    padding: '2rem 1rem',
    textAlign: 'center',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '12px',
    border: '1px dashed var(--border-color)',
  },
  barCard: {
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '10px 12px',
  },
  barMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  moveTitle: {
    fontWeight: '800',
    fontSize: '1.05rem',
    color: 'var(--accent-primary)',
  },
  voteCount: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    fontWeight: '700',
  },
  barTrack: {
    width: '100%',
    height: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-primary), #60a5fa)',
    borderRadius: '5px',
    transition: 'width 0.3s ease',
  },
  studentChatBox: {
    borderTop: '1px solid var(--border-color)',
    paddingTop: '1rem',
  },
  currentVoteBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    marginBottom: '0.75rem',
    color: 'var(--text-primary)',
  },
  inputForm: {
    display: 'flex',
    gap: '0.5rem',
  },
  textInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  btnPrimary: {
    background: 'var(--accent-primary)',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  btnSecondary: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '8px 14px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  feedbackBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid',
    marginTop: '0.75rem',
  },
  suggestionChip: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
    color: 'var(--accent-primary)',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  rosterVotesSection: {
    borderTop: '1px solid var(--border-color)',
    paddingTop: '1rem',
  },
  rosterVotesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '180px',
    overflowY: 'auto',
  },
  studentVoteRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '8px',
    fontSize: '0.85rem',
  },
  moveBadge: {
    fontWeight: '800',
    color: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '1rem',
  },
  modalCard: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px var(--shadow-color)',
  },
  modalTextarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    resize: 'none',
    boxSizing: 'border-box',
    marginBottom: '1rem',
  },
  modalInput: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    boxSizing: 'border-box',
    marginBottom: '1rem',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  },
};
