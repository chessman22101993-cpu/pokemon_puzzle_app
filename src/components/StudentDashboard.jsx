import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { parseStartedAt } from '../utils/timerUtils';
import { 
  listenToSession, 
  listenToStudent, 
  updateStudentStatus, 
  listenToStudents,
  purchasePokemon,
  openMysteryBox,
  feedBerry,
  equipPokemon,
  purchaseShopItem,
  equipShopItem,
  triggerSkillOnStudent,
  stealCoinsFromStudent,
  submitCustomReviewAnswer,
  purchaseFootballCard,
  openFootballBoosterPack,
  dismissRoundOverlay,
  endRound,
  requestClassroomEntry,
  isStudentApprovedForToday,
} from '../firebase/db';
import { getNextPuzzle } from '../utils/puzzleApi';
import ChessboardWrapper from './ChessboardWrapper';
import PokemonCompanion from './PokemonCompanion';
import PokemonCollection from './PokemonCollection';
import MysteryBox from './MysteryBox';
import RewardShop from './RewardShop';
import FootballCardShop from './FootballCardShop';
import TimerDisplay from './TimerDisplay';
import ChessboardAnimationCanvas from './ChessboardAnimationCanvas';
import { rollMysteryBox, POKEMON_CATALOG, handlePokemonImageError } from '../data/pokemonData';
import { rollFootballBoosterPack } from '../data/footballCardsData';
import { SHOP_ITEMS } from '../data/shopItems';
import { PuzzleEngine, getStudentBoardOrientation } from '../utils/chessEngine';
import { playCorrectMove, playWrongMove, playPuzzleSolved, playApplause } from '../utils/soundEffects';
import { playSpellSound } from '../utils/spellSounds';
import PollAppTab from './PollAppTab';
import { PUZZLES } from '../data/puzzles';
import { Zap, CheckCircle, Lock, AlertCircle, Eye, ShoppingBag, Volume2, VolumeX, Trophy, Clock, BarChart2 } from 'lucide-react';

// Starting position FEN
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const getAchievementDescription = (achName) => {
  const d = {
    'First Puzzle': 'Solved your very first puzzle. Welcome to the board!',
    'Puzzle Explorer': 'Solved 5 puzzles in this session. Keep exploring!',
    'Speed Monster': 'Solved a puzzle in under 5 seconds! Outstanding! ⚡',
    'Lightning Kid': 'Solved in under 10 seconds. Super fast! 🚀',
    'Calculation Genius': 'Navigated a long multi-move sequence perfectly! 🧠',
    'Future Grand Master': 'Solved 10 puzzles. A rising star! 🌟',
  };
  return d[achName] || 'A glorious milestone on your chess journey.';
};

export default function StudentDashboard({ classId, student, onLeave }) {
  const [session, setSession] = useState(null);
  const [syncedStudent, setSyncedStudent] = useState(() => {
    let initial = student;
    if (typeof window !== 'undefined') {
      try {
        const savedSession = localStorage.getItem(`student_session_${classId}`);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          initial = { ...student, ...parsed };
        }
        const savedIdx = localStorage.getItem(`student_puzzle_index_${classId}_${student.id}`);
        if (savedIdx !== null && !isNaN(Number(savedIdx))) {
          initial = {
            ...initial,
            currentPuzzleIndex: Math.max(initial.currentPuzzleIndex || 0, Number(savedIdx), initial.roundSolved || 0)
          };
        }
      } catch (e) {}
    }
    return initial;
  });
  
  // Real-time student list (needed for round winner podium calculations)
  const [students, setStudents] = useState([]);

  // Ref to always hold the latest syncedStudent value to prevent stale closures
  const syncedStudentRef = useRef(syncedStudent);
  useEffect(() => {
    syncedStudentRef.current = syncedStudent;
  }, [syncedStudent]);

  // Board state
  const [boardPosition, setBoardPosition] = useState(START_FEN);
  const [activePuzzle, setActivePuzzle] = useState(null);
  const [puzzleEngine, setPuzzleEngine] = useState(null);
  const [isWrongMove, setIsWrongMove] = useState(false);
  const [successSolved, setSuccessSolved] = useState(false);
  const [incorrectMoveText, setIncorrectMoveText] = useState('');

  // Hints
  const [catSpeechOverride, setCatSpeechOverride] = useState('');

  // Modals
  const [showPocket, setShowPocket] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showMystery, setShowMystery] = useState(false);
  const [showFootballCardShop, setShowFootballCardShop] = useState(false);
  
  // Auto-close shop modals if Coach locks the shop
  useEffect(() => {
    if (session?.isShopLocked) {
      setShowShop(false);
      setShowMystery(false);
      setShowFootballCardShop(false);
    }
  }, [session?.isShopLocked]);
  const [dismissedRoundNum, setDismissedRoundNum] = useState(() => {
    try {
      return sessionStorage.getItem(`dismissed_round_${classId}`) || null;
    } catch (e) {
      return null;
    }
  });

  // Reset dismissed round tracker when a new round is active so podium always displays upon round end
  useEffect(() => {
    if (session?.round?.status === 'active') {
      setDismissedRoundNum(null);
      try {
        sessionStorage.removeItem(`dismissed_round_${classId}`);
      } catch (e) {}
    }
  }, [session?.round?.status, session?.round?.number, classId]);

  const handleDismissStandings = () => {
    const currentRoundNum = session?.round?.number || 1;
    setDismissedRoundNum(currentRoundNum);
    try {
      sessionStorage.setItem(`dismissed_round_${classId}`, String(currentRoundNum));
    } catch (e) {}
  };

  // Gamification toasts
  const [coinToasts, setCoinToasts] = useState([]);
  const [achievementToasts, setAchievementToasts] = useState([]);

  // Reset alert state
  const [isResetDetected, setIsResetDetected] = useState(false);

  // Puzzle tracking refs
  const attemptCount = useRef(0);
  const puzzleStartTime = useRef(Date.now());
  const solvedPuzzleIds = useRef(new Set());
  const sessionPuzzleQueue = useRef([]); // puzzle queue received from coach session
  const currentPuzzleIndex = useRef((() => {
    let idx = 0;
    if (typeof window !== 'undefined') {
      try {
        const val = localStorage.getItem(`student_puzzle_index_${classId}_${student.id}`);
        if (val !== null && !isNaN(Number(val))) idx = Number(val);
      } catch (e) {}
    }
    return Math.max(idx, student?.currentPuzzleIndex || 0, student?.roundSolved || 0);
  })());  // which index in the queue this student is on
  const currentRoundNumberRef = useRef(null); // track last round number to auto-reset on new rounds
  const currentRoundStatusRef = useRef(null); // track last round status to detect when round becomes active
  const handlePuzzleSolvedRef = useRef(null);

  const [maxBoardWidth, setMaxBoardWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 660;
      if (window.innerWidth >= 768) return Math.min(640, window.innerWidth - 48);
      return Math.max(260, window.innerWidth - 20);
    }
    return 660;
  });

  // Audio mute controls
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chess_mute_audio') === 'true';
    }
    return false;
  });

  const toggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    localStorage.setItem('chess_mute_audio', nextVal ? 'true' : 'false');
  };

  // Active Skills targeting states
  const [targetingSkill, setTargetingSkill] = useState(null); // { pokemonId, skill }
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [customSolved, setCustomSolved] = useState(false);

  // Stonewall spell state & hooks
  const [stonewallPuzzle, setStonewallPuzzle] = useState(null);
  useEffect(() => {
    if (syncedStudent?.stonewalled) {
      if (!stonewallPuzzle) {
        setCatSpeechOverride("🧱 Oh no! You've been Stonewalled! Summoning an Expert challenge...");
        getNextPuzzle('mixed', 'expert', solvedPuzzleIds.current).then(next => {
          if (next) {
            next.isStonewall = true;
            setStonewallPuzzle(next);
          }
        });
      }
    } else {
      setStonewallPuzzle(null);
    }
  }, [syncedStudent?.stonewalled, stonewallPuzzle]);

  useEffect(() => {
    if (syncedStudent?.stonewalled && stonewallPuzzle) {
      setActivePuzzle(stonewallPuzzle);
      setBoardPosition(stonewallPuzzle.fen);
      setSuccessSolved(false);
      setIsWrongMove(false);
      setIncorrectMoveText('');
      attemptCount.current = 0;
      puzzleStartTime.current = Date.now();
      
      const engine = new PuzzleEngine({
        puzzle: stonewallPuzzle,
        onCorrectMove: () => {
          setBoardPosition(engine.getFen());
          setCatSpeechOverride('Nice! Keep going!');
          playCorrectMove();
        },
        onSolved: () => {
          setBoardPosition(engine.getFen());
          playPuzzleSolved();
          handlePuzzleSolved(stonewallPuzzle, currentPuzzleIndex.current);
        },
        onIncorrectMove: () => {
          setIsWrongMove(true);
          playWrongMove();
          setIncorrectMoveText('Oops, that is not correct. Try again!');
          attemptCount.current += 1;
        },
        onSetupComplete: (newFen) => {
          setBoardPosition(newFen);
        },
      });
      setPuzzleEngine(engine);
      setCatSpeechOverride(`🧱 Stonewalled! Solve this Expert challenge (Rating: ${stonewallPuzzle.rating || '2400+'}) to break the wall!`);
    }
  }, [stonewallPuzzle]);

  // Real-time clock for status effect countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Coached Custom Challenges local states & grader feedback listener
  const [board1Text, setBoard1Text] = useState('');
  const [board2Text, setBoard2Text] = useState('');
  const [feedbackModal, setFeedbackModal] = useState({ show: false, title: '', message: '' });

  const lastSubRef = useRef({});
  useEffect(() => {
    const subs = syncedStudent?.customReviewSubmissions || {};
    ['board1', 'board2'].forEach(bk => {
      const prev = lastSubRef.current[bk];
      const curr = subs[bk];
      if (curr && curr.status !== prev?.status) {
        if (curr.status === 'correct') {
          const rewardCoins = session?.round?.customReviewPuzzles?.[bk]?.reward || 50;
          try {
            playPuzzleSolved();
          } catch (e) {}
          setFeedbackModal({
            show: true,
            title: '🎉 Correct Answer!',
            message: `Your answer for ${bk === 'board1' ? 'Board 1' : 'Board 2'} is correct! Well done! +${rewardCoins} coins 🪙`
          });
        } else if (curr.status === 'incorrect') {
          try {
            playWrongMove();
          } catch (e) {}
          setFeedbackModal({
            show: true,
            title: '❌ Incorrect Answer',
            message: `Your answer for ${bk === 'board1' ? 'Board 1' : 'Board 2'} is incorrect. Please try again!`
          });
        }
      }
    });
    lastSubRef.current = JSON.parse(JSON.stringify(subs));
  }, [syncedStudent?.customReviewSubmissions, session?.round?.customReviewPuzzles]);

  const isFrozen = syncedStudent?.activeEffects?.freeze && syncedStudent.activeEffects.freeze.until > currentTime;
  const isSmoked = syncedStudent?.activeEffects?.smokescreen && syncedStudent.activeEffects.smokescreen.until > currentTime;
  const isParalyzed = syncedStudent?.activeEffects?.paralyze && syncedStudent.activeEffects.paralyze.until > currentTime;
  const isWatered = syncedStudent?.activeEffects?.waterblast && syncedStudent.activeEffects.waterblast.until > currentTime;
  const isWind = syncedStudent?.activeEffects?.wind && syncedStudent.activeEffects.wind.until > currentTime;
  const isSleeping = syncedStudent?.activeEffects?.sleep && syncedStudent.activeEffects.sleep.until > currentTime;

  const remainingSkips = syncedStudent?.skipUsed 
    ? (syncedStudent?.extraSkips || 0) 
    : (1 + (syncedStudent?.extraSkips || 0));

  const [fireSweepActive, setFireSweepActive] = useState(false);
  const lastSmokeTime = useRef(0);
  useEffect(() => {
    const smoke = syncedStudent?.activeEffects?.smokescreen;
    if (smoke && smoke.until > Date.now() && smoke.until !== lastSmokeTime.current) {
      lastSmokeTime.current = smoke.until;
      setFireSweepActive(true);
      const timer = setTimeout(() => setFireSweepActive(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [syncedStudent?.activeEffects?.smokescreen]);

  // Real-time spell sounds listener for incoming attacks
  const lastActiveEffects = useRef({});
  useEffect(() => {
    const effects = syncedStudent?.activeEffects || {};
    const old = lastActiveEffects.current;

    if (effects.freeze?.until > Date.now() && effects.freeze.until !== old.freeze?.until) {
      playSpellSound('ice');
    }
    if (effects.paralyze?.until > Date.now() && effects.paralyze.until !== old.paralyze?.until) {
      playSpellSound('lightning');
    }
    if (effects.smokescreen?.until > Date.now() && effects.smokescreen.until !== old.smokescreen?.until) {
      playSpellSound('fire');
    }
    if (effects.waterblast?.until > Date.now() && effects.waterblast.until !== old.waterblast?.until) {
      playSpellSound('water');
    }
    if (effects.wind?.until > Date.now() && effects.wind.until !== old.wind?.until) {
      playSpellSound('wind');
    }
    if (effects.sleep?.until > Date.now() && effects.sleep.until !== old.sleep?.until) {
      playSpellSound('sleep');
    }

    lastActiveEffects.current = {
      freeze: { until: effects.freeze?.until || 0 },
      paralyze: { until: effects.paralyze?.until || 0 },
      smokescreen: { until: effects.smokescreen?.until || 0 },
      waterblast: { until: effects.waterblast?.until || 0 },
      wind: { until: effects.wind?.until || 0 },
      sleep: { until: effects.sleep?.until || 0 },
    };
  }, [syncedStudent?.activeEffects]);

  const totalDuration = (Number(session?.round?.duration) || 0) + (Number(session?.round?.extraTimeAdded) || 0);
  const startMs = parseStartedAt(session?.round?.startedAt);
  // Authoritative round-over status from database (prevents local client clock skew from killing rounds prematurely)
  const isRoundOver = session?.round?.status === 'ended' || session?.status === 'ended';

  // Real-time notifications checker (for stolen coins alerts)
  useEffect(() => {
    const list = syncedStudent?.notifications || [];
    if (list.length > 0) {
      const last = list[list.length - 1];
      const toastId = Date.now();
      setCoinToasts(prev => [...prev, { id: toastId, text: last.text, isNegative: true }]);
      setTimeout(() => setCoinToasts(prev => prev.filter(t => t.id !== toastId)), 4000);

      // Clear notifications so they aren't parsed again
      updateStudentStatus(classId, student.id, { notifications: [] });
    }
  }, [syncedStudent?.notifications]);

  // Dynamically calculate board size for PC (660px fixed), tablet, and mobile
  useEffect(() => {
    const calculateMaxSize = () => {
      const vw = window.innerWidth;
      if (vw >= 1024) {
        // Standard PC / Laptop: 660px
        setMaxBoardWidth(660);
      } else if (vw >= 768) {
        // Tablets (iPad / iPad Air: 768px - 1023px): up to 640px with breathing room
        setMaxBoardWidth(Math.min(640, Math.floor(vw - 48)));
      } else {
        // Mobile phones (320px - 767px): cleanly fills screen without horizontal overflow
        setMaxBoardWidth(Math.max(260, Math.floor(vw - 20)));
      }
    };

    calculateMaxSize();
    window.addEventListener('resize', calculateMaxSize);
    return () => window.removeEventListener('resize', calculateMaxSize);
  }, []);

  // Play applause when the round is completed/podium is active
  useEffect(() => {
    if (session?.round?.status === 'ended') {
      playApplause();
    }
  }, [session?.round?.status]);

  // ── Listen to session ──
  useEffect(() => {
    const unsubSession = listenToSession(classId, (data) => {
      if (data) {
        setSession(data);
        
        // Boot student ONLY if coach explicitly locked the lobby AND student is not in approved list or roster
        const isLobbyLocked = !!data.isLobbyLocked;
        const inApproved = (data.approvedStudents || []).includes(student.id);
        const inRoster = (data.roster || []).some(r => r.id === student.id);

        if (isLobbyLocked && !inApproved && !inRoster) {
          localStorage.removeItem(`student_session_${classId}`);
          onLeave();
          return;
        }

        if (data.status === 'reset') {
          setIsResetDetected(true);
          localStorage.removeItem(`student_session_${classId}`);
          setTimeout(() => {
            onLeave();
          }, 3000);
          return;
        }

        // Store the puzzle queue from session into ref when it arrives
        if (data.puzzleQueue && data.puzzleQueue.length > 0) {
          sessionPuzzleQueue.current = data.puzzleQueue;
        }
        if (data.status === 'ended') {
          setBoardPosition(START_FEN);
          setActivePuzzle(null);
          setPuzzleEngine(null);
          setCatSpeechOverride('Great work today! The round has ended. 🎉');
        }
      }
    });

    const unsubSelf = listenToStudent(classId, student.id, (selfData) => {
      if (selfData) {
        setSyncedStudent(selfData);
        try {
          localStorage.setItem(`student_session_${classId}`, JSON.stringify(selfData));
          if (selfData.currentPuzzleIndex !== undefined && selfData.currentPuzzleIndex !== null) {
            localStorage.setItem(`student_puzzle_index_${classId}_${student.id}`, String(selfData.currentPuzzleIndex));
          }
        } catch (e) {}
        if (selfData.privateHint) {
          setCatSpeechOverride(`Coach: "${selfData.privateHint}"`);
        }
      }
    });

    const unsubStudents = listenToStudents(classId, (list) => {
      setStudents(list);
    });

    updateStudentStatus(classId, student.id, { status: 'thinking' });

    return () => {
      if (typeof unsubSession === 'function') unsubSession();
      if (typeof unsubSelf === 'function') unsubSelf();
      if (typeof unsubStudents === 'function') unsubStudents();
      updateStudentStatus(classId, student.id, { status: 'offline' });
    };
  }, [classId, student.id, onLeave]);

  // Keep-alive heartbeat every 15s to maintain accurate online status, and mark offline on close
  useEffect(() => {
    const heartbeat = setInterval(() => {
      updateStudentStatus(classId, student.id, {
        lastActive: Date.now()
      });
    }, 15000);

    const handleBeforeUnload = () => {
      updateStudentStatus(classId, student.id, { status: 'offline' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [classId, student.id]);

  // Auto-request entry if not approved for today
  useEffect(() => {
    if (session && !isStudentApprovedForToday(syncedStudent, session, student.id)) {
      const isAlreadyPending = (session.pendingApprovals || []).some(p => p.id === student.id);
      if (!isAlreadyPending) {
        requestClassroomEntry(classId, syncedStudent?.name || student.name, student.id);
      }
    }
  }, [session, syncedStudent, student.id, student.name, classId]);

  // ── Core: load puzzle at a specific index from the session queue ──
  const loadPuzzleAtIndex = useCallback((idx) => {
    if (syncedStudent?.stonewalled && stonewallPuzzle) {
      return;
    }
    const queue = sessionPuzzleQueue.current;
    if (!queue || queue.length === 0) return;

    const puzzle = queue[idx % queue.length];
    if (!puzzle) return;
    
    currentPuzzleIndex.current = idx;

    try {
      localStorage.setItem(`student_puzzle_index_${classId}_${student.id}`, String(idx));
      const savedSession = localStorage.getItem(`student_session_${classId}`);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        parsed.currentPuzzleIndex = idx;
        localStorage.setItem(`student_session_${classId}`, JSON.stringify(parsed));
      }
    } catch (e) {}

    setActivePuzzle(puzzle);
    setBoardPosition(puzzle.fen);
    setSuccessSolved(false);
    setIsWrongMove(false);
    setIncorrectMoveText('');
    attemptCount.current = 0;
    puzzleStartTime.current = Date.now();

    setSyncedStudent(prev => ({
      ...prev,
      currentPuzzleIndex: idx,
    }));

    updateStudentStatus(classId, student.id, {
      status: 'thinking',
      requestedHelpText: '',
      privateHint: '',
      currentPuzzleIndex: idx,
      currentPuzzleTitle: puzzle.title || puzzle.description || 'Tactics',
      currentPuzzleSolution: puzzle.solution ? (Array.isArray(puzzle.solution) ? puzzle.solution.join(', ') : puzzle.solution) : '',
      currentPuzzleFen: puzzle.fen,
    });

    // Build engine
    const engine = new PuzzleEngine({
      puzzle,
      onCorrectMove: () => {
        setBoardPosition(engine.getFen());
        setCatSpeechOverride('Nice! Keep going!');
        playCorrectMove();
      },
      onSolved: () => {
        setBoardPosition(engine.getFen());
        playPuzzleSolved();
        if (handlePuzzleSolvedRef.current) {
          handlePuzzleSolvedRef.current(puzzle, idx);
        }
      },
      onIncorrectMove: () => {
        setIsWrongMove(true);
        playWrongMove();
        setTimeout(() => setIsWrongMove(false), 500);
        attemptCount.current += 1;

        const currentData = syncedStudentRef.current || {};
        const team = currentData.activeTeam || ['togepi'];

        // Shield check
        const shieldPokes = team.map(tId => POKEMON_CATALOG.find(p => p.id === tId)).filter(p => p && p.skill && p.skill.id === 'shield');
        let penaltyBlocked = false;
        let blockingPokeName = '';
        for (const sp of shieldPokes) {
          const chance = sp.skill.params?.chance || 0.40;
          if (Math.random() < chance) {
            penaltyBlocked = true;
            blockingPokeName = sp.name;
            break;
          }
        }

        if (penaltyBlocked) {
          setCatSpeechOverride(`${blockingPokeName} blocked the coin penalty with its shield! 🛡️⚡`);
          setIncorrectMoveText('Incorrect move! Penalty Blocked! 🛡️');
          setTimeout(() => setIncorrectMoveText(''), 2500);
          updateStudentStatus(classId, student.id, { 
            status: 'wrong',
          });
          return;
        }
        
        // Deduct coins on wrong answer (floor at 0). Penalty is 10 coins after 20 solves, otherwise 5.
        const totalSolvedVal = currentData.totalSolved || 0;
        const penaltyAmount = totalSolvedVal >= 20 ? 10 : 5;
        const oldCoins = currentData.coins || 0;
        const newCoins = Math.max(0, oldCoins - penaltyAmount);
        
        const toastId = Date.now();
        setCoinToasts(prev => [...prev, { id: toastId, text: `-${penaltyAmount} 🪙 (Wrong move)`, isNegative: true }]);
        setTimeout(() => setCoinToasts(prev => prev.filter(t => t.id !== toastId)), 2500);

        setSyncedStudent(prev => ({
          ...prev,
          coins: newCoins,
          roundStreak: 0,
          status: 'wrong'
        }));
        
        updateStudentStatus(classId, student.id, { 
          status: 'wrong', 
          coins: newCoins,
          roundStreak: 0,
        });

        setIncorrectMoveText(`Incorrect move! Try again (-${penaltyAmount} 🪙)`);
        setTimeout(() => setIncorrectMoveText(''), 2500);
      },
      onSetupComplete: (newFen) => {
        setBoardPosition(newFen);
      },
    });

    setPuzzleEngine(engine);
  }, [classId, student.id]);

  // ── Handle move ──
  const handleMovePiece = (source, target) => {
    if (successSolved || !puzzleEngine || session?.status === 'paused' || isRoundOver) return false;
    const res = puzzleEngine.makeMove(source, target);
    if (res.success) {
      setBoardPosition(puzzleEngine.getFen());
      if (res.hasOpponentReply) {
        res.opponentMovePromise.then(() => setBoardPosition(puzzleEngine.getFen()));
      }
      return true;
    }
    return false;
  };

  // ── Puzzle solved: Coins, achievements, auto-advance ──
  const handlePuzzleSolved = useCallback(async (solvedPuzzle, solvedIdx) => {
    if (isRoundOver) return;
    setSuccessSolved(true);
    updateStudentStatus(classId, student.id, { status: 'solved' });
    solvedPuzzleIds.current.add(solvedPuzzle.id);

    // Coin Calculation
    const currentStudent = syncedStudentRef.current || {};
    const currentAchievements = currentStudent.achievements || [];
    const newAchievements = [];
    const team = currentStudent.activeTeam || ['togepi'];

    // 1. Mudkip underdog check (if in bottom 3 round rankings)
    let isUnderdog = false;
    if (students && students.length >= 4) {
      const sortedBySolved = [...students].sort((a, b) => (b.roundSolved || 0) - (a.roundSolved || 0));
      const myPos = sortedBySolved.findIndex(s => s.id === student.id);
      if (myPos !== -1 && myPos >= sortedBySolved.length - 3) {
        isUnderdog = true;
      }
    }

    // 2. Teammate passive boosts
    let activeBoost = 0;
    const elapsed = (Date.now() - puzzleStartTime.current) / 1000;
    const speedBonus = elapsed <= 10;

    let gainedCoins = 0;
    let newTotal = currentStudent.totalSolved || 0;
    let newRoundSolved = currentStudent.roundSolved || 0;
    let newRoundStreak = currentStudent.roundStreak || 0;
    let finalAchievements = currentAchievements;
    let toastText = '';

    if (solvedPuzzle.isCustom) {
      gainedCoins = solvedPuzzle.rewardCoins || 50;
      toastText = `+${gainedCoins} 🪙 (Challenge Reward! 🏆)`;
    } else {
      const boostPokes = team.map(tId => POKEMON_CATALOG.find(p => p.id === tId)).filter(p => p && p.skill && p.skill.id === 'coinBoost');
      boostPokes.forEach(bp => {
        const bonus = bp.skill.params?.bonus || 0;
        const speedBonusVal = bp.skill.params?.speedBonus || 0;
        activeBoost += bonus;
        if (speedBonus && speedBonusVal) {
          activeBoost += speedBonusVal;
        }
      });

      const underdogPokes = team.map(tId => POKEMON_CATALOG.find(p => p.id === tId)).filter(p => p && p.skill && p.skill.id === 'underdog');
      if (isUnderdog && underdogPokes.length > 0) {
        activeBoost += 4;
      }

      gainedCoins = 15 + activeBoost;
      if (speedBonus) gainedCoins += 5;

      newRoundStreak = (currentStudent.roundStreak || 0) + 1;
      const isStreakMilestone = newRoundStreak > 0 && newRoundStreak % 5 === 0;
      if (isStreakMilestone) {
        let streakBonus = 10;
        // Piplup Pride streak multiplier
        const multiplierPokes = team.map(tId => POKEMON_CATALOG.find(p => p.id === tId)).filter(p => p && p.skill && p.skill.id === 'streakMaster');
        if (multiplierPokes.length > 0) {
          const mult = multiplierPokes[0].skill.params?.multiplier || 1.2;
          streakBonus = Math.round(streakBonus * mult);
        }
        gainedCoins += streakBonus;
      }

      newTotal += 1;
      newRoundSolved += 1;

      // Achievements
      if (currentAchievements.length === 0) newAchievements.push('First Puzzle');
      if (newTotal >= 5 && !currentAchievements.includes('Puzzle Explorer')) newAchievements.push('Puzzle Explorer');
      if (elapsed <= 5 && !currentAchievements.includes('Speed Monster')) newAchievements.push('Speed Monster');
      else if (elapsed <= 10 && !currentAchievements.includes('Lightning Kid')) newAchievements.push('Lightning Kid');
      if (solvedPuzzle.solution?.length >= 3 && !currentAchievements.includes('Calculation Genius')) newAchievements.push('Calculation Genius');
      if (newTotal >= 10 && !currentAchievements.includes('Future Grand Master')) newAchievements.push('Future Grand Master');

      finalAchievements = [...currentAchievements, ...newAchievements];
      toastText = `+${gainedCoins} 🪙${speedBonus ? ' (Speed Bonus! ⚡)' : ''}${isStreakMilestone ? ' (Streak! 🔥)' : ''}`;

      // Leaderboard Tax active?
      if (syncedStudent.activeTaxUntil && syncedStudent.activeTaxUntil > Date.now()) {
        const sortedByCoins = [...students].sort((a, b) => (b.coins || 0) - (a.coins || 0));
        const targets = sortedByCoins.filter(s => s.id !== student.id).slice(0, 3);
        let taxStolen = 0;
        for (const p of targets) {
          const currentCoins = p.coins || 0;
          await updateStudentStatus(classId, p.id, { 
            coins: Math.max(0, currentCoins - 5),
            roundCoins: Math.max(0, (p.roundCoins || 0) - 5)
          });
          taxStolen += 5;
        }
        if (taxStolen > 0) {
          gainedCoins += taxStolen;
          toastText += ` (+${taxStolen} Tax Bounty! 💸)`;
        }
      }

      // King's Bounty active?
      if (syncedStudent.activeBountyUntil && syncedStudent.activeBountyUntil > Date.now()) {
        const sortedByCoins = [...students].sort((a, b) => (b.coins || 0) - (a.coins || 0));
        const leader = sortedByCoins.find(s => s.id !== student.id);
        if (leader) {
          const currentCoins = leader.coins || 0;
          await updateStudentStatus(classId, leader.id, { 
            coins: Math.max(0, currentCoins - 10),
            roundCoins: Math.max(0, (leader.roundCoins || 0) - 10)
          });
          gainedCoins += 10;
          toastText += ` (+10 King's Bounty! 👑)`;
        }
      }
    }

    // Coin Toast Animation
    const toastId = Date.now();
    setCoinToasts(prev => [...prev, { id: toastId, text: toastText, isNegative: false }]);
    setTimeout(() => setCoinToasts(prev => prev.filter(t => t.id !== toastId)), 2500);

    // Achievement toast notification
    if (newAchievements.length > 0) {
      newAchievements.forEach((ach, index) => {
        const achToastId = Date.now() + Math.random() + index;
        setAchievementToasts(prev => [...prev, { id: achToastId, name: ach }]);
        setTimeout(() => {
          setAchievementToasts(prev => prev.filter(t => t.id !== achToastId));
        }, 4000);
      });
    }

    const newBestSingleRound = Math.max(currentStudent.bestSingleRoundSolved || 0, newRoundSolved);

    const updatedData = {
      ...currentStudent,
      totalSolved: newTotal,
      roundSolved: newRoundSolved,
      bestSingleRoundSolved: newBestSingleRound,
      roundLastSolvedAt: Date.now(),
      coins: (currentStudent.coins || 0) + gainedCoins,
      roundCoins: (currentStudent.roundCoins || 0) + gainedCoins,
      roundStreak: newRoundStreak,
      achievements: finalAchievements,
      status: 'solved',
    };
    
    if (syncedStudent.boardFlipRemaining > 0) {
      updatedData.boardFlipRemaining = Math.max(0, syncedStudent.boardFlipRemaining - 1);
    }

    if (solvedPuzzle.isCustom) {
      const nextIdx = (syncedStudent?.solvedCustomPuzzleIndex || 0) + 1;
      const totalCustom = session.customPuzzle?.puzzles?.length || 0;
      updatedData.solvedCustomPuzzleIndex = nextIdx;
      if (nextIdx >= totalCustom) {
        updatedData.solvedCustomPuzzleId = session.customPuzzle.broadcastAt;
      }
    } else {
      updatedData.currentPuzzleIndex = solvedIdx + 1;
    }
    if (solvedPuzzle.isStonewall) {
      updatedData.stonewalled = false;
    }
    setSyncedStudent(updatedData);
    try {
      localStorage.setItem(`student_session_${classId}`, JSON.stringify(updatedData));
      if (!solvedPuzzle.isCustom) {
        localStorage.setItem(`student_puzzle_index_${classId}_${student.id}`, String(solvedIdx + 1));
      }
    } catch (e) {}

    // Save to database
    const dbUpdate = {
      totalSolved: newTotal,
      roundSolved: newRoundSolved,
      bestSingleRoundSolved: newBestSingleRound,
      roundLastSolvedAt: Date.now(),
      coins: (currentStudent.coins || 0) + gainedCoins,
      roundCoins: (currentStudent.roundCoins || 0) + gainedCoins,
      roundStreak: newRoundStreak,
      achievements: finalAchievements,
      status: 'solved',
    };
    if (syncedStudent.boardFlipRemaining > 0) {
      dbUpdate.boardFlipRemaining = Math.max(0, syncedStudent.boardFlipRemaining - 1);
    }
    if (solvedPuzzle.isCustom) {
      const nextIdx = (syncedStudent?.solvedCustomPuzzleIndex || 0) + 1;
      const totalCustom = session.customPuzzle?.puzzles?.length || 0;
      dbUpdate.solvedCustomPuzzleIndex = nextIdx;
      if (nextIdx >= totalCustom) {
        dbUpdate.solvedCustomPuzzleId = session.customPuzzle.broadcastAt;
      }
    } else {
      dbUpdate.currentPuzzleIndex = solvedIdx + 1;
    }
    if (solvedPuzzle.isStonewall) {
      dbUpdate.stonewalled = false;
    }
    updateStudentStatus(classId, student.id, dbUpdate);

    // Auto-advance to next puzzle after celebration
    if (solvedPuzzle.isStonewall) {
      setTimeout(() => {
        setSuccessSolved(false);
        setIsWrongMove(false);
        const startIndex = syncedStudent?.currentPuzzleIndex || 0;
        loadPuzzleAtIndex(startIndex);
      }, 2500);
    } else if (!solvedPuzzle.isCustom) {
      setTimeout(() => {
        const nextIdx = solvedIdx + 1;
        const queue = sessionPuzzleQueue.current;

        if (queue && nextIdx < queue.length) {
          setCatSpeechOverride('Brilliant! Next puzzle is ready! 🎯');
          loadPuzzleAtIndex(nextIdx);
        } else {
          setCatSpeechOverride('Loading more puzzles…');
          getNextPuzzle(
            solvedPuzzle.theme || 'mixed',
            session?.difficulty || solvedPuzzle.difficulty || 'intermediate',
            solvedPuzzleIds.current
          ).then(next => {
            if (next) {
              sessionPuzzleQueue.current = [...(queue || []), next];
              loadPuzzleAtIndex(nextIdx);
            } else {
              setCatSpeechOverride("All puzzles solved! Outstanding! 🏆");
            }
          }).catch(() => {
            setCatSpeechOverride("Round finished! Amazing work! 🏆");
          });
        }
      }, 2500);
    } else {
      const nextIdx = (syncedStudent?.solvedCustomPuzzleIndex || 0) + 1;
      const totalCustom = session.customPuzzle?.puzzles?.length || 0;
      if (nextIdx < totalCustom) {
        setTimeout(() => {
          setSuccessSolved(false);
          setIsWrongMove(false);
        }, 2500);
      } else {
        setTimeout(() => {
          setCatSpeechOverride("Challenge complete! Waiting for Coach... 🙋");
        }, 2500);
      }
    }
  }, [classId, student.id, loadPuzzleAtIndex, session?.customPuzzle, session?.difficulty, syncedStudent, students]);

  handlePuzzleSolvedRef.current = handlePuzzleSolved;

  // ── Custom Puzzle listener ──
  useEffect(() => {
    if (!session) return;
    const cp = session.customPuzzle;
    if (cp && cp.active && cp.puzzles && cp.puzzles.length > 0) {
      // 1. Detect if this is a new challenge broadcast
      if (syncedStudent && syncedStudent.solvedCustomChallengeId !== cp.broadcastAt) {
        const dbReset = {
          solvedCustomChallengeId: cp.broadcastAt,
          solvedCustomPuzzleIndex: 0,
          solvedCustomPuzzleId: ""
        };
        setSyncedStudent(prev => ({ ...prev, ...dbReset }));
        updateStudentStatus(classId, student.id, dbReset);
        return;
      }

      const currentCustomIdx = syncedStudent?.solvedCustomPuzzleIndex || 0;
      const isSolved = (syncedStudent?.solvedCustomPuzzleId === cp.broadcastAt) || (currentCustomIdx >= cp.puzzles.length);
      setCustomSolved(isSolved);

      if (!isSolved) {
        const targetPuzzle = cp.puzzles[currentCustomIdx];
        if (targetPuzzle && (activePuzzle?.id !== targetPuzzle.id || !puzzleEngine)) {
          const customPuzzleObj = {
            id: targetPuzzle.id,
            fen: targetPuzzle.fen,
            solution: targetPuzzle.solution,
            setupMove: null,
            isCustom: true,
            rewardCoins: targetPuzzle.rewardCoins,
            title: targetPuzzle.title,
            description: `Solve challenge ${currentCustomIdx + 1} of ${cp.puzzles.length}!`,
            hints: []
          };
          setActivePuzzle(customPuzzleObj);
          setBoardPosition(targetPuzzle.fen);
          setIsWrongMove(false);
          setSuccessSolved(false);

          const engine = new PuzzleEngine({
            puzzle: customPuzzleObj,
            onCorrectMove: () => {
              setBoardPosition(engine.getFen());
              setCatSpeechOverride('Nice! Keep going!');
              playCorrectMove();
            },
            onSolved: () => {
              setBoardPosition(engine.getFen());
              playPuzzleSolved();
              if (handlePuzzleSolvedRef.current) {
                handlePuzzleSolvedRef.current(customPuzzleObj, currentCustomIdx);
              }
            },
            onIncorrectMove: () => {
              setIsWrongMove(true);
              playWrongMove();
              setTimeout(() => setIsWrongMove(false), 500);
              setIncorrectMoveText('Incorrect move! Try again!');
              setTimeout(() => setIncorrectMoveText(''), 2500);
            },
            onSetupComplete: (newFen) => {
              setBoardPosition(newFen);
            },
          });
          setPuzzleEngine(engine);

          setCatSpeechOverride(`📢 Challenge ${currentCustomIdx + 1}/${cp.puzzles.length}: "${targetPuzzle.title}" for ${targetPuzzle.rewardCoins} coins! 🎯`);
        }
      } else {
        setCatSpeechOverride("Amazing! You completed all challenges! Waiting for coach... 🙋");
      }
    } else {
      setCustomSolved(false);
      if (activePuzzle?.isCustom) {
        const startIndex = syncedStudent?.currentPuzzleIndex || 0;
        loadPuzzleAtIndex(startIndex);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.customPuzzle, syncedStudent?.solvedCustomPuzzleId, syncedStudent?.solvedCustomPuzzleIndex, syncedStudent?.solvedCustomChallengeId, activePuzzle?.id]);

  // ── Load puzzle when session becomes active and has a queue ──
  useEffect(() => {
    if (!session) return;
    if (session.status !== 'active') return;
    if (session.customPuzzle && session.customPuzzle.active) return; // Custom puzzle takes priority!
    if (session.round?.type === 'custom_review') return; // Custom FEN review challenge takes priority!
    
    // Ensure puzzle queue is populated even if session.puzzleQueue is empty
    const queue = (session.puzzleQueue && session.puzzleQueue.length > 0)
      ? session.puzzleQueue
      : PUZZLES;

    sessionPuzzleQueue.current = queue;

    const roundNum = session.round?.number;
    const roundStatus = session.round?.status;

    // Detect if a new round has started or round status changed to active
    const isNewRoundNumber = currentRoundNumberRef.current !== null && currentRoundNumberRef.current !== roundNum;
    const isRoundBecameActive = currentRoundStatusRef.current !== null && currentRoundStatusRef.current !== 'active' && roundStatus === 'active';
    const isRoundStart = isNewRoundNumber || isRoundBecameActive;

    currentRoundNumberRef.current = roundNum;
    currentRoundStatusRef.current = roundStatus;

    if (roundStatus !== 'active') return;

    if (isNewRoundNumber) {
      try {
        localStorage.setItem(`student_puzzle_index_${classId}_${student.id}`, '0');
      } catch (e) {}
    }

    const savedIndex = (() => {
      try {
        const val = localStorage.getItem(`student_puzzle_index_${classId}_${student.id}`);
        if (val !== null && !isNaN(Number(val))) return Number(val);
      } catch (e) {}
      return null;
    })();

    const startIndex = isNewRoundNumber
      ? 0
      : Math.max(
          syncedStudent?.currentPuzzleIndex || 0,
          savedIndex !== null ? savedIndex : 0,
          syncedStudent?.roundSolved || 0
        );

    // If a new round or round activation occurs, force reset puzzle solve states and load the round start puzzle
    if (isRoundStart) {
      setSuccessSolved(false);
      setCustomSolved(false);
      setIsWrongMove(false);
      setIncorrectMoveText('');
      loadPuzzleAtIndex(startIndex);
      return;
    }

    // If we're mid-round and currently celebrating a solved puzzle (successSolved is true),
    // don't interrupt the celebration timer — handlePuzzleSolved will load the next puzzle when ready
    if (successSolved && activePuzzle && !activePuzzle.isCustom) {
      return;
    }

    // Load puzzle if we don't have an active puzzle, or if puzzle index changed, or engine is missing
    if (!activePuzzle || currentPuzzleIndex.current !== startIndex || !puzzleEngine) {
      setSuccessSolved(false);
      loadPuzzleAtIndex(startIndex);
    }
  }, [
    session?.status,
    session?.round?.status,
    session?.round?.number,
    session?.round?.type,
    session?.difficulty,
    session?.puzzleQueue,
    syncedStudent?.currentPuzzleIndex,
    session?.customPuzzle?.active,
    activePuzzle,
    puzzleEngine,
    successSolved,
    loadPuzzleAtIndex
  ]);

  // ── Ask coach for help ──
  const handleRequestHelp = async () => {
    try {
      setSyncedStudent(prev => ({ ...prev, status: 'help' }));
      await updateStudentStatus(classId, student.id, { 
        status: 'help',
        requestedHelpText: 'Needs assistance on this puzzle.',
      });
      setCatSpeechOverride("I've raised my hand! Coach will help us shortly. 🙋");
    } catch (e) {
      console.error('Failed to request help:', e);
    }
  };

  // ── Feed Berry hint generator ──
  const handleFeedBerry = async () => {
    if ((syncedStudent.coins || 0) < 5) return;
    try {
      const activeCompanion = syncedStudent.equippedPokemon || 'togepi';
      const res = await feedBerry(classId, student.id, activeCompanion);
      
      if (res && res.success) {
        setSyncedStudent(prev => ({
          ...prev,
          coins: res.newCoins,
          pokemonXp: { ...prev.pokemonXp, [activeCompanion]: res.xp },
          ownedPokemon: res.evolved ? prev.ownedPokemon.filter(id => id !== res.from).concat(res.to) : prev.ownedPokemon,
          activeTeam: res.evolved ? prev.activeTeam.map(id => id === res.from ? res.to : id) : prev.activeTeam,
          equippedPokemon: res.evolved ? res.to : prev.equippedPokemon
        }));

        if (res.evolved) {
          const fromPoke = POKEMON_CATALOG.find(p => p.id === res.from);
          const toPoke = POKEMON_CATALOG.find(p => p.id === res.to);
          alert(`✨ EVOLUTION! ✨ Your ${fromPoke?.name} evolved into ${toPoke?.name}! His skill got upgraded!`);
        }
      }

      // Select chess strategy hint based on active puzzle theme
      let hintText = "Look for checks, captures, and force lines!";
      if (activePuzzle) {
        const theme = activePuzzle.theme || 'mixed';
        if (theme === 'fork') hintText = "Psst! Double attack! Can one piece hit two targets?";
        else if (theme === 'pin') hintText = "An opponent's piece is blocking a more valuable target behind it!";
        else if (theme === 'skewer') hintText = "Attack a valuable piece so it has to move, exposing a target behind!";
        else if (theme === 'mateIn1') hintText = "Look for a direct check that leaves the king with no legal squares!";
        else if (theme === 'mateIn2') hintText = "Force their king into a tight net with checks!";
        else if (theme === 'sacrifice') hintText = "Give up a piece to open up an escape square or undefended diagonal!";
        else if (theme === 'deflection') hintText = "Lure their defender away from the square they need to protect!";
      }

      setCatSpeechOverride(hintText);
    } catch (e) {
      alert(e.message || 'Berry feeding failed');
    }
  };

  // ── Active Skills Usage ──
  const handleUseActiveSkill = async (pokeId, skill) => {
    if (!skill) return;

    const cooldownUntil = syncedStudent.pokemonCooldowns?.[pokeId] || 0;
    if (cooldownUntil > Date.now()) {
      alert('Skill is still on cooldown!');
      return;
    }

    const pokeItem = POKEMON_CATALOG.find(p => p.id === pokeId);
    let cooldownDuration = 60;
    if (pokeItem) {
      if (pokeItem.rarity === 'legendary') cooldownDuration = 120;
      else if (pokeItem.rarity === 'epic') cooldownDuration = 90;
      else if (pokeItem.rarity === 'rare') cooldownDuration = 75;
    }

    if (skill.id === 'reveal') {
      if (!activePuzzle?.solution) return;
      const firstMove = Array.isArray(activePuzzle.solution) ? activePuzzle.solution[0] : activePuzzle.solution;
      setCatSpeechOverride(`Abra/Alakazam psychic reveal! The first move is: ${firstMove}! 💡`);
      
      const pokemonCooldowns = { ...(syncedStudent.pokemonCooldowns || {}) };
      pokemonCooldowns[pokeId] = Date.now() + cooldownDuration * 1000;
      setSyncedStudent(prev => ({ ...prev, pokemonCooldowns }));
      await updateStudentStatus(classId, student.id, { pokemonCooldowns });
    } else if (skill.id === 'confusion') {
      setCatSpeechOverride("Confusion swap! Skipping this puzzle... 🌀");
      
      const pokemonCooldowns = { ...(syncedStudent.pokemonCooldowns || {}) };
      pokemonCooldowns[pokeId] = Date.now() + cooldownDuration * 1000;
      setSyncedStudent(prev => ({ ...prev, pokemonCooldowns }));
      await updateStudentStatus(classId, student.id, { pokemonCooldowns });

      // Skip current puzzle
      await handleSkipPuzzle(true);
    } else if (skill.id === 'leaderSteal') {
      const sortedBySolved = [...students].sort((a, b) => (b.roundSolved || 0) - (a.roundSolved || 0));
      const leader = sortedBySolved.find(s => s.id !== student.id);
      if (leader) {
        const stealAmt = skill.params?.amount || 50;
        await stealCoinsFromStudent(classId, student.id, student.name, leader.id, stealAmt);
        setCatSpeechOverride(`Prism Laser stole ${stealAmt} coins from leader ${leader.name}! 💎⚡`);
      } else {
        setCatSpeechOverride("No opponent found to steal from! 🤷");
      }
      
      const pokemonCooldowns = { ...(syncedStudent.pokemonCooldowns || {}) };
      pokemonCooldowns[pokeId] = Date.now() + cooldownDuration * 1000;
      setSyncedStudent(prev => ({ ...prev, pokemonCooldowns }));
      await updateStudentStatus(classId, student.id, { pokemonCooldowns });
    } else {
      // targets classmates
      setTargetingSkill({ pokemonId: pokeId, skill });
      setShowTargetSelector(true);
    }
  };

  // ── Cast Spell Cards ──
  const handleCastSpell = async (spellId) => {
    const isRoundActive = session?.round?.status === 'active';
    if (!isRoundActive || isFrozen || isParalyzed || isSmoked || isWatered) return;

    const inventory = syncedStudent.spellInventory || {};
    const qty = inventory[spellId] || 0;
    if (qty <= 0) return;

    if (['spell_stonewall', 'spell_thundershock', 'spell_waterblast', 'spell_windattack', 'spell_sleeppowder'].includes(spellId)) {
      setTargetingSkill({ isSpell: true, spellId, name: SHOP_ITEMS.find(i => i.id === spellId)?.name || 'Spell Card' });
      setShowTargetSelector(true);
      return;
    }

    try {
      const updatedInventory = { ...inventory, [spellId]: qty - 1 };
      if (updatedInventory[spellId] <= 0) {
        delete updatedInventory[spellId];
      }
      setSyncedStudent(prev => ({ ...prev, spellInventory: updatedInventory }));
      await updateStudentStatus(classId, student.id, { spellInventory: updatedInventory });

      const otherStudents = students.filter(s => s.id !== student.id);

      if (spellId === 'spell_flamethrower') {
        for (const s of otherStudents) {
          await triggerSkillOnStudent(classId, student.name, s.id, 'smokescreen', 30);
        }
        playSpellSound('fire');
        setCatSpeechOverride("🔥 Cast Flamethrower! Smoked out all other chessboards! 🌫️");
      } else if (spellId === 'spell_lockboard') {
        for (const s of otherStudents) {
          await triggerSkillOnStudent(classId, student.name, s.id, 'freeze', 15);
        }
        playSpellSound('ice');
        setCatSpeechOverride("🔒 Cast Lock Board! Frozen all other classmates' boards! ❄️");
      } else if (spellId === 'spell_boardflip') {
        for (const s of otherStudents) {
          await updateStudentStatus(classId, s.id, { boardFlipRemaining: 3 });
        }
        playSpellSound('wind');
        setCatSpeechOverride("🌀 Cast Chaos Board Flip! Flipped all other chessboards! 🗺️");
      } else if (spellId === 'spell_tax') {
        await updateStudentStatus(classId, student.id, { activeTaxUntil: Date.now() + 30000 });
        playSpellSound('sleep');
        setCatSpeechOverride("💸 Cast Leaderboard Tax! For 30s, solving puzzles steals 5 coins from each of the top 3 players!");
      } else if (spellId === 'spell_bounty') {
        await updateStudentStatus(classId, student.id, { activeBountyUntil: Date.now() + 45000 });
        playSpellSound('sleep');
        setCatSpeechOverride("👑 Cast King's Bounty! For 45s, solving puzzles steals 10 coins from the 1st place player!");
      }
    } catch (e) {
      console.error('Failed to cast spell:', e);
      alert('Failed to cast spell card.');
    }
  };
  const handleSkipPuzzle = async (forceFree = false) => {
    if (syncedStudent?.stonewalled) {
      setCatSpeechOverride("🧱 You are Stonewalled! Solve this Expert challenge to break the wall!");
      return;
    }

    const isSkipUsed = syncedStudent?.skipUsed || false;
    const extraSkips = syncedStudent?.extraSkips || 0;

    if (!forceFree && isSkipUsed && extraSkips <= 0) return;

    const updates = {};
    if (!forceFree) {
      updates.skipUsed = true;
      if (isSkipUsed && extraSkips > 0) {
        updates.extraSkips = extraSkips - 1;
      }
    }

    // Is Custom Challenge active?
    const cp = session?.customPuzzle;
    if (cp && cp.active && cp.puzzles && cp.puzzles.length > 0) {
      const currentCustomIdx = syncedStudent?.solvedCustomPuzzleIndex || 0;
      const nextCustomIdx = currentCustomIdx + 1;
      const totalCustom = cp.puzzles.length;

      updates.solvedCustomPuzzleIndex = nextCustomIdx;
      if (nextCustomIdx >= totalCustom) {
        updates.solvedCustomPuzzleId = cp.broadcastAt;
      }

      setSyncedStudent(prev => ({
        ...prev,
        ...updates
      }));

      await updateStudentStatus(classId, student.id, updates);
      setCatSpeechOverride("Skipped custom challenge! Loading next... ⏩");
      return;
    }

    // Normal puzzle queue advance
    const nextIdx = (currentPuzzleIndex.current) + 1;
    updates.currentPuzzleIndex = nextIdx;

    setSyncedStudent(prev => {
      const nextStudent = { ...prev, ...updates };
      try {
        localStorage.setItem(`student_session_${classId}`, JSON.stringify(nextStudent));
        localStorage.setItem(`student_puzzle_index_${classId}_${student.id}`, String(nextIdx));
      } catch (e) {}
      return nextStudent;
    });

    await updateStudentStatus(classId, student.id, updates);
    setCatSpeechOverride("No problem! Let's try another challenge. 👍");

    // Advance queue
    const queue = sessionPuzzleQueue.current;

    if (queue && nextIdx < queue.length) {
      loadPuzzleAtIndex(nextIdx);
    } else {
      setCatSpeechOverride('Loading next puzzle...');
      getNextPuzzle(
        activePuzzle?.theme || 'mixed',
        activePuzzle?.difficulty || 'intermediate',
        solvedPuzzleIds.current
      ).then(next => {
        if (next) {
          sessionPuzzleQueue.current = [...(queue || []), next];
          loadPuzzleAtIndex(nextIdx);
        } else {
          setCatSpeechOverride("Out of puzzles! Great effort today!");
        }
      });
    }
  };

  // ── Purchase and Equip in Shop ──
  const handlePurchasePokemon = async (pokemonId, cost) => {
    const res = await purchasePokemon(classId, student.id, pokemonId, cost);
    if (res && res.success) {
      setSyncedStudent(prev => ({
        ...prev,
        coins: res.newCoins,
        ownedPokemon: [...(prev.ownedPokemon || []), pokemonId]
      }));
    }
  };

  const handlePurchaseShopItem = async (itemId, cost, isConsumable) => {
    const res = await purchaseShopItem(classId, student.id, itemId, cost, isConsumable);
    if (res && res.success) {
      setSyncedStudent(prev => ({
        ...prev,
        coins: res.newCoins,
        inventory: [...(prev.inventory || []), itemId]
      }));
    }
  };

  const handleEquipPokemon = async (pokemonId) => {
    await equipPokemon(classId, student.id, pokemonId);
  };

  const handleEquipShopItem = async (slot, itemId) => {
    await equipShopItem(classId, student.id, slot, itemId);
  };

  const handleOpenMysteryBox = async (boxType = 'standard', cost = 150) => {
    // Determine unowned pokemon
    const rolledId = rollMysteryBox(syncedStudent.ownedPokemon || [], boxType);
    const result = await openMysteryBox(classId, student.id, rolledId, cost);
    if (result && result.success) {
      setSyncedStudent(prev => ({
        ...prev,
        coins: result.newCoins,
        ownedPokemon: result.duplicate ? (prev.ownedPokemon || []) : [...(prev.ownedPokemon || []), result.pokemon]
      }));
    }
    return { pokemonId: result.pokemon, duplicate: result.duplicate };
  };

  const getCompanionState = () => {
    if (session?.status === 'paused' || session?.round?.status === 'ended') return 'sleep';
    if (successSolved) return 'correct';
    if (isWrongMove) return 'incorrect';
    if (syncedStudent.status === 'help') return 'help';
    if (puzzleEngine?.opponentMoving) return 'thinking';
    return 'idle';
  };

  const sessionStarted = session?.status === 'active' || session?.status === 'paused' || session?.status === 'ended' || session?.round?.status === 'active' || session?.round?.status === 'ended';
  const puzzleNumber = currentPuzzleIndex.current + 1;

  const actualSideToMove = activePuzzle
    ? (activePuzzle.sideToMove || (activePuzzle.setupMove
        ? (activePuzzle.fen?.split(' ')[1] === 'w' ? 'black' : 'white')
        : (activePuzzle.fen?.split(' ')[1] === 'w' ? 'white' : 'black')))
    : 'white';

  let playerColor = actualSideToMove;
  if (syncedStudent?.boardFlipRemaining > 0) {
    playerColor = playerColor === 'white' ? 'black' : 'white';
  }

  const equippedTheme = syncedStudent.equippedItems?.theme || session?.theme || 'classic';
  const equippedBorder = syncedStudent.equippedItems?.border || null;
  const equippedTitle = syncedStudent.equippedItems?.title || null;

  const spellInventory = syncedStudent?.spellInventory || {};
  const spellsList = Object.entries(spellInventory).filter(([itemId, qty]) => itemId.startsWith('spell_') && qty > 0);

  let titlePrefix = '';
  if (equippedTitle === 'flair_crown') titlePrefix = '👑 ';
  else if (equippedTitle === 'flair_lightning') titlePrefix = '⚡ ';

  const sortedLeaderboard = (session?.round?.status === 'ended' && Array.isArray(session?.round?.rankings))
    ? session.round.rankings
    : [...students].sort((a, b) => {
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
  const myRankIndex = sortedLeaderboard.findIndex(s => s.id === student.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '-';

  // Top 5 students sorted by roundSolved and speed for the live mini-leaderboard
  const top5Round = [...students]
    .filter(s => s.status !== 'offline')
    .sort((a, b) => {
      const aSolved = a.roundSolved || 0;
      const bSolved = b.roundSolved || 0;
      if (bSolved !== aSolved) return bSolved - aSolved;
      if (aSolved > 0) {
        const aTime = a.roundLastSolvedAt || Infinity;
        const bTime = b.roundLastSolvedAt || Infinity;
        if (aTime !== bTime) return aTime - bTime;
      }
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, 5);

  // Wall of Fame: Top 3 students with most puzzles solved in a single round
  const wallOfFameTop3 = useMemo(() => {
    return [...students]
      .map(s => ({
        ...s,
        singleRoundRecord: Math.max(s.bestSingleRoundSolved || 0, s.roundSolved || 0),
      }))
      .filter(s => s.singleRoundRecord > 0)
      .sort((a, b) => {
        if (b.singleRoundRecord !== a.singleRoundRecord) {
          return b.singleRoundRecord - a.singleRoundRecord;
        }
        return (b.totalSolved || 0) - (a.totalSolved || 0);
      })
      .slice(0, 3);
  }, [students]);

  return (
    <div className="workspace-wrapper app-container">

      {/* ── CLASSROOM RESET OVERLAY ── */}
      {isResetDetected && (
        <div style={styles.overlay}>
          <div className="glass-panel animate-float" style={styles.overlayCard}>
            <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <h2>Session Reset by Coach</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Your teacher has reset this session. Redirecting to landing page...
            </p>
          </div>
        </div>
      )}

      {/* ── PAUSED OVERLAY ── */}
      {!isResetDetected && (session?.status === 'paused' || session?.round?.status === 'paused') && session?.round?.status !== 'ended' && (
        <div style={styles.overlay}>
          <div className="glass-panel animate-float" style={styles.overlayCard}>
            <Lock size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
            <h2>Session Paused by Coach</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Take a moment to think! ☕</p>
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENT TOASTS ── */}
      <div style={styles.achToastsContainer}>
        {achievementToasts.map(toast => (
          <div key={toast.id} style={styles.achToast} className="animate-slide-up">
            <span style={{ fontSize: '1.4rem' }}>🏆</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Achievement Unlocked!</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{toast.name}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── COIN TRANSACTION TOASTS ── */}
      {coinToasts.map(toast => (
        <div 
          key={toast.id} 
          style={{
            ...styles.coinToast,
            borderColor: toast.isNegative ? '#f87171' : '#fbbf24',
            color: toast.isNegative ? '#dc2626' : '#d97706',
          }} 
          className="pulse-active"
        >
          <span>{toast.text}</span>
        </div>
      ))}

      {/* ── BROADCAST / COACH ANNOUNCEMENT BANNER ── */}
      {(session?.coachAnnouncement?.text || session?.broadcastHint) && (
        <div style={styles.broadcastBanner} className="animate-slide-up">
          <span style={{ fontSize: '1.25rem' }}>📢</span>
          <span><strong>Coach Announcement:</strong> {session?.coachAnnouncement?.text || session?.broadcastHint}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      {/* ── FEEDBACK MODAL OVERLAY ── */}
      {feedbackModal.show && (
        <div style={{ ...styles.overlay, zIndex: 20000 }}>
          <div className="glass-panel animate-float" style={{ ...styles.overlayCard, maxWidth: '400px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>{feedbackModal.title}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.95rem', lineHeight: '1.4' }}>
              {feedbackModal.message}
            </p>
            <button
              onClick={() => setFeedbackModal({ show: false, title: '', message: '' })}
              className="btn btn-accent"
              style={{ width: '100%', padding: '0.6rem', fontWeight: 800, borderRadius: '10px' }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* ── PENDING JOIN APPROVAL LOBBY ── */}
      {(() => {
        const isApproved = isStudentApprovedForToday(syncedStudent, session, student.id);
        if (!isApproved) {
          return (
            <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', boxSizing: 'border-box' }}>
              <div className="glass-panel scale-up-anim" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', borderRadius: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--accent-primary)', boxShadow: '0 12px 40px var(--shadow-color)' }}>
                <div style={{ fontSize: '4rem' }} className="pulse-active">⏳</div>
                <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.8rem', color: 'var(--text-primary)' }}>
                  Waiting for Coach Approval
                </h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Hello <strong>{syncedStudent.name || student.name}</strong>! You have requested to join classroom <strong>{classId}</strong>.
                  <br />
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                    Only with your coach's approval can you enter today's class.
                  </span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.6rem 1.2rem', borderRadius: '30px', color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} className="pulse-active" />
                  Request sent! You will be admitted automatically once coach approves.
                </div>
                <button
                  onClick={() => {
                    if (confirm("Cancel join request and leave session?")) {
                      onLeave();
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 800 }}
                >
                  Leave Session
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {sessionStarted && session?.round?.status === 'active' && session?.round?.type === 'custom_review' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 2rem', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box' }}>
          {/* Custom Coached Challenge Header */}
          <header className="student-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CLASSROOM CUSTOM CHALLENGE
              </span>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                Hello, {student.name}! 👋
              </h2>
            </div>
            <div className="student-header-actions" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={toggleMute} 
                className="btn btn-secondary" 
                style={{ padding: '0.45rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={isMuted ? 'Unmute Sounds' : 'Mute Sounds'}
              >
                {isMuted ? <VolumeX size={18} color="var(--text-secondary)" /> : <Volume2 size={18} color="var(--accent-primary)" />}
              </button>

              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                🪙 <strong>{syncedStudent.coins || 0}</strong> Coins
              </div>

              <button onClick={() => setShowPocket(true)} className="btn btn-secondary" style={styles.headerActionBtn}>
                🎒 Pocket
              </button>

              <button 
                onClick={() => {
                  if (session?.isShopLocked) {
                    alert('🛑 The Coach has locked all Shops for this round!');
                  } else {
                    setShowShop(true);
                  }
                }} 
                className="btn btn-secondary" 
                style={{ 
                  ...styles.headerActionBtn, 
                  opacity: session?.isShopLocked ? 0.65 : 1,
                  cursor: session?.isShopLocked ? 'not-allowed' : 'pointer'
                }}
                title="Pokémon Companion & Items Shop"
              >
                🏪 Pokémon Shop {session?.isShopLocked && '🔒'}
              </button>

              <button 
                onClick={() => {
                  if (session?.isShopLocked) {
                    alert('🛑 The Coach has locked all Shops for this round!');
                  } else {
                    setShowFootballCardShop(true);
                  }
                }} 
                className="btn btn-secondary" 
                style={{ 
                  ...styles.headerActionBtn, 
                  opacity: session?.isShopLocked ? 0.65 : 1,
                  cursor: session?.isShopLocked ? 'not-allowed' : 'pointer',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                }}
                title="Football Card Shop & Album"
              >
                ⚽ Football Shop {session?.isShopLocked && '🔒'}
              </button>

              {session?.round?.duration > 0 && (
                <div style={{ width: '180px' }}>
                  <TimerDisplay
                    startedAt={session.round.startedAt}
                    duration={session.round.duration}
                    extraTime={session.round.extraTimeAdded}
                    status={session.round.status}
                    size="compact"
                  />
                </div>
              )}

              <button 
                onClick={() => {
                  if (confirm("Are you sure you want to leave this session?")) {
                    onLeave();
                  }
                }} 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem 1rem' }}
              >
                Leave
              </button>
            </div>
          </header>

          {/* Dual Chessboard Solver Row */}
          <div className="custom-review-grid" style={{ display: 'grid', gap: '1.5rem', flex: 1, minHeight: 0 }}>
            {['board1', 'board2'].map(bk => {
              const puzzle = session.round.customReviewPuzzles?.[bk];
              if (!puzzle) return null;
              
              const sub = syncedStudent.customReviewSubmissions?.[bk];
              const isCorrect = sub?.status === 'correct';
              const isPending = sub?.status === 'submitted';
              const isIncorrect = sub?.status === 'incorrect';
              
              const textVal = bk === 'board1' ? board1Text : board2Text;
              const setTxt = bk === 'board1' ? setBoard1Text : setBoard2Text;

              return (
                <div 
                  key={bk} 
                  className="glass-panel" 
                  style={{
                    padding: '1.5rem',
                    borderRadius: '20px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: isCorrect 
                      ? '2px solid #10b981' 
                      : isPending 
                        ? '2px solid #f59e0b' 
                        : '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    minHeight: 0
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>
                      🧩 {bk === 'board1' ? 'Board 1' : 'Board 2'}: {puzzle.title}
                    </h3>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: getStudentBoardOrientation(puzzle) === 'black' ? '#000' : '#4b5563', backgroundColor: getStudentBoardOrientation(puzzle) === 'black' ? '#e5e7eb' : '#fff', border: '1px solid #ccc', padding: '2px 8px', borderRadius: '4px' }}>
                      {getStudentBoardOrientation(puzzle) === 'black' ? '⬛ Black to play' : '⬜ White to play'}
                    </span>
                  </div>

                  {/* Static Chessboard */}
                  <div style={{ display: 'flex', justifyContent: 'center', flex: 1, minHeight: 0 }}>
                    <ChessboardWrapper 
                      position={puzzle.fen} 
                      theme="classic" 
                      interactive={false} 
                      orientation={getStudentBoardOrientation(puzzle)}
                      maxWidth="650px"
                      customArrows={puzzle.arrows || []}
                    />
                  </div>

                  {/* Answer Inputs & Submission Status */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {isCorrect ? (
                      <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1.5px solid #10b981', borderRadius: '10px', padding: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem' }}>
                        <span>🟢 Correct! Answer approved. +{puzzle.reward} coins 🪙</span>
                      </div>
                    ) : isPending ? (
                      <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1.5px solid #f59e0b', borderRadius: '10px', padding: '0.8rem', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem' }}>
                        <span>⏳ Answer submitted! Waiting for coach review...</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {isIncorrect && (
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.1rem' }}>
                            ❌ Incorrect answer. Try a different line/explanation!
                          </div>
                        )}
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)' }}>TYPE YOUR ANSWER</label>
                        <form 
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!textVal.trim() || isRoundOver) return;
                            const submittedAns = textVal.trim();
                            // Optimistically set local state so status instantly switches to 'submitted'
                            setSyncedStudent(prev => ({
                              ...prev,
                              customReviewSubmissions: {
                                ...(prev?.customReviewSubmissions || {}),
                                [bk]: {
                                  answer: submittedAns,
                                  status: 'submitted',
                                  timestamp: Date.now()
                                }
                              }
                            }));
                            await submitCustomReviewAnswer(classId, student.id, bk, submittedAns);
                          }}
                          style={{ display: 'flex', gap: '0.5rem' }}
                        >
                          <input 
                            type="text"
                            value={textVal}
                            onChange={e => setTxt(e.target.value)}
                            placeholder={isRoundOver ? "Round has ended. Submissions are disabled." : "Type moves (e.g. 1. e4 e5) or text explanation..."}
                            disabled={isRoundOver}
                            style={{
                              flex: 1,
                              padding: '0.6rem',
                              fontSize: '0.85rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              opacity: isRoundOver ? 0.6 : 1,
                              cursor: isRoundOver ? 'not-allowed' : 'text'
                            }}
                          />
                          <button
                            type="submit"
                            disabled={!textVal.trim() || isRoundOver}
                            className="btn btn-accent"
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 800 }}
                          >
                            Submit
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <header className="header-bar student-header-bar">
        <div>
          <span style={styles.headerCode}>CLASS: {classId}</span>
          <h2 style={{ margin: 0 }}>
            Hello, {titlePrefix}{student.name}! 👋
          </h2>
        </div>
        <div className="student-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mute/Unmute Toggle */}
          <button 
            onClick={toggleMute} 
            className="btn btn-secondary" 
            style={{ padding: '0.45rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={isMuted ? 'Unmute Sounds' : 'Mute Sounds'}
          >
            {isMuted ? <VolumeX size={18} color="var(--text-secondary)" /> : <Volume2 size={18} color="var(--accent-primary)" />}
          </button>

          <div style={styles.statsBadge}>🪙 <strong>{syncedStudent.coins || 0}</strong></div>
          <div style={styles.statsBadge}><CheckCircle size={15} color="#22c55e" /><span>{syncedStudent.totalSolved || 0} Solved</span></div>
          
          <button onClick={() => setShowPocket(true)} className="btn btn-secondary" style={styles.headerActionBtn}>
            🎒 Pocket
          </button>
          
          <button 
            onClick={() => {
              if (session?.isShopLocked) {
                alert('🛑 The Coach has locked all Shops for this round!');
              } else {
                setShowShop(true);
              }
            }} 
            className="btn btn-secondary" 
            style={{ 
              ...styles.headerActionBtn, 
              opacity: session?.isShopLocked ? 0.65 : 1,
              cursor: session?.isShopLocked ? 'not-allowed' : 'pointer'
            }}
            title="Pokémon Companion & Items Shop"
          >
            🏪 Pokémon Shop {session?.isShopLocked && '🔒'}
          </button>

          <button 
            onClick={() => {
              if (session?.isShopLocked) {
                alert('🛑 The Coach has locked all Shops for this round!');
              } else {
                setShowFootballCardShop(true);
              }
            }} 
            className="btn btn-secondary" 
            style={{ 
              ...styles.headerActionBtn, 
              opacity: session?.isShopLocked ? 0.65 : 1,
              cursor: session?.isShopLocked ? 'not-allowed' : 'pointer',
              border: '1px solid rgba(245, 158, 11, 0.4)',
            }}
            title="Football Card Shop & Album"
          >
            ⚽ Football Shop {session?.isShopLocked && '🔒'}
          </button>

          <button 
            onClick={() => {
              if (confirm("Are you sure you want to leave this session?")) {
                onLeave();
              }
            }} 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem 1rem' }}
          >
            Leave
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT: PUZZLE DASHBOARD ── */}
      <div className="dashboard-grid">

        {/* LEFT: Turn Indicator, Skip & Pokémon companion card */}
        <div className="sidebar-col companion-col" style={styles.sidebar}>

          {/* Turn Indicator & Skip Action Card (Left side of screen) */}
          {sessionStarted && activePuzzle && (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '0.85rem', 
                borderRadius: '16px', 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1.5px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              {/* Which Side to Move Indicator */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  justifyContent: 'center',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: actualSideToMove === 'white' ? '#ffffff' : '#1e293b',
                  border: actualSideToMove === 'white' ? '2.5px solid #cbd5e1' : '2.5px solid #64748b',
                  boxShadow: actualSideToMove === 'white'
                    ? '0 0 10px rgba(255,255,255,0.7)'
                    : '0 0 8px rgba(0,0,0,0.5)',
                  flexShrink: 0
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                  <span style={{
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: 1.1
                  }}>
                    {actualSideToMove === 'white' ? 'White to Play' : 'Black to Play'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {actualSideToMove === 'white' ? '⚪ Your Turn' : '⚫ Your Turn'}
                  </span>
                </div>
              </div>

              {/* Quick Skip Button */}
              {!successSolved && !customSolved && session?.round?.status === 'active' && !isRoundOver && (
                <button
                  onClick={() => handleSkipPuzzle(false)}
                  disabled={remainingSkips <= 0 || syncedStudent?.stonewalled}
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    backgroundColor: (remainingSkips <= 0 || syncedStudent?.stonewalled) ? 'var(--bg-tertiary)' : '#d97706',
                    color: (remainingSkips <= 0 || syncedStudent?.stonewalled) ? 'var(--text-secondary)' : '#ffffff',
                    border: 'none',
                    cursor: (remainingSkips <= 0 || syncedStudent?.stonewalled) ? 'not-allowed' : 'pointer',
                    boxShadow: (remainingSkips <= 0 || syncedStudent?.stonewalled) ? 'none' : '0 4px 12px rgba(217, 119, 6, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  title={syncedStudent?.stonewalled ? 'Stonewalled! Cannot skip.' : ''}
                >
                  ⏩ Skip Puzzle {syncedStudent?.stonewalled ? '(Stonewalled)' : remainingSkips > 0 ? `(${remainingSkips} left)` : '(Used)'}
                </button>
              )}
            </div>
          )}

          <div 
            className="glass-panel" 
            style={{ 
              ...styles.catCard,
              boxShadow: equippedBorder === 'flair_gold_border' 
                ? '0 0 12px #f59e0b' 
                : equippedBorder === 'flair_diamond_border'
                  ? '0 0 18px #3b82f6'
                  : 'none',
              border: equippedBorder === 'flair_gold_border'
                ? '2px solid #f59e0b'
                : equippedBorder === 'flair_diamond_border'
                  ? '2px solid #3b82f6'
                  : '1px solid var(--border-color)',
            }}
          >
            <PokemonCompanion
              pokemonId={syncedStudent.equippedPokemon || 'togepi'}
              state={getCompanionState()}
              studentName={student.name}
              customText={catSpeechOverride}
              onFeedBerry={handleFeedBerry}
              coins={syncedStudent.coins || 0}
            />
          </div>

          {/* Teammate Active Skills Bar (Moved from Top of Board) */}
          {session && (
            <div className="glass-panel" style={{ padding: '0.8rem', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🎒 Teammate Skills</span>
                {session?.isFocusMode ? (
                  <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 800 }}>🛡️ Focus Mode (Spells Paused)</span>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', opacity: 0.8 }}>
                    {session?.round?.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(syncedStudent.activeTeam || ['togepi']).map(pokeId => {
                  const poke = POKEMON_CATALOG.find(p => p.id === pokeId);
                  if (!poke) return null;
                  
                  const cooldownUntil = syncedStudent.pokemonCooldowns?.[pokeId] || 0;
                  const isCooldown = cooldownUntil > currentTime;
                  const remaining = Math.max(0, Math.round((cooldownUntil - currentTime) / 1000));
                  const isPassive = poke.skill?.type === 'passive';
                  const isRoundActive = session?.round?.status === 'active';
                  
                  return (
                    <div 
                      key={pokeId} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.4rem', 
                        padding: '0.4rem', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--bg-tertiary)',
                        opacity: isCooldown ? 0.6 : 1,
                        position: 'relative'
                      }}
                      title={poke.skill ? `${poke.skill.name}: ${poke.skill.description}` : `${poke.name}`}
                    >
                      <img src={poke.spriteUrl} alt={poke.name} onError={(e) => handlePokemonImageError(e, poke)} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{poke.name}</span>
                        <span style={{ fontSize: '0.58rem', color: isCooldown ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isPassive ? `${poke.skill?.name || 'Passive'}` : (session?.isFocusMode ? 'Focus Mode 🛡️' : isSleeping ? 'Sleeping 💤' : isCooldown ? `Cooldown (${remaining}s)` : 'Ready')}
                        </span>
                      </div>
                      {!isPassive && (
                        <button
                          onClick={() => handleUseActiveSkill(pokeId, poke.skill)}
                          className="btn btn-accent"
                          disabled={!isRoundActive || isFrozen || isParalyzed || isSmoked || isWatered || isSleeping || isCooldown || session?.isFocusMode}
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: (!isRoundActive || isFrozen || isParalyzed || isSmoked || isWatered || isSleeping || isCooldown || session?.isFocusMode) ? 'not-allowed' : 'pointer',
                            backgroundColor: session?.isFocusMode ? '#64748b' : isSleeping ? '#6b7280' : isCooldown ? '#4b5563' : '#8b5cf6',
                            color: '#fff'
                          }}
                        >
                          {session?.isFocusMode ? 'Focus 🛡️' : isSleeping ? '💤' : isCooldown ? `${remaining}s` : 'Use'}
                        </button>
                      )}
                      {isPassive && (
                        <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 800, paddingRight: '4px' }}>
                          Passive
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}



        </div>

        {/* CENTER: Puzzle board & active elements */}
        <div className="board-col" style={styles.boardCol}>
          
          {/* Active Round Timer Display */}
          {sessionStarted && session?.round?.status === 'active' && (
            <div style={{ width: '100%', marginBottom: '0.8rem' }}>
              <TimerDisplay
                startedAt={session.round.startedAt}
                duration={session.round.duration}
                extraTime={session.round.extraTimeAdded}
                status={session.round.status}
                size="compact"
              />
            </div>
          )}



          <div className="glass-panel student-workspace-card" style={styles.workspaceCard}>

            {/* ── WAITING STATE (session not started) ── */}
            {!sessionStarted ? (
              <div style={styles.waitingState}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, marginBottom: '0.5rem' }}>Waiting for Coach</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '300px', textAlign: 'center' }}>
                  Your teacher will start the round soon. Get ready! ♟
                </p>
                <div style={{ width: '100%', maxWidth: `${maxBoardWidth}px`, marginTop: '1.5rem' }}>
                  <ChessboardWrapper
                    position={START_FEN}
                    onMove={() => false}
                    interactive={false}
                    puzzleFen={START_FEN}
                    maxWidth={`${maxBoardWidth}px`}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Active Spells & Buffs Indicators */}
                {(syncedStudent?.stonewalled || 
                  isWind ||
                  isSleeping ||
                  (syncedStudent?.activeTaxUntil && syncedStudent.activeTaxUntil > currentTime) || 
                  (syncedStudent?.activeBountyUntil && syncedStudent.activeBountyUntil > currentTime)) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    {syncedStudent.stonewalled && (
                      <div style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', backgroundColor: '#475569', color: '#fff', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>🧱 Stonewall Active (Rating 2400+)</span>
                      </div>
                    )}
                    {isWind && (
                      <div style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', backgroundColor: '#0ea5e9', color: '#fff', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>🍃 Cyclone Wind: Pieces swaying! ({Math.max(0, Math.round((syncedStudent.activeEffects.wind.until - currentTime) / 1000))}s)</span>
                      </div>
                    )}
                    {isSleeping && (
                      <div style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', backgroundColor: '#a855f7', color: '#fff', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #c084fc', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>💤 Sleep Powder: Companions Asleep! ({Math.max(0, Math.round((syncedStudent.activeEffects.sleep.until - currentTime) / 1000))}s)</span>
                      </div>
                    )}
                    {syncedStudent.activeTaxUntil && syncedStudent.activeTaxUntil > currentTime && (
                      <div style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', backgroundColor: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>💸 Leaderboard Tax: +15 🪙 ({Math.max(0, Math.round((syncedStudent.activeTaxUntil - currentTime) / 1000))}s)</span>
                      </div>
                    )}
                    {syncedStudent.activeBountyUntil && syncedStudent.activeBountyUntil > currentTime && (
                      <div style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', backgroundColor: '#d97706', color: '#fff', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #fbbf24', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>👑 King\'s Bounty: +10 🪙 ({Math.max(0, Math.round((syncedStudent.activeBountyUntil - currentTime) / 1000))}s)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── ACTIVE PUZZLE HEADER ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={styles.puzzleNumBadge}>Puzzle #{puzzleNumber}</span>
                      {activePuzzle?.difficulty && (
                        <span style={{ ...styles.diffBadge, background: activePuzzle.difficulty === 'beginner' ? 'hsl(145,60%,40%)' : activePuzzle.difficulty === 'advanced' ? 'hsl(0,70%,50%)' : 'hsl(38,90%,45%)' }}>
                          {activePuzzle.difficulty.charAt(0).toUpperCase() + activePuzzle.difficulty.slice(1)}
                        </span>
                      )}
                      {activePuzzle?.rating && (
                        <span style={{ ...styles.diffBadge, background: 'hsl(38,90%,50%)', color: '#000' }}>★ {activePuzzle.rating}</span>
                      )}
                      {activePuzzle?.mixedBandLabel && (
                        <span style={{ ...styles.diffBadge, background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
                          {activePuzzle.mixedBandLabel}
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: '0.2rem 0 0' }}>{activePuzzle?.title || 'Loading puzzle…'}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      Round Solves: {syncedStudent.roundSolved || 0}
                    </div>
                  </div>
                </div>

                {/* Incorrect move banner */}
                {incorrectMoveText && (
                  <div style={styles.incorrectToast} className="animate-shake">
                    <AlertCircle size={15} />
                    <span>{incorrectMoveText}</span>
                  </div>
                )}

                {/* ── BOARD ── */}
                <div 
                  className={`${isWrongMove ? 'animate-shake' : ''} ${isWind ? 'wind-affected-board' : ''}`} 
                  style={{ 
                    width: '100%', 
                    position: 'relative',
                    borderRadius: '12px',
                    border: syncedStudent.stonewalled ? '4px solid #64748b' : '4px solid transparent',
                    boxShadow: syncedStudent.stonewalled ? '0 0 25px rgba(100, 116, 139, 0.6)' : 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <ChessboardWrapper
                    position={boardPosition}
                    onMove={handleMovePiece}
                    theme={equippedTheme}
                    puzzleFen={activePuzzle?.fen}
                    orientation={getStudentBoardOrientation(activePuzzle)}
                    interactive={!successSolved && !customSolved && session?.status !== 'paused' && (session?.round?.status === 'active' || !session?.round?.status) && !isFrozen && !isSmoked && !isParalyzed && !isWatered && !isRoundOver}
                    maxWidth={`${maxBoardWidth}px`}
                  />

                  <ChessboardAnimationCanvas
                    fire={fireSweepActive}
                    ice={isFrozen}
                    lightning={isParalyzed}
                    smoke={isSmoked}
                    water={isWatered}
                    wind={isWind}
                    sleep={isSleeping}
                  />

                  {/* Custom Solved Overlay */}
                  {customSolved && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                      textAlign: 'center',
                      padding: '2rem',
                      borderRadius: '8px',
                      backdropFilter: 'blur(4px)',
                      color: '#fff'
                    }}>
                      <span style={{ fontSize: '4.5rem', marginBottom: '0.8rem' }}>🏆</span>
                      <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#10b981', margin: 0 }}>
                        All Challenges Solved!
                      </h2>
                      <p style={{ fontSize: '1rem', marginTop: '0.5rem', opacity: 0.9, maxWidth: '280px', margin: '0.5rem 0 0 0' }}>
                        Round is ended, waiting for coach.
                      </p>
                    </div>
                  )}

                  {/* Water Blast Overlay */}
                  {isWatered && (
                    <div className="ice-freeze-overlay" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(255, 255, 255, 0.25) 50%, rgba(29, 78, 216, 0.6) 100%)', border: '4px solid rgba(59, 130, 246, 0.7)', boxShadow: 'inset 0 0 50px rgba(59, 130, 246, 0.8)', color: '#1e3a8a' }}>
                      <span style={{ fontSize: '3rem' }}>💧</span>
                      <h3 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>WATER BLASTED!</h3>
                      <p style={{ fontSize: '0.85rem' }}>
                        Drenched by classmate <strong>{syncedStudent.activeEffects.waterblast.attacker}</strong>!
                      </p>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Remaining: {Math.max(0, Math.round((syncedStudent.activeEffects.waterblast.until - currentTime) / 1000))}s</span>
                    </div>
                  )}

                  {/* Frozen Overlay */}
                  {isFrozen && (
                    <div className="ice-freeze-overlay">
                      <span style={{ fontSize: '3rem' }}>❄️</span>
                      <h3 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>FROZEN!</h3>
                      <p style={{ fontSize: '0.85rem' }}>
                        Frozen by classmate <strong>{syncedStudent.activeEffects.freeze.attacker}</strong>!
                      </p>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Remaining: {Math.max(0, Math.round((syncedStudent.activeEffects.freeze.until - currentTime) / 1000))}s</span>
                    </div>
                  )}

                  {/* Paralyzed Overlay */}
                  {isParalyzed && (
                    <div className="lightning-overlay">
                      <span style={{ fontSize: '3rem' }}>⚡</span>
                      <h3 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>PARALYZED!</h3>
                      <p style={{ fontSize: '0.85rem' }}>
                        Zapped by classmate <strong>{syncedStudent.activeEffects.paralyze.attacker}</strong>!
                      </p>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Remaining: {Math.max(0, Math.round((syncedStudent.activeEffects.paralyze.until - currentTime) / 1000))}s</span>
                    </div>
                  )}

                  {/* Smokescreen Overlay */}
                  {isSmoked && (
                    <div style={styles.smokeOverlay}>
                      <span style={{ fontSize: '2.5rem' }}>🌫️</span>
                      <h3 style={{ margin: '0.2rem 0', fontWeight: 'bold', fontSize: '1rem' }}>SMOKESCREEN!</h3>
                      <p style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                        Obscured by classmate <strong>{syncedStudent.activeEffects.smokescreen.attacker}</strong>!
                      </p>
                      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Obscured: {Math.max(0, Math.round((syncedStudent.activeEffects.smokescreen.until - currentTime) / 1000))}s</span>
                    </div>
                  )}

                  {/* Fire Sweep Animation */}
                  {fireSweepActive && (
                    <div className="fire-sweep-overlay">
                      <span style={{ fontSize: '4.5rem', marginBottom: '0.5rem' }}>🔥</span>
                      <h2 style={{ fontWeight: 900, fontSize: '1.6rem', color: '#facc15', margin: 0 }}>FLAMETHROWER BLAST!</h2>
                    </div>
                  )}

                  {/* Stonewall Loading Overlay */}
                  {syncedStudent.stonewalled && !stonewallPuzzle && (
                    <div className="ice-freeze-overlay" style={{ background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)', border: '4px solid #64748b', color: '#f1f5f9' }}>
                      <span style={{ fontSize: '3rem' }}>🧱</span>
                      <h3 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>STONEWALL ACTIVE!</h3>
                      <p style={{ fontSize: '0.85rem', maxWidth: '280px' }}>
                        An opponent stonewalled you! Carving your Expert (2000+ Elo) puzzle...
                      </p>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>⌛ loading...</span>
                    </div>
                  )}
                </div>

                <p style={{ margin: '0.75rem 0', textAlign: 'center', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {activePuzzle?.description}
                </p>

                {/* ── SUCCESS STATE ── */}
                {successSolved && (
                  <div style={styles.successBanner} className="animate-slide-up">
                    <span style={{ fontSize: '1.5rem' }}>✨</span>
                    <strong>Brilliant! Next puzzle loading…</strong>
                  </div>
                )}

                {/* Action buttons */}
                {!successSolved && !customSolved && session?.round?.status === 'active' && !isRoundOver && (
                  <div className="student-action-row" style={styles.actionRow}>
                    <button
                      onClick={() => handleSkipPuzzle(false)}
                      disabled={remainingSkips <= 0 || syncedStudent?.stonewalled}
                      className="btn btn-secondary"
                      style={{ 
                        flex: 1, 
                        backgroundColor: (remainingSkips <= 0 || syncedStudent?.stonewalled) ? 'var(--bg-tertiary)' : '#d97706',
                        color: '#fff',
                        borderColor: '#b45309'
                      }}
                      title={syncedStudent?.stonewalled ? 'Stonewalled! Cannot skip.' : ''}
                    >
                      ⏩ Skip Puzzle {syncedStudent?.stonewalled ? '(Stonewalled)' : remainingSkips > 0 ? `(${remainingSkips} left)` : '(Used)'}
                    </button>
                    
                    <button
                      onClick={() => setShowSkillMenu(true)}
                      className="btn btn-accent"
                      style={{ 
                        flex: 1, 
                        backgroundColor: '#8b5cf6', 
                        borderColor: '#7c3aed', 
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      ⚡ Use Skill
                    </button>

                    <button
                      onClick={handleRequestHelp}
                      disabled={syncedStudent.status === 'help'}
                      className="btn btn-accent"
                      style={{ flex: 1 }}
                    >
                      {syncedStudent.status === 'help' ? '🆘 Help Requested!' : '🙋 Ask Coach'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Live Round Leaderboard, Wall of Fame & Achievements */}
        <div className="achievement-col" style={styles.achievementCol}>

          {/* Wall of Fame: Top 3 Single-Round Record Solvers */}
          <div 
            className="glass-panel" 
            style={{ 
              ...styles.achCard,
              marginBottom: '1rem',
              background: 'linear-gradient(180deg, var(--bg-secondary) 0%, rgba(245, 158, 11, 0.05) 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.35)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏛️</span>
                <div>
                  <h3 style={{ fontSize: '0.88rem', margin: 0, fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    Wall of Fame
                  </h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Top 3 in Single Round
                  </span>
                </div>
              </div>
              <span style={{ 
                fontSize: '0.62rem', 
                padding: '2px 7px', 
                borderRadius: '6px', 
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(234, 179, 8, 0.15))', 
                color: '#d97706', 
                fontWeight: 900,
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}>
                👑 BEST
              </span>
            </div>

            {wallOfFameTop3.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '0.9rem 0.5rem', 
                color: 'var(--text-secondary)', 
                fontSize: '0.78rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '10px',
                border: '1px dashed var(--border-color)'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>⭐</div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>No records set yet!</div>
                <div style={{ fontSize: '0.7rem' }}>Solve puzzles this round to claim the #1 spot!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {wallOfFameTop3.map((s, idx) => {
                  const isMe = s.id === student.id;
                  const medals = ['🥇', '🥈', '🥉'];
                  const medal = medals[idx] || `#${idx + 1}`;
                  const record = s.singleRoundRecord || 0;
                  const bgStyles = [
                    'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(234, 179, 8, 0.05))',
                    'linear-gradient(135deg, rgba(148, 163, 184, 0.14), rgba(203, 213, 225, 0.05))',
                    'linear-gradient(135deg, rgba(217, 119, 6, 0.12), rgba(180, 83, 9, 0.04))'
                  ];
                  const borderColors = ['#f59e0b', '#94a3b8', '#d97706'];
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '10px',
                        background: isMe ? 'hsla(260, 80%, 60%, 0.15)' : bgStyles[idx] || 'var(--bg-tertiary)',
                        border: isMe ? '2px solid var(--accent-primary)' : `1px solid ${borderColors[idx] || 'var(--border-color)'}`,
                        boxShadow: idx === 0 ? '0 2px 8px rgba(245, 158, 11, 0.2)' : 'none',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <span style={{ fontSize: '1.1rem', minWidth: '22px' }}>{medal}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{
                            fontWeight: isMe ? 900 : 700,
                            color: isMe ? 'var(--accent-primary)' : 'var(--text-primary)',
                            fontSize: '0.78rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '90px'
                          }}>
                            {isMe ? 'You' : s.name}
                          </span>
                          {s.roundSolved > 0 && session?.round?.status === 'active' && (
                            <span style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 700 }}>
                              Current: {s.roundSolved}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          color: idx === 0 ? '#d97706' : 'var(--text-primary)'
                        }}>
                          {record} solved
                        </span>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          single round
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top 5 Round Leaderboard */}
          {sessionStarted && top5Round.length > 0 && (
            <div className="glass-panel" style={styles.achCard}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.6rem' }}>🏆 Round Top 5</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {top5Round.map((s, i) => {
                  const isMe = s.id === student.id;
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        backgroundColor: isMe ? 'hsla(260, 80%, 60%, 0.12)' : 'var(--bg-tertiary)',
                        border: isMe ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.9rem', minWidth: '22px' }}>{medal}</span>
                        <span style={{
                          fontWeight: isMe ? 800 : 600,
                          color: isMe ? 'var(--accent-primary)' : 'var(--text-primary)',
                          maxWidth: '90px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {isMe ? 'You' : s.name}
                        </span>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.8rem' }}>
                        {s.roundSolved || 0} solved
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="glass-panel" style={styles.achCard}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>🏅 Achievements</h3>
            {(syncedStudent.achievements || []).length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                Solve puzzles to unlock achievements!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }} className="custom-scrollbar">
                {(syncedStudent.achievements || []).map(ach => (
                  <div key={ach} style={styles.achItem}>
                    <span style={{ fontSize: '1.1rem' }}>🏆</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{ach}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{getAchievementDescription(ach)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'Coins', value: syncedStudent.coins || 0, icon: '🪙' },
                  { label: 'Solved', value: syncedStudent.totalSolved || 0, icon: '✅' },
                  { label: 'Streak', value: `${syncedStudent.streak || 0}🔥`, icon: '' },
                  { label: 'Badges', value: (syncedStudent.achievements || []).length, icon: '🏅' },
                ].map(s => (
                  <div key={s.label} style={styles.miniStat}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{s.icon}{s.value}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* Pokémon Pocket Modal */}
      {showPocket && (
        <PokemonCollection
          ownedPokemon={syncedStudent.ownedPokemon || []}
          equippedPokemon={syncedStudent.equippedPokemon || 'togepi'}
          activeTeam={syncedStudent.activeTeam || ['togepi']}
          pokemonXp={syncedStudent.pokemonXp || {}}
          coins={syncedStudent.coins || 0}
          onEquip={handleEquipPokemon}
          onToggleTeam={async (pokeId) => {
            let team = [...(syncedStudent.activeTeam || [])];
            if (team.includes(pokeId)) {
              team = team.filter(id => id !== pokeId);
            } else {
              if (team.length >= 6) return;
              team.push(pokeId);
            }
            setSyncedStudent(prev => ({ ...prev, activeTeam: team }));
            await updateStudentStatus(classId, student.id, { activeTeam: team });
          }}
          onFeedBerry={async (pokeId) => {
            const res = await feedBerry(classId, student.id, pokeId);
            if (res && res.success) {
              setSyncedStudent(prev => ({
                ...prev,
                coins: res.newCoins,
                pokemonXp: { ...prev.pokemonXp, [pokeId]: res.xp },
                ownedPokemon: res.evolved ? prev.ownedPokemon.filter(id => id !== res.from).concat(res.to) : prev.ownedPokemon,
                activeTeam: res.evolved ? prev.activeTeam.map(id => id === res.from ? res.to : id) : prev.activeTeam,
                equippedPokemon: res.evolved && prev.equippedPokemon === res.from ? res.to : prev.equippedPokemon
              }));
            }
            return res;
          }}
          onOpenFootballShop={() => {
            if (session?.isShopLocked) {
              alert('🛑 The Coach has locked all Shops for this round!');
              return;
            }
            setShowPocket(false);
            setShowFootballCardShop(true);
          }}
          onClose={() => setShowPocket(false)}
        />
      )}

      {/* Classmate Target Selector Modal */}
      {showTargetSelector && targetingSkill && (
        <div style={styles.overlay} className="modal-backdrop">
          <div style={{ ...styles.overlayCard, maxWidth: '340px' }} className="glass-panel scale-up-anim">
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 800 }}>Select Classmate Target</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Select a classmate to target with <strong>{targetingSkill.isSpell ? targetingSkill.name : targetingSkill.skill?.name}</strong>:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1.2rem' }} className="custom-scrollbar">
              {students
                .filter(s => s.id !== student.id && s.status !== 'offline')
                .map(s => (
                  <button
                    key={s.id}
                    onClick={async () => {
                      setShowTargetSelector(false);
                      const SPELL_COOLDOWNS = {
                        spell_flamethrower: 60,
                        spell_lockboard: 90,
                        spell_boardflip: 75,
                        spell_tax: 90,
                        spell_bounty: 90,
                        spell_stonewall: 120,
                        spell_thundershock: 60,
                        spell_waterblast: 60,
                        spell_windattack: 75,
                        spell_sleeppowder: 80
                      };

                      if (targetingSkill.isSpell) {
                        const spellId = targetingSkill.spellId;
                        const inventory = syncedStudent.spellInventory || {};
                        const qty = inventory[spellId] || 0;
                        if (qty > 0) {
                          // Consumable spells - reduce quantity and delete if 0
                          const updatedInventory = { ...inventory, [spellId]: qty - 1 };
                          if (updatedInventory[spellId] <= 0) {
                            delete updatedInventory[spellId];
                          }
                          setSyncedStudent(prev => ({ ...prev, spellInventory: updatedInventory }));
                          await updateStudentStatus(classId, student.id, { spellInventory: updatedInventory });
                          
                          if (spellId === 'spell_stonewall') {
                            await updateStudentStatus(classId, s.id, { stonewalled: true });
                            playSpellSound('ice');
                            setCatSpeechOverride(`🧱 Stonewalled ${s.name}! Overwrote their next puzzle with a 2000+ Elo Expert challenge!`);
                          } else if (spellId === 'spell_thundershock') {
                            await triggerSkillOnStudent(classId, student.name, s.id, 'paralyze', 15);
                            playSpellSound('lightning');
                            setCatSpeechOverride(`⚡ Thunder Shocked ${s.name}'s board for 15s!`);
                          } else if (spellId === 'spell_waterblast') {
                            await triggerSkillOnStudent(classId, student.name, s.id, 'waterblast', 15);
                            playSpellSound('water');
                            setCatSpeechOverride(`💧 Water Blasted ${s.name}'s board for 15s!`);
                          } else if (spellId === 'spell_windattack') {
                            await triggerSkillOnStudent(classId, student.name, s.id, 'wind', 15);
                            playSpellSound('wind');
                            setCatSpeechOverride(`🍃 Cast Wind Attack on ${s.name}! Pieces will blow away!`);
                          } else if (spellId === 'spell_sleeppowder') {
                            await triggerSkillOnStudent(classId, student.name, s.id, 'sleep', 40);
                            playSpellSound('sleep');
                            setCatSpeechOverride(`💤 Sleep Powder cast on ${s.name}! Put all their Pokemon to sleep for 40s!`);
                          }
                        }
                      } else {
                        const pokeId = targetingSkill.pokemonId;
                        const skill = targetingSkill.skill;
                        
                        const pokeItem = POKEMON_CATALOG.find(p => p.id === pokeId);
                        let dur = 15;
                        let cooldownDuration = 60;
                        if (pokeItem) {
                          if (pokeItem.rarity === 'legendary') {
                            dur = 40;
                            cooldownDuration = 120;
                          } else if (pokeItem.rarity === 'epic') {
                            dur = 30;
                            cooldownDuration = 90;
                          } else if (pokeItem.rarity === 'rare') {
                            dur = 20;
                            cooldownDuration = 75;
                          } else {
                            dur = 15;
                            cooldownDuration = 60;
                          }
                        }

                        const pokemonCooldowns = { ...(syncedStudent.pokemonCooldowns || {}) };
                        pokemonCooldowns[pokeId] = Date.now() + cooldownDuration * 1000;
                        setSyncedStudent(prev => ({ ...prev, pokemonCooldowns }));
                        await updateStudentStatus(classId, student.id, { pokemonCooldowns });

                        if (skill.id === 'freeze') {
                          await triggerSkillOnStudent(classId, student.name, s.id, 'freeze', dur);
                          playSpellSound('ice');
                          setCatSpeechOverride(`Roar of Time froze ${s.name}'s board for ${dur}s! 🧊❄️`);
                        } else if (skill.id === 'paralyze') {
                          await triggerSkillOnStudent(classId, student.name, s.id, 'paralyze', dur);
                          playSpellSound('lightning');
                          setCatSpeechOverride(`Bolt Strike paralyzed ${s.name}'s board for ${dur}s! ⚡💥`);
                        } else if (skill.id === 'smokescreen') {
                          await triggerSkillOnStudent(classId, student.name, s.id, 'smokescreen', dur);
                          playSpellSound('fire');
                          setCatSpeechOverride(`Smokescreen blinded ${s.name}'s board for ${dur}s! 🌫️🌀`);
                        } else if (skill.id === 'coinSteal') {
                          const stealAmt = skill.params?.amount || skill.params?.steal || 20;
                          await stealCoinsFromStudent(classId, student.id, student.name, s.id, stealAmt);
                          playSpellSound('sleep');
                          setCatSpeechOverride(`Stole ${stealAmt} coins from ${s.name}! 💸🐱`);
                        } else if (skill.id === 'lunalaSteal') {
                          const stealAmt = skill.params?.amount || 50;
                          await stealCoinsFromStudent(classId, student.id, student.name, s.id, stealAmt);
                          await triggerSkillOnStudent(classId, student.name, s.id, 'smokescreen', dur);
                          playSpellSound('fire');
                          setCatSpeechOverride(`Moongeist Beam stole ${stealAmt} coins and blinded ${s.name}! 🦇🌫️`);
                        } else if (skill.id === 'waterblast') {
                          await triggerSkillOnStudent(classId, student.name, s.id, 'waterblast', dur);
                          playSpellSound('water');
                          setCatSpeechOverride(`Water Blast drenched ${s.name}'s board for ${dur}s! 💧🌊`);
                        } else if (skill.id === 'windattack') {
                          await triggerSkillOnStudent(classId, student.name, s.id, 'wind', dur);
                          playSpellSound('wind');
                          setCatSpeechOverride(`Cyclone Wing blew away ${s.name}'s board for ${dur}s! 🍃🌪️`);
                        } else if (skill.id === 'sleep') {
                          await triggerSkillOnStudent(classId, student.name, s.id, 'sleep', dur);
                          playSpellSound('sleep');
                          setCatSpeechOverride(`Sing Lullaby put ${s.name}'s Pokemon companions to sleep for ${dur}s! 💤💤`);
                        }
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '0.5rem', textAlign: 'left', fontSize: '0.88rem' }}
                  >
                    ♟ {s.name} (Rank: {students.findIndex(x => x.id === s.id) + 1})
                  </button>
                ))}
              {students.filter(s => s.id !== student.id && s.status !== 'offline').length === 0 && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>No classmates currently online.</span>
              )}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => {
                setShowTargetSelector(false);
                setTargetingSkill(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Choose Teammate Skill Modal */}
      {showSkillMenu && (
        <div style={styles.overlay} className="modal-backdrop">
          <div style={{ ...styles.overlayCard, maxWidth: '380px' }} className="glass-panel scale-up-anim">
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 800 }}>⚡ Choose Teammate Skill</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Select an active teammate skill to trigger:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', marginBottom: '1.2rem' }} className="custom-scrollbar">
              {(syncedStudent.activeTeam || ['togepi'])
                .map(pokeId => {
                  const poke = POKEMON_CATALOG.find(p => p.id === pokeId);
                  return { pokeId, poke };
                })
                .filter(item => item.poke && item.poke.skill)
                .map(({ pokeId, poke }) => {
                  const isCooldown = syncedStudent.cooldowns?.[pokeId] === true;
                  const isPassive = poke.skill.type === 'passive';
                  const isRoundActive = session?.round?.status === 'active';
                  
                  return (
                    <div 
                      key={pokeId} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '0.5rem', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '10px', 
                        background: 'var(--bg-secondary)',
                        opacity: (isCooldown || isPassive) ? 0.6 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={poke.spriteUrl} alt={poke.name} onError={(e) => handlePokemonImageError(e, poke)} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{poke.name}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            {poke.skill.name} ({isPassive ? 'Passive' : 'Active'})
                          </span>
                        </div>
                      </div>

                      {isPassive ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 600 }}>
                          Auto-Passive
                        </span>
                      ) : isCooldown ? (
                        <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
                          Used
                        </span>
                      ) : (
                        <button
                          disabled={!isRoundActive || isFrozen || isParalyzed || isSmoked}
                          onClick={() => {
                            setShowSkillMenu(false);
                            handleUseActiveSkill(pokeId, poke.skill);
                          }}
                          className="btn btn-accent"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: 'none' }}
                        >
                          Trigger
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => setShowSkillMenu(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reward Shop Modal */}
      {showShop && (
        <RewardShop
          coins={syncedStudent.coins || 0}
          ownedPokemon={syncedStudent.ownedPokemon || []}
          ownedItems={syncedStudent.ownedItems || []}
          equippedPokemon={syncedStudent.equippedPokemon || 'togepi'}
          equippedItems={syncedStudent.equippedItems || {}}
          activeTeam={syncedStudent.activeTeam || ['togepi']}
          onPurchasePokemon={handlePurchasePokemon}
          onPurchaseShopItem={handlePurchaseShopItem}
          onEquipPokemon={handleEquipPokemon}
          onEquipShopItem={handleEquipShopItem}
          onToggleTeam={async (pokeId) => {
            let team = [...(syncedStudent.activeTeam || [])];
            if (team.includes(pokeId)) {
              team = team.filter(id => id !== pokeId);
            } else {
              if (team.length >= 6) return;
              team.push(pokeId);
            }
            setSyncedStudent(prev => ({ ...prev, activeTeam: team }));
            await updateStudentStatus(classId, student.id, { activeTeam: team });
          }}
          onOpenMysteryBox={() => {
            if (session?.isShopLocked) {
              alert('🛑 The Coach has locked all Shops & Mystery Boxes for this round!');
              return;
            }
            setShowShop(false);
            setShowMystery(true);
          }}
          onOpenFootballShop={() => {
            if (session?.isShopLocked) {
              alert('🛑 The Coach has locked all Shops for this round!');
              return;
            }
            setShowShop(false);
            setShowFootballCardShop(true);
          }}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Mystery Box Panel */}
      {showMystery && (
        <MysteryBox
          coins={syncedStudent.coins || 0}
          activeTeam={syncedStudent.activeTeam || ['togepi']}
          onOpenBox={handleOpenMysteryBox}
          onToggleTeam={async (pokeId) => {
            let team = [...(syncedStudent.activeTeam || [])];
            if (team.includes(pokeId)) {
              team = team.filter(id => id !== pokeId);
            } else {
              if (team.length >= 6) return;
              team.push(pokeId);
            }
            setSyncedStudent(prev => ({ ...prev, activeTeam: team }));
            await updateStudentStatus(classId, student.id, { activeTeam: team });
          }}
          onClose={() => setShowMystery(false)}
        />
      )}

      {/* ⚽ Football Card Shop Modal */}
      {showFootballCardShop && (
        <FootballCardShop
          coins={syncedStudent.coins || 0}
          ownedCards={syncedStudent.ownedFootballCards || []}
          onPurchaseCard={async (cardId, cost) => {
            const res = await purchaseFootballCard(classId, student.id, cardId, cost);
            if (res && res.success) {
              const toastId = Date.now();
              setCoinToasts(prev => [...prev, { id: toastId, text: `-${cost} 🪙 (Card Purchased!)`, isNegative: true }]);
              setTimeout(() => setCoinToasts(prev => prev.filter(t => t.id !== toastId)), 2500);

              setSyncedStudent(prev => ({
                ...prev,
                coins: res.newCoins,
                ownedFootballCards: [...(prev.ownedFootballCards || []), cardId]
              }));
            }
          }}
          onOpenBoosterPack={async () => {
            const rolledCard = rollFootballBoosterPack(syncedStudent.ownedFootballCards || []);
            const res = await openFootballBoosterPack(classId, student.id, rolledCard);
            if (res && res.success) {
              const prevOwned = syncedStudent.ownedFootballCards || [];
              const newOwned = prevOwned.includes(rolledCard.id) ? prevOwned : [...prevOwned, rolledCard.id];
              
              const toastId = Date.now();
              if (res.isDuplicate) {
                setCoinToasts(prev => [...prev, { id: toastId, text: `-150 🪙 / +${res.refundCoins || 30} 🪙 (Duplicate Refund)`, isNegative: false }]);
              } else {
                setCoinToasts(prev => [...prev, { id: toastId, text: `-150 🪙 (Booster Pack Opened!)`, isNegative: true }]);
              }
              setTimeout(() => setCoinToasts(prev => prev.filter(t => t.id !== toastId)), 3000);

              setSyncedStudent(prev => ({
                ...prev,
                coins: res.newCoins,
                ownedFootballCards: newOwned
              }));
            }
            return rolledCard;
          }}
          onClose={() => setShowFootballCardShop(false)}
        />
      )}

      {/* ── ROUND WINNER OVERLAY ── */}
      {isRoundOver && Number(dismissedRoundNum) !== Number(session?.round?.number || 1) && (
        <div style={styles.overlay} className="modal-backdrop">
          <div style={styles.winnerModal} className="glass-panel scale-up-anim">
            <span style={{ fontSize: '3rem' }}>🏆</span>
            <h2 style={styles.winnerTitle}>Round {session?.round?.number || 1} Completed!</h2>
            
            {/* Podium */}
            <div style={styles.podium}>
              {/* 2nd place */}
              {sortedLeaderboard[1] && (sortedLeaderboard[1].roundCoins > 0 || sortedLeaderboard[1].roundSolved > 0) && (
                <div style={{ ...styles.podiumStep, ...styles.stepSecond }}>
                  <span style={styles.podiumMedal}>🥈</span>
                  <span style={styles.podiumName}>{sortedLeaderboard[1].name}</span>
                  <span style={styles.podiumPoints}>{sortedLeaderboard[1].roundSolved || 0} Solved</span>
                  <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>+{sortedLeaderboard[1].roundCoins || 0} 🪙</span>
                  <div style={styles.silverPedestal}>2</div>
                </div>
              )}

              {/* 1st place */}
              {sortedLeaderboard[0] && (sortedLeaderboard[0].roundCoins > 0 || sortedLeaderboard[0].roundSolved > 0) && (
                <div style={{ ...styles.podiumStep, ...styles.stepFirst }}>
                  <span style={styles.podiumMedal}>🥇</span>
                  <span style={styles.podiumName}>{sortedLeaderboard[0].name}</span>
                  <span style={styles.podiumPoints}>{sortedLeaderboard[0].roundSolved || 0} Solved</span>
                  <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>+{sortedLeaderboard[0].roundCoins || 0} 🪙</span>
                  <div style={styles.goldPedestal}>1</div>
                </div>
              )}

              {/* 3rd place */}
              {sortedLeaderboard[2] && (sortedLeaderboard[2].roundCoins > 0 || sortedLeaderboard[2].roundSolved > 0) && (
                <div style={{ ...styles.podiumStep, ...styles.stepThird }}>
                  <span style={styles.podiumMedal}>🥉</span>
                  <span style={styles.podiumName}>{sortedLeaderboard[2].name}</span>
                  <span style={styles.podiumPoints}>{sortedLeaderboard[2].roundSolved || 0} Solved</span>
                  <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>+{sortedLeaderboard[2].roundCoins || 0} 🪙</span>
                  <div style={styles.bronzePedestal}>3</div>
                </div>
              )}
            </div>

            {/* Student's private results */}
            <div style={styles.myResultBox} className="glass-panel">
              <span style={styles.resultTitle}>YOUR PERFORMANCE</span>
              <div style={styles.resultRow}>
                <span>Your Rank:</span>
                <strong>#{myRank}</strong>
              </div>
              <div style={{ ...styles.resultRow }}>
                <span>Puzzles Solved:</span>
                <strong>{syncedStudent.roundSolved || 0} solved</strong>
              </div>
              <div style={styles.resultRow}>
                <span>Coins Earned:</span>
                <strong style={{ color: '#f59e0b' }}>🪙 +{syncedStudent.roundCoins || 0}</strong>
              </div>
            </div>

            {/* Full Final Leaderboard Table */}
            <div style={{ width: '100%', marginBottom: '1rem', maxHeight: '180px', overflowY: 'auto' }} className="custom-scrollbar">
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Full Final Rankings
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {sortedLeaderboard.map((s, idx) => {
                  const isMe = s.id === student.id;
                  const medalIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  return (
                    <div
                      key={s.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '10px',
                        backgroundColor: isMe ? 'hsla(260, 80%, 60%, 0.15)' : 'var(--bg-secondary)',
                        border: isMe ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, minWidth: '22px', fontSize: '0.85rem' }}>{medalIcon}</span>
                        <span style={{ fontWeight: isMe ? 800 : 600, color: isMe ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                          {s.name} {isMe && '(You)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 'bold' }}>
                        <span style={{ color: 'var(--accent-primary)' }}>🧩 {s.roundSolved || 0} solved</span>
                        <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>+{s.roundCoins || 0} 🪙</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
              Waiting for the coach to configure the next round...
            </p>

            <div style={{ display: 'flex', gap: '0.6rem', width: '100%' }}>
              <button 
                className="btn btn-accent" 
                style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.92rem', borderRadius: '12px', fontWeight: 'bold' }} 
                onClick={() => {
                  handleDismissStandings();
                  setShowMystery(true);
                }}
              >
                🎁 Open Mystery Box
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.92rem', borderRadius: '12px', fontWeight: 'bold' }} 
                onClick={() => {
                  handleDismissStandings();
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

const styles = {
  achToastsContainer: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    pointerEvents: 'none',
  },
  achToast: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1.25rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '2px solid var(--accent-primary)',
    borderRadius: '12px',
    boxShadow: '0 8px 24px var(--shadow-color)',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    maxWidth: '280px',
  },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(5px)' },
  overlayCard: { padding: '2.5rem', maxWidth: '420px', width: '90%', textAlign: 'center', borderRadius: '20px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' },
  coinToast: { position: 'fixed', top: '80px', right: '24px', zIndex: 200, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--accent-primary)', borderRadius: '30px', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 12px var(--shadow-color)' },
  broadcastBanner: { position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 150, display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.2rem', backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--accent-primary)', borderRadius: '30px', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 12px var(--shadow-color)' },
  headerCode: { fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  statsBadge: { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' },
  headerActionBtn: {
    padding: '0.35rem 0.85rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  catCard: { padding: '1rem', borderRadius: '20px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' },
  sideToMoveCard: {
    padding: '0.8rem 1rem',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '0.75rem',
  },
  boardCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minWidth: 0 },
  workspaceCard: { padding: '1rem', width: '100%', boxSizing: 'border-box', alignSelf: 'stretch', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' },
  waitingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' },
  puzzleNumBadge: { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)', color: '#fff' },
  diffBadge: { display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, color: '#fff' },
  incorrectToast: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'hsl(0,80%,96%)', border: '1px solid hsl(0,70%,80%)', borderRadius: '8px', color: 'hsl(0,70%,45%)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' },
  successBanner: { display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', padding: '0.75rem', backgroundColor: 'hsl(145,60%,95%)', border: '1px solid hsl(145,60%,75%)', borderRadius: '10px', color: 'hsl(145,60%,30%)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' },
  actionRow: { display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' },
  achievementCol: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  achCard: { padding: '1rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' },
  achItem: { display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' },
  miniStat: { textAlign: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' },

  // Winner leaderboard styles
  winnerModal: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '2rem',
    width: '90%',
    maxWidth: '460px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  winnerTitle: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '1.4rem',
    fontWeight: '800',
    margin: '0.5rem 0 1.2rem 0',
  },
  podium: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: '0.6rem',
    width: '100%',
    height: '160px',
    marginBottom: '1.2rem',
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
    fontSize: '1.8rem',
  },
  podiumName: {
    fontWeight: '800',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    width: '100%',
    textAlign: 'center',
  },
  podiumPoints: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#f59e0b',
  },
  goldPedestal: {
    backgroundColor: '#ffd700',
    color: '#000',
    width: '100%',
    height: '60px',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    fontWeight: '900',
  },
  silverPedestal: {
    backgroundColor: '#c0c0c0',
    color: '#000',
    width: '100%',
    height: '42px',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: '900',
  },
  bronzePedestal: {
    backgroundColor: '#cd7f32',
    color: '#fff',
    width: '100%',
    height: '28px',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    fontWeight: '900',
  },
  myResultBox: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '0.8rem 1.2rem',
    width: '100%',
    maxWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  resultTitle: {
    fontWeight: '800',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.2rem',
    marginBottom: '0.2rem',
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: '700',
  },
  skillsBar: {
    padding: '0.6rem 0.8rem',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
  },
  skillBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.2rem 0.5rem',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1.5px solid var(--border-color)',
    minWidth: '120px',
  },
  skillSprite: {
    width: '28px',
    height: '28px',
    objectFit: 'contain',
  },
  freezeOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(219, 234, 254, 0.8)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    zIndex: 90,
    color: '#1e3a8a',
    textAlign: 'center',
    padding: '1.5rem',
  },
  smokeOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(31, 41, 55, 0.88)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    zIndex: 90,
    color: '#f3f4f6',
    textAlign: 'center',
    padding: '1.5rem',
  },
  paralyzeOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(253, 224, 71, 0.82)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    zIndex: 90,
    color: '#854d0e',
    textAlign: 'center',
    padding: '1.5rem',
  },
};
