import React, { useState, useEffect } from 'react';
import { Play, Users, Trophy, Award, BookOpen, Crown, ChevronRight, Lock } from 'lucide-react';
import { 
  createSession, 
  joinSession, 
  listenToSession, 
  requestClassroomEntry,
  isStudentApprovedForToday
} from '../firebase/db';
import FootballCardShop from './FootballCardShop';
import { rollFootballBoosterPack, FOOTBALL_BOOSTER_PACK_PRICE, FOOTBALL_DUPLICATE_REFUND } from '../data/footballCardsData';

const getStorageArray = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return [];
  }
};

export default function LandingPage({ onStartCoach, onJoinStudent, initialClassCode = '', hideRoleToggle = false, forceRole = '' }) {
  const [activeTab, setActiveTab] = useState(forceRole || (initialClassCode ? 'student' : 'coach')); // 'student' or 'coach'
  const sessionHistory = getStorageArray('session_history');
  
  // Landing Football Shop Modal state & persistent preview wallet
  const [showLandingFootballShop, setShowLandingFootballShop] = useState(false);
  const [landingCoins, setLandingCoins] = useState(() => {
    try {
      const saved = localStorage.getItem('player_football_preview_coins');
      return saved !== null ? parseInt(saved, 10) : 1000;
    } catch (e) {
      return 1000;
    }
  });
  const [landingCards, setLandingCards] = useState(() => {
    try {
      const saved = localStorage.getItem('player_football_preview_cards');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handlePurchaseLandingCard = async (cardId, cost) => {
    if (landingCoins < cost) throw new Error('Not enough coins! Solve puzzles in a session to earn more.');
    const newCoins = landingCoins - cost;
    const newCards = [...landingCards, cardId];
    setLandingCoins(newCoins);
    setLandingCards(newCards);
    try {
      localStorage.setItem('player_football_preview_coins', String(newCoins));
      localStorage.setItem('player_football_preview_cards', JSON.stringify(newCards));
    } catch (e) {}
    return { success: true };
  };

  const handleOpenLandingBoosterPack = async () => {
    if (landingCoins < FOOTBALL_BOOSTER_PACK_PRICE) throw new Error('Not enough coins for Booster Pack!');
    const rolled = rollFootballBoosterPack(landingCards);
    const isDup = landingCards.includes(rolled.id);
    const refund = isDup ? FOOTBALL_DUPLICATE_REFUND : 0;
    const newCoins = Math.max(0, landingCoins - FOOTBALL_BOOSTER_PACK_PRICE + refund);
    const newCards = isDup ? landingCards : [...landingCards, rolled.id];
    setLandingCoins(newCoins);
    setLandingCards(newCards);
    try {
      localStorage.setItem('player_football_preview_coins', String(newCoins));
      localStorage.setItem('player_football_preview_cards', JSON.stringify(newCards));
    } catch (e) {}
    return { ...rolled, isDuplicate: isDup, refundCoins: refund };
  };

  // Sync active tab and input code when URL initialClassCode resolves
  useEffect(() => {
    if (forceRole) {
      setActiveTab(forceRole);
    } else {
      setActiveTab(initialClassCode ? 'student' : 'coach');
    }
    if (initialClassCode) {
      setClassCode(initialClassCode);
    }
  }, [initialClassCode, forceRole]);

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [classCode, setClassCode] = useState(initialClassCode);
  const [studentError, setStudentError] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);

  // Dynamic Roster & Waiting Room States
  const [sessionData, setSessionData] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isLobbyLocked, setIsLobbyLocked] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(''); // '', 'pending', 'approved'
  const [tempStudentId, setTempStudentId] = useState('');
  const [tempStudentName, setTempStudentName] = useState('');

  // Coach Form State
  const [difficulty, setDifficulty] = useState('mixed');
  const [theme, setTheme] = useState('mixed');
  const [coachLoading, setCoachLoading] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [coachError, setCoachError] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    const list = getStorageArray('coach_active_sessions');
    setActiveSessions(list);
  }, []);

  const handleDeleteSession = (code) => {
    if (confirm(`Are you sure you want to remove the batch "${code}"?`)) {
      const updated = activeSessions.filter(c => c !== code);
      setActiveSessions(updated);
      localStorage.setItem('coach_active_sessions', JSON.stringify(updated));
    }
  };

  const handleClearAllBatches = () => {
    if (confirm('Are you sure you want to remove ALL saved batches and start fresh?')) {
      setActiveSessions([]);
      localStorage.removeItem('coach_active_sessions');
    }
  };

  const handleCopyCodeLink = (code) => {
    const url = `${window.location.origin}/class/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    });
  };

  // Listen to session roster & gates in real-time
  useEffect(() => {
    const code = classCode.trim().toUpperCase();
    if (code.length >= 2 && code.length <= 20) {
      const unsubscribe = listenToSession(code, (session) => {
        if (session) {
          setSessionData(session);
          setIsLobbyLocked(!!session.isLobbyLocked);
          
          // Check if pending registration gets approved for today
          if (tempStudentId) {
            const isApproved = isStudentApprovedForToday(null, session, tempStudentId);
            if (isApproved) {
              setApprovalStatus('approved');
              // Automatically join
              handleAutoLogin(code, tempStudentName, tempStudentId);
            }
          }
        } else {
          setSessionData(null);
          setIsLobbyLocked(false);
        }
      });
      return unsubscribe;
    } else {
      setSessionData(null);
      setIsLobbyLocked(false);
    }
  }, [classCode, tempStudentId, tempStudentName]);

  // Generate random 4-character code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleAutoLogin = async (code, name, id) => {
    setStudentLoading(true);
    try {
      const studentData = await joinSession(code, name, id);
      const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      try {
        localStorage.setItem(`persistent_student_id_${code}`, id);
        localStorage.setItem(`persistent_student_id_by_name_${cleanKey}`, id);
        localStorage.setItem('puzzle_app_last_student_id', id);
        localStorage.setItem('puzzle_app_last_student_name', name);
      } catch (e) {}
      onJoinStudent(code, studentData);
    } catch (err) {
      setStudentError(err.message || 'Could not join session.');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setStudentError('');

    const code = classCode.trim().toUpperCase();
    if (!code) {
      setStudentError('Please enter a classroom code.');
      return;
    }

    if (isLobbyLocked) {
      setStudentError('Classroom lobby is currently locked by the Coach.');
      return;
    }

    // Case 1: Registering as a new student
    if (selectedStudentId === 'new' || !(sessionData?.roster || []).length) {
      if (!studentName.trim()) {
        setStudentError('Please enter your name.');
        return;
      }
      const sName = studentName.trim();
      
      // Check if student name already exists in roster
      const existingMatch = (sessionData?.roster || []).find(r => r.name.toLowerCase() === sName.toLowerCase());

      if (existingMatch) {
        const isApproved = isStudentApprovedForToday(null, sessionData, existingMatch.id);
        if (isApproved) {
          await handleAutoLogin(code, existingMatch.name, existingMatch.id);
        } else {
          setTempStudentId(existingMatch.id);
          setTempStudentName(existingMatch.name);
          setApprovalStatus('pending');
          await requestClassroomEntry(code, existingMatch.name, existingMatch.id);
        }
        return;
      }

      // Check if student has a saved ID on this device from earlier/yesterday to preserve wallet
      const cleanKey = sName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const savedStudentId = localStorage.getItem(`persistent_student_id_by_name_${cleanKey}`)
        || (localStorage.getItem('puzzle_app_last_student_name')?.toLowerCase() === sName.toLowerCase() ? localStorage.getItem('puzzle_app_last_student_id') : null);

      const studentId = savedStudentId || `std_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const isApproved = isStudentApprovedForToday(null, sessionData, studentId);
      if (isApproved) {
        await handleAutoLogin(code, sName, studentId);
      } else {
        setTempStudentId(studentId);
        setTempStudentName(sName);
        setApprovalStatus('pending');
        await requestClassroomEntry(code, sName, studentId);
      }
      return;
    }

    // Case 2: Selecting an existing name
    if (!selectedStudentId) {
      setStudentError('Please select your name or register as new.');
      return;
    }

    const rosterStudent = (sessionData?.roster || []).find(r => r.id === selectedStudentId);
    if (!rosterStudent) {
      setStudentError('Student record not found.');
      return;
    }

    const isApproved = isStudentApprovedForToday(null, sessionData, selectedStudentId);
    if (isApproved) {
      // Already approved for today
      await handleAutoLogin(code, rosterStudent.name, selectedStudentId);
    } else {
      // Send entry request to coach approval queue for today
      setTempStudentId(selectedStudentId);
      setTempStudentName(rosterStudent.name);
      setApprovalStatus('pending');
      await requestClassroomEntry(code, rosterStudent.name, selectedStudentId);
    }
  };

  const handleCoachSubmit = async (e) => {
    e.preventDefault();
    setCoachError('');
    setCoachLoading(true);
    
    const code = customCode.trim() ? customCode.trim().toUpperCase() : generateRandomCode();
    
    if (customCode.trim() && (customCode.trim().length < 2 || customCode.trim().length > 20)) {
      setCoachError('Custom code must be between 2 and 20 characters.');
      setCoachLoading(false);
      return;
    }

    try {
      const sessionData = await createSession(code, { difficulty, theme });
      const activeSessionsList = getStorageArray('coach_active_sessions');
      if (!activeSessionsList.includes(code)) {
        activeSessionsList.push(code);
        localStorage.setItem('coach_active_sessions', JSON.stringify(activeSessionsList));
      }
      onStartCoach(code, sessionData);
    } catch {
      setCoachError('Could not start classroom session. Try again.');
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <div style={styles.container} className="animate-slide-up">
      {/* Decorative floating components */}
      <div className="floating-piece-left animate-float">♞</div>
      <div className="floating-piece-right animate-float">👑</div>

      <div style={styles.card} className="glass-panel">
        {/* App Logo/Header */}
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <Crown size={32} color="var(--accent-primary)" />
          </div>
          <h1 style={styles.title}>Chess Classroom</h1>
          <p style={styles.subtitle}>Live puzzle sessions for online coaching</p>
        </div>

        {/* Role Toggle Tabs */}
        {!hideRoleToggle && approvalStatus !== 'pending' && (
          <div style={styles.tabContainer}>
            <button 
              onClick={() => setActiveTab('student')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'student' ? styles.activeTab : {}),
              }}
            >
              <Play size={18} />
              Student Join
            </button>
            <button 
              onClick={() => setActiveTab('coach')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'coach' ? styles.activeTab : {}),
              }}
            >
              <Users size={18} />
              Coach Dashboard
            </button>
          </div>
        )}

        {/* Tab Panel: Student Join */}
        {activeTab === 'student' && (
          approvalStatus === 'pending' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite', display: 'inline-block', marginBottom: '1rem' }}>⏳</div>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, marginBottom: '0.5rem' }}>Waiting for Coach...</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto' }}>
                Hi <strong>{tempStudentName}</strong>! Your request to join class <strong>{classCode.toUpperCase()}</strong> has been sent. The coach will let you in shortly! ♟
              </p>
            </div>
          ) : (
            <form onSubmit={handleStudentSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Classroom Code</label>
                <input 
                  type="text" 
                  placeholder="e.g., LVL2ADV" 
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  style={{ ...styles.input, textTransform: 'uppercase' }}
                  className="input-field"
                  maxLength={20}
                  required
                />
              </div>

              {sessionData && (
                <>
                  {/* Roster dropdown if students are registered */}
                  {(sessionData.roster || []).length > 0 && (
                    <>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Select Your Name</label>
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          style={styles.select}
                          className="input-field"
                          required
                        >
                          <option value="">-- Choose Name --</option>
                          {sessionData.roster.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                          <option value="new">➕ I'm New (Register)</option>
                        </select>
                      </div>

                      {/* Direct link for registering name */}
                      <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '0.8rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedStudentId === 'new') {
                              setSelectedStudentId('');
                              setStudentName('');
                            } else {
                              setSelectedStudentId('new');
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                          }}
                        >
                          {selectedStudentId === 'new' ? '⬅ Back to Roster list' : '➕ Not on the list? Add your name to roster'}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Name field if new student or no roster yet */}
                  {(selectedStudentId === 'new' || !(sessionData.roster || []).length) && (
                    <div style={styles.inputGroup} className="scale-up-anim">
                      <label style={styles.label}>Your Name</label>
                      <input 
                        type="text" 
                        placeholder="Type your name..." 
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        style={styles.input}
                        className="input-field"
                        maxLength={20}
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {isLobbyLocked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(0, 84%, 50%)', fontSize: '0.85rem', fontWeight: 600, padding: '0.5rem', border: '1px solid hsl(0, 80%, 90%)', borderRadius: '8px', background: 'hsl(0, 100%, 99%)' }}>
                  <Lock size={16} />
                  <span>The Coach has locked the entry gate.</span>
                </div>
              )}

              {studentError && <div style={styles.error}>{studentError}</div>}

              <button 
                type="submit" 
                disabled={studentLoading || isLobbyLocked || (sessionData && !selectedStudentId && (sessionData.roster || []).length > 0)}
                className="btn btn-primary"
                style={styles.submitButton}
              >
                {studentLoading ? 'Processing...' : (
                  selectedStudentId && selectedStudentId !== 'new' && localStorage.getItem(`persistent_student_id_${classCode.trim().toUpperCase()}`) === selectedStudentId
                    ? 'Login Instantly'
                    : 'Request Entry'
                )}
                <ChevronRight size={18} />
              </button>
            </form>
          )
        )}

        {/* Tab Panel: Coach Start */}
        {activeTab === 'coach' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {/* Active Batches Manager */}
            {activeSessions.length > 0 && (
              <div className="glass-panel scale-up-anim" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'var(--bg-tertiary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <h3 style={{ ...styles.label, margin: 0, fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 800 }}>
                    🏫 Your Active Batches / Classes ({activeSessions.length})
                  </h3>
                  <button
                    onClick={handleClearAllBatches}
                    className="btn"
                    style={{
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    🗑️ Remove All Batches
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {activeSessions.map((code) => (
                    <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-secondary)', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem', letterSpacing: '0.5px' }}>{code}</span>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleCopyCodeLink(code)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          {copiedCode === code ? '✅ Copied!' : '🔗 Copy Link'}
                        </button>
                        <button
                          onClick={() => onStartCoach(code, null)}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          Enter Dashboard
                        </button>
                        <button
                          onClick={() => handleDeleteSession(code)}
                          className="btn"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px', backgroundColor: 'transparent', border: 'none', color: 'hsl(0,75%,50%)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create New Batch Form */}
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <h3 style={{ ...styles.label, marginBottom: '1rem', fontSize: '0.82rem', fontWeight: 800 }}>
                ➕ Create New Batch / Classroom
              </h3>
              <form onSubmit={handleCoachSubmit} style={styles.form}>
                <div style={styles.inputRow}>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Difficulty</label>
                    <select 
                      value={difficulty} 
                      onChange={(e) => setDifficulty(e.target.value)}
                      style={styles.select}
                      className="input-field"
                    >
                      <option value="mixed">Mixed Difficulty</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Puzzle Theme</label>
                    <select 
                      value={theme} 
                      onChange={(e) => setTheme(e.target.value)}
                      style={styles.select}
                      className="input-field"
                    >
                      <option value="mixed">Mixed Themes</option>
                      <option value="mate_1">Mate in 1</option>
                      <option value="mate_2">Mate in 2</option>
                      <option value="mate_3">Mate in 3</option>
                      <option value="fork">Fork</option>
                      <option value="pin">Pin</option>
                      <option value="skewer">Skewer</option>
                      <option value="double_attack">Double Attack</option>
                      <option value="discovered_attack">Discovered Attack</option>
                      <option value="deflection">Deflection</option>
                      <option value="decoy">Decoy</option>
                      <option value="clearance">Clearance</option>
                      <option value="removing_defender">Removing Defender</option>
                      <option value="endgame">Endgame</option>
                    </select>
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Custom Code (Optional, 2-20 chars)</label>
                  <input 
                    type="text" 
                    placeholder="Leave blank for random (e.g. LVL2ADV)" 
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    style={{ ...styles.input, textTransform: 'uppercase' }}
                    className="input-field"
                    maxLength={20}
                  />
                </div>

                {coachError && <div style={styles.error}>{coachError}</div>}

                <button 
                  type="submit" 
                  disabled={coachLoading}
                  className="btn btn-primary"
                  style={styles.submitButton}
                >
                  {coachLoading ? 'Creating...' : 'Create Batch'}
                  <ChevronRight size={18} />
                </button>
              </form>
            </div>

            {/* Session History section for Coaches */}
            {sessionHistory.length > 0 && (
              <div style={styles.historySection}>
                <h3 style={styles.historyTitle}>Your Classroom Logs</h3>
                <div style={styles.historyList}>
                  {sessionHistory.slice(-3).reverse().map((h, i) => (
                    <div key={i} style={styles.historyItem} className="glass-panel">
                      <div style={styles.historyMetaHeader}>
                        <span style={styles.historyCode}>Session: {h.classId}</span>
                        <span style={styles.historyDate}>{h.date}</span>
                      </div>
                      <div style={styles.historyStats}>
                        <span>👥 {h.studentsCount} Students</span>
                        <span>🎯 {h.averageAccuracy}% Acc</span>
                        <span>🏆 Top: {h.topStudent}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature Badges for Premium Vibe */}
      <div style={styles.badgeRow}>
        <div style={styles.miniBadge}>
          <Award size={16} color="var(--accent-primary)" />
          <span>Real-time Sync</span>
        </div>
        <div style={styles.miniBadge}>
          <BookOpen size={16} color="var(--accent-primary)" />
          <span>Rich Chess Puzzles</span>
        </div>
        <div style={styles.miniBadge}>
          <Trophy size={16} color="var(--accent-primary)" />
          <span>Live Leaderboard</span>
        </div>
      </div>

      {/* Floating Football Card Shop Launcher */}
      <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
        <button
          onClick={() => setShowLandingFootballShop(true)}
          className="btn btn-secondary glass-panel"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.65rem 1.4rem',
            borderRadius: '24px',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: 'pointer',
            border: '2px solid rgba(245, 158, 11, 0.6)',
            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.25)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '1.2rem' }}>⚽</span>
          <span>Open Football Card Shop & Album</span>
          <span style={{ fontSize: '0.7rem', backgroundColor: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '10px', fontWeight: 900, letterSpacing: '0.5px' }}>
            NEW
          </span>
        </button>
      </div>

      {/* Football Card Shop Modal on Landing Page */}
      {showLandingFootballShop && (
        <FootballCardShop
          coins={landingCoins}
          ownedCards={landingCards}
          onPurchaseCard={handlePurchaseLandingCard}
          onOpenBoosterPack={handleOpenLandingBoosterPack}
          onClose={() => setShowLandingFootballShop(false)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '85vh',
    position: 'relative',
    padding: '1rem',
  },

  card: {
    width: '100%',
    maxWidth: '540px',
    padding: '2.5rem',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--panel-glow)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoBadge: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    backgroundColor: 'var(--accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    boxShadow: '0 8px 16px rgba(var(--accent-rgb), 0.1)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  tabContainer: {
    display: 'flex',
    gap: '0.5rem',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '0.4rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '2rem',
  },
  tabButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    fontFamily: 'Outfit, sans-serif',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--accent-primary)',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  inputRow: {
    display: 'flex',
    gap: '1rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
  },
  input: {
    fontSize: '1rem',
  },
  select: {
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  error: {
    fontSize: '0.9rem',
    color: 'hsl(0, 84%, 50%)',
    backgroundColor: 'hsl(0, 80%, 96%)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    borderLeft: '4px solid hsl(0, 84%, 50%)',
  },
  submitButton: {
    marginTop: '0.5rem',
    padding: '0.9rem',
    fontSize: '1.05rem',
    width: '100%',
  },
  difficultySelectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  difficultyCard: {
    padding: '1.25rem 0.5rem',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
  },
  difficultyCardTitle: {
    fontWeight: '700',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
  },
  difficultyCardDesc: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  difficultyCardActiveBeginner: {
    borderColor: '#22c55e',
    backgroundColor: 'hsl(142, 60%, 96%)',
    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
  },
  difficultyCardActiveIntermediate: {
    borderColor: '#f59e0b',
    backgroundColor: 'hsl(38, 90%, 96%)',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
  },
  difficultyCardActiveAdvanced: {
    borderColor: '#ef4444',
    backgroundColor: 'hsl(0, 85%, 97%)',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
  },
  badgeRow: {
    display: 'flex',
    gap: '1.5rem',
    marginTop: '2rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  miniBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-secondary)',
    padding: '0.4rem 0.8rem',
    borderRadius: '9999px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 2px 4px var(--shadow-color)',
  },
  historySection: {
    marginTop: '2rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '1.5rem',
    width: '100%',
  },
  historyTitle: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginBottom: '1rem',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  historyItem: {
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
  },
  historyMetaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginBottom: '0.4rem',
  },
  historyCode: {
    color: 'var(--accent-primary)',
  },
  historyDate: {
    fontWeight: '400',
  },
  historyStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    fontWeight: '600',
    flexWrap: 'wrap',
    gap: '0.5rem',
  }
};
