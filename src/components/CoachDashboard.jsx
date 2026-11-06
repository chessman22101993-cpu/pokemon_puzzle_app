import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import {
  listenToSession,
  listenToStudents,
  updateSessionSettings,
  createSession,
  updateStudentStatus,
  startRound,
  endRound,
  addExtraTime,
  resetEntireSession,
  resetDailyProgress,
  approveStudentEntry,
  approveMultipleStudents,
  rejectStudentEntry,
  renameStudent,
  resetAllStudentCoins,
  sanitizeCoins,
  removeStudentFromRoster,
  parsePgnOrFen,
  saveCustomPuzzlesLibrary,
  gradeCustomReviewAnswer,
  updateCustomReviewBoardArrows,
  dismissRoundOverlay,
  resetRoundStats,
  isStudentOnline,
  isStudentApprovedForToday,
} from '../firebase/db';
import { fetchPuzzlesByTheme, DIFFICULTY_PRESETS } from '../utils/puzzleApi';
import { PUZZLES } from '../data/puzzles';
import TimerDisplay from './TimerDisplay';
import { parseStartedAt } from '../utils/timerUtils';
import PollAppTab from './PollAppTab';
import { Users, Play, Pause, Square, CheckCircle2, Trophy, Zap, ChevronRight, RefreshCw, BarChart2, Bell, BellRing, Wifi, Megaphone, Shield, Gift, HelpCircle, Copy, Search, Send, Clock, Award } from 'lucide-react';
import { playStudentJoinNotification } from '../utils/soundEffects';

// Difficulty config (Updated to 5 modes including Custom)
const DIFFICULTIES = [
  { value: 'beginner',     label: 'Beginner',     emoji: '🟢', color: 'hsl(145,60%,40%)', bg: 'hsl(145,60%,95%)' },
  { value: 'intermediate', label: 'Intermediate', emoji: '🟡', color: 'hsl(38,90%,45%)',  bg: 'hsl(38,90%,95%)'  },
  { value: 'advanced',     label: 'Advanced',     emoji: '🔴', color: 'hsl(0,75%,50%)',   bg: 'hsl(0,75%,96%)'   },
  { value: 'mixed',        label: 'Mixed Mode',   emoji: '🌈', color: 'hsl(280,75%,50%)',  bg: 'hsl(280,70%,96%)'  },
];

const TIMER_PRESETS = [
  { value: 60,  label: '1 Min',  emoji: '⏰' },
  { value: 180, label: '3 Min',  emoji: '⏰' },
  { value: 300, label: '5 Min',  emoji: '⏰' },
  { value: 600, label: '10 Min', emoji: '⏰' },
  { value: 900, label: '15 Min', emoji: '⏰' },
];

const STATUS_ICON = { thinking: '🤔', solved: '✅', wrong: '❌', help: '🆘', offline: '⚫' };
const STATUS_LABEL = { thinking: 'Solving', solved: 'Solved!', wrong: 'Wrong move', help: 'Needs Help', offline: 'Offline' };

// Starting position FEN
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const DEFAULT_CUSTOM_PUZZLE_SET = [
  { id: 'custom_default_1', title: 'Puzzle 1: Fried Liver Attack', fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6', solution: 'Nxf7', reward: 50, sideToMove: 'white' },
  { id: 'custom_default_2', title: 'Puzzle 2: Back Rank Checkmate', fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', solution: 'Rd8#', reward: 50, sideToMove: 'white' }
];

// Helper to parse a PGN string into FEN and move solution sequence
const parsePgnForCustomPuzzle = (pgnText) => {
  if (!pgnText.trim()) return null;
  try {
    const chess = new Chess();
    chess.loadPgn(pgnText);
    const history = chess.history({ verbose: true });
    const headers = chess.header();
    const startFen = headers.FEN || START_FEN;
    const moves = history.map(m => m.from + m.to + (m.promotion || ''));
    return {
      success: true,
      fen: startFen,
      solution: moves.join(', '),
      moveCount: moves.length
    };
  } catch (e) {
    return {
      success: false,
      error: e.message || 'Invalid PGN format.'
    };
  }
};

const getNormalizedMoveTokens = (text) => {
  if (!text) return [];
  const cleaned = text.toLowerCase()
                      .replace(/[^a-z0-9]/g, ' ')
                      .trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  const pieceMap = {
    'rook': 'r', 'row': 'r', 'raw': 'r',
    'knight': 'n', 'night': 'n',
    'bishop': 'b',
    'queen': 'q',
    'king': 'k',
    'pawn': 'p',
  };
  
  const squareLettersMap = {
    'key': 'e', // speech-to-text "row key one" -> rook e 1 -> r e 1
    'sea': 'c', 'see': 'c',
    'bee': 'b',
    'aye': 'a',
    'gee': 'g',
  };
  
  const numberMap = {
    'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8'
  };

  const ignoredWords = new Set(['to', 'the', 'on', 'at', 'moves', 'play', 'plays', 'with', 'takes', 'x']);

  let normalizedTokens = [];
  for (let token of tokens) {
    if (ignoredWords.has(token)) {
      continue;
    }
    if (pieceMap[token]) {
      normalizedTokens.push(pieceMap[token]);
    } else if (squareLettersMap[token]) {
      normalizedTokens.push(squareLettersMap[token]);
    } else if (numberMap[token]) {
      normalizedTokens.push(numberMap[token]);
    } else {
      let processedToken = token;
      Object.keys(pieceMap).forEach(key => {
        processedToken = processedToken.replace(new RegExp(key, 'g'), pieceMap[key]);
      });
      Object.keys(squareLettersMap).forEach(key => {
        processedToken = processedToken.replace(new RegExp(key, 'g'), squareLettersMap[key]);
      });
      Object.keys(numberMap).forEach(key => {
        processedToken = processedToken.replace(new RegExp(key, 'g'), numberMap[key]);
      });
      normalizedTokens.push(processedToken);
    }
  }

  // Merge file and rank: e.g. ['e', '1'] -> ['e1']
  let mergedSquares = [];
  for (let i = 0; i < normalizedTokens.length; i++) {
    const current = normalizedTokens[i];
    const next = normalizedTokens[i + 1];
    if (current.length === 1 && current >= 'a' && current <= 'h' && next && next.length === 1 && next >= '1' && next <= '8') {
      mergedSquares.push(current + next);
      i++;
    } else {
      mergedSquares.push(current);
    }
  }

  // Merge piece and square: e.g. ['r', 'e1'] -> ['re1']
  let mergedMoves = [];
  for (let i = 0; i < mergedSquares.length; i++) {
    const current = mergedSquares[i];
    const next = mergedSquares[i + 1];
    const isPiece = ['r', 'n', 'b', 'q', 'k', 'p'].includes(current);
    const isSquare = next && next.length === 2 && next[0] >= 'a' && next[0] <= 'h' && next[1] >= '1' && next[1] <= '8';
    if (isPiece && isSquare) {
      mergedMoves.push(current + next);
      i++;
    } else {
      mergedMoves.push(current);
    }
  }

  return mergedMoves.filter(Boolean);
};

const validateAnswer = (coachAns, studentAns) => {
  const coachTokens = getNormalizedMoveTokens(coachAns);
  const studentTokens = getNormalizedMoveTokens(studentAns);
  
  if (coachTokens.length === 0) return null;
  if (studentTokens.length < coachTokens.length) return false;
  
  for (let i = 0; i < coachTokens.length; i++) {
    if (studentTokens[i] !== coachTokens[i]) {
      return false;
    }
  }
  return true;
};

export default function CoachDashboard({ classId, onLeave, onSwitchClass }) {
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live Custom Puzzles list state
  const [customPuzzles, setCustomPuzzles] = useState([
    { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', solution: 'c6b4, c4f7', reward: '100', title: 'Puzzle 1' }
  ]);
  const [customPgn, setCustomPgn] = useState('');
  const [pgnFeedback, setPgnFeedback] = useState('');

  // Coached Custom Challenges State Hooks
  const [activeDashboardTab, setActiveDashboardTab] = useState('round_manager'); // 'round_manager' or 'custom_challenge'
  const [customBuilderSubTab, setCustomBuilderSubTab] = useState('library'); // 'library' or 'setup'
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [selectedBoard1Id, setSelectedBoard1Id] = useState('');
  const [selectedBoard2Id, setSelectedBoard2Id] = useState('');
  const [board1Coins, setBoard1Coins] = useState(50);
  const [board2Coins, setBoard2Coins] = useState(50);
  const [board1Answer, setBoard1Answer] = useState('');
  const [board2Answer, setBoard2Answer] = useState('');
  const [activeReviewBoardTab, setActiveReviewBoardTab] = useState('board1');
  const [editingActiveBoard, setEditingActiveBoard] = useState(false);
  const [activeFenInput, setActiveFenInput] = useState('');
  const [activeAnswerInput, setActiveAnswerInput] = useState('');
  const [activeRewardInput, setActiveRewardInput] = useState('50');
  const [entryToasts, setEntryToasts] = useState([]);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [studentFilter, setStudentFilter] = useState('all'); // 'all' or 'online'
  const [announcementText, setAnnouncementText] = useState('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const prevPendingIdsRef = useRef(new Set());
  const isInitialMountRef = useRef(true);

  const [dismissedRoundNum, setDismissedRoundNum] = useState(() => {
    try {
      return sessionStorage.getItem(`coach_dismissed_round_${classId}`) || null;
    } catch (e) {
      return null;
    }
  });

  // Sound + Toast + Desktop Notification when students request entry
  useEffect(() => {
    const currentPending = session?.pendingApprovals || [];
    const currentIds = new Set(currentPending.map(p => p.id));

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevPendingIdsRef.current = currentIds;
      return;
    }

    const newlyAdded = currentPending.filter(p => !prevPendingIdsRef.current.has(p.id));
    if (newlyAdded.length > 0) {
      playStudentJoinNotification();

      newlyAdded.forEach(req => {
        const toastId = `entry_${req.id}_${Date.now()}`;
        setEntryToasts(prev => [...prev, { id: toastId, studentId: req.id, name: req.name }]);
        setTimeout(() => {
          setEntryToasts(prev => prev.filter(t => t.id !== toastId));
        }, 10000);
      });

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const studentNames = newlyAdded.map(p => p.name).join(', ');
        new Notification('Student Entry Request', {
          body: `${studentNames} is waiting for your approval to enter today's class!`,
          icon: '/favicon.ico',
        });
      }
    }

    prevPendingIdsRef.current = currentIds;
  }, [session?.pendingApprovals, classId]);

  // Reset dismissed round tracker when a new round is active so winner podium always displays upon round end
  useEffect(() => {
    if (session?.round?.status === 'active') {
      setDismissedRoundNum(null);
      try {
        sessionStorage.removeItem(`coach_dismissed_round_${classId}`);
      } catch (e) {}
    }
  }, [session?.round?.status, session?.round?.number, classId]);

  const handleDismissCoachStandings = () => {
    const currentRoundNum = session?.round?.number || 1;
    setDismissedRoundNum(currentRoundNum);
    try {
      sessionStorage.setItem(`coach_dismissed_round_${classId}`, String(currentRoundNum));
    } catch (e) {}
  };

  // Universal FEN Library Sync across all links/classes
  useEffect(() => {
    if (!classId) return;
    const currentLib = session?.customReviewLibrary || [];
    if (currentLib.length === 0) {
      let puzzlesToSave = DEFAULT_CUSTOM_PUZZLE_SET;
      const universalSaved = localStorage.getItem('universal_custom_puzzle_library');
      if (universalSaved) {
        try {
          const universalPuzzles = JSON.parse(universalSaved);
          if (Array.isArray(universalPuzzles) && universalPuzzles.length > 0) {
            puzzlesToSave = universalPuzzles;
          }
        } catch (e) {
          console.error('Failed to parse universal custom library:', e);
        }
      }
      saveCustomPuzzlesLibrary(classId, puzzlesToSave);
    }
  }, [classId, session?.customReviewLibrary]);

  // Auto-select board 1 and board 2 from library if unselected or invalid
  useEffect(() => {
    const library = session?.customReviewLibrary || DEFAULT_CUSTOM_PUZZLE_SET;
    if (library.length >= 2) {
      if (!selectedBoard1Id || !library.some(p => p.id === selectedBoard1Id)) {
        setSelectedBoard1Id(library[0].id);
      }
      if (!selectedBoard2Id || !library.some(p => p.id === selectedBoard2Id)) {
        setSelectedBoard2Id(library[1].id);
      }
    } else if (library.length === 1) {
      if (!selectedBoard1Id) setSelectedBoard1Id(library[0].id);
      if (!selectedBoard2Id) setSelectedBoard2Id(library[0].id);
    }
  }, [session?.customReviewLibrary, selectedBoard1Id, selectedBoard2Id]);

  useEffect(() => {
    if (selectedBoard1Id) {
      const library = session?.customReviewLibrary || DEFAULT_CUSTOM_PUZZLE_SET;
      const puzzle = library.find(p => p.id === selectedBoard1Id);
      if (puzzle && puzzle.solution) {
        setBoard1Answer(puzzle.solution);
      }
    }
  }, [selectedBoard1Id, session?.customReviewLibrary]);

  useEffect(() => {
    if (selectedBoard2Id) {
      const library = session?.customReviewLibrary || DEFAULT_CUSTOM_PUZZLE_SET;
      const puzzle = library.find(p => p.id === selectedBoard2Id);
      if (puzzle && puzzle.solution) {
        setBoard2Answer(puzzle.solution);
      }
    }
  }, [selectedBoard2Id, session?.customReviewLibrary]);

  useEffect(() => {
    if (session?.round?.customReviewPuzzles?.[activeReviewBoardTab]) {
      const currentInfo = session.round.customReviewPuzzles[activeReviewBoardTab];
      setActiveFenInput(currentInfo.fen || '');
      setActiveAnswerInput(currentInfo.answer || '');
      setActiveRewardInput(currentInfo.reward || 50);
    }
  }, [activeReviewBoardTab, session?.round?.customReviewPuzzles]);

  const handleSaveActiveBoardEdits = async () => {
    if (!session?.round?.customReviewPuzzles?.[activeReviewBoardTab]) return;
    const boardKey = activeReviewBoardTab;
    const currentBoard = session.round.customReviewPuzzles[boardKey];
    const { parsePgnOrFen } = await import('../firebase/db');
    const parsed = parsePgnOrFen(activeFenInput || currentBoard.fen);

    const updatedBoard = {
      ...currentBoard,
      fen: parsed.fen,
      sideToMove: parsed.sideToMove,
      answer: activeAnswerInput.trim(),
      reward: parseInt(activeRewardInput, 10) || 50,
    };

    const updatedRound = {
      ...session.round,
      customReviewPuzzles: {
        ...session.round.customReviewPuzzles,
        [boardKey]: updatedBoard,
      },
    };

    await updateSessionSettings(classId, { round: updatedRound });
    setEditingActiveBoard(false);
  }; // 'board1' or 'board2'

  const handlePgnChange = (val) => {
    setCustomPgn(val);
    if (!val.trim()) {
      setPgnFeedback('');
      return;
    }
    const res = parsePgnForCustomPuzzle(val);
    if (res && res.success) {
      const newList = [{
        fen: res.fen,
        solution: res.solution,
        reward: '50',
        title: 'Custom Puzzle'
      }];
      setCustomPuzzles(newList);
      setPreviewFen(res.fen); // Fix empty board when pasting PGN
      setPgnFeedback(`✅ Successfully parsed PGN!`);
    } else if (res) {
      setPgnFeedback(`❌ Error parsing PGN: ${res.error}`);
    }
  };

  // Batches Switcher State
  const [activeSessionsList, setActiveSessionsList] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');

  // Sync active sessions list from local storage on mount/change
  useEffect(() => {
    let list = [];
    try {
      const raw = localStorage.getItem('coach_active_sessions');
      list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
    } catch (e) {
      list = [];
    }
    if (!list.includes(classId)) {
      list.push(classId);
      localStorage.setItem('coach_active_sessions', JSON.stringify(list));
    }
    setActiveSessionsList(list);
  }, [classId]);

  const handleCopyClassLink = (code) => {
    const url = `${window.location.origin}/class/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    });
  };

  const handleDeleteClass = (code) => {
    if (confirm(`Are you sure you want to remove the batch "${code}"?`)) {
      const updated = activeSessionsList.filter(c => c !== code);
      setActiveSessionsList(updated);
      localStorage.setItem('coach_active_sessions', JSON.stringify(updated));
      if (code === classId) {
        if (updated.length > 0 && onSwitchClass) {
          onSwitchClass(updated[0]);
        } else {
          onLeave();
        }
      }
    }
  };

  const handleClearAllBatches = () => {
    if (confirm("Are you sure you want to remove ALL batches and start completely fresh?")) {
      localStorage.removeItem('coach_active_sessions');
      setActiveSessionsList([]);
      onLeave();
    }
  };

  const handleCreateNewBatch = async (code) => {
    if (activeSessionsList.includes(code)) {
      alert("A batch with this code already exists!");
      return;
    }
    try {
      setLoading(true);
      await createSession(code, { difficulty: 'intermediate', theme: 'mixed' });
      const updated = [...activeSessionsList, code];
      setActiveSessionsList(updated);
      localStorage.setItem('coach_active_sessions', JSON.stringify(updated));
      
      // Auto switch
      if (onSwitchClass) {
        onSwitchClass(code);
      }
    } catch (e) {
      alert("Failed to create new batch session.");
    } finally {
      setLoading(false);
    }
  };

  // Timer Configuration State
  const [timerPreset, setTimerPreset] = useState(300); // default 5 min (300s)
  const [customMin, setCustomMin] = useState('5');
  const [customSec, setCustomSec] = useState('00');
  const [isTimerMode, setIsTimerMode] = useState(true); // true = timed, false = manual/untimed

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState('');

  // Puzzle preview for coach board
  const [previewFen, setPreviewFen] = useState(START_FEN);
  const [previewPuzzle, setPreviewPuzzle] = useState(null);
  const [puzzleQueue, setPuzzleQueue] = useState([]); // loaded batch
  const puzzleQueueRef = useRef([]);

  // Sync queue ref
  useEffect(() => { puzzleQueueRef.current = puzzleQueue; }, [puzzleQueue]);

  // Subscribe to session + students
  useEffect(() => {
    const unsubSession = listenToSession(classId, (data) => {
      if (data) {
        setSession(data);
        setSessionActive(data.status === 'active' || data.status === 'paused');
        if (data.difficulty) setDifficulty(data.difficulty);
        
        // Auto daily reset check
        const todayStr = new Date().toDateString();
        if (data.lastActiveDate && data.lastActiveDate !== todayStr) {
          resetDailyProgress(classId);
          updateSessionSettings(classId, { lastActiveDate: todayStr });
        } else if (!data.lastActiveDate) {
          updateSessionSettings(classId, { lastActiveDate: todayStr });
        }
      }
    });
    const unsubStudents = listenToStudents(classId, (list) => setStudents(list));
    return () => {
      if (typeof unsubSession === 'function') unsubSession();
      if (typeof unsubStudents === 'function') unsubStudents();
    };
  }, [classId]);
  // Auto-validation effect
  useEffect(() => {
    if (!sessionActive || session?.round?.type !== 'custom_review' || !session?.autoValidate) {
      return;
    }

    students.forEach(student => {
      ['board1', 'board2'].forEach(boardKey => {
        const sub = student.customReviewSubmissions?.[boardKey];
        if (sub && sub.status === 'submitted') {
          const expected = session?.round?.customReviewPuzzles?.[boardKey]?.answer;
          if (expected) {
            const rewardCoins = session?.round?.customReviewPuzzles?.[boardKey]?.reward || 50;
            const isCorrect = validateAnswer(expected, sub.answer);
            if (isCorrect !== null) {
              gradeCustomReviewAnswer(classId, student.id, boardKey, isCorrect, isCorrect ? rewardCoins : 0);
            }
          }
        }
      });
    });
  }, [students, session, sessionActive, classId]);


  // Fetch first batch of puzzles when difficulty changes
  const loadPuzzles = useCallback(async (diff) => {
    if (diff === 'custom') {
      setPuzzleQueue([]);
      setPreviewPuzzle(null);
      setPreviewFen(START_FEN);
      return;
    }
    setLoading(true);
    try {
      const results = await fetchPuzzlesByTheme('mixed', diff);
      setPuzzleQueue(results);
      if (results.length > 0) {
        setPreviewPuzzle(results[0]);
        // Show FEN after setup move for preview
        setPreviewFen(results[0].fen);
      }
    } catch {
      console.warn('Could not load puzzles from API');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load preview puzzle whenever difficulty changes (even before session start)
  useEffect(() => {
    loadPuzzles(difficulty);
  }, [difficulty, loadPuzzles]);

  // Start the puzzle session — fetch batch, configure timer and push to Firebase/mock
  const handleStartSession = useCallback(async () => {
    setLoading(true);
    try {
      let results = [];
      let customPuzzleData = null;

      if (difficulty === 'custom') {
        const puzzlesList = customPuzzles.map((p, idx) => ({
          id: `custom_${Date.now()}_${idx}`,
          fen: p.fen.trim(),
          solution: p.solution.split(',').map(s => s.trim()).filter(Boolean),
          rewardCoins: parseInt(p.reward, 10) || 50,
          title: p.title.trim() || `Challenge ${idx + 1}`
        })).filter(p => p.fen && p.solution.length > 0);

        if (puzzlesList.length === 0) {
          alert('Please configure at least one valid puzzle.');
          setLoading(false);
          return;
        }

        customPuzzleData = {
          active: true,
          puzzles: puzzlesList,
          broadcastAt: Date.now()
        };
        setPuzzleQueue([]);
        setPreviewPuzzle(null);
        setPreviewFen(puzzlesList[0].fen);
      } else {
        // Always fetch a fresh batch of puzzles for each new round directly
        results = await fetchPuzzlesByTheme('mixed', difficulty);
        if (!results || results.length === 0) {
          results = PUZZLES;
        }
        setPuzzleQueue(results);
        if (results.length > 0) {
          setPreviewPuzzle(results[0]);
          setPreviewFen(results[0].fen);
        }
      }

      let duration = 0; // manual/untimed
      if (isTimerMode) {
        if (timerPreset === 'custom') {
          const mins = parseInt(customMin, 10) || 0;
          const secs = parseInt(customSec, 10) || 0;
          duration = mins * 60 + secs;
        } else {
          duration = parseInt(timerPreset, 10);
        }
      }

      // Reset students round-specific stats before round starts
      await resetRoundStats(classId);

      const currentRoundNum = session?.round?.number || 0;
      const roundData = {
        number: currentRoundNum + 1,
        status: 'active',
        type: 'standard',
        startedAt: Date.now(),
        duration: duration,
        extraTimeAdded: 0,
        endedAt: null,
      };

      // Store serialised puzzle queue in session and start the round atomically
      await updateSessionSettings(classId, {
        difficulty,
        sessionStarted: true,
        status: 'active',
        customPuzzle: customPuzzleData,
        round: roundData,
        // Store compact puzzle data (id, fen, setupMove, solution) for students
        puzzleQueue: difficulty === 'custom' ? [] : results.slice(0, 100).map(p => ({
          id: p.id,
          fen: p.fen,
          setupMove: p.setupMove || null,
          solution: p.solution,
          rating: p.rating,
          theme: p.theme,
          difficulty: p.difficulty,
          title: p.title,
          description: p.description,
          hints: p.hints,
          isLichess: !!p.isLichess,
          mixedBandLabel: p.mixedBandLabel || null,
        })),
        puzzleQueueDifficulty: difficulty,
      });

      setSessionActive(true);
    } catch (e) {
      console.error('Failed to start session:', e);
    } finally {
      setLoading(false);
    }
  }, [difficulty, isTimerMode, timerPreset, customMin, customSec, customPuzzles, classId, session?.round?.number]);

  const handlePause = () => {
    const isCurrentlyPaused = session?.status === 'paused' || session?.round?.status === 'paused';
    const nextStatus = isCurrentlyPaused ? 'active' : 'paused';
    
    let updatedRound = null;
    if (session?.round) {
      if (isCurrentlyPaused) {
        // Resuming: Adjust startedAt by adding the duration of the pause
        const pauseDurationMs = session.round.pausedAt ? (Date.now() - parseStartedAt(session.round.pausedAt)) : 0;
        const newStartedAt = parseStartedAt(session.round.startedAt) + pauseDurationMs;
        updatedRound = {
          ...session.round,
          status: 'active',
          startedAt: newStartedAt > 0 ? newStartedAt : Date.now(),
          pausedAt: null
        };
      } else {
        // Pausing: Record when pause started
        updatedRound = {
          ...session.round,
          status: 'paused',
          pausedAt: Date.now()
        };
      }
    }

    updateSessionSettings(classId, { 
      status: nextStatus,
      round: updatedRound
    });
  };

  const handleEndRound = useCallback(async () => {
    try {
      await endRound(classId);
    } catch (err) {
      console.error('Error ending round from coach dashboard:', err);
    }
  }, [classId]);

  // Autonomous Watchdog: Ensure round ends automatically when duration expires, even if the banner is unmounted or tab is backgrounded
  useEffect(() => {
    if (session?.round?.status === 'active' && session?.status !== 'paused' && classId) {
      const sMs = parseStartedAt(session.round.startedAt);
      const dur = (Number(session.round.duration) || 0) + (Number(session.round.extraTimeAdded) || 0);
      if (sMs > 0 && dur > 0) {
        const checkExpiry = () => {
          if ((Date.now() - sMs) >= dur * 1000) {
            handleEndRound();
          }
        };

        checkExpiry();
        const intervalId = setInterval(checkExpiry, 1000);
        return () => clearInterval(intervalId);
      }
    }
  }, [session?.round?.status, session?.status, session?.round?.startedAt, session?.round?.duration, session?.round?.extraTimeAdded, handleEndRound, classId]);

    const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBulkPasteText(event.target.result);
    };
    reader.readAsText(file);
  };

const handleLoadLibrary = async () => {
    if (!bulkPasteText.trim()) {
      alert('Please paste some FEN or PGN text first.');
      return;
    }
    
    let items = [];
    if (bulkPasteText.includes('[Event')) {
      const parts = bulkPasteText.split(/(\[Event\s+"[^"]+"\])/g);
      let currentPgn = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part.startsWith('[Event')) {
          if (currentPgn) items.push(currentPgn);
          currentPgn = part;
        } else {
          currentPgn += '\n' + part;
        }
      }
      if (currentPgn) items.push(currentPgn);
    } else {
      const fenRegex = /([1-8rnbqkpRNBQKP]+\/){7}[1-8rnbqkpRNBQKP]+(?:\s+[wb](?:\s+[KkQq-]+(?:\s+(?:[a-h][1-8]|-)(?:\s+\d+\s+\d+)?)?)?)?/gi;
      const matches = bulkPasteText.match(fenRegex);
      if (matches && matches.length > 0) {
        items = matches.map(m => m.trim());
      } else {
        items = bulkPasteText.split(/[\r\n;]+/).map(s => s.trim()).filter(Boolean);
      }
    }
    
    if (items.length === 0) {
      alert('No valid puzzles found in the pasted text.');
      return;
    }
    
    const parsed = items.map((item, idx) => {
      const parsedData = parsePgnOrFen(item);
      const titleMatch = item.match(/\[Title\s+"([^"]+)"\]/) || item.match(/\[White\s+"([^"]+)"\]/);
      const title = titleMatch ? titleMatch[1] : `Puzzle #${idx + 1}`;
      
      let solution = '';
      try {
        const chess = new Chess();
        const fenTagMatch = item.match(/\[FEN\s+"([^"]+)"\]/i);
        if (fenTagMatch) {
          chess.load(fenTagMatch[1].trim());
        }
        chess.loadPgn(item);
        const history = chess.history();
        if (history && history.length > 0) {
          solution = history.join(' ');
        }
      } catch (e) {
        // Not a PGN or invalid moves
      }

      return {
        id: `lib_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        raw: item,
        fen: parsedData.fen,
        sideToMove: parsedData.sideToMove,
        title: title,
        solution: solution
      };
    });
    
    const currentLibrary = session?.customReviewLibrary || [];
    const updatedLibrary = [...currentLibrary, ...parsed];
    await saveCustomPuzzlesLibrary(classId, updatedLibrary);
    setBulkPasteText('');
    alert(`Successfully loaded ${parsed.length} puzzles into the class library!`);
  };

  const handleClearLibrary = async () => {
    if (confirm("Are you sure you want to clear the entire custom puzzle library for this class?")) {
      await saveCustomPuzzlesLibrary(classId, null);
    }
  };

  const handleAutoLoadNextTwo = () => {
    const library = session?.customReviewLibrary || [];
    if (library.length < 2) {
      alert("Please load at least 2 puzzles into the library first.");
      return;
    }
    
    let nextIndex1 = 0;
    let nextIndex2 = 1;
    
    if (selectedBoard2Id) {
      const idx = library.findIndex(p => p.id === selectedBoard2Id);
      if (idx !== -1) {
        nextIndex1 = (idx + 1) % library.length;
        nextIndex2 = (idx + 2) % library.length;
      }
    } else if (selectedBoard1Id) {
      const idx = library.findIndex(p => p.id === selectedBoard1Id);
      if (idx !== -1) {
        nextIndex1 = (idx + 1) % library.length;
        nextIndex2 = (idx + 2) % library.length;
      }
    }
    
    const b1 = library[nextIndex1];
    const b2 = library[nextIndex2];
    
    if (b1 && b2) {
      setSelectedBoard1Id(b1.id);
      setSelectedBoard2Id(b2.id);
      setBoard1Answer(b1.solution || '');
      setBoard2Answer(b2.solution || '');
    }
  };

  const handleLaunchCustomChallenge = async () => {
    const library = session?.customReviewLibrary && session.customReviewLibrary.length > 0
      ? session.customReviewLibrary
      : DEFAULT_CUSTOM_PUZZLE_SET;
      
    const b1 = library.find(p => p.id === selectedBoard1Id) || library[0] || {};
    const b2 = library.find(p => p.id === selectedBoard2Id) || library[1] || library[0] || {};
    
    setLoading(true);
    try {
      let duration = 0;
      if (isTimerMode) {
        if (timerPreset === 'custom') {
          const mins = parseInt(customMin, 10) || 0;
          const secs = parseInt(customSec, 10) || 0;
          duration = mins * 60 + secs;
        } else {
          duration = parseInt(timerPreset, 10) || 0;
        }
      }
      
      await resetRoundStats(classId);
      
      const newRoundNumber = (Number(session?.round?.number) || 0) + 1;
      
      await updateSessionSettings(classId, {
        difficulty: 'custom_review',
        sessionStarted: true,
        status: 'active',
        customPuzzle: null,
        round: {
          number: newRoundNumber,
          type: 'custom_review',
          startedAt: Date.now(),
          duration: duration,
          extraTimeAdded: 0,
          status: 'active',
          endedAt: null,
          customReviewPuzzles: {
            board1: {
              id: b1.id || 'custom_b1',
              title: b1.title || 'Board 1',
              fen: b1.fen || START_FEN,
              sideToMove: b1.sideToMove || 'white',
              reward: parseInt(board1Coins, 10) || 50,
              answer: (board1Answer || b1.solution || '').trim()
            },
            board2: {
              id: b2.id || 'custom_b2',
              title: b2.title || 'Board 2',
              fen: b2.fen || START_FEN,
              sideToMove: b2.sideToMove || 'white',
              reward: parseInt(board2Coins, 10) || 50,
              answer: (board2Answer || b2.solution || '').trim()
            }
          }
        }
      });
      
      setSessionActive(true);
    } catch (e) {
      console.error('Failed to launch custom challenge:', e);
      alert('Error launching challenge: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (studentId, boardKey, isCorrect, rewardCoins) => {
    try {
      await gradeCustomReviewAnswer(classId, studentId, boardKey, isCorrect, rewardCoins);
    } catch (e) {
      console.error('Failed to grade submission:', e);
    }
  };

  const handleAddTime = async (seconds) => {
    await addExtraTime(classId, seconds);
  };

  const handleStartNextRound = async () => {
    // Show settings panel again by setting round status to waiting
    await updateSessionSettings(classId, {
      status: 'waiting',
      round: {
        number: session?.round?.number || 0,
        status: 'waiting',
        startedAt: null,
        duration: 0,
        extraTimeAdded: 0,
        endedAt: null,
      }
    });
    setSessionActive(false);
  };

  const handleResetClick = () => {
    setResetInput('');
    setShowResetConfirm(true);
  };

  const handleDailyReset = async () => {
    if (!confirm("Are you sure you want to perform a Daily Progress Reset? This will reset all solved puzzle progress for the day, but students will keep all their coins and Pokémon companions.")) {
      return;
    }
    setLoading(true);
    try {
      await resetDailyProgress(classId);
      setShowResetConfirm(false);
      setSessionActive(false);
      setPreviewFen(START_FEN);
      setPreviewPuzzle(null);
    } catch (e) {
      console.error(e);
      alert("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (resetInput !== 'RESET') return;
    setLoading(true);
    try {
      await resetEntireSession(classId);
      setShowResetConfirm(false);
      setSessionActive(false);
      setPreviewFen(START_FEN);
      setPreviewPuzzle(null);
    } catch (e) {
      console.error(e);
      alert('Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/class/${classId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleSendPrivateHint = async (studentId, hintText) => {
    if (!hintText.trim()) return;
    try {
      await updateStudentStatus(classId, studentId, {
        privateHint: hintText,
        status: 'thinking',
      });
    } catch (e) {
      console.error('Failed to send private hint:', e);
    }
  };

  const handleGiftCoins = async (studentId, studentName, currentCoins) => {
    const amountStr = prompt(`How many coins would you like to gift to ${studentName}?`);
    if (amountStr === null) return;
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }
    try {
      await updateStudentStatus(classId, studentId, {
        coins: (currentCoins || 0) + amount
      });
    } catch (e) {
      console.error('Failed to gift coins:', e);
      alert('Error gifting coins.');
    }
  };

  const handleRenameStudent = async (studentId, currentName) => {
    const newName = prompt(`Rename student "${currentName}" to:`, currentName);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      alert('Please enter a valid student name.');
      return;
    }
    try {
      await renameStudent(classId, studentId, trimmed);
    } catch (e) {
      console.error('Failed to rename student:', e);
      alert('Error renaming student.');
    }
  };

  // Live stats & real-time online presence
  const onlineStudents = students.filter(s => isStudentOnline(s));
  const offlineStudents = students.filter(s => !isStudentOnline(s));
  const totalStudents = onlineStudents.length;
  const solvedThisPuzzle = onlineStudents.filter(s => s.status === 'solved').length;
  const solvedStudentsList = onlineStudents.filter(s => s.status === 'solved');
  const helpSeekingStudents = students.filter(s => s.status === 'help');
  const maxSolved = students.reduce((max, s) => Math.max(max, s.totalSolved || 0), 0);

  const currentBatch = session?.puzzleQueue || puzzleQueue || [];
  const currentPuzzleIndex = currentBatch.findIndex(p => p.id === previewPuzzle?.id);

  const handlePrevPuzzle = () => {
    if (currentBatch.length === 0) return;
    const prevIdx = currentPuzzleIndex > 0 ? currentPuzzleIndex - 1 : currentBatch.length - 1;
    const prevP = currentBatch[prevIdx];
    if (prevP) {
      setPreviewPuzzle(prevP);
      setPreviewFen(prevP.fen);
    }
  };

  const handleNextPuzzle = () => {
    if (currentBatch.length === 0) return;
    const nextIdx = currentPuzzleIndex < currentBatch.length - 1 ? currentPuzzleIndex + 1 : 0;
    const nextP = currentBatch[nextIdx];
    if (nextP) {
      setPreviewPuzzle(nextP);
      setPreviewFen(nextP.fen);
    }
  };

  const handleSendAnnouncement = async (textToUse) => {
    const msg = (textToUse !== undefined ? textToUse : announcementText).trim();
    if (!msg) return;
    setBroadcastLoading(true);
    try {
      await updateSessionSettings(classId, {
        coachAnnouncement: {
          text: msg,
          sentAt: Date.now(),
        },
        broadcastHint: msg,
      });
      setAnnouncementText('');
    } catch (e) {
      console.error('Failed to send announcement:', e);
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleClearAnnouncement = async () => {
    try {
      await updateSessionSettings(classId, {
        coachAnnouncement: null,
        broadcastHint: '',
      });
    } catch (e) {
      console.error('Failed to clear announcement:', e);
    }
  };

  const handleToggleFocusMode = async () => {
    try {
      const current = !!session?.isFocusMode;
      await updateSessionSettings(classId, { isFocusMode: !current });
    } catch (e) {
      console.error('Failed to toggle focus mode:', e);
    }
  };

  const handleAwardClassCoins = async (amount = 15) => {
    try {
      const targets = students.filter(s => isStudentOnline(s));
      const targetList = targets.length > 0 ? targets : students;
      if (targetList.length === 0) {
        alert('No students in class yet.');
        return;
      }
      for (const s of targetList) {
        const curCoins = s.coins || 0;
        const curRoundCoins = s.roundCoins || 0;
        await updateStudentStatus(classId, s.id, {
          coins: curCoins + amount,
          roundCoins: curRoundCoins + amount,
          notifications: [
            ...(s.notifications || []),
            { id: Date.now() + Math.random(), text: `🎁 Coach awarded you +${amount} bonus coins for great effort!` }
          ]
        });
      }
      await updateSessionSettings(classId, {
        coachAnnouncement: {
          text: `🎁 Coin Drop! Coach awarded +${amount} bonus coins to everyone!`,
          sentAt: Date.now()
        },
        broadcastHint: `🎁 Coin Drop! Coach awarded +${amount} bonus coins to everyone!`,
      });
    } catch (e) {
      console.error('Failed to award class coins:', e);
    }
  };

  const handleResolveHelp = async (studentId) => {
    try {
      await updateStudentStatus(classId, studentId, { status: 'thinking' });
    } catch (e) {
      console.error('Failed to resolve help:', e);
    }
  };

  const handleSendHelpHint = async (studentId, studentName) => {
    const hintMsg = prompt(`Enter a hint to send to ${studentName}:`, 'Look for checks, captures, and unprotected pieces!');
    if (!hintMsg || !hintMsg.trim()) return;
    try {
      const target = students.find(s => s.id === studentId);
      await updateStudentStatus(classId, studentId, {
        status: 'thinking',
        notifications: [
          ...(target?.notifications || []),
          { id: Date.now(), text: `💡 Coach Hint: ${hintMsg.trim()}` }
        ]
      });
    } catch (e) {
      console.error('Failed to send help hint:', e);
    }
  };

  const handleCopyLeaderboard = () => {
    if (students.length === 0) {
      alert('No students to copy.');
      return;
    }
    const sorted = [...students].sort((a, b) => (b.roundSolved || 0) - (a.roundSolved || 0));
    const lines = [
      `🏆 Class ${classId} Leaderboard (Round ${session?.round?.number || 1})`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...sorted.map((s, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        return `${medal} ${s.name}: ${s.roundSolved || 0} solved | ${s.coins || 0} coins`;
      }),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Generated by Chess Classroom Hub`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    alert('📋 Class leaderboard copied to clipboard!');
  };

  const handleCopyFen = (fenStr) => {
    if (!fenStr) return;
    navigator.clipboard.writeText(fenStr);
    alert('📋 FEN copied to clipboard!');
  };

  const diffConfig = DIFFICULTIES.find(d => d.value === difficulty) || DIFFICULTIES[1];

  const playerColor = previewPuzzle
    ? (previewPuzzle.sideToMove || (previewPuzzle.setupMove
        ? (previewPuzzle.fen?.split(' ')[1] === 'w' ? 'black' : 'white')
        : (previewPuzzle.fen?.split(' ')[1] === 'w' ? 'white' : 'black')))
    : 'white';

  // Filter students based on online tab and search query
  const filteredStudents = students
    .filter(s => {
      if (studentFilter === 'online' && !isStudentOnline(s)) return false;
      if (studentSearchQuery.trim()) {
        return s.name?.toLowerCase().includes(studentSearchQuery.trim().toLowerCase());
      }
      return true;
    });

  // Sort students for leaderboard with online students prioritized
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const aOnline = isStudentOnline(a);
    const bOnline = isStudentOnline(b);
    if (aOnline !== bOnline) return bOnline ? 1 : -1;
    const aSolved = a.roundSolved || 0;
    const bSolved = b.roundSolved || 0;
    if (bSolved !== aSolved) return bSolved - aSolved;
    if (aSolved > 0) {
      const aTime = a.roundLastSolvedAt || Infinity;
      const bTime = b.roundLastSolvedAt || Infinity;
      if (aTime !== bTime) return aTime - bTime;
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  const totalDuration = (Number(session?.round?.duration) || 0) + (Number(session?.round?.extraTimeAdded) || 0);
  const startMs = parseStartedAt(session?.round?.startedAt);
  // Authoritative round-over status from database (ensures frozen rankings snapshot is ready)
  const isRoundOver = session?.round?.status === 'ended' || session?.status === 'ended';

  const roundWinners = (session?.round?.status === 'ended' && Array.isArray(session?.round?.rankings))
    ? session.round.rankings
    : sortedStudents;

  return (
    <div style={styles.root}>
      {/* ── TOP HEADER ── */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={styles.logo}>♟</div>
          <div>
            <div style={styles.headerTitle}>Chess Puzzle Classroom</div>
            <div style={styles.headerSub}>
              Class Code: <strong style={{ color: 'var(--accent-primary)', letterSpacing: '0.1em' }}>{classId}</strong>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Real-time Who is Online Pill Button */}
          <button
            onClick={() => setShowOnlineModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: onlineStudents.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
              border: `1.5px solid ${onlineStudents.length > 0 ? '#10b981' : 'var(--border-color)'}`,
              color: onlineStudents.length > 0 ? '#10b981' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.85rem',
              transition: 'all 0.2s ease',
            }}
            title="Click to view all students currently online"
          >
            <span 
              style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: onlineStudents.length > 0 ? '#10b981' : '#64748b' 
              }} 
              className={onlineStudents.length > 0 ? 'pulse-active' : ''} 
            />
            <span>{onlineStudents.length} Online</span>
          </button>

          {/* Enable Browser Notification Button */}
          {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
            <button
              onClick={() => {
                Notification.requestPermission().then(perm => {
                  if (perm === 'granted') {
                    playStudentJoinNotification();
                  }
                });
              }}
              className="btn btn-secondary"
              style={{ ...styles.smallBtn, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b' }}
              title="Enable sound & desktop alerts when students request approval to enter"
            >
              <Bell size={13} />
              <span>Enable Alerts</span>
            </button>
          )}

          <button onClick={handleCopyLink} className="btn btn-secondary" style={styles.smallBtn}>
            {copiedLink ? '✅ Copied!' : '🔗 Copy Student Link'}
          </button>
          <button 
            onClick={handleResetClick} 
            className="btn btn-secondary" 
            style={{ ...styles.smallBtn, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <RefreshCw size={14} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} />
            Reset Class
          </button>
          <button 
            onClick={() => {
              if (confirm("Are you sure you want to exit the coach dashboard?")) {
                onLeave();
              }
            }} 
            className="btn btn-secondary" 
            style={styles.smallBtn}
          >
            Leave
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', margin: '0 2rem 1.5rem 2rem', paddingBottom: '0.2rem' }}>
        <button
          onClick={() => setActiveDashboardTab('round_manager')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeDashboardTab === 'round_manager' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeDashboardTab === 'round_manager' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '1rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🎮 Standard Rounds
        </button>
        <button
          onClick={() => setActiveDashboardTab('custom_challenge')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeDashboardTab === 'custom_challenge' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeDashboardTab === 'custom_challenge' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '1rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🃏 Custom PGN/FEN Challenges
        </button>
      </div>

      {/* ── ACTIVE ROUND TIMER BANNER ── */}
      {sessionActive && (session?.round?.status === 'active' || session?.round?.status === 'paused' || session?.status === 'paused') && (
        <div className="glass-panel animate-slide-down" style={{
          margin: '0 2rem 1.5rem 2rem',
          padding: '0.8rem 1.5rem',
          borderRadius: '16px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1.5px solid var(--accent-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: '0 8px 32px var(--shadow-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⏳</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                ROUND {session.round.number} ACTIVE ({session.round.type === 'custom_review' ? 'Coached Custom Challenge' : 'Standard Round'})
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Students are actively solving. You can manage settings or prepare the next round below.
              </div>
            </div>
          </div>

          {/* Compact Timer Display & Control Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <TimerDisplay
              startedAt={session.round.startedAt}
              duration={session.round.duration}
              extraTime={session.round.extraTimeAdded}
              status={session.round.status}
              onExpired={handleEndRound}
              size="compact"
              showControls={false}
            />

            {/* Quick Time Add Buttons */}
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleAddTime(60)}>
                +1m
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => handleAddTime(300)}>
                +5m
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handlePause}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                {session?.status === 'paused' ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
              </button>
              <button
                onClick={handleEndRound}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', color: 'hsl(0,70%,50%)', border: '1px solid hsl(0,70%,80%)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Square size={14} /> End Round
              </button>
            </div>

            {/* Auto-Validate Toggle in Header */}
            {session.round.type === 'custom_review' && (
              <button
                onClick={async () => {
                  const current = session?.autoValidate || false;
                  await updateSessionSettings(classId, { autoValidate: !current });
                }}
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  backgroundColor: session?.autoValidate ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                  border: `1px solid ${session?.autoValidate ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  color: session?.autoValidate ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                🤖 Auto-Validate: {session?.autoValidate ? 'ON' : 'OFF'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pending Student Approvals Alert with Sound & Actionable Notification */}
      {session?.pendingApprovals && session.pendingApprovals.length > 0 && (
        <div 
          className="glass-panel animate-slide-down" 
          style={{
            margin: '0 2rem 1.25rem 2rem',
            padding: '1rem 1.4rem',
            borderRadius: '16px',
            backgroundColor: 'rgba(245, 158, 11, 0.14)',
            border: '2px solid rgba(245, 158, 11, 0.5)',
            boxShadow: '0 8px 25px rgba(245, 158, 11, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '1rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🔔 {session.pendingApprovals.length} Student{session.pendingApprovals.length > 1 ? 's' : ''} Knocking at the Door!</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Only with your approval can students enter today's class.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => approveMultipleStudents(classId, session.pendingApprovals)}
                className="btn btn-accent"
                style={{ padding: '0.45rem 1.2rem', fontSize: '0.85rem', fontWeight: '800', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              >
                ✅ Approve All ({session.pendingApprovals.length})
              </button>
            </div>
          </div>

          {/* Individual student chips with quick 1-click approval */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
            {session.pendingApprovals.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  👤 {req.name}
                </span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button
                    onClick={() => approveStudentEntry(classId, req.id, req.name)}
                    className="btn btn-primary"
                    style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '5px', fontWeight: 'bold' }}
                    title={`Approve ${req.name}`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectStudentEntry(classId, req.id)}
                    className="btn btn-secondary"
                    style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '5px', color: '#ef4444' }}
                    title={`Reject ${req.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="coach-layout-grid">

        {/* ── LEFT: BOARD + CONTROLS ── */}
        <div style={styles.leftCol}>
          {activeDashboardTab === 'custom_challenge' ? (
            <div className="glass-panel" style={styles.card}>
              <h3 style={styles.cardTitle}>Coached Custom Challenge Builder</h3>
              
              {/* Custom Builder Sub-Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCustomBuilderSubTab('library')}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    borderBottom: customBuilderSubTab === 'library' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: customBuilderSubTab === 'library' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    padding: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  📥 Import & Library
                </button>
                <button
                  type="button"
                  onClick={() => setCustomBuilderSubTab('setup')}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    borderBottom: customBuilderSubTab === 'setup' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: customBuilderSubTab === 'setup' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    padding: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  ⚙️ Board Setup & Launch
                </button>
              </div>

              {/* Sub-Tab 1: Import & Library */}
              {customBuilderSubTab === 'library' && (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={styles.settingLabel}>📁 Bulk import FEN / PGN puzzles</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', marginBottom: '0.5rem' }}>
                      <label className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                        📥 Import File (.txt, .pgn, .fen)
                        <input 
                          type="file" 
                          accept=".txt,.pgn,.fen" 
                          onChange={handleFileUpload} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                    </div>
                    <textarea
                      value={bulkPasteText}
                      onChange={e => setBulkPasteText(e.target.value)}
                      placeholder="Paste one or more FENs/PGNs here..."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <button 
                        onClick={handleLoadLibrary}
                        className="btn btn-accent" 
                        style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        📥 Load to Library
                      </button>
                      {(session?.customReviewLibrary || []).length > 0 && (
                        <button 
                          onClick={handleClearLibrary}
                          className="btn" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                        >
                          🗑️ Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={styles.settingLabel}>📚 Loaded Library ({(session?.customReviewLibrary || []).length} puzzles)</span>
                    {!(session?.customReviewLibrary || []).length ? (
                      <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '0.4rem' }}>
                        No custom puzzles loaded yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem', maxHeight: '120px', overflowY: 'auto', paddingRight: '0.2rem' }} className="custom-scrollbar">
                        {(session.customReviewLibrary || []).map((p, idx) => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                              {idx + 1}. {p.title} ({p.sideToMove})
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              {p.fen.substring(0, 15)}...
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Setup Boards & Launch */}
              {customBuilderSubTab === 'setup' && (
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.8rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)' }}>BOARD 1 PUZZLE</label>
                      <select 
                        value={selectedBoard1Id} 
                        onChange={e => setSelectedBoard1Id(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 'bold', marginTop: '0.2rem', fontSize: '0.75rem' }}
                      >
                        <option value="">-- Choose Board 1 --</option>
                        {(session?.customReviewLibrary || []).map(p => (
                          <option key={p.id} value={p.id}>{p.title} ({p.sideToMove})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)' }}>BOARD 2 PUZZLE</label>
                      <select 
                        value={selectedBoard2Id} 
                        onChange={e => setSelectedBoard2Id(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 'bold', marginTop: '0.2rem', fontSize: '0.75rem' }}
                      >
                        <option value="">-- Choose Board 2 --</option>
                        {(session?.customReviewLibrary || []).map(p => (
                          <option key={p.id} value={p.id}>{p.title} ({p.sideToMove})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleAutoLoadNextTwo}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}
                  >
                    ➕ Auto-select Next 2 Puzzles
                  </button>

                  {selectedBoard1Id && selectedBoard2Id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                      <div style={{ display: 'flex', gap: '0.8rem' }}>
                        {/* Board 1 */}
                        <div style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800 }}>♟ Board 1</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <div>
                              <label style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)' }}>EXPECTED ANSWER</label>
                              <input 
                                type="text" 
                                value={board1Answer} 
                                onChange={e => setBoard1Answer(e.target.value)}
                                placeholder="e.g. Nf3" 
                                style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)' }}>REWARD</label>
                              <input 
                                type="number" 
                                value={board1Coins} 
                                onChange={e => setBoard1Coins(e.target.value)}
                                style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Board 2 */}
                        <div style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800 }}>♟ Board 2</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <div>
                              <label style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)' }}>EXPECTED ANSWER</label>
                              <input 
                                type="text" 
                                value={board2Answer} 
                                onChange={e => setBoard2Answer(e.target.value)}
                                placeholder="e.g. d4" 
                                style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)' }}>REWARD</label>
                              <input 
                                type="number" 
                                value={board2Coins} 
                                onChange={e => setBoard2Coins(e.target.value)}
                                style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timer settings */}
                      <div style={{ marginTop: '0.4rem' }}>
                        <span style={styles.settingLabel}>TIMER MODE</span>
                        <div style={styles.timerRow}>
                          <button
                            type="button"
                            onClick={() => setIsTimerMode(true)}
                            style={{
                              ...styles.timerToggleBtn,
                              backgroundColor: isTimerMode ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                              color: isTimerMode ? '#fff' : 'var(--text-primary)',
                              fontWeight: 'bold',
                              padding: '0.4rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            ⏰ Timed Round
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsTimerMode(false)}
                            style={{
                              ...styles.timerToggleBtn,
                              backgroundColor: !isTimerMode ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                              color: !isTimerMode ? '#fff' : 'var(--text-primary)',
                              fontWeight: 'bold',
                              padding: '0.4rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            ♾️ Untimed
                          </button>
                        </div>

                        {isTimerMode && (
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            {TIMER_PRESETS.map(preset => (
                              <button
                                type="button"
                                key={preset.value}
                                onClick={() => setTimerPreset(preset.value)}
                                style={{
                                  ...styles.presetBtn,
                                  backgroundColor: timerPreset === preset.value ? 'var(--bg-accent-subtle)' : 'var(--bg-secondary)',
                                  borderColor: timerPreset === preset.value ? 'var(--accent-primary)' : 'var(--border-color)',
                                  color: timerPreset === preset.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                                  padding: '0.3rem 0.5rem',
                                  fontSize: '0.7rem'
                                }}
                              >
                                {preset.emoji} {preset.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setTimerPreset('custom')}
                              style={{
                                ...styles.presetBtn,
                                backgroundColor: timerPreset === 'custom' ? 'var(--bg-accent-subtle)' : 'var(--bg-secondary)',
                                borderColor: timerPreset === 'custom' ? 'var(--accent-primary)' : 'var(--border-color)',
                                color: timerPreset === 'custom' ? 'var(--accent-primary)' : 'var(--text-primary)',
                                padding: '0.3rem 0.5rem',
                                fontSize: '0.7rem'
                              }}
                            >
                              ⚙️ Custom Time
                            </button>
                          </div>
                        )}

                        {isTimerMode && timerPreset === 'custom' && (
                          <div style={{ ...styles.customTimeRow, marginTop: '0.5rem' }}>
                            <input
                              type="number"
                              value={customMin}
                              onChange={e => setCustomMin(e.target.value)}
                              placeholder="Min"
                              style={{ ...styles.timeInput, padding: '0.3rem', fontSize: '0.75rem' }}
                            />
                            <span style={{ fontWeight: 'bold' }}>:</span>
                            <input
                              type="number"
                              value={customSec}
                              onChange={e => setCustomSec(e.target.value)}
                              placeholder="Sec"
                              style={{ ...styles.timeInput, padding: '0.3rem', fontSize: '0.75rem' }}
                            />
                          </div>
                        )}
                      </div>

                      {sessionActive && session?.round?.type === 'custom_review' && session?.round?.status === 'active' ? (
                        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1.5px solid #10b981', borderRadius: '10px', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>🟢 Coached Challenge Active!</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Round {session?.round?.number || 1})</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={handleEndRound}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#ef4444', borderColor: '#ef4444' }}
                            >
                              ⏹ End Challenge
                            </button>
                            <button
                              onClick={handleLaunchCustomChallenge}
                              disabled={loading}
                              className="btn btn-accent"
                              style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 800 }}
                            >
                              🔄 Restart / Apply
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={handleLaunchCustomChallenge}
                          disabled={loading}
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem', fontWeight: 800, borderRadius: '10px', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                        >
                          <Play size={16} />
                          {loading ? 'Preparing Challenge…' : '▶ Launch Coached Challenge'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Round Manager Tab
            sessionActive && session?.round?.status === 'active' ? (
              <div className="glass-panel" style={{ ...styles.card, padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>♟️</div>
                <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Standard Round Active</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  A standard round is currently running. You can view the live progress of students and rank updates on the right side of your dashboard.
                </p>
              </div>
            ) : (
              <div className="glass-panel" style={styles.card}>
                <h3 style={styles.cardTitle}>Configure Round</h3>

                {/* Difficulty */}
                <div style={{ marginBottom: '1.2rem' }}>
                  <span style={styles.settingLabel}>DIFFICULTY</span>
                  <div style={styles.diffRow}>
                    {DIFFICULTIES.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setDifficulty(d.value)}
                        style={{
                          ...styles.diffBtn,
                          background: difficulty === d.value ? d.color : 'var(--bg-tertiary)',
                          color: difficulty === d.value ? '#fff' : 'var(--text-primary)',
                          border: `2px solid ${difficulty === d.value ? d.color : 'var(--border-color)'}`,
                        }}
                      >
                        <span style={{ fontSize: '1.3rem' }}>{d.emoji}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer Settings */}
                <div style={{ marginBottom: '1.2rem' }}>
                  <span style={styles.settingLabel}>TIMER MODE</span>
                  <div style={styles.timerRow}>
                    <button
                      onClick={() => setIsTimerMode(true)}
                      style={{
                        ...styles.timerToggleBtn,
                        backgroundColor: isTimerMode ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: isTimerMode ? '#fff' : 'var(--text-primary)',
                        fontWeight: 'bold',
                      }}
                    >
                      ⏰ Timed Round
                    </button>
                    <button
                      onClick={() => setIsTimerMode(false)}
                      style={{
                        ...styles.timerToggleBtn,
                        backgroundColor: !isTimerMode ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: !isTimerMode ? '#fff' : 'var(--text-primary)',
                        fontWeight: 'bold',
                      }}
                    >
                      ♾️ Untimed / Manual
                    </button>
                  </div>

                  {isTimerMode && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      {TIMER_PRESETS.map(preset => (
                        <button
                          key={preset.value}
                          onClick={() => setTimerPreset(preset.value)}
                          style={{
                            ...styles.presetBtn,
                            backgroundColor: timerPreset === preset.value ? 'var(--bg-accent-subtle)' : 'var(--bg-secondary)',
                            borderColor: timerPreset === preset.value ? 'var(--accent-primary)' : 'var(--border-color)',
                            color: timerPreset === preset.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                          }}
                        >
                          {preset.emoji} {preset.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setTimerPreset('custom')}
                        style={{
                          ...styles.presetBtn,
                          backgroundColor: timerPreset === 'custom' ? 'var(--bg-accent-subtle)' : 'var(--bg-secondary)',
                          borderColor: timerPreset === 'custom' ? 'var(--accent-primary)' : 'var(--border-color)',
                          color: timerPreset === 'custom' ? 'var(--accent-primary)' : 'var(--text-primary)',
                        }}
                      >
                        ⚙️ Custom Time
                      </button>
                    </div>
                  )}

                  {isTimerMode && timerPreset === 'custom' && (
                    <div style={styles.customTimeRow}>
                      <input
                        type="number"
                        value={customMin}
                        onChange={e => setCustomMin(e.target.value)}
                        placeholder="Min"
                        style={styles.timeInput}
                      />
                      <span style={{ fontWeight: 'bold' }}>:</span>
                      <input
                        type="number"
                        value={customSec}
                        onChange={e => setCustomSec(e.target.value)}
                        placeholder="Sec"
                        style={styles.timeInput}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleStartSession}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 800, borderRadius: '12px', marginTop: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Play size={18} />
                  {loading ? 'Preparing Puzzles…' : '▶ Start Round'}
                </button>
              </div>
            )
          )}          {/* ── CLASSROOM GATES & ROSTER CONTROL ── */}
          <div className="glass-panel" style={{ ...styles.card, marginTop: '1rem' }}>
            <h3 style={styles.cardTitle}>
              <Users size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
              Classroom Gates & Roster
            </h3>

            {/* Quick Share Link button */}
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={handleCopyLink}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  fontSize: '0.82rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px dashed var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                }}
              >
                <span>🔗</span> {copiedLink ? 'Copied Student Link!' : 'Copy Student Join Link to Share'}
              </button>
            </div>

            {/* Gates Row */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem' }}>
              <button
                onClick={() => updateSessionSettings(classId, { isLobbyLocked: !session?.isLobbyLocked })}
                style={{
                  ...styles.gateBtn,
                  backgroundColor: session?.isLobbyLocked ? 'hsla(0, 75%, 50%, 0.15)' : 'hsla(145, 60%, 40%, 0.15)',
                  color: session?.isLobbyLocked ? 'hsl(0, 75%, 50%)' : 'hsl(145, 60%, 40%)',
                  border: `1px solid ${session?.isLobbyLocked ? 'hsl(0, 75%, 50%)' : 'hsl(145, 60%, 40%)'}`,
                }}
              >
                {session?.isLobbyLocked ? '🔒 Lobby Closed' : '🔓 Lobby Open'}
              </button>

              <button
                onClick={() => updateSessionSettings(classId, { isShopLocked: !session?.isShopLocked })}
                style={{
                  ...styles.gateBtn,
                  backgroundColor: session?.isShopLocked ? 'hsla(0, 75%, 50%, 0.15)' : 'hsla(145, 60%, 40%, 0.15)',
                  color: session?.isShopLocked ? 'hsl(0, 75%, 50%)' : 'hsl(145, 60%, 40%)',
                  border: `1px solid ${session?.isShopLocked ? 'hsl(0, 75%, 50%)' : 'hsl(145, 60%, 40%)'}`,
                }}
              >
                {session?.isShopLocked ? '🔒 Shop Disabled' : '🔓 Shop Enabled'}
              </button>

              <button
                onClick={() => updateSessionSettings(classId, { requireJoinApproval: session?.requireJoinApproval === false })}
                style={{
                  ...styles.gateBtn,
                  backgroundColor: session?.requireJoinApproval !== false ? 'hsla(145, 60%, 40%, 0.15)' : 'hsla(0, 75%, 50%, 0.15)',
                  color: session?.requireJoinApproval !== false ? 'hsl(145, 60%, 40%)' : 'hsl(0, 75%, 50%)',
                  border: `1px solid ${session?.requireJoinApproval !== false ? 'hsl(145, 60%, 40%)' : 'hsl(0, 75%, 50%)'}`,
                }}
              >
                {session?.requireJoinApproval !== false ? '✋ Join Approval Required' : '⚡ Auto-Approve Joins'}
              </button>

              <button
                onClick={async () => {
                  if (confirm("Reset ALL student coins in this classroom to 200 starting coins?")) {
                    await resetAllStudentCoins(classId, 200);
                    alert("All student coins have been reset to 200 🪙!");
                  }
                }}
                style={{
                  ...styles.gateBtn,
                  backgroundColor: 'hsla(38, 90%, 50%, 0.15)',
                  color: 'hsl(38, 90%, 40%)',
                  border: '1px solid hsl(38, 90%, 50%)',
                }}
                title="Reset all student coins to 200 starting balance"
              >
                🪙 Reset All Coins
              </button>
            </div>

            {/* Pending Approval Queue */}
            {session?.pendingApprovals && session.pendingApprovals.length > 0 && (
              <div style={{ marginBottom: '1rem', border: '1px solid hsla(38, 90%, 50%, 0.3)', borderRadius: '8px', background: 'hsla(38, 90%, 50%, 0.03)', padding: '0.75rem' }}>
                <span style={{ ...styles.settingLabel, color: 'hsl(38, 80%, 40%)', fontWeight: 'bold' }}>
                  ⏳ PENDING APPROVALS ({session.pendingApprovals.length})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {session.pendingApprovals.map((req) => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{req.name}</span>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          onClick={() => approveStudentEntry(classId, req.id, req.name)}
                          className="btn btn-primary"
                          style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectStudentEntry(classId, req.id)}
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', color: 'hsl(0, 75%, 50%)' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Roster manager */}
            <div>
              <span style={styles.settingLabel}>APPROVED ROSTER</span>
              
              {/* Manual add input row */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem' }}>
                <input
                  type="text"
                  placeholder="Enter name (or names separated by commas/newlines)..."
                  id="manual-student-input"
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      const value = e.target.value.trim();
                      if (value) {
                        const names = value.split(/[,\n\r\t;]+/).map(n => n.trim()).filter(Boolean);
                        const studentsToApprove = names.map((name, index) => ({
                          id: `std_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
                          name
                        }));
                        await approveMultipleStudents(classId, studentsToApprove);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={async () => {
                    const input = document.getElementById('manual-student-input');
                    const value = input?.value?.trim();
                    if (value) {
                      const names = value.split(/[,\n\r\t;]+/).map(n => n.trim()).filter(Boolean);
                      const studentsToApprove = names.map((name, index) => ({
                        id: `std_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
                        name
                      }));
                      await approveMultipleStudents(classId, studentsToApprove);
                      input.value = '';
                    }
                  }}
                  className="btn btn-accent"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}
                >
                  Add
                </button>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem', fontStyle: 'italic' }}>
                💡 Tip: Paste names separated by commas, semicolons, tabs, or newlines to add a batch!
              </span>

              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.4rem', paddingRight: '0.2rem' }}>
                {!(session?.roster || []).length ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No approved roster yet.</span>
                ) : (
                  session.roster.map((student) => (
                    <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.82rem', background: 'var(--bg-tertiary)' }}>
                      <span>{student.name}</span>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${student.name} from the roster?`)) {
                            removeStudentFromRoster(classId, student.id);
                          }
                        }}
                        style={{ border: 'none', background: 'transparent', color: 'hsl(0, 75%, 50%)', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── BATCHES / CLASSROOM SWITCHER ── */}
          <div className="glass-panel" style={{ ...styles.card, marginTop: '1rem' }}>
            <h3 style={styles.cardTitle}>
              <Users size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
              Switch Batches / Classrooms
            </h3>
            
            {/* Create inline new batch form */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <input
                type="text"
                placeholder="New batch code (e.g. LVL2ADV)"
                id="new-batch-code-input"
                maxLength={20}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const code = e.target.value.trim().toUpperCase();
                    if (code && code.length >= 2 && code.length <= 20) {
                      await handleCreateNewBatch(code);
                      e.target.value = '';
                    }
                  }
                }}
              />
              <button
                onClick={async () => {
                  const input = document.getElementById('new-batch-code-input');
                  const code = input?.value?.trim().toUpperCase();
                  if (code && code.length >= 2 && code.length <= 20) {
                    await handleCreateNewBatch(code);
                    input.value = '';
                  }
                }}
                className="btn btn-accent"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                Create
              </button>
            </div>

            {/* Scrollable list of active batches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '180px', overflowY: 'auto' }} className="custom-scrollbar">
              {activeSessionsList.map((code) => {
                const isCurrent = code === classId;
                return (
                  <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: isCurrent ? 'hsla(38, 90%, 50%, 0.1)' : 'var(--bg-secondary)', borderColor: isCurrent ? 'var(--accent-primary)' : 'var(--border-color)' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {code} {isCurrent && '✓'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      <button
                        onClick={() => handleCopyClassLink(code)}
                        style={{ padding: '2px 6px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                      >
                        {copiedCode === code ? 'Copied' : 'Link'}
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={() => onSwitchClass && onSwitchClass(code)}
                          style={{ padding: '2px 6px', fontSize: '0.72rem', borderRadius: '4px', border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer' }}
                        >
                          Switch
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClass(code)}
                        style={{ padding: '2px 6px', fontSize: '0.72rem', borderRadius: '4px', border: 'none', background: 'transparent', color: 'hsl(0,75%,50%)', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              {activeSessionsList.length > 0 && (
                <button
                  onClick={handleClearAllBatches}
                  className="btn"
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '0.35rem',
                    fontSize: '0.72rem',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  🗑️ Clear All Batches & Start Fresh
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── MIDDLE: COACH ASSISTANT & LIVE ROUND COMMAND CENTER (NO CHESSBOARD) ── */}
        <div style={styles.middleCol}>
          
          {/* 1. 🆘 Priority Student Help Desk (When students have clicked 'Ask Coach') */}
          {helpSeekingStudents.length > 0 && (
            <div 
              className="glass-panel animate-slide-down" 
              style={{
                ...styles.card,
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '2px solid rgba(239, 68, 68, 0.5)',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)',
                padding: '1rem 1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#ef4444', fontSize: '0.95rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🆘</span>
                  <span>Student Assistance Needed ({helpSeekingStudents.length})</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Students waiting for teacher hint
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {helpSeekingStudents.map(s => (
                  <div 
                    key={s.id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-secondary)',
                      padding: '0.5rem 0.8rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        👤 {s.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        (Puzzle #{s.totalSolved ? s.totalSolved + 1 : 1})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleSendHelpHint(s.id, s.name)}
                        className="btn btn-accent"
                        style={{ padding: '3px 9px', fontSize: '0.72rem', fontWeight: 700 }}
                      >
                        💡 Send Hint
                      </button>
                      <button
                        onClick={() => handleResolveHelp(s.id)}
                        className="btn btn-secondary"
                        style={{ padding: '3px 9px', fontSize: '0.72rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                      >
                        ✓ Assisted
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. ⚡ Coach Quick Action Toolbar (New Helping Tools) */}
          <div className="glass-panel" style={{ ...styles.card, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ ...styles.cardTitle, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>⚡ Coach Assistant Tools</span>
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Live Classroom Controls</span>
            </div>

            {/* Broadcast Classroom Announcement */}
            <div style={{ marginBottom: '1rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>📢 Broadcast Announcement to Students</span>
                </label>
                {session?.coachAnnouncement?.text && (
                  <button
                    onClick={handleClearAnnouncement}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✕ Clear Current
                  </button>
                )}
              </div>

              {/* Active Announcement Preview */}
              {session?.coachAnnouncement?.text && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#d97706', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span>Active on student screens: "{session.coachAnnouncement.text}"</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Type a message to all students..."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendAnnouncement(); }}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                  }}
                />
                <button
                  onClick={() => handleSendAnnouncement()}
                  disabled={broadcastLoading || !announcementText.trim()}
                  className="btn btn-accent"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem', fontWeight: 800 }}
                >
                  Send 📢
                </button>
              </div>

              {/* Quick Announcement Presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {[
                  '⏰ 2 minutes remaining! Finish your puzzle!',
                  '♟️ Look for Checks, Captures, and Threats!',
                  '🔥 Great concentration today! Keep it up!',
                  '🤫 Quiet solving time — calculate carefully!'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendAnnouncement(preset)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    className="hover-card"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Action Buttons Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
              {/* Award Class Coins */}
              <button
                onClick={() => handleAwardClassCoins(15)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                title="Award +15 coins to every online student"
              >
                <span>🎁 +15 🪙 to Class</span>
              </button>

              <button
                onClick={() => handleAwardClassCoins(25)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                title="Award +25 coins to every online student"
              >
                <span>⭐ +25 🪙 to Class</span>
              </button>

              {/* Focus Mode (Spell Freeze) */}
              <button
                onClick={handleToggleFocusMode}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 0.6rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  backgroundColor: session?.isFocusMode ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: session?.isFocusMode ? '#3b82f6' : 'var(--text-primary)',
                  borderColor: session?.isFocusMode ? '#3b82f6' : 'var(--border-color)',
                  fontWeight: session?.isFocusMode ? 800 : 600,
                }}
                title="Toggle student Pokémon spells on/off"
              >
                <span>{session?.isFocusMode ? '🛡️ Focus: Spells OFF' : '⚡ Spells: ON'}</span>
              </button>

              {/* Copy Leaderboard */}
              <button
                onClick={handleCopyLeaderboard}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                title="Copy formatted leaderboard to clipboard for WhatsApp or Email"
              >
                <span>📋 Copy Standings</span>
              </button>
            </div>
          </div>

          {/* 3. Main Center Content depending on tab */}
          {sessionActive && session?.round?.type === 'custom_review' ? (
            /* Custom Review Summary Cards (NO CHESSBOARD) */
            <div className="glass-panel" style={{ ...styles.card, padding: '1.25rem' }}>
              <h3 style={{ ...styles.cardTitle, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🧩 Active Custom Challenges
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {['board1', 'board2'].map(bk => {
                  const puzzle = session?.round?.customReviewPuzzles?.[bk];
                  if (!puzzle) return null;
                  const subsCount = students.filter(s => s.customReviewSubmissions?.[bk]?.status === 'submitted').length;
                  const correctCount = students.filter(s => s.customReviewSubmissions?.[bk]?.status === 'correct').length;
                  return (
                    <div key={bk} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
                          {bk === 'board1' ? 'Board 1' : 'Board 2'}: {puzzle.title}
                        </span>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '9999px', backgroundColor: puzzle.sideToMove === 'black' ? '#0f172a' : '#fff', color: puzzle.sideToMove === 'black' ? '#fff' : '#000', border: '1px solid var(--border-color)', fontWeight: 700 }}>
                          {puzzle.sideToMove === 'black' ? '⬛ Black to play' : '⬜ White to play'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>Expected:</strong> <code style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px' }}>{puzzle.answer || '(None)'}</code>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem', fontSize: '0.78rem' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>🪙 {puzzle.reward || 50} coins</span>
                        <span style={{ color: subsCount > 0 ? '#f59e0b' : 'var(--text-secondary)', fontWeight: 700 }}>
                          {subsCount} pending / {correctCount} correct
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyFen(puzzle.fen)}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.72rem', alignSelf: 'flex-start', marginTop: '0.2rem' }}
                      >
                        📋 Copy FEN
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeDashboardTab === 'custom_challenge' ? (
            /* Custom Challenge Builder Selected Specs (NO CHESSBOARD) */
            <div className="glass-panel" style={{ ...styles.card, padding: '1.25rem' }}>
              <h3 style={{ ...styles.cardTitle, margin: '0 0 1rem 0' }}>🧩 Custom Challenge Board Specifications</h3>
              {(!selectedBoard1Id && !selectedBoard2Id) ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Select Board 1 or Board 2 puzzles from the library in the left column to configure them.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  {[['board1', selectedBoard1Id, board1Coins, board1Answer], ['board2', selectedBoard2Id, board2Coins, board2Answer]].map(([bk, pid, coins, ans]) => {
                    if (!pid) return null;
                    const library = session?.customReviewLibrary || [];
                    const puzzle = library.find(p => p.id === pid);
                    if (!puzzle) return null;
                    return (
                      <div key={bk} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
                            {bk === 'board1' ? 'Board 1' : 'Board 2'}: {puzzle.title}
                          </span>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '9999px', backgroundColor: puzzle.sideToMove === 'black' ? '#0f172a' : '#fff', color: puzzle.sideToMove === 'black' ? '#fff' : '#000', border: '1px solid var(--border-color)', fontWeight: 700 }}>
                            {puzzle.sideToMove === 'black' ? '⬛ Black' : '⬜ White'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <strong>Answer:</strong> <code style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px' }}>{ans || puzzle.answer || '(None)'}</code>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>
                          Reward: 🪙 {coins} coins
                        </div>
                        <button
                          onClick={() => handleCopyFen(puzzle.fen)}
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', alignSelf: 'flex-start', marginTop: '0.2rem' }}
                        >
                          📋 Copy FEN
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 4. Active Puzzle & Class Performance Hub (NO CHESSBOARD) */}
              <div className="glass-panel" style={{ ...styles.card, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <span style={{ ...styles.badge, background: diffConfig.color }}>
                        {diffConfig.emoji} {diffConfig.label}
                      </span>
                      {previewPuzzle?.rating && (
                        <span style={{ ...styles.badge, background: 'hsl(38,90%,50%)', color: '#000', fontWeight: 800 }}>
                          ★ {previewPuzzle.rating}
                        </span>
                      )}
                      {previewPuzzle?.theme && (
                        <span style={{ ...styles.badge, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                          🏷️ {previewPuzzle.theme}
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: playerColor === 'black' ? '#0f172a' : '#f1f5f9',
                        color: playerColor === 'black' ? '#f8fafc' : '#0f172a',
                        border: '1px solid var(--border-color)',
                      }}>
                        {playerColor === 'black' ? '⬛ Black to Move' : '⬜ White to Move'}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {previewPuzzle?.title || (previewPuzzle?.id ? `Puzzle ${previewPuzzle.id.substring(0, 8)}` : 'No Puzzle Selected')}
                    </h3>
                  </div>

                  {/* Live Solved Meter */}
                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Class Solves
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981' }}>
                      {solvedThisPuzzle} / {totalStudents}
                    </div>
                  </div>
                </div>

                {/* Visual Live Solve Progress Bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                    <span>Classroom Completion Rate</span>
                    <span style={{ color: '#10b981', fontWeight: 800 }}>
                      {totalStudents > 0 ? Math.round((solvedThisPuzzle / totalStudents) * 100) : 0}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <div style={{
                      height: '100%',
                      width: `${totalStudents > 0 ? Math.round((solvedThisPuzzle / totalStudents) * 100) : 0}%`,
                      background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {/* Description / Tactical Theme */}
                {previewPuzzle?.description && (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', marginBottom: '0.9rem', fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                    💡 "{previewPuzzle.description}"
                  </div>
                )}

                {/* FEN Box with Copy */}
                {previewPuzzle?.fen && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>FEN:</strong> {previewPuzzle.fen}
                    </div>
                    <button
                      onClick={() => handleCopyFen(previewPuzzle.fen)}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                      title="Copy FEN to clipboard"
                    >
                      📋 Copy FEN
                    </button>
                  </div>
                )}

                {/* Solvers Chips */}
                {solvedStudentsList.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      ✅ Solved by:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {solvedStudentsList.map(s => (
                        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.72rem', fontWeight: 700 }}>
                          <span>✓</span> {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Navigation Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Puzzle {currentPuzzleIndex >= 0 ? currentPuzzleIndex + 1 : 1} of {currentBatch.length || 1}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={handlePrevPuzzle}
                      disabled={currentBatch.length <= 1}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      ◀ Prev Puzzle
                    </button>
                    <button
                      onClick={handleNextPuzzle}
                      disabled={currentBatch.length <= 1}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      Next Puzzle ▶
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Current Puzzle Batch List */}
              <div className="glass-panel" style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ ...styles.cardTitle, margin: 0 }}>
                    🧩 Current Puzzle Batch ({currentBatch.length})
                  </h3>
                  {loading && <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>Loading...</span>}
                </div>
                
                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.2rem' }}>
                  {!currentBatch.length ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                      No puzzles loaded in batch.
                    </span>
                  ) : (
                    currentBatch.map((p, index) => {
                      const isCurrentPreview = previewPuzzle?.id === p.id;
                      return (
                        <div
                          key={p.id || index}
                          onClick={() => {
                            setPreviewPuzzle(p);
                            setPreviewFen(p.fen);
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.5rem 0.6rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: `1px solid ${isCurrentPreview ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            background: isCurrentPreview ? 'var(--bg-accent-subtle)' : 'var(--bg-tertiary)',
                            color: isCurrentPreview ? 'var(--accent-primary)' : 'var(--text-primary)',
                            transition: 'all 0.15s ease',
                          }}
                          className="hover-card"
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden', marginRight: '0.5rem' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.82rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              #{index + 1}: {p.title || `Puzzle ${p.id.substring(0, 6)}`}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              Rating: {p.rating || 'N/A'} | {p.theme || 'mixed'}
                            </span>
                          </div>
                          {isCurrentPreview && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--accent-primary)', flexShrink: 0 }}>
                              Viewing 👀
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div style={styles.rightCol}>
          {sessionActive && session?.round?.type === 'custom_review' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
              {/* REVIEW (ANSWERS FROM STUDENTS) SHIFTED TO SCREEN RIGHT */}
              <div className="glass-panel" style={{ ...styles.card, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h3 style={{ ...styles.cardTitle, margin: '0 0 0.8rem 0' }}>📋 Student Answers Review</h3>
                
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <button
                    onClick={() => setActiveReviewBoardTab('board1')}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      borderBottom: activeReviewBoardTab === 'board1' ? '3px solid var(--accent-primary)' : 'none',
                      color: activeReviewBoardTab === 'board1' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      padding: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    ♟ Board 1 Subs ({students.filter(s => s.customReviewSubmissions?.board1?.status === 'submitted').length})
                  </button>
                  <button
                    onClick={() => setActiveReviewBoardTab('board2')}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      borderBottom: activeReviewBoardTab === 'board2' ? '3px solid var(--accent-primary)' : 'none',
                      color: activeReviewBoardTab === 'board2' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      padding: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    ♟ Board 2 Subs ({students.filter(s => s.customReviewSubmissions?.board2?.status === 'submitted').length})
                  </button>
                </div>

                {/* Expected metadata & mid-round editor display */}
                {(() => {
                  const activeBoardKey = activeReviewBoardTab;
                  const puzzleInfo = session?.round?.customReviewPuzzles?.[activeBoardKey];
                  if (!puzzleInfo) return null;
                  return (
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '0.8rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                        <span style={{ color: 'var(--accent-primary)' }}>🧩 {puzzleInfo.title}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: '#f59e0b' }}>🪙 {puzzleInfo.reward} Coins</span>
                          <button
                            onClick={() => setEditingActiveBoard(!editingActiveBoard)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: editingActiveBoard ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                              color: editingActiveBoard ? '#fff' : 'var(--text-primary)',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            {editingActiveBoard ? 'Close Edit' : '✏️ Edit FEN / Answer'}
                          </button>
                        </div>
                      </div>

                      {!editingActiveBoard ? (
                        <div style={{ marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          <div>
                            <strong>Expected Answer:</strong> <code style={{ fontSize: '0.8rem', color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px' }}>{puzzleInfo.answer || '(No answer set)'}</code>
                          </div>
                          <div style={{ wordBreak: 'break-all', opacity: 0.85, fontSize: '0.7rem' }}>
                            <strong>FEN:</strong> {puzzleInfo.fen} ({puzzleInfo.sideToMove === 'black' ? '⬛ Black to move' : '⬜ White to move'})
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.6rem' }}>
                          <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.75rem' }}>
                            EDIT ACTIVE {activeBoardKey === 'board1' ? 'BOARD 1' : 'BOARD 2'} PUZZLE
                          </div>
                          
                          <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>EXPECTED ANSWER</label>
                            <input
                              type="text"
                              value={activeAnswerInput}
                              onChange={e => setActiveAnswerInput(e.target.value)}
                              placeholder="e.g. Bc4 or Nc3 Bc4"
                              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 'bold' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>BOARD FEN / PGN POSITION</label>
                            <textarea
                              value={activeFenInput}
                              onChange={e => setActiveFenInput(e.target.value)}
                              placeholder="Paste FEN or PGN position..."
                              rows={2}
                              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.72rem', fontFamily: 'monospace', resize: 'vertical' }}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>COINS:</label>
                              <input
                                type="number"
                                value={activeRewardInput}
                                onChange={e => setActiveRewardInput(e.target.value)}
                                style={{ width: '60px', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 'bold' }}
                              />
                            </div>
                            <button
                              onClick={handleSaveActiveBoardEdits}
                              className="btn btn-accent"
                              style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem', fontWeight: 800 }}
                            >
                              💾 Save & Apply Changes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Submissions list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                  {(() => {
                    const activeBoardKey = activeReviewBoardTab;
                    const rewardCoins = session?.round?.customReviewPuzzles?.[activeBoardKey]?.reward || 50;
                    const submittedStudents = students.filter(s => s.customReviewSubmissions?.[activeBoardKey]);
                    
                    if (submittedStudents.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No student has submitted an answer for this board yet. ⏳
                        </div>
                      );
                    }
                    
                    return submittedStudents.map(student => {
                      const sub = student.customReviewSubmissions[activeBoardKey];
                      const statusColors = {
                        submitted: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#f59e0b', label: 'Pending' },
                        correct: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', text: '#10b981', label: 'Correct' },
                        incorrect: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#ef4444', label: 'Incorrect' }
                      };
                      const badge = statusColors[sub.status] || statusColors.submitted;
                      
                      return (
                        <div 
                          key={student.id} 
                          style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            padding: '0.8rem',
                            backgroundColor: 'var(--bg-secondary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{student.name}</span>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: badge.bg,
                              border: '1px solid ' + badge.border,
                              color: badge.text
                            }}>{badge.label}</span>
                          </div>
                          <div style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            border: '1px solid var(--border-color)',
                            wordBreak: 'break-all',
                            color: 'var(--text-primary)'
                          }}>
                            {sub.answer}
                          </div>
                          {sub.status === 'submitted' && (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                              <button
                                onClick={() => handleGradeSubmission(student.id, activeBoardKey, false, 0)}
                                className="btn"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 'bold',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#ef4444',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕ Incorrect
                              </button>
                              <button
                                onClick={() => handleGradeSubmission(student.id, activeBoardKey, true, rewardCoins)}
                                className="btn"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 'bold',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  color: '#10b981',
                                  cursor: 'pointer'
                                }}
                              >
                                ✓ Correct
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* SHORTENED STUDENT LIST/RANKING AREA AT THE BOTTOM */}
              <div className="glass-panel" style={{ ...styles.card, maxHeight: '200px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h4 style={{ ...styles.cardTitle, margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>
                  👥 Student Progress Checklist ({onlineStudents.length} online)
                </h4>
                <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                  {students.map(s => {
                    const b1Sub = s.customReviewSubmissions?.board1;
                    const b2Sub = s.customReviewSubmissions?.board2;
                    const getIcon = (sub) => {
                      if (!sub) return '⚪';
                      if (sub.status === 'submitted') return '🟡';
                      if (sub.status === 'correct') return '🟢';
                      return '🔴';
                    };
                    const online = isStudentOnline(s);
                    return (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.2rem', borderBottom: '1px dashed var(--border-color)', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: online ? 700 : 400, opacity: online ? 1 : 0.6 }}>
                          {s.name} {online ? '🟢' : '⚫'}
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.72rem' }}>
                          <span title="Board 1">B1: {getIcon(b1Sub)}</span>
                          <span title="Board 2">B2: {getIcon(b2Sub)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : activeDashboardTab === 'custom_challenge' ? (
            /* Shortened classroom roster for Builder mode */
            <div className="glass-panel" style={{ ...styles.card, height: '100%', maxHeight: '600px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={styles.cardTitle}>👥 Classroom Roster ({onlineStudents.length} online)</h3>
              <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                {students.map(s => {
                  const online = isStudentOnline(s);
                  return (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.2rem', borderBottom: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: online ? 700 : 400, opacity: online ? 1 : 0.6 }}>
                        {s.name} {online ? '🟢' : '⚫'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🪙 {s.coins || 0} total</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ ...styles.card, height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ ...styles.cardTitle, margin: 0 }}>
                  <Users size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
                  Students ({onlineStudents.length} online)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {maxSolved > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      🏆 Max: {maxSolved}
                    </div>
                  )}
                </div>
              </div>

              {/* 🟢 Who is Online Real-Time Status Strip & Filter */}
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: onlineStudents.length > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: onlineStudents.length > 0 ? '#10b981' : '#64748b' }} className={onlineStudents.length > 0 ? 'pulse-active' : ''} />
                    <span>Who is Online ({onlineStudents.length} of {students.length})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => setStudentFilter('all')}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: studentFilter === 'all' ? 'var(--accent-primary)' : 'transparent',
                        color: studentFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      All ({students.length})
                    </button>
                    <button
                      onClick={() => setStudentFilter('online')}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: studentFilter === 'online' ? '#10b981' : 'transparent',
                        color: studentFilter === 'online' ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      🟢 Online ({onlineStudents.length})
                    </button>
                  </div>
                </div>

                {onlineStudents.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    No students currently active online.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {onlineStudents.map(s => (
                      <span
                        key={s.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#10b981',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Search Filter */}
              {students.length > 0 && (
                <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search student name..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                    }}
                  />
                  {studentSearchQuery && (
                    <button
                      onClick={() => setStudentSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

            {students.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👥</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                  No students yet.<br />Share the class link to get started!
                </p>
                <button onClick={handleCopyLink} className="btn btn-accent" style={{ marginTop: '1rem', padding: '0.6rem 1.2rem' }}>
                  🔗 Copy Student Link
                </button>
              </div>
            ) : (
              <div style={styles.studentList}>
                {sortedStudents.map((s, i) => {
                  const solved = s.totalSolved || 0;
                  const maxBar = Math.max(maxSolved, 1);
                  const pct = Math.round((solved / maxBar) * 100);
                  
                  // Render profile title / border flairs
                  const equippedBorder = s.equippedItems?.border || null;
                  const equippedTitle = s.equippedItems?.title || null;
                  const hasGoldBorder = equippedBorder === 'flair_gold_border';
                  const hasDiamondBorder = equippedBorder === 'flair_diamond_border';

                  let titlePrefix = '';
                  if (equippedTitle === 'flair_crown') titlePrefix = '👑 ';
                  else if (equippedTitle === 'flair_lightning') titlePrefix = '⚡ ';

                  return (
                    <div 
                      key={s.id} 
                      style={{
                        ...styles.studentCard,
                        boxShadow: hasGoldBorder 
                          ? '0 0 10px #f59e0b' 
                          : hasDiamondBorder 
                            ? '0 0 15px #3b82f6' 
                            : 'none',
                        border: hasGoldBorder 
                          ? '2.5px solid #f59e0b' 
                          : hasDiamondBorder 
                            ? '2.5px solid #3b82f6' 
                            : '1px solid var(--border-color)',
                      }}
                      className={hasDiamondBorder ? 'diamond-card-border' : ''}
                    >
                      <div style={styles.studentRank}>
                        {i === 0 && (s.coins > 0 || s.roundCoins > 0) ? '🥇' : i === 1 && (s.coins > 0 || s.roundCoins > 0) ? '🥈' : i === 2 && (s.coins > 0 || s.roundCoins > 0) ? '🥉' : `#${i + 1}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: hasGoldBorder ? '#f59e0b' : 'var(--text-primary)' }}>
                              {titlePrefix}{s.name}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '2px 7px',
                                borderRadius: '9999px',
                                fontSize: '0.68rem',
                                fontWeight: 'bold',
                                backgroundColor: isStudentOnline(s) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                                color: isStudentOnline(s) ? '#10b981' : '#94a3b8',
                                border: `1px solid ${isStudentOnline(s) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: isStudentOnline(s) ? '#10b981' : '#94a3b8',
                                }}
                                className={isStudentOnline(s) ? 'pulse-active' : ''}
                              />
                              {isStudentOnline(s) ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <span style={styles.statusPill}>{STATUS_ICON[s.status] || '🤔'} {STATUS_LABEL[s.status] || 'Solving'}</span>
                            <span style={{ ...styles.badge, background: 'var(--accent-primary)', color: '#fff', fontSize: '0.7rem' }}>
                              {solved} solved
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div style={styles.progressTrack}>
                          <div style={{ ...styles.progressFill, width: `${pct}%` }} />
                        </div>
                        {/* Coin economy row */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <span>🪙 <strong>{s.coins || 0}</strong> total</span>
                            {sessionActive && <span>Round: +{s.roundCoins || 0} 🪙</span>}
                            <span>🔥 {s.streak || 0} streak</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              onClick={() => handleRenameStudent(s.id, s.name)}
                              style={{
                                border: 'none',
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#3b82f6',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                              title="Rename student"
                            >
                              ✏️ Rename
                            </button>
                            <button
                              onClick={() => handleGiftCoins(s.id, s.name, s.coins)}
                              style={{
                                border: 'none',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#d97706',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              🎁 Gift
                            </button>
                          </div>
                        </div>

                        {sessionActive && session?.round?.type === 'custom_review' && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.72rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>Custom Review:</span>
                            {['board1', 'board2'].map(bk => {
                              const sub = s.customReviewSubmissions?.[bk];
                              let color = 'var(--text-secondary)';
                              let label = 'No Sub';
                              let icon = '⚪';
                              if (sub) {
                                if (sub.status === 'submitted') { color = '#f59e0b'; label = 'Pending'; icon = '🟡'; }
                                else if (sub.status === 'correct') { color = '#10b981'; label = 'Correct'; icon = '🟢'; }
                                else if (sub.status === 'incorrect') { color = '#ef4444'; label = 'Incorrect'; icon = '🔴'; }
                              }
                              return (
                                <span 
                                  key={bk} 
                                  style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    border: `1px solid ${sub ? (sub.status === 'submitted' ? '#f59e0b' : sub.status === 'correct' ? '#10b981' : '#ef4444') : 'var(--border-color)'}`,
                                    color: color,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 800
                                  }}
                                >
                                  {bk === 'board1' ? 'B1' : 'B2'}: {icon} {label}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Equipped Companion & Active Team of 6 */}
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-secondary)', alignItems: 'center', flexWrap: 'wrap' }}>
                          {s.equippedPokemon && (
                            <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              🐾 {s.equippedPokemon.toUpperCase()}
                            </span>
                          )}
                          {s.activeTeam && s.activeTeam.length > 0 && (
                            <div style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Team:</span>
                              {s.activeTeam.map((pokeId) => (
                                <span key={pokeId} style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border-color)', fontSize: '0.68rem' }} title={pokeId}>
                                  {pokeId.substring(0, 3).toUpperCase()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Active Puzzle Info & Private Hint Controls */}
                        {s.currentPuzzleTitle && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.6rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                            <span>🧩 Puzzle #{s.currentPuzzleIndex + 1 || 1}: <strong>{s.currentPuzzleTitle}</strong></span>
                            {s.mixedBandLabel && (
                              <span style={{ marginLeft: '0.4rem', fontStyle: 'italic', color: 'var(--accent-primary)' }}>
                                ({s.mixedBandLabel})
                              </span>
                            )}
                          </div>
                        )}

                        {s.status === 'help' && s.currentPuzzleSolution && (
                          <div style={{ background: 'hsla(35, 90%, 50%, 0.05)', border: '1px solid hsla(35, 90%, 50%, 0.2)', borderRadius: '8px', padding: '0.6rem', marginTop: '0.5rem' }}>
                            <div style={{ fontSize: '0.78rem', color: 'hsl(35, 80%, 35%)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                              <span>💡 Answer: {s.currentPuzzleSolution}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                              <input
                                type="text"
                                placeholder="Type a hint & press Enter..."
                                id={`hint-input-${s.id}`}
                                style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSendPrivateHint(s.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const input = document.getElementById(`hint-input-${s.id}`);
                                  if (input) {
                                    handleSendPrivateHint(s.id, input.value);
                                    input.value = '';
                                  }
                                }}
                                className="btn btn-accent"
                                style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                Send
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Session stats footer */}
            {sessionActive && students.length > 0 && (
              <div style={styles.statsFooter}>
                <div style={styles.statBox}>
                  <div style={styles.statNum}>{students.filter(s => s.status === 'solved').length}</div>
                  <div style={styles.statLbl}>Solved Now</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statNum}>{students.filter(s => s.status === 'thinking').length}</div>
                  <div style={styles.statLbl}>Thinking</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statNum}>{students.reduce((t, s) => t + (s.totalSolved || 0), 0)}</div>
                  <div style={styles.statLbl}>Total Solves</div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* ── ROUND WINNER OVERLAY ── */}
      {isRoundOver && Number(dismissedRoundNum) !== Number(session?.round?.number || 1) && (
        <div style={styles.winnerOverlay} className="modal-backdrop">
          <div style={styles.winnerModal} className="glass-panel scale-up-anim">
            <span style={{ fontSize: '3rem' }}>🏆</span>
            <h2 style={styles.winnerTitle}>Round {session?.round?.number || 1} Completed!</h2>
            
            {/* Podium display */}
            <div style={styles.podium}>
              {/* 2nd place */}
              {roundWinners[1] && (roundWinners[1].roundCoins > 0 || roundWinners[1].roundSolved > 0) && (
                <div style={{ ...styles.podiumStep, ...styles.stepSecond }}>
                  <span style={styles.podiumMedal}>🥈</span>
                  <span style={styles.podiumName}>{roundWinners[1].name}</span>
                  <span style={styles.podiumPoints}>{roundWinners[1].roundSolved || 0} Solved</span>
                  <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>+{roundWinners[1].roundCoins || 0} 🪙</span>
                  <div style={styles.silverPedestal}>2</div>
                </div>
              )}

              {/* 1st place */}
              {roundWinners[0] && (roundWinners[0].roundCoins > 0 || roundWinners[0].roundSolved > 0) && (
                <div style={{ ...styles.podiumStep, ...styles.stepFirst }}>
                  <span style={styles.podiumMedal}>🥇</span>
                  <span style={styles.podiumName}>{roundWinners[0].name}</span>
                  <span style={styles.podiumPoints}>{roundWinners[0].roundSolved || 0} Solved</span>
                  <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>+{roundWinners[0].roundCoins || 0} 🪙</span>
                  <div style={styles.goldPedestal}>1</div>
                </div>
              )}

              {/* 3rd place */}
              {roundWinners[2] && (roundWinners[2].roundCoins > 0 || roundWinners[2].roundSolved > 0) && (
                <div style={{ ...styles.podiumStep, ...styles.stepThird }}>
                  <span style={styles.podiumMedal}>🥉</span>
                  <span style={styles.podiumName}>{roundWinners[2].name}</span>
                  <span style={styles.podiumPoints}>{roundWinners[2].roundSolved || 0} Solved</span>
                  <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>+{roundWinners[2].roundCoins || 0} 🪙</span>
                  <div style={styles.bronzePedestal}>3</div>
                </div>
              )}
            </div>

            {/* List rankings */}
            <div style={styles.rankingsList} className="custom-scrollbar">
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                ROUND LEADERBOARD
              </h4>
              {roundWinners.map((s, index) => (
                <div key={s.id} style={styles.rankingRow}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', width: '24px' }}>#{index + 1}</span>
                    <span style={{ fontWeight: '700' }}>{s.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontWeight: 'bold' }}>
                    <span>🧩 {s.roundSolved || 0} solved</span>
                    <span style={{ color: '#f59e0b' }}>🪙 +{s.roundCoins || 0}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.8rem', width: '100%' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.95rem', borderRadius: '12px', fontWeight: 'bold' }} 
                onClick={() => {
                  handleDismissCoachStandings();
                }}
              >
                Close
              </button>
              <button 
                className="btn btn-primary" 
                style={{ ...styles.nextRoundBtn, flex: 1, margin: 0 }} 
                onClick={handleStartNextRound}
              >
                Start Next Round
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET CLASSROOM CONFIRMATION MODAL ── */}
      {showResetConfirm && (
        <div style={styles.winnerOverlay} className="modal-backdrop">
          <div style={{ ...styles.resetModal, maxWidth: '480px' }} className="glass-panel scale-up-anim">
            <span style={{ fontSize: '2.5rem' }}>🔄</span>
            <h3 style={{ ...styles.winnerTitle, color: 'var(--text-primary)', marginTop: '0.5rem' }}>Classroom Reset Options</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', margin: '1.25rem 0', textAlign: 'left' }}>
              {/* Option 1: Daily Reset */}
              <div style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🟢</span> Option 1: Fresh Daily Start
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Resets daily solved puzzle progress, index counts, streaks, and round status back to 0. 
                  <strong> Students KEEP their companions (Pokémon), overall coins, XP, levels, and shop inventory.</strong>
                </p>
                <button 
                  className="btn btn-primary"
                  style={{ backgroundColor: '#10b981', borderColor: '#059669', color: '#fff', padding: '0.5rem', fontWeight: 800, fontSize: '0.85rem', borderRadius: '8px', marginTop: '0.2rem' }}
                  onClick={handleDailyReset}
                  disabled={loading}
                >
                  Apply Daily Reset
                </button>
              </div>

              {/* Option 2: Nuclear Reset */}
              <div style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>⚠️</span> Option 2: Nuclear Reset
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Completely wipes the entire classroom. Deletes all students and kicks them to the landing page. 
                  <strong> Wipes all coins and companions.</strong>
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                  <input
                    type="text"
                    value={resetInput}
                    onChange={e => setResetInput(e.target.value)}
                    placeholder="Type RESET to authorize"
                    style={{ ...styles.resetInput, flex: 1, margin: 0, padding: '0.5rem', fontSize: '0.85rem', height: 'auto', border: '1px solid #ef4444' }}
                  />
                  <button 
                    className="btn btn-danger" 
                    style={{ backgroundColor: '#ef4444', borderColor: '#dc2626', color: '#fff', padding: '0.5rem 1rem', fontWeight: 800, fontSize: '0.85rem', borderRadius: '8px' }}
                    onClick={handleConfirmReset}
                    disabled={resetInput !== 'RESET' || loading}
                  >
                    Nuclear Reset
                  </button>
                </div>
              </div>
            </div>

            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', fontWeight: 'bold' }}
              onClick={() => setShowResetConfirm(false)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── WHO IS ONLINE MODAL ── */}
      {showOnlineModal && (
        <div style={styles.winnerOverlay} onClick={() => setShowOnlineModal(false)}>
          <div
            className="glass-panel scale-up-anim"
            style={{
              ...styles.winnerModal,
              maxWidth: '460px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
              <h3 style={{ ...styles.cardTitle, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '1.15rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} className="pulse-active" />
                Who is Online ({onlineStudents.length})
              </h3>
              <button
                onClick={() => setShowOnlineModal(false)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem', padding: '0 4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ width: '100%', maxHeight: '380px', overflowY: 'auto' }} className="custom-scrollbar">
              {onlineStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💤</div>
                  No students are currently active online.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {onlineStudents.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} className="pulse-active" />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Active now</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
                        <span style={styles.statusPill}>{STATUS_ICON[s.status] || '🤔'} {STATUS_LABEL[s.status] || 'Solving'}</span>
                        <span style={{ fontWeight: 'bold' }}>🪙 {s.coins || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.25rem', width: '100%' }}>
              <button
                onClick={() => setShowOnlineModal(false)}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.6rem', fontWeight: 'bold', borderRadius: '8px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING ENTRY REQUEST TOASTS ── */}
      {entryToasts.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          maxWidth: '380px',
          width: '100%',
        }}>
          {entryToasts.map(toast => (
            <div
              key={toast.id}
              className="scale-up-anim glass-panel"
              style={{
                padding: '0.9rem 1.1rem',
                borderRadius: '14px',
                backgroundColor: 'var(--bg-secondary)',
                border: '2px solid #f59e0b',
                boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                  🔔
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {toast.name} wants to enter!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Waiting for your approval
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    approveStudentEntry(classId, toast.studentId, toast.name);
                    setEntryToasts(prev => prev.filter(t => t.id !== toast.id));
                  }}
                  className="btn btn-primary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800, borderRadius: '6px' }}
                >
                  Approve
                </button>
                <button
                  onClick={() => setEntryToasts(prev => prev.filter(t => t.id !== toast.id))}
                  style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.85rem 1.5rem',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    boxShadow: '0 2px 8px var(--shadow-color)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  logo: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  headerTitle: {
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 800,
    fontSize: '1.15rem',
    color: 'var(--text-primary)',
  },
  headerSub: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    marginTop: '0.1rem',
  },
  smallBtn: {
    padding: '0.4rem 0.9rem',
    fontSize: '0.82rem',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minWidth: 0,
  },
  middleCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minWidth: 0,
    overflow: 'hidden',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '500px',
    minWidth: 0,
  },
  card: {
    padding: '1.25rem',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
  },
  cardTitle: {
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 700,
    fontSize: '1rem',
    marginBottom: '0.75rem',
    color: 'var(--text-primary)',
  },
  settingLabel: {
    fontSize: '0.75rem',
    fontWeight: '800',
    letterSpacing: '1px',
    color: 'var(--text-secondary)',
    marginBottom: '0.4rem',
    display: 'block',
  },
  diffRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.6rem',
  },
  diffBtn: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.7rem 0.5rem',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontFamily: 'Outfit, sans-serif',
  },
  timerRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.8rem',
  },
  timerToggleBtn: {
    flex: 1,
    padding: '0.6rem',
    fontSize: '0.82rem',
    fontWeight: 'bold',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    transition: 'all 0.2s',
  },
  gateBtn: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  timerToggleRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.8rem',
  },
  toggleBtn: {
    flex: 1,
    fontSize: '0.82rem',
    padding: '0.5rem',
    borderRadius: '8px',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.4rem',
  },
  presetBtn: {
    border: 'none',
    padding: '0.5rem 0.2rem',
    fontSize: '0.8rem',
    fontWeight: '700',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background-color 0.2s',
  },
  customTimeRow: {
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'center',
    marginTop: '0.6rem',
  },
  timeInput: {
    width: '60px',
    padding: '0.4rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.55rem',
    borderRadius: '20px',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#fff',
  },
  studentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 280px)',
    paddingRight: '0.25rem',
  },
  studentCard: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '10px',
    boxSizing: 'border-box',
  },
  studentRank: {
    width: '32px',
    textAlign: 'center',
    fontWeight: 800,
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    paddingTop: '0.15rem',
  },
  statusPill: {
    fontSize: '0.72rem',
    padding: '0.15rem 0.45rem',
    borderRadius: '20px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
  progressTrack: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: 'var(--border-color)',
    overflow: 'hidden',
    marginTop: '0.2rem',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, hsl(220,80%,56%), hsl(280,70%,60%))',
    transition: 'width 0.4s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1rem',
  },
  statsFooter: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border-color)',
  },
  statBox: {
    flex: 1,
    textAlign: 'center',
    padding: '0.6rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '8px',
  },
  statNum: {
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 800,
    fontSize: '1.4rem',
    color: 'var(--accent-primary)',
  },
  statLbl: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    marginTop: '0.1rem',
  },

  // Leaderboard / Winner Modal Styles
  winnerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },
  winnerModal: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '2rem',
    width: '90%',
    maxWidth: '520px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  winnerTitle: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '1.5rem',
    fontWeight: '800',
    margin: '0.5rem 0 1.5rem 0',
  },
  podium: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: '0.6rem',
    width: '100%',
    height: '180px',
    marginBottom: '1.5rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--border-color)',
  },
  podiumStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  stepFirst: {
    height: '100%',
    justifyContent: 'flex-end',
  },
  stepSecond: {
    height: '80%',
    justifyContent: 'flex-end',
  },
  stepThird: {
    height: '65%',
    justifyContent: 'flex-end',
  },
  podiumMedal: {
    fontSize: '2rem',
  },
  podiumName: {
    fontWeight: '800',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    width: '100%',
    textAlign: 'center',
  },
  podiumPoints: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#f59e0b',
  },
  goldPedestal: {
    backgroundColor: '#ffd700',
    color: '#000',
    width: '100%',
    height: '70px',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: '900',
  },
  silverPedestal: {
    backgroundColor: '#c0c0c0',
    color: '#000',
    width: '100%',
    height: '50px',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: '900',
  },
  bronzePedestal: {
    backgroundColor: '#cd7f32',
    color: '#fff',
    width: '100%',
    height: '35px',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: '900',
  },
  rankingsList: {
    width: '100%',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1.5rem',
  },
  rankingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0.8rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    fontSize: '0.85rem',
  },
  nextRoundBtn: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: '800',
    borderRadius: '12px',
  },

  // Reset Modal specific styles
  resetModal: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '2rem',
    width: '90%',
    maxWidth: '380px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    textAlign: 'center',
  },
  resetDesc: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: '0.5rem 0 1.2rem 0',
  },
  resetInput: {
    width: '100%',
    maxWidth: '220px',
    padding: '0.5rem',
    borderRadius: '8px',
    border: '2px solid #ef4444',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    marginBottom: '1.5rem',
  },
  confirmActions: {
    display: 'flex',
    gap: '0.8rem',
    width: '100%',
    justifyContent: 'center',
  }
};
