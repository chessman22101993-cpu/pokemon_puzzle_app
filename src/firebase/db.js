// Database operations and real-time synchronization
import { isMock, firestore } from './config';
import { Chess } from 'chess.js';
import { POKEMON_CATALOG } from '../data/pokemonData';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  getDocs,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

// ----------------------------------------------------
// Mock Sync Engine (BroadcastChannel + LocalStorage)
// ----------------------------------------------------
const MOCK_CHANNEL_NAME = 'chess_classroom_puzzle_sync';
let mockChannel = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    mockChannel = new BroadcastChannel(MOCK_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported or blocked:', e);
  }
}

// Helper to broadcast changes
const broadcastMessage = (payload) => {
  if (mockChannel) {
    mockChannel.postMessage(payload);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mock_db_sync', { detail: payload }));
  }
};

// Helper for Mock Storage
const getMockData = (key, defaultVal = null) => {
  try {
    if (typeof window === 'undefined') return defaultVal;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return defaultVal;
  }
};

const setMockData = (key, val) => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Error saving localStorage key "${key}":`, e);
  }
};

// ----------------------------------------------------
// Constants
// ----------------------------------------------------
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Default student data shape (used for new students and rejoin reset-check)
const DEFAULT_STUDENT_FIELDS = {
  status: 'thinking',
  currentPuzzleIndex: 0,
  totalSolved: 0,
  coins: 200,
  isApproved: true,
  roundCoins: 0,
  roundSolved: 0,
  bestSingleRoundSolved: 0,
  roundWrong: 0,
  roundStreak: 0,
  skipUsed: false,
  extraSkips: 2,
  streak: 0,
  achievements: [],
  requestedHelpText: '',
  privateHint: '',
  ownedPokemon: ['togepi', 'pikachu', 'jigglypuff'],
  equippedPokemon: 'togepi',
  activeTeam: ['togepi', 'pikachu', 'jigglypuff'],
  pokemonXp: { togepi: 0, pikachu: 0, jigglypuff: 0 },
  ownedItems: [],
  equippedItems: {
    theme: null,
    celebration: null,
    border: null,
    title: null,
  },
  activeSkin: 'classic', // legacy, kept for compat
};

// Default round shape
const DEFAULT_ROUND = {
  number: 0,
  status: 'waiting', // 'waiting' | 'active' | 'ended'
  startedAt: null,
  duration: 0,
  extraTimeAdded: 0,
  endedAt: null,
};

// ----------------------------------------------------
// Persistent Student Profiles (Global Database Layer)
// ----------------------------------------------------
export const getPersistentProfile = async (studentId) => {
  let profile = null;
  if (!isMock) {
    try {
      const docRef = doc(firestore, 'students', studentId);
      const snap = await getDoc(docRef);
      if (snap.exists()) profile = snap.data();
    } catch (e) {
      console.error('Firebase getPersistentProfile failed:', e);
    }
  } else {
    profile = getMockData(`persistent_student_${studentId}`);
  }
  if (profile) {
    const cleanCoins = sanitizeCoins(profile.coins, 200);
    profile.coins = cleanCoins;
  }
  return profile;
};

export const savePersistentProfile = async (studentId, data) => {
  if (data && data.coins !== undefined) {
    data.coins = sanitizeCoins(data.coins, 200);
  }
  if (!isMock) {
    try {
      const docRef = doc(firestore, 'students', studentId);
      await setDoc(docRef, data, { merge: true });
    } catch (e) {
      console.error('Firebase savePersistentProfile failed:', e);
    }
  } else {
    const existing = getMockData(`persistent_student_${studentId}`) || {};
    const cleanCoins = data.coins !== undefined ? sanitizeCoins(data.coins, 200) : sanitizeCoins(existing.coins, 200);
    setMockData(`persistent_student_${studentId}`, { ...existing, ...data, coins: cleanCoins });
  }
};

// ----------------------------------------------------
// Session TTL & Date Helpers
// ----------------------------------------------------

/**
 * Get current date string in local YYYY-MM-DD format
 */
export const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Safely parse any timestamp representation (Firestore Timestamp, number in ms/seconds, ISO string) into epoch milliseconds.
 */
export const parseAnyTimestamp = (ts) => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts < 1e11 ? ts * 1000 : ts;
  if (typeof ts === 'string') {
    const p = new Date(ts).getTime();
    return !isNaN(p) ? (p < 1e11 ? p * 1000 : p) : 0;
  }
  if (typeof ts === 'object') {
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (ts.seconds !== undefined) return ts.seconds * 1000;
    if (ts._seconds !== undefined) return ts._seconds * 1000;
  }
  return 0;
};

/**
 * Check if a student is approved to enter today's class.
 * Approvals are strictly per-day / session: if approved on Monday, student MUST ask to join again on Tuesday.
 */
export const isStudentApprovedForToday = (student, session, studentId) => {
  if (!session) return false;
  // If coach explicitly disabled the approval requirement
  if (session.requireJoinApproval === false) return true;

  const id = studentId || student?.id;
  if (!id) return false;

  const today = getTodayDateString();
  const approvedDates = session.approvedDates || {};
  const approvalDate = approvedDates[id] || student?.approvedDate;

  // Student must be explicitly approved for today's date
  return approvalDate === today;
};

/**
 * Check if a student is currently online based on heartbeat activity (within last 45s) and status.
 */
export const isStudentOnline = (student) => {
  if (!student) return false;
  if (student.status === 'offline') return false;
  if (student.lastActive) {
    const ms = parseAnyTimestamp(student.lastActive);
    if (ms > 0) {
      return (Date.now() - ms) < 45000;
    }
  }
  return student.status === 'thinking' || student.status === 'solved';
};

/**
 * Check if a session has expired. Classroom sessions remain valid as long as they exist in database.
 */
export const isSessionExpired = (session) => {
  if (!session) return true;
  return false;
};

// ----------------------------------------------------
// Public APIs (Handles Production vs. Sandbox Fallback)
// ----------------------------------------------------

/**
 * Request to join a classroom (waiting room registration)
 */
export const requestClassroomEntry = async (classId, studentName, studentId) => {
  const today = getTodayDateString();
  const request = { 
    id: studentId, 
    name: studentName, 
    timestamp: Date.now(),
    date: today,
    requestedAt: new Date().toISOString()
  };
  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const pending = (data.pendingApprovals || []).filter(p => p.id !== studentId);
        await updateDoc(sessionRef, {
          pendingApprovals: [...pending, request]
        });
      } else {
        await setDoc(sessionRef, {
          pendingApprovals: [request],
          approvedStudents: [],
          approvedDates: {},
          roster: [],
          status: 'active',
          requireJoinApproval: true,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (e) {
      console.error('Firebase requestClassroomEntry failed:', e);
    }
  } else {
    let session = getMockData(`session_${classId}`);
    if (!session) {
      session = { pendingApprovals: [], approvedStudents: [], approvedDates: {}, roster: [], status: 'active', requireJoinApproval: true };
    }
    const pending = (session.pendingApprovals || []).filter(p => p.id !== studentId);
    session.pendingApprovals = [...pending, request];
    setMockData(`session_${classId}`, session);
    broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
  }
};

/**
 * Approve a student entry request
 */
export const approveStudentEntry = async (classId, studentId, studentName) => {
  const today = getTodayDateString();
  // First ensure student persistent profile is created/retrieved
  const profile = await getPersistentProfile(studentId);
  if (!profile) {
    await savePersistentProfile(studentId, {
      id: studentId,
      name: studentName,
      coins: 200,
      ownedPokemon: ['togepi', 'pikachu', 'jigglypuff'],
      equippedPokemon: 'togepi',
      activeTeam: ['togepi', 'pikachu', 'jigglypuff'],
      pokemonXp: { togepi: 0, pikachu: 0, jigglypuff: 0 },
      ownedItems: [],
      equippedItems: { theme: null, celebration: null, border: null, title: null },
      achievements: [],
    });
  }

  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const pending = (data.pendingApprovals || []).filter(p => p.id !== studentId);
        const roster = data.roster || [];
        const approved = data.approvedStudents || [];
        const approvedDates = { ...(data.approvedDates || {}), [studentId]: today };

        if (!roster.some(r => r.id === studentId)) {
          roster.push({ id: studentId, name: studentName });
        }
        if (!approved.includes(studentId)) {
          approved.push(studentId);
        }

        await updateDoc(sessionRef, {
          pendingApprovals: pending,
          roster,
          approvedStudents: approved,
          approvedDates
        });

        // Update student document to isApproved: true and approvedDate for today
        const studentRef = doc(firestore, 'sessions', classId, 'students', studentId);
        await setDoc(studentRef, { 
          isApproved: true, 
          approvedDate: today, 
          status: 'thinking',
          lastActive: serverTimestamp() 
        }, { merge: true });
      }
    } catch (e) {
      console.error('Firebase approveStudentEntry failed:', e);
    }
  } else {
    const session = getMockData(`session_${classId}`);
    if (session) {
      session.pendingApprovals = (session.pendingApprovals || []).filter(p => p.id !== studentId);
      session.roster = session.roster || [];
      session.approvedStudents = session.approvedStudents || [];
      session.approvedDates = { ...(session.approvedDates || {}), [studentId]: today };

      if (!session.roster.some(r => r.id === studentId)) {
        session.roster.push({ id: studentId, name: studentName });
      }
      if (!session.approvedStudents.includes(studentId)) {
        session.approvedStudents.push(studentId);
      }

      setMockData(`session_${classId}`, session);
      broadcastMessage({ type: 'SESSION_UPDATE', classId, session });

      const students = getMockData(`students_${classId}`, []);
      const sIdx = students.findIndex(s => s.id === studentId);
      if (sIdx !== -1) {
        students[sIdx].isApproved = true;
        students[sIdx].approvedDate = today;
        students[sIdx].status = 'thinking';
        students[sIdx].lastActive = new Date().toISOString();
        setMockData(`students_${classId}`, students);
        broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
      }
    }
  }
};

/**
 * Approve multiple student entry requests in batch to avoid race conditions.
 * @param {string} classId
 * @param {Array<{id: string, name: string}>} studentsList
 */
export const approveMultipleStudents = async (classId, studentsList) => {
  if (!studentsList || studentsList.length === 0) return;
  const today = getTodayDateString();

  // Ensure persistent profiles are created
  for (const s of studentsList) {
    const profile = await getPersistentProfile(s.id);
    if (!profile) {
      await savePersistentProfile(s.id, {
        id: s.id,
        name: s.name,
        coins: 200,
        ownedPokemon: ['togepi', 'pikachu', 'jigglypuff'],
        equippedPokemon: 'togepi',
        activeTeam: ['togepi', 'pikachu', 'jigglypuff'],
        pokemonXp: { togepi: 0, pikachu: 0, jigglypuff: 0 },
        ownedItems: [],
        equippedItems: { theme: null, celebration: null, border: null, title: null },
        achievements: [],
      });
    }
  }

  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const pending = data.pendingApprovals || [];
        const roster = data.roster || [];
        const approved = data.approvedStudents || [];
        const approvedDates = { ...(data.approvedDates || {}) };

        const studentIdsToApprove = studentsList.map(s => s.id);
        const updatedPending = pending.filter(p => !studentIdsToApprove.includes(p.id));

        for (const s of studentsList) {
          approvedDates[s.id] = today;
          if (!roster.some(r => r.id === s.id)) {
            roster.push({ id: s.id, name: s.name });
          }
          if (!approved.includes(s.id)) {
            approved.push(s.id);
          }
        }

        await updateDoc(sessionRef, {
          pendingApprovals: updatedPending,
          roster,
          approvedStudents: approved,
          approvedDates
        });

        for (const sId of studentIdsToApprove) {
          try {
            const studentRef = doc(firestore, 'sessions', classId, 'students', sId);
            await setDoc(studentRef, { 
              isApproved: true, 
              approvedDate: today, 
              status: 'thinking',
              lastActive: serverTimestamp() 
            }, { merge: true });
          } catch (_) {}
        }
      }
    } catch (e) {
      console.error('Firebase approveMultipleStudents failed:', e);
    }
  } else {
    const session = getMockData(`session_${classId}`);
    if (session) {
      const studentIdsToApprove = studentsList.map(s => s.id);
      session.pendingApprovals = (session.pendingApprovals || []).filter(p => !studentIdsToApprove.includes(p.id));
      session.roster = session.roster || [];
      session.approvedStudents = session.approvedStudents || [];
      session.approvedDates = session.approvedDates || {};

      for (const s of studentsList) {
        session.approvedDates[s.id] = today;
        if (!session.roster.some(r => r.id === s.id)) {
          session.roster.push({ id: s.id, name: s.name });
        }
        if (!session.approvedStudents.includes(s.id)) {
          session.approvedStudents.push(s.id);
        }
      }

      setMockData(`session_${classId}`, session);
      broadcastMessage({ type: 'SESSION_UPDATE', classId, session });

      const students = getMockData(`students_${classId}`, []);
      let updatedStudents = false;
      students.forEach(s => {
        if (studentIdsToApprove.includes(s.id)) {
          s.isApproved = true;
          s.approvedDate = today;
          s.status = 'thinking';
          s.lastActive = new Date().toISOString();
          updatedStudents = true;
        }
      });
      if (updatedStudents) {
        setMockData(`students_${classId}`, students);
        broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
      }
    }
  }
};

/**
 * Rename a student across session roster, pending approvals, student status, and persistent profile
 */
export const renameStudent = async (classId, studentId, newName) => {
  const trimmedName = (newName || '').trim();
  if (!trimmedName) return;

  // 1. Update persistent profile
  await savePersistentProfile(studentId, { name: trimmedName });

  // 2. Update student document in session
  await updateStudentStatus(classId, studentId, { name: trimmedName });

  // 3. Update session roster & pending approvals lists
  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const roster = (data.roster || []).map(r => r.id === studentId ? { ...r, name: trimmedName } : r);
        const pending = (data.pendingApprovals || []).map(p => p.id === studentId ? { ...p, name: trimmedName } : p);
        await updateDoc(sessionRef, { roster, pendingApprovals: pending });
      }
    } catch (e) {
      console.error('Firebase renameStudent failed:', e);
    }
  } else {
    const session = getMockData(`session_${classId}`);
    if (session) {
      session.roster = (session.roster || []).map(r => r.id === studentId ? { ...r, name: trimmedName } : r);
      session.pendingApprovals = (session.pendingApprovals || []).map(p => p.id === studentId ? { ...p, name: trimmedName } : p);
      setMockData(`session_${classId}`, session);
      broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
    }
  }
};


/**
 * Reject a student entry request
 */
export const rejectStudentEntry = async (classId, studentId) => {
  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const pending = (data.pendingApprovals || []).filter(p => p.id !== studentId);
        const approvedDates = { ...(data.approvedDates || {}) };
        delete approvedDates[studentId];
        await updateDoc(sessionRef, { pendingApprovals: pending, approvedDates });

        try {
          const studentDocRef = doc(firestore, 'sessions', classId, 'students', studentId);
          await updateDoc(studentDocRef, { isApproved: false, status: 'offline' });
        } catch (_) {}
      }
    } catch (e) {
      console.error('Firebase rejectStudentEntry failed:', e);
    }
  } else {
    const session = getMockData(`session_${classId}`);
    if (session) {
      session.pendingApprovals = (session.pendingApprovals || []).filter(p => p.id !== studentId);
      if (session.approvedDates) {
        delete session.approvedDates[studentId];
      }
      setMockData(`session_${classId}`, session);
      broadcastMessage({ type: 'SESSION_UPDATE', classId, session });

      const students = getMockData(`students_${classId}`, []);
      const s = students.find(x => x.id === studentId);
      if (s) {
        s.isApproved = false;
        s.status = 'offline';
        setMockData(`students_${classId}`, students);
        broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
      }
    }
  }
};

/**
 * Remove a student from the approved roster
 */
export const removeStudentFromRoster = async (classId, studentId) => {
  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const roster = (data.roster || []).filter(r => r.id !== studentId);
        const approved = (data.approvedStudents || []).filter(id => id !== studentId);
        const approvedDates = { ...(data.approvedDates || {}) };
        delete approvedDates[studentId];
        await updateDoc(sessionRef, { roster, approvedStudents: approved, approvedDates });
        
        // Also delete from active students subcollection
        const studentDocRef = doc(firestore, 'sessions', classId, 'students', studentId);
        await deleteDoc(studentDocRef);
      }
    } catch (e) {
      console.error('Firebase removeStudentFromRoster failed:', e);
    }
  } else {
    const session = getMockData(`session_${classId}`);
    if (session) {
      session.roster = (session.roster || []).filter(r => r.id !== studentId);
      session.approvedStudents = (session.approvedStudents || []).filter(id => id !== studentId);
      if (session.approvedDates) {
        delete session.approvedDates[studentId];
      }
      setMockData(`session_${classId}`, session);
      
      const students = getMockData(`students_${classId}`, []);
      const updated = students.filter(s => s.id !== studentId);
      setMockData(`students_${classId}`, updated);
      
      broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
      broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students: updated });
    }
  }
};

/**
 * Create a new classroom session
 */
export const createSession = async (classId, settings = {}) => {
  let universalLib = [];
  try {
    const saved = localStorage.getItem('universal_custom_puzzle_library');
    if (saved) universalLib = JSON.parse(saved);
  } catch (e) {}

  const sessionData = {
    id: classId,
    status: 'waiting', // waiting, active, paused, ended, reset
    difficulty: settings.difficulty || 'mixed',
    theme: settings.theme || 'mixed',
    currentPuzzleId: settings.currentPuzzleId || '0',
    currentPuzzleIndex: 0,
    hintsEnabled: true,
    broadcastHint: '',
    createdAt: new Date().toISOString(),
    round: { ...DEFAULT_ROUND },
    roundHistory: [],
    puzzleQueue: [],
    puzzleQueueDifficulty: null,
    sessionStarted: false,
    isLobbyLocked: false,
    isShopLocked: false,
    requireJoinApproval: true,
    roster: [],
    approvedStudents: [],
    pendingApprovals: [],
    customReviewLibrary: universalLib,
  };

  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      await setDoc(sessionRef, {
        ...sessionData,
        createdAt: serverTimestamp()
      });
      return sessionData;
    } catch (e) {
      console.error('Firebase createSession failed, using fallback:', e);
    }
  }

  // Mock Fallback
  setMockData(`session_${classId}`, sessionData);
  setMockData(`students_${classId}`, []);
  broadcastMessage({ type: 'SESSION_UPDATE', classId, session: sessionData });
  return sessionData;
};

/**
 * Join an existing classroom session.
 * If a student with the same ID already exists, reconnect to their data (no duplicate).
 */
export const joinSession = async (classId, studentName, studentId) => {
  // Retrieve or create their persistent profile first
  let profile = await getPersistentProfile(studentId);
  if (!profile) {
    profile = {
      id: studentId,
      name: studentName,
      coins: 200,
      ownedPokemon: ['togepi', 'pikachu', 'jigglypuff'],
      equippedPokemon: 'togepi',
      activeTeam: ['togepi', 'pikachu', 'jigglypuff'],
      pokemonXp: { togepi: 0, pikachu: 0, jigglypuff: 0 },
      ownedItems: [],
      equippedItems: { theme: null, celebration: null, border: null, title: null },
      achievements: [],
    };
    await savePersistentProfile(studentId, profile);
  }

  if (!isMock) {
    try {
      // Check if session exists first
      const sessionRef = doc(firestore, 'sessions', classId);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) {
        throw new Error('Classroom code does not exist.');
      }

      // Ensure student is listed in session roster & approvedStudents
      const sessionData = sessionSnap.data() || {};
      const roster = sessionData.roster || [];
      const approved = sessionData.approvedStudents || [];
      const pending = sessionData.pendingApprovals || [];
      const requireApproval = sessionData.requireJoinApproval !== false;
      let updatedSession = false;

      if (!roster.some(r => r.id === studentId)) {
        roster.push({ id: studentId, name: studentName });
        updatedSession = true;
      }

      const isApproved = isStudentApprovedForToday(profile, sessionData, studentId);
      if (!isApproved) {
        if (!pending.some(p => p.id === studentId)) {
          pending.push({ id: studentId, name: studentName, joinedAt: new Date().toISOString(), requestedAt: Date.now() });
          updatedSession = true;
        }
      }

      if (updatedSession) {
        await updateDoc(sessionRef, { roster, approvedStudents: approved, pendingApprovals: pending });
      }

      // Check if student already exists in this session (rejoin scenario)
      const studentRef = doc(firestore, 'sessions', classId, 'students', studentId);
      const existingSnap = await getDoc(studentRef);
      
      if (existingSnap.exists()) {
        // Rejoin — merge persistent items, update status/name
        const existingData = existingSnap.data() || {};
        const existingCoins = typeof existingData.coins === 'number' ? existingData.coins : null;
        const profileCoins = typeof profile?.coins === 'number' ? profile.coins : null;
        const resolvedCoins = sanitizeCoins(existingCoins ?? profileCoins ?? 200, 200);

        const isApprovedForToday = isStudentApprovedForToday(existingData, sessionData, studentId);

        const mergedData = {
          ...DEFAULT_STUDENT_FIELDS,
          ...existingData,
          ...profile,
          coins: resolvedCoins,
          name: studentName,
          isApproved: isApprovedForToday,
          status: isApprovedForToday ? 'thinking' : 'offline',
        };
        await setDoc(studentRef, {
          ...mergedData,
          lastActive: serverTimestamp(),
        });
        return mergedData;
      }

      // New student entry to the active session
      const initCoins = sanitizeCoins(profile?.coins ?? 200, 200);
      const studentData = {
        ...DEFAULT_STUDENT_FIELDS,
        ...profile,
        coins: initCoins,
        id: studentId,
        name: studentName,
        isApproved,
        lastActive: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
      };
      await setDoc(studentRef, {
        ...studentData,
        lastActive: serverTimestamp(),
        joinedAt: serverTimestamp(),
      });
      return studentData;
    } catch (e) {
      if (e.message === 'Classroom code does not exist.') throw e;
      console.error('Firebase joinSession failed, using fallback:', e);
    }
  }

  // Mock Fallback
  const session = getMockData(`session_${classId}`);
  if (!session) {
    throw new Error('Classroom code does not exist.');
  }

  session.roster = session.roster || [];
  session.approvedStudents = session.approvedStudents || [];
  session.pendingApprovals = session.pendingApprovals || [];
  session.approvedDates = session.approvedDates || {};

  if (!session.roster.some(r => r.id === studentId)) {
    session.roster.push({ id: studentId, name: studentName });
  }

  const isApproved = isStudentApprovedForToday(profile, session, studentId);
  if (!isApproved) {
    if (!session.pendingApprovals.some(p => p.id === studentId)) {
      session.pendingApprovals.push({ id: studentId, name: studentName, joinedAt: new Date().toISOString(), requestedAt: Date.now() });
    }
  }

  setMockData(`session_${classId}`, session);

  const students = getMockData(`students_${classId}`, []);
  const existingIndex = students.findIndex(s => s.id === studentId);

  if (existingIndex !== -1) {
    // Rejoin — preserve all progress, merge persistent profile
    const existingCoins = typeof students[existingIndex].coins === 'number' ? students[existingIndex].coins : null;
    const profileCoins = typeof profile?.coins === 'number' ? profile.coins : null;
    const resolvedCoins = sanitizeCoins(existingCoins ?? profileCoins ?? 200, 200);

    const isApprovedForToday = isStudentApprovedForToday(students[existingIndex], session, studentId);

    students[existingIndex] = {
      ...DEFAULT_STUDENT_FIELDS,
      ...students[existingIndex],
      ...profile,
      coins: resolvedCoins,
      name: studentName,
      isApproved: isApprovedForToday,
      status: isApprovedForToday ? 'thinking' : 'offline',
      lastActive: new Date().toISOString(),
    };
    setMockData(`students_${classId}`, students);
    broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
    return students[existingIndex];
  }

  // New student entry to the active session
  const initCoins = sanitizeCoins(profile?.coins ?? 200, 200);
  const studentData = {
    ...DEFAULT_STUDENT_FIELDS,
    ...profile,
    coins: initCoins,
    id: studentId,
    name: studentName,
    isApproved,
    lastActive: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
  };
  students.push(studentData);
  setMockData(`students_${classId}`, students);
  broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
  return studentData;
};

/**
 * Listen to Session Metadata in real-time
 */
export const listenToSession = (classId, callback) => {
  if (!isMock && firestore) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      return onSnapshot(sessionRef, (docSnap) => {
        try {
          if (docSnap.exists() && typeof callback === 'function') {
            callback(docSnap.data());
          } else if (typeof callback === 'function') {
            callback(null);
          }
        } catch (err) {
          console.error('Session listener callback error:', err);
        }
      }, (error) => {
        console.error('Session listener error:', error);
      });
    } catch (e) {
      console.error('Firebase listenToSession failed, falling back:', e);
    }
  }

  // Mock Fallback
  // Send current state immediately
  const initialSession = getMockData(`session_${classId}`);
  if (typeof callback === 'function') callback(initialSession);

  // Listen to BroadcastChannel
  const handleMsg = (e) => {
    if (e.data && e.data.type === 'SESSION_UPDATE' && e.data.classId === classId) {
      if (typeof callback === 'function') callback(e.data.session);
    }
  };

  const handleLocal = (e) => {
    if (e.detail && e.detail.type === 'SESSION_UPDATE' && e.detail.classId === classId) {
      if (typeof callback === 'function') callback(e.detail.session);
    }
  };

  if (mockChannel) {
    mockChannel.addEventListener('message', handleMsg);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mock_db_sync', handleLocal);
  }

  // Return unsubscribe function
  return () => {
    if (mockChannel) {
      mockChannel.removeEventListener('message', handleMsg);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('mock_db_sync', handleLocal);
    }
  };
};

/**
 * Listen to Student List in real-time
 */
export const listenToStudents = (classId, callback) => {
  if (!isMock && firestore) {
    try {
      const studentsColl = collection(firestore, 'sessions', classId, 'students');
      return onSnapshot(studentsColl, (snapshot) => {
        try {
          const list = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() || {};
            const cleanCoins = sanitizeCoins(data.coins, data.coins === undefined ? 200 : 0);
            list.push({ id: docSnap.id, ...data, coins: cleanCoins });
          });
          if (typeof callback === 'function') callback(list);
        } catch (err) {
          console.error('Students list callback error:', err);
        }
      }, (error) => {
        console.error('Students list listener error:', error);
      });
    } catch (e) {
      console.error('Firebase listenToStudents failed, falling back:', e);
    }
  }

  // Mock Fallback
  // Send current list immediately
  const rawList = getMockData(`students_${classId}`, []);
  const initialList = (rawList || []).map(s => ({ ...s, coins: sanitizeCoins(s.coins, s.coins === undefined ? 200 : 0) }));
  if (typeof callback === 'function') callback(initialList);

  const handleMsg = (e) => {
    if (e.data && e.data.type === 'STUDENTS_UPDATE' && e.data.classId === classId) {
      const list = (e.data.students || []).map(s => ({ ...s, coins: sanitizeCoins(s.coins, s.coins === undefined ? 200 : 0) }));
      if (typeof callback === 'function') callback(list);
    }
    if (e.data && e.data.type === 'STUDENT_ACTION' && e.data.classId === classId) {
      const list = (getMockData(`students_${classId}`, []) || []).map(s => ({ ...s, coins: sanitizeCoins(s.coins, s.coins === undefined ? 200 : 0) }));
      if (typeof callback === 'function') callback(list);
    }
  };

  const handleLocal = (e) => {
    if (e.detail && e.detail.type === 'STUDENTS_UPDATE' && e.detail.classId === classId) {
      const list = (e.detail.students || []).map(s => ({ ...s, coins: sanitizeCoins(s.coins, s.coins === undefined ? 200 : 0) }));
      if (typeof callback === 'function') callback(list);
    }
    if (e.detail && e.detail.type === 'STUDENT_ACTION' && e.detail.classId === classId) {
      const list = (getMockData(`students_${classId}`, []) || []).map(s => ({ ...s, coins: sanitizeCoins(s.coins, s.coins === undefined ? 200 : 0) }));
      if (typeof callback === 'function') callback(list);
    }
  };

  if (mockChannel) {
    mockChannel.addEventListener('message', handleMsg);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mock_db_sync', handleLocal);
  }

  return () => {
    if (mockChannel) {
      mockChannel.removeEventListener('message', handleMsg);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('mock_db_sync', handleLocal);
    }
  };
};

export const sanitizeCoins = (coinsVal, fallback = 0) => {
  if (coinsVal === undefined || coinsVal === null || coinsVal === 'unlimited' || coinsVal === 'Infinity' || coinsVal === Infinity || coinsVal === '∞') {
    return fallback;
  }
  const num = Number(coinsVal);
  if (typeof num === 'number' && isFinite(num) && !isNaN(num)) {
    return Math.max(0, Math.floor(num));
  }
  return fallback;
};

/**
 * Reset all student coins in a classroom session to 200
 */
export const resetAllStudentCoins = async (classId, targetCoins = 200) => {
  if (!isMock) {
    try {
      const studentsColl = collection(firestore, 'sessions', classId, 'students');
      const snap = await getDocs(studentsColl);
      const updates = [];
      snap.forEach(docSnap => {
        updates.push(updateDoc(docSnap.ref, { coins: targetCoins }));
      });
      await Promise.all(updates);
      return;
    } catch (e) {
      console.error('Firebase resetAllStudentCoins failed:', e);
    }
  }

  // Mock Fallback
  const students = getMockData(`students_${classId}`, []);
  const updated = students.map(s => ({ ...s, coins: targetCoins }));
  setMockData(`students_${classId}`, updated);
  broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students: updated });
};

/**
 * Update Student Status, Score, Coins, Achievements, Pokémon, etc.
 */
export const updateStudentStatus = async (classId, studentId, updates) => {
  if (updates.coins !== undefined) {
    updates.coins = sanitizeCoins(updates.coins, 0);
  }

  // Sync to global persistent profile if updates contain persistent fields
  const persistentKeys = ['coins', 'ownedPokemon', 'equippedPokemon', 'activeTeam', 'pokemonXp', 'ownedItems', 'equippedItems', 'achievements', 'ownedFootballCards'];
  const persistentUpdates = {};
  let hasPersistentUpdates = false;
  persistentKeys.forEach(k => {
    if (updates[k] !== undefined) {
      persistentUpdates[k] = updates[k];
      hasPersistentUpdates = true;
    }
  });
  if (hasPersistentUpdates) {
    savePersistentProfile(studentId, persistentUpdates);
  }

  if (!isMock) {
    try {
      const studentRef = doc(firestore, 'sessions', classId, 'students', studentId);
      await setDoc(studentRef, {
        ...updates,
        lastActive: serverTimestamp()
      }, { merge: true });
      return;
    } catch (e) {
      console.error('Firebase updateStudentStatus failed, using fallback:', e);
    }
  }

  // Mock Fallback
  const students = getMockData(`students_${classId}`, []);
  const index = students.findIndex(s => s.id === studentId);
  if (index !== -1) {
    students[index] = {
      ...students[index],
      ...updates,
      lastActive: new Date().toISOString()
    };
    setMockData(`students_${classId}`, students);
    // Broadcast both STUDENT_ACTION and STUDENTS_UPDATE
    broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
    broadcastMessage({ type: 'STUDENT_ACTION', classId, studentId, updates });
  }
};

/**
 * Update Session Settings (Coach Control)
 */
export const updateSessionSettings = async (classId, updates) => {
  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      await setDoc(sessionRef, updates, { merge: true });
      return;
    } catch (e) {
      console.error('Firebase updateSessionSettings failed, using fallback:', e);
    }
  }

  // Mock Fallback
  const session = getMockData(`session_${classId}`);
  if (session) {
    const updatedSession = { ...session, ...updates };
    setMockData(`session_${classId}`, updatedSession);
    broadcastMessage({ type: 'SESSION_UPDATE', classId, session: updatedSession });
  }
};

/**
 * Listen to single student (e.g. for private hints sent by coach)
 */
export const listenToStudent = (classId, studentId, callback) => {
  if (!isMock && firestore) {
    try {
      const studentRef = doc(firestore, 'sessions', classId, 'students', studentId);
      return onSnapshot(studentRef, (docSnap) => {
        try {
          if (docSnap.exists() && typeof callback === 'function') {
            const data = docSnap.data() || {};
            const cleanCoins = sanitizeCoins(data.coins, data.coins === undefined ? 200 : 0);
            callback({ ...data, coins: cleanCoins });
          }
        } catch (e) {
          console.error('listenToStudent callback error:', e);
        }
      });
    } catch (e) {
      console.error('Firebase listenToStudent failed, falling back:', e);
    }
  }

  // Mock Fallback
  // Send current state
  const students = getMockData(`students_${classId}`, []);
  const student = students.find(s => s.id === studentId);
  if (student && typeof callback === 'function') {
    callback({ ...student, coins: sanitizeCoins(student.coins, student.coins === undefined ? 200 : 0) });
  }

  const handleMsg = (e) => {
    if (e.data && e.data.type === 'STUDENTS_UPDATE' && e.data.classId === classId) {
      const updated = e.data.students.find(s => s.id === studentId);
      if (updated && typeof callback === 'function') {
        callback({ ...updated, coins: sanitizeCoins(updated.coins, updated.coins === undefined ? 200 : 0) });
      }
    }
  };

  const handleLocal = (e) => {
    if (e.detail && e.detail.type === 'STUDENTS_UPDATE' && e.detail.classId === classId) {
      const updated = e.detail.students.find(s => s.id === studentId);
      if (updated && typeof callback === 'function') {
        callback({ ...updated, coins: sanitizeCoins(updated.coins, updated.coins === undefined ? 200 : 0) });
      }
    }
  };

  if (mockChannel) {
    mockChannel.addEventListener('message', handleMsg);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mock_db_sync', handleLocal);
  }

  return () => {
    if (mockChannel) {
      mockChannel.removeEventListener('message', handleMsg);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('mock_db_sync', handleLocal);
    }
  };
};

// ----------------------------------------------------
// Round & Timer Management
// ----------------------------------------------------

/**
 * Start a new round with optional timer
 * @param {string} classId
 * @param {number} duration - Duration in seconds (0 = untimed / manual end)
 */
export const startRound = async (classId, duration = 0) => {
  // First reset all students' round-specific stats
  await resetRoundStats(classId);

  const session = !isMock 
    ? (await getDoc(doc(firestore, 'sessions', classId))).data()
    : getMockData(`session_${classId}`);
  
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

  await updateSessionSettings(classId, {
    status: 'active',
    sessionStarted: true,
    round: roundData,
  });

  return roundData;
};

/**
 * End the current round, snapshot results
 */
export const endRound = async (classId) => {
  if (!classId) return null;
  const normalizedClassId = String(classId).trim().toUpperCase();

  try {
    const session = !isMock
      ? (await getDoc(doc(firestore, 'sessions', normalizedClassId))).data()
      : getMockData(`session_${normalizedClassId}`);

    if (!session?.round || session.round.status === 'ended') return null;

    // Get student rankings for this round
    let students = [];
    try {
      if (!isMock) {
        const snap = await getDocs(collection(firestore, 'sessions', normalizedClassId, 'students'));
        snap.forEach(d => students.push({ id: d.id, ...d.data() }));
      } else {
        const mockList = getMockData(`students_${normalizedClassId}`, []);
        students = Array.isArray(mockList) ? mockList : [];
      }
    } catch (err) {
      console.error('Error fetching students in endRound:', err);
      students = [];
    }

    const rankings = (Array.isArray(students) ? students : [])
      .map(s => ({
        id: s.id,
        name: s.name || 'Anonymous',
        roundCoins: s.roundCoins || 0,
        roundSolved: s.roundSolved || 0,
        roundLastSolvedAt: s.roundLastSolvedAt || 0,
      }))
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
      });

    const endedRound = {
      ...session.round,
      status: 'ended',
      endedAt: Date.now(),
      rankings: rankings // Freeze rankings inside the round object
    };

    const roundSnapshot = {
      round: endedRound,
      rankings: rankings,
      endedAt: Date.now(),
    };

    const history = Array.isArray(session.roundHistory) ? [...session.roundHistory] : [];
    const existingIndex = history.findIndex(h => h.round?.number === endedRound.number);
    if (existingIndex >= 0) {
      history[existingIndex] = roundSnapshot;
    } else {
      history.push(roundSnapshot);
    }

    await updateSessionSettings(normalizedClassId, {
      status: 'ended',
      round: endedRound,
      roundHistory: history,
    });

    return roundSnapshot;
  } catch (outerErr) {
    console.error('Fatal error in endRound, forcing round status to ended:', outerErr);
    try {
      const fallbackRound = {
        status: 'ended',
        endedAt: Date.now(),
      };
      await updateSessionSettings(normalizedClassId, {
        status: 'ended',
        round: fallbackRound,
      });
    } catch (fallbackErr) {
      console.error('Fallback endRound failed:', fallbackErr);
    }
    return null;
  }
};

/**
 * Add extra time to the current round
 * @param {number} seconds - Seconds to add
 */
export const addExtraTime = async (classId, seconds) => {
  const session = !isMock
    ? (await getDoc(doc(firestore, 'sessions', classId))).data()
    : getMockData(`session_${classId}`);

  if (!session?.round) return;

  const updatedRound = {
    ...session.round,
    extraTimeAdded: (session.round.extraTimeAdded || 0) + seconds,
  };

  await updateSessionSettings(classId, { round: updatedRound });
  return updatedRound;
};

/**
 * Reset round-specific stats for ALL students in a session
 */
export const resetRoundStats = async (classId) => {
  const roundResetFields = {
    roundCoins: 0,
    roundSolved: 0,
    roundWrong: 0,
    roundStreak: 0,
    skipUsed: false,
    extraSkips: 2,
    currentPuzzleIndex: 0,
    status: 'thinking',
    activeEffects: null,
    cooldowns: null,
    pokemonCooldowns: null,
    customReviewSubmissions: null,
    customReviewFeedback: null,
    notifications: [],
  };

  if (!isMock) {
    try {
      const studentsColl = collection(firestore, 'sessions', classId, 'students');
      const snap = await getDocs(studentsColl);
      const updates = [];
      snap.forEach(docSnap => {
        updates.push(setDoc(docSnap.ref, roundResetFields, { merge: true }));
      });
      await Promise.all(updates);
      return;
    } catch (e) {
      console.error('Firebase resetRoundStats failed, using fallback:', e);
    }
  }

  // Mock Fallback
  const students = getMockData(`students_${classId}`, []);
  const updated = students.map(s => ({ ...s, ...roundResetFields }));
  setMockData(`students_${classId}`, updated);
  broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students: updated });
};

/**
 * Daily Progress Reset (Keep Coins & Pokémon, reset daily solved progress)
 */
export const resetDailyProgress = async (classId) => {
  const dailyResetFields = {
    totalSolved: 0,
    roundCoins: 0,
    roundSolved: 0,
    roundWrong: 0,
    roundStreak: 0,
    skipUsed: false,
    extraSkips: 2,
    currentPuzzleIndex: 0,
    status: 'thinking',
    isApproved: false,
    approvedDate: null,
    activeEffects: null,
    cooldowns: null,
    pokemonCooldowns: null,
    customReviewSubmissions: null,
    customReviewFeedback: null,
    notifications: [],
  };

  if (!isMock) {
    try {
      const studentsColl = collection(firestore, 'sessions', classId, 'students');
      const snap = await getDocs(studentsColl);
      const updates = [];
      snap.forEach(docSnap => {
        updates.push(setDoc(docSnap.ref, dailyResetFields, { merge: true }));
      });
      await Promise.all(updates);
      
      const sessionRef = doc(firestore, 'sessions', classId);
      await setDoc(sessionRef, {
        status: 'waiting',
        approvedStudents: [],
        approvedDates: {},
        pendingApprovals: [],
        round: {
          number: 0,
          status: 'waiting',
          startedAt: null,
          duration: 0,
          extraTimeAdded: 0,
          endedAt: null,
        }
      }, { merge: true });
      return;
    } catch (e) {
      console.error('Firebase resetDailyProgress failed:', e);
    }
  }

  // Mock Fallback
  const students = getMockData(`students_${classId}`, []);
  const updated = students.map(s => ({ ...s, ...dailyResetFields }));
  setMockData(`students_${classId}`, updated);
  broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students: updated });

  const session = getMockData(`session_${classId}`);
  if (session) {
    session.status = 'waiting';
    session.approvedStudents = [];
    session.approvedDates = {};
    session.pendingApprovals = [];
    session.round = {
      number: 0,
      status: 'waiting',
      startedAt: null,
      duration: 0,
      extraTimeAdded: 0,
      endedAt: null,
    };
    setMockData(`session_${classId}`, session);
    broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
  }
};

// ----------------------------------------------------
// Session Reset (Nuclear Reset by Coach)
// ----------------------------------------------------

/**
 * Reset entire session — deletes all students, resets to fresh state.
 * Connected students will detect status='reset' and redirect to landing.
 */
export const resetEntireSession = async (classId) => {
  if (!isMock) {
    try {
      // Delete all students
      const studentsColl = collection(firestore, 'sessions', classId, 'students');
      const snap = await getDocs(studentsColl);
      const deletes = [];
      snap.forEach(docSnap => {
        deletes.push(deleteDoc(docSnap.ref));
      });
      await Promise.all(deletes);

      // Reset session to initial state
      const sessionRef = doc(firestore, 'sessions', classId);
      await updateDoc(sessionRef, {
        status: 'reset',
        round: { ...DEFAULT_ROUND },
        roundHistory: [],
        puzzleQueue: [],
        puzzleQueueDifficulty: null,
        sessionStarted: false,
      });
      
      // After a brief delay, set status back to 'waiting' for coach
      setTimeout(async () => {
        try {
          await updateDoc(sessionRef, { status: 'waiting' });
        } catch (_) { /* ignore */ }
      }, 2000);
      
      return;
    } catch (e) {
      console.error('Firebase resetEntireSession failed, using fallback:', e);
    }
  }

  // Mock Fallback
  const session = getMockData(`session_${classId}`);
  if (session) {
    // Signal reset to all connected students
    const resetSession = {
      ...session,
      status: 'reset',
      round: { ...DEFAULT_ROUND },
      roundHistory: [],
      puzzleQueue: [],
      puzzleQueueDifficulty: null,
      sessionStarted: false,
    };
    setMockData(`session_${classId}`, resetSession);
    setMockData(`students_${classId}`, []);
    broadcastMessage({ type: 'SESSION_UPDATE', classId, session: resetSession });
    broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students: [] });
    
    // After brief delay, set back to waiting
    setTimeout(() => {
      resetSession.status = 'waiting';
      setMockData(`session_${classId}`, resetSession);
      broadcastMessage({ type: 'SESSION_UPDATE', classId, session: resetSession });
    }, 2000);
  }
};

// ----------------------------------------------------
// Pokémon & Shop Operations
// ----------------------------------------------------

/**
 * Purchase a Pokémon (direct purchase for commons)
 */
export const purchasePokemon = async (classId, studentId, pokemonId, cost) => {
  // Get current student data
  let studentData;
  if (!isMock) {
    const snap = await getDoc(doc(firestore, 'sessions', classId, 'students', studentId));
    studentData = snap.data();
  } else {
    const students = getMockData(`students_${classId}`, []);
    studentData = students.find(s => s.id === studentId);
  }

  if (!studentData) throw new Error('Student not found');
  const currentCoins = sanitizeCoins(studentData.coins, 0);
  if (currentCoins < cost) throw new Error('Not enough coins');
  if ((studentData.ownedPokemon || []).includes(pokemonId)) throw new Error('Already owned');

  const newCoins = Math.max(0, currentCoins - cost);

  await updateStudentStatus(classId, studentId, {
    coins: newCoins,
    ownedPokemon: [...(studentData.ownedPokemon || []), pokemonId],
  });

  return { success: true, newCoins };
};

/**
 * Open a mystery box — deducts 150 coins, returns random Pokémon
 * Uses rollMysteryBox from pokemonData.js (caller provides the rolled result)
 */
export const openMysteryBox = async (classId, studentId, rolledPokemonId, cost = 150) => {
  let studentData;
  if (!isMock) {
    const snap = await getDoc(doc(firestore, 'sessions', classId, 'students', studentId));
    studentData = snap.data();
  } else {
    const students = getMockData(`students_${classId}`, []);
    studentData = students.find(s => s.id === studentId);
  }

  if (!studentData) throw new Error('Student not found');
  const currentCoins = sanitizeCoins(studentData.coins, 0);
  if (currentCoins < cost) throw new Error('Not enough coins');

  const ownedPokemon = studentData.ownedPokemon || [];
  
  if (rolledPokemonId === null) {
    // All Pokémon owned — refund scenario shouldn't happen but handle gracefully
    throw new Error('All Pokémon already owned!');
  }

  // Check duplicate (already owned the rolled one — give 20 coin refund)
  if (ownedPokemon.includes(rolledPokemonId)) {
    const newCoins = Math.max(0, currentCoins - cost + 20);
    await updateStudentStatus(classId, studentId, {
      coins: newCoins,
    });
    return { success: true, pokemon: rolledPokemonId, duplicate: true, refund: 20, newCoins };
  }

  const newCoins = Math.max(0, currentCoins - cost);
  await updateStudentStatus(classId, studentId, {
    coins: newCoins,
    ownedPokemon: [...ownedPokemon, rolledPokemonId],
  });

  return { success: true, pokemon: rolledPokemonId, duplicate: false, refund: 0, newCoins };
};

/**
 * Feed a berry to Pokémon (5 coins for 1 hint)
 */
export const feedBerry = async (classId, studentId, pokemonId = null, berryCost = 5) => {
  let studentData;
  if (!isMock) {
    const snap = await getDoc(doc(firestore, 'sessions', classId, 'students', studentId));
    studentData = snap.data();
  } else {
    const students = getMockData(`students_${classId}`, []);
    studentData = students.find(s => s.id === studentId);
  }

  if (!studentData) throw new Error('Student not found');
  const currentCoins = sanitizeCoins(studentData.coins, 0);
  if (currentCoins < berryCost) throw new Error('Not enough coins');

  const targetPoke = pokemonId || studentData.equippedPokemon || 'togepi';
  const newCoins = Math.max(0, currentCoins - berryCost);
  const xpMap = { ...(studentData.pokemonXp || {}) };
  const currentXp = (xpMap[targetPoke] || 0) + 1;
  xpMap[targetPoke] = currentXp;

  let evolved = false;
  let evolutionTarget = null;
  let owned = [...(studentData.ownedPokemon || [])];
  let team = [...(studentData.activeTeam || [])];
  let equipped = studentData.equippedPokemon;

  const pData = POKEMON_CATALOG.find(p => p.id === targetPoke);

  if (currentXp >= 5 && pData && pData.evolvesTo) {
    evolved = true;
    evolutionTarget = pData.evolvesTo;

    // Replace in owned list
    owned = owned.filter(id => id !== targetPoke);
    if (!owned.includes(evolutionTarget)) {
      owned.push(evolutionTarget);
    }

    // Replace in active team
    team = team.map(id => id === targetPoke ? evolutionTarget : id);

    // Replace in equipped
    if (equipped === targetPoke) {
      equipped = evolutionTarget;
    }
  }

  const updates = {
    coins: newCoins,
    pokemonXp: xpMap,
    ownedPokemon: owned,
    activeTeam: team,
    equippedPokemon: equipped
  };

  await updateStudentStatus(classId, studentId, updates);

  return {
    success: true,
    newCoins,
    evolved,
    from: targetPoke,
    to: evolutionTarget,
    xp: currentXp
  };
};

/**
 * Equip a Pokémon as companion
 */
export const equipPokemon = async (classId, studentId, pokemonId) => {
  let studentData;
  if (!isMock) {
    const snap = await getDoc(doc(firestore, 'sessions', classId, 'students', studentId));
    studentData = snap.data();
  } else {
    const students = getMockData(`students_${classId}`, []);
    studentData = students.find(s => s.id === studentId);
  }

  if (!studentData) throw new Error('Student not found');
  if (!(studentData.ownedPokemon || []).includes(pokemonId)) throw new Error('Pokémon not owned');

  await updateStudentStatus(classId, studentId, {
    equippedPokemon: pokemonId,
  });

  return { success: true };
};

/**
 * Purchase a shop item (theme, celebration, power-up, flair)
 */
export const purchaseShopItem = async (classId, studentId, itemId, cost, isConsumable = false) => {
  let studentData;
  if (!isMock) {
    const snap = await getDoc(doc(firestore, 'sessions', classId, 'students', studentId));
    studentData = snap.data();
  } else {
    const students = getMockData(`students_${classId}`, []);
    studentData = students.find(s => s.id === studentId);
  }

  if (!studentData) throw new Error('Student not found');
  const currentCoins = sanitizeCoins(studentData.coins, 0);
  if (currentCoins < cost) throw new Error('Not enough coins');

  const newCoins = Math.max(0, currentCoins - cost);
  const updates = {
    coins: newCoins,
  };

  if (isConsumable) {
    // Power-ups: increment counter
    if (itemId === 'powerup_skip') {
      updates.extraSkips = (studentData.extraSkips || 0) + 1;
    } else if (itemId.startsWith('spell_')) {
      const inventory = studentData.spellInventory || {};
      updates.spellInventory = {
        ...inventory,
        [itemId]: (inventory[itemId] || 0) + 1
      };
    }
  } else {
    // Permanent items
    if (!(studentData.ownedItems || []).includes(itemId)) {
      updates.ownedItems = [...(studentData.ownedItems || []), itemId];
    } else {
      throw new Error('Already owned');
    }
  }

  await updateStudentStatus(classId, studentId, updates);
  return { success: true, newCoins: updates.coins };
};

/**
 * Equip a shop item
 */
export const equipShopItem = async (classId, studentId, slot, itemId) => {
  const validSlots = ['theme', 'celebration', 'border', 'title'];
  if (!validSlots.includes(slot)) throw new Error('Invalid slot');

  let studentData;
  if (!isMock) {
    const snap = await getDoc(doc(firestore, 'sessions', classId, 'students', studentId));
    studentData = snap.data();
  } else {
    const students = getMockData(`students_${classId}`, []);
    studentData = students.find(s => s.id === studentId);
  }

  if (!studentData) throw new Error('Student not found');
  
  // itemId of null means unequip
  if (itemId !== null && !(studentData.ownedItems || []).includes(itemId)) {
    throw new Error('Item not owned');
  }

  const equippedItems = { ...(studentData.equippedItems || {}), [slot]: itemId };
  await updateStudentStatus(classId, studentId, { equippedItems });
  return { success: true };
};

/**
 * Purchase a Football Card directly
 */
export const purchaseFootballCard = async (classId, studentId, cardId, cost) => {
  let studentData;
  if (!isMock) {
    const snap = await getDoc(doc(firestore, 'sessions', classId, 'students', studentId));
    studentData = snap.data();
  } else {
    const students = getMockData(`students_${classId}`, []);
    studentData = students.find(s => s.id === studentId);
  }

  if (!studentData) throw new Error('Student not found');
  const currentCoins = sanitizeCoins(studentData.coins, 0);
  if (currentCoins < cost) throw new Error('Not enough coins');

  const owned = studentData.ownedFootballCards || [];
  if (owned.includes(cardId)) throw new Error('Already owned');

  const newCoins = Math.max(0, currentCoins - cost);
  const updates = {
    coins: newCoins,
    ownedFootballCards: [...owned, cardId],
  };

  await updateStudentStatus(classId, studentId, updates);
  return { success: true, newCoins: updates.coins, cardId };
};

/**
 * Open a Football Booster Pack (Mystery Box)
 */
export const openFootballBoosterPack = async (classId, studentId, rolledCard) => {
  let studentData;
  if (!isMock) {
    const snap = await getDoc(doc(firestore, 'sessions', classId, 'students', studentId));
    studentData = snap.data();
  } else {
    const students = getMockData(`students_${classId}`, []);
    studentData = students.find(s => s.id === studentId);
  }

  if (!studentData) throw new Error('Student not found');
  const currentCoins = sanitizeCoins(studentData.coins, 0);
  if (currentCoins < 150) throw new Error('Not enough coins for booster pack');

  const owned = studentData.ownedFootballCards || [];
  const isDuplicate = owned.includes(rolledCard.id);
  const refund = isDuplicate ? (rolledCard.refundCoins || 30) : 0;
  const newCoins = Math.max(0, currentCoins - 150 + refund);

  const updates = {
    coins: newCoins,
  };

  if (!isDuplicate) {
    updates.ownedFootballCards = [...owned, rolledCard.id];
  }

  await updateStudentStatus(classId, studentId, updates);
  return { 
    success: true, 
    newCoins: updates.coins, 
    card: rolledCard, 
    isDuplicate, 
    refundCoins: refund 
  };
};

// ----------------------------------------------------
// Custom Puzzles (Existing)
// ----------------------------------------------------

/**
 * Save custom puzzle in personal library
 */
export const saveCustomPuzzle = async (puzzle) => {
  const puzWithId = {
    ...puzzle,
    id: puzzle.id || `custom_${Date.now()}`,
    createdAt: new Date().toISOString()
  };

  if (!isMock) {
    try {
      const puzzlesColl = collection(firestore, 'custom_puzzles');
      await addDoc(puzzlesColl, puzWithId);
      return puzWithId;
    } catch (e) {
      console.error('Firebase saveCustomPuzzle failed, using fallback:', e);
    }
  }

  // Mock Fallback
  const customPuzzles = getMockData('custom_puzzles', []);
  customPuzzles.push(puzWithId);
  setMockData('custom_puzzles', customPuzzles);
  return puzWithId;
};

/**
 * Get all custom puzzles
 */
export const getCustomPuzzles = async () => {
  if (!isMock) {
    try {
      const puzzlesColl = collection(firestore, 'custom_puzzles');
      const snap = await getDocs(puzzlesColl);
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      console.error('Firebase getCustomPuzzles failed, using fallback:', e);
    }
  }

  // Mock Fallback
  return getMockData('custom_puzzles', []);
};

/**
 * Trigger active status-effect skill on classmate (freeze, smokescreen, etc.)
 */
export const triggerSkillOnStudent = async (classId, attackerName, targetStudentId, skillId, duration = 15) => {
  if (!isMock) {
    try {
      const studentRef = doc(firestore, 'sessions', classId, 'students', targetStudentId);
      const snap = await getDoc(studentRef);
      if (snap.exists()) {
        const data = snap.data();
        const activeEffects = data.activeEffects || {};
        activeEffects[skillId] = {
          until: Date.now() + duration * 1000,
          attacker: attackerName
        };
        await updateDoc(studentRef, { activeEffects });
      }
    } catch (e) {
      console.error('triggerSkillOnStudent failed:', e);
    }
  } else {
    const students = getMockData(`students_${classId}`, []);
    const index = students.findIndex(s => s.id === targetStudentId);
    if (index !== -1) {
      const activeEffects = students[index].activeEffects || {};
      activeEffects[skillId] = {
        until: Date.now() + duration * 1000,
        attacker: attackerName
      };
      students[index].activeEffects = activeEffects;
      setMockData(`students_${classId}`, students);
      broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
    }
  }
};

/**
 * Steal coins from classmate (e.g. Meowth steal)
 */
export const stealCoinsFromStudent = async (classId, attackerId, attackerName, targetStudentId, amount = 15) => {
  if (!isMock) {
    try {
      const targetRef = doc(firestore, 'sessions', classId, 'students', targetStudentId);
      const attackerRef = doc(firestore, 'sessions', classId, 'students', attackerId);

      const targetSnap = await getDoc(targetRef);
      const attackerSnap = await getDoc(attackerRef);

      if (targetSnap.exists() && attackerSnap.exists()) {
        const targetData = targetSnap.data();
        const attackerData = attackerSnap.data();

        const targetCoins = sanitizeCoins(targetData.coins, 0);
        const attackerCoins = sanitizeCoins(attackerData.coins, 0);
        const stolen = Math.min(targetCoins, amount);
        const newTargetCoins = Math.max(0, targetCoins - stolen);
        const newAttackerCoins = attackerCoins + stolen;

        const notifications = targetData.notifications || [];
        notifications.push({
          id: `steal_${Date.now()}`,
          text: `💸 ${attackerName} stole ${stolen} coins from you!`,
          timestamp: Date.now()
        });

        await updateDoc(targetRef, { coins: newTargetCoins, notifications });
        await updateDoc(attackerRef, { coins: newAttackerCoins });

        // Sync global persistent profile
        savePersistentProfile(targetStudentId, { coins: newTargetCoins });
        savePersistentProfile(attackerId, { coins: newAttackerCoins });
      }
    } catch (e) {
      console.error('stealCoinsFromStudent failed:', e);
    }
  } else {
    const students = getMockData(`students_${classId}`, []);
    const targetIdx = students.findIndex(s => s.id === targetStudentId);
    const attackerIdx = students.findIndex(s => s.id === attackerId);

    if (targetIdx !== -1 && attackerIdx !== -1) {
      const targetCoins = sanitizeCoins(students[targetIdx].coins, 0);
      const attackerCoins = sanitizeCoins(students[attackerIdx].coins, 0);
      const stolen = Math.min(targetCoins, amount);
      
      students[targetIdx].coins = Math.max(0, targetCoins - stolen);
      students[attackerIdx].coins = attackerCoins + stolen;

      students[targetIdx].notifications = students[targetIdx].notifications || [];
      students[targetIdx].notifications.push({
        id: `steal_${Date.now()}`,
        text: `💸 ${attackerName} stole ${stolen} coins from you!`,
        timestamp: Date.now()
      });

      setMockData(`students_${classId}`, students);

      // Sync global persistent profile
      savePersistentProfile(targetStudentId, { coins: students[targetIdx].coins });
      savePersistentProfile(attackerId, { coins: students[attackerIdx].coins });

      broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
    }
  }
};

// ── CUSTOM CHALLENGES HELPERS ──

export const parsePgnOrFen = (input) => {
  const cleaned = (input || '').trim();
  if (!cleaned) {
    return { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', sideToMove: 'white' };
  }

  // 1. Check if FEN tag exists in PGN header brackets [FEN "..."]
  const fenTagMatch = cleaned.match(/\[FEN\s+"([^"]+)"\]/i);
  if (fenTagMatch) {
    const rawFen = fenTagMatch[1].trim();
    try {
      const game = new Chess(rawFen);
      const sideToMove = game.turn() === 'b' ? 'black' : 'white';
      return { fen: game.fen(), sideToMove };
    } catch {
      // Fallback token check if incomplete
      const tokens = rawFen.split(/\s+/);
      const sideToMove = tokens[1] === 'b' ? 'black' : 'white';
      return { fen: rawFen, sideToMove };
    }
  }

  // 2. Try parsing directly as FEN with chess.js
  try {
    const game = new Chess(cleaned);
    const sideToMove = game.turn() === 'b' ? 'black' : 'white';
    return { fen: game.fen(), sideToMove };
  } catch {
    // 3. Try parsing as PGN with chess.js
    try {
      const game = new Chess();
      game.loadPgn(cleaned);
      const fen = game.fen();
      const sideToMove = game.turn() === 'b' ? 'black' : 'white';
      return { fen, sideToMove };
    } catch {
      // 4. Token fallback for partial FEN strings
      const tokens = cleaned.split(/\s+/);
      const isBlackTurn = tokens.includes('b');
      const sideToMove = isBlackTurn ? 'black' : 'white';
      return { fen: cleaned, sideToMove };
    }
  }
};

export const saveCustomPuzzlesLibrary = async (classId, puzzlesList) => {
  try {
    if (puzzlesList && Array.isArray(puzzlesList)) {
      localStorage.setItem('universal_custom_puzzle_library', JSON.stringify(puzzlesList));
    } else if (puzzlesList === null) {
      localStorage.removeItem('universal_custom_puzzle_library');
    }
  } catch (e) {
    console.error('Failed to save universal library to localStorage:', e);
  }

  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      await setDoc(sessionRef, { customReviewLibrary: puzzlesList }, { merge: true });
      return;
    } catch (e) {
      console.error('Firebase saveCustomPuzzlesLibrary failed:', e);
    }
  }
  // Mock Fallback
  const session = getMockData(`session_${classId}`, {});
  session.customReviewLibrary = puzzlesList;
  setMockData(`session_${classId}`, session);
  broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
};

export const submitCustomReviewAnswer = async (classId, studentId, boardKey, answer) => {
  if (!isMock) {
    try {
      const studentRef = doc(firestore, 'sessions', classId, 'students', studentId);
      const snap = await getDoc(studentRef);
      const data = snap.exists() ? (snap.data() || {}) : {};
      const submissions = data.customReviewSubmissions || {};
      submissions[boardKey] = {
        answer: answer.trim(),
        status: 'submitted',
        timestamp: Date.now()
      };
      await setDoc(studentRef, { customReviewSubmissions: submissions }, { merge: true });
      return;
    } catch (e) {
      console.error('Firebase submitCustomReviewAnswer failed, using mock:', e);
    }
  }

  // Mock Fallback
  const students = getMockData(`students_${classId}`, []);
  const sIdx = students.findIndex(s => s.id === studentId);
  if (sIdx !== -1) {
    const submissions = students[sIdx].customReviewSubmissions || {};
    submissions[boardKey] = {
      answer: answer.trim(),
      status: 'submitted',
      timestamp: Date.now()
    };
    students[sIdx].customReviewSubmissions = submissions;
    setMockData(`students_${classId}`, students);
    broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
  }
};

export const gradeCustomReviewAnswer = async (classId, studentId, boardKey, isCorrect, coinsAwarded) => {
  if (!isMock) {
    try {
      const studentRef = doc(firestore, 'sessions', classId, 'students', studentId);
      const snap = await getDoc(studentRef);
      const data = snap.exists() ? (snap.data() || {}) : {};
      
      const submissions = data.customReviewSubmissions || {};
      if (submissions[boardKey]) {
        submissions[boardKey].status = isCorrect ? 'correct' : 'incorrect';
      }

      const updates = {
        customReviewSubmissions: submissions,
      };

      if (isCorrect && coinsAwarded > 0) {
        updates.coins = (data.coins || 0) + coinsAwarded;
        updates.roundCoins = (data.roundCoins || 0) + coinsAwarded;
      }

      await setDoc(studentRef, updates, { merge: true });

      if (isCorrect && coinsAwarded > 0) {
        const { savePersistentProfile } = await import('./db');
        savePersistentProfile(studentId, { coins: updates.coins });
      }
      return;
    } catch (e) {
      console.error('Firebase gradeCustomReviewAnswer failed, using mock:', e);
    }
  }

  // Mock Fallback
  const students = getMockData(`students_${classId}`, []);
  const sIdx = students.findIndex(s => s.id === studentId);
  if (sIdx !== -1) {
    const data = students[sIdx];
    const submissions = data.customReviewSubmissions || {};
    if (submissions[boardKey]) {
      submissions[boardKey].status = isCorrect ? 'correct' : 'incorrect';
    }
    
    data.customReviewSubmissions = submissions;
    if (isCorrect && coinsAwarded > 0) {
      data.coins = (data.coins || 0) + coinsAwarded;
      data.roundCoins = (data.roundCoins || 0) + coinsAwarded;
    }

    setMockData(`students_${classId}`, students);
    broadcastMessage({ type: 'STUDENTS_UPDATE', classId, students });
  }
};

export const updateCustomReviewBoardArrows = async (classId, round, boardKey, arrows) => {
  if (!round) return;
  const newRound = { ...round };
  if (newRound.customReviewPuzzles && newRound.customReviewPuzzles[boardKey]) {
    newRound.customReviewPuzzles[boardKey] = {
      ...newRound.customReviewPuzzles[boardKey],
      arrows: arrows || []
    };
  }

  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      await setDoc(sessionRef, { round: newRound }, { merge: true });
      return;
    } catch (e) {
      console.error('Firebase updateCustomReviewBoardArrows failed:', e);
    }
  }
  // Mock Fallback
  const session = getMockData(`session_${classId}`);
  if (session) {
    session.round = newRound;
    setMockData(`session_${classId}`, session);
    broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
  }
};

// ----------------------------------------------------
// Poll App Real-Time Synchronization
// ----------------------------------------------------

/**
 * Update the active Poll App board position and history
 */
export const updatePollState = async (classId, updates) => {
  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      const snap = await getDoc(sessionRef);
      const existingPoll = (snap.exists() ? snap.data().pollState : {}) || {};
      await updateDoc(sessionRef, {
        pollState: { ...existingPoll, ...updates }
      });
      return;
    } catch (e) {
      console.error('Firebase updatePollState failed:', e);
    }
  }

  // Mock Fallback
  const session = getMockData(`session_${classId}`) || {};
  const pollState = session.pollState || {};
  session.pollState = { ...pollState, ...updates };
  setMockData(`session_${classId}`, session);
  broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
};

/**
 * Submit a student's move vote in the Poll App
 */
export const submitPollVote = async (classId, studentId, studentName, moveSan) => {
  const voteObj = { studentId, studentName, moveSan, timestamp: Date.now() };

  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      const snap = await getDoc(sessionRef);
      const pollState = (snap.exists() ? snap.data().pollState : {}) || {};
      const votes = pollState.votes || {};
      votes[studentId] = voteObj;

      await setDoc(sessionRef, {
        pollState: {
          ...pollState,
          votes
        }
      }, { merge: true });
      return;
    } catch (e) {
      console.error('Firebase submitPollVote failed:', e);
    }
  }

  // Mock Fallback
  const session = getMockData(`session_${classId}`) || {};
  session.pollState = session.pollState || {};
  session.pollState.votes = session.pollState.votes || {};
  session.pollState.votes[studentId] = voteObj;

  setMockData(`session_${classId}`, session);
  broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
};

/**
 * Clear all current votes in the Poll App
 */
export const clearPollVotes = async (classId) => {
  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      await updateDoc(sessionRef, {
        'pollState.votes': {}
      });
      return;
    } catch (e) {
      console.error('Firebase clearPollVotes failed:', e);
    }
  }

  // Mock Fallback
  const session = getMockData(`session_${classId}`) || {};
  if (session.pollState) {
    session.pollState.votes = {};
    setMockData(`session_${classId}`, session);
    broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
  }
};

/**
 * Listen to Poll App state changes
 */
export const listenToPollState = (classId, callback) => {
  return listenToSession(classId, (sessionData) => {
    if (sessionData && sessionData.pollState) {
      callback(sessionData.pollState);
    } else {
      callback(null);
    }
  });
};

/**
 * Start and sync Poll App view to all students in the classroom session
 */
export const startPollSession = async (classId) => {
  if (!isMock) {
    try {
      const sessionRef = doc(firestore, 'sessions', classId);
      const snap = await getDoc(sessionRef);
      const data = snap.exists() ? snap.data() : {};

      const pending = data.pendingApprovals || [];
      const roster = data.roster || [];
      const approved = data.approvedStudents || [];

      for (const p of pending) {
        if (!roster.some(r => r.id === p.id)) roster.push({ id: p.id, name: p.name });
        if (!approved.includes(p.id)) approved.push(p.id);
      }

      await updateDoc(sessionRef, {
        pollActive: true,
        activeTab: 'poll_app',
        pendingApprovals: [],
        roster,
        approvedStudents: approved,
        'pollState.active': true,
        'round.status': 'active',
      });
      return;
    } catch (e) {
      console.error('Firebase startPollSession failed:', e);
    }
  }

  // Mock Fallback
  const session = getMockData(`session_${classId}`) || {};
  const pending = session.pendingApprovals || [];
  session.roster = session.roster || [];
  session.approvedStudents = session.approvedStudents || [];

  for (const p of pending) {
    if (!session.roster.some(r => r.id === p.id)) session.roster.push({ id: p.id, name: p.name });
    if (!session.approvedStudents.includes(p.id)) session.approvedStudents.push(p.id);
  }

  session.pendingApprovals = [];
  session.pollActive = true;
  session.activeTab = 'poll_app';
  if (!session.pollState) session.pollState = {};
  session.pollState.active = true;
  if (session.round) session.round.status = 'active';

  setMockData(`session_${classId}`, session);
  broadcastMessage({ type: 'SESSION_UPDATE', classId, session });
};

/**
 * Dismiss round winner overlay permanently
 */
export const dismissRoundOverlay = async (classId) => {
  // Dismissing round overlay is handled via local state / sessionStorage by components.
  return;
};



