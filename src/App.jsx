import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import CoachDashboard from './components/CoachDashboard';
import StudentDashboard from './components/StudentDashboard';
import { Palette } from 'lucide-react';
import { isSessionExpired, listenToSession } from './firebase/db';

export default function App() {
  // Synchronously initialize state from URL & localStorage
  const [classId, setClassId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname;
    const coachMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/coach/i);
    const studentMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/?$/i);
    if (coachMatch) return coachMatch[1].toUpperCase();
    if (studentMatch) return studentMatch[1].toUpperCase();
    return '';
  });

  const [initialClassCode, setInitialClassCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname;
    const coachMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/coach/i);
    const studentMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/?$/i);
    if (coachMatch) return coachMatch[1].toUpperCase();
    if (studentMatch) return studentMatch[1].toUpperCase();
    return '';
  });

  const [student, setStudent] = useState(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const coachMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/coach/i);
    const isPlainCoach = path.match(/\/coach/i);
    if (coachMatch || isPlainCoach) return null; // Never load student session on coach route

    const studentMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/?$/i);
    const code = studentMatch ? studentMatch[1].toUpperCase() : localStorage.getItem('active_student_code');
    if (code) {
      const savedSession = localStorage.getItem(`student_session_${code}`);
      if (savedSession) {
        try {
          return JSON.parse(savedSession);
        } catch (e) {}
      }
    }
    return null;
  });

  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 'landing';
    const path = window.location.pathname;
    const coachMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/coach/i);
    if (coachMatch) return 'coach';

    const isPlainCoach = path.match(/\/coach/i);
    if (isPlainCoach) return 'landing';

    const studentMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/?$/i);
    const code = studentMatch ? studentMatch[1].toUpperCase() : null;
    if (code && localStorage.getItem(`student_session_${code}`)) {
      return 'student';
    }
    return 'landing';
  });

  const [theme, setTheme] = useState('classic'); // 'classic', 'forest', 'castle', 'space', 'ice', 'volcano'
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Check URL pathname on mount and listen to navigation popstate events
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const coachMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/coach/i);
      const studentMatch = path.match(/\/class\/([A-Za-z0-9_-]+)\/?$/i);
      const isPlainCoach = path.match(/\/coach/i);
      
      if (coachMatch) {
        const code = coachMatch[1].toUpperCase();
        setInitialClassCode(code);
        setClassId(code);
        setStudent(null);
        setPage('coach');
        return;
      }
      
      if (isPlainCoach) {
        setPage('landing');
        setClassId('');
        setStudent(null);
        setInitialClassCode('');
        return;
      }

      if (studentMatch) {
        const code = studentMatch[1].toUpperCase();
        setInitialClassCode(code);
        setClassId(code);

        const savedSession = localStorage.getItem(`student_session_${code}`);
        if (savedSession) {
          try {
            const parsedStudent = JSON.parse(savedSession);
            setStudent(parsedStudent);
            setPage('student');

            // Verify session is active and valid in background
            const unsub = listenToSession(code, (sessionData) => {
              if (sessionData && isSessionExpired(sessionData)) {
                console.warn('Session expired for today');
                localStorage.removeItem(`student_session_${code}`);
                localStorage.removeItem('active_student_code');
                setStudent(null);
                setPage('landing');
                alert('This session has expired.');
              } else {
                if (window.location.pathname !== `/class/${code}`) {
                  window.history.replaceState(null, '', `/class/${code}`);
                }
              }
              unsub(); // unsubscribe immediately
            });
            return;
          } catch (e) {
            localStorage.removeItem(`student_session_${code}`);
            localStorage.removeItem('active_student_code');
          }
        } else {
          setPage('landing');
          setStudent(null);
          return;
        }
      }

      setPage('landing');
      setClassId('');
      setInitialClassCode('');
      setStudent(null);
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Update theme class on body element
  useEffect(() => {
    // Remove other theme classes
    document.body.className = '';
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  const handleStartCoach = (code) => {
    setClassId(code);
    setPage('coach');
    window.history.pushState(null, '', `/class/${code}/coach`);
  };

  const handleJoinStudent = (code, studentData) => {
    setClassId(code);
    setStudent(studentData);
    setPage('student');
    localStorage.setItem('active_student_code', code);
    localStorage.setItem(`student_session_${code}`, JSON.stringify(studentData));
    window.history.pushState(null, '', `/class/${code}`);
  };

  const handleLeaveSession = () => {
    if (classId) {
      localStorage.removeItem(`student_session_${classId}`);
    }
    localStorage.removeItem('active_student_code');
    setPage('landing');
    setClassId('');
    setStudent(null);
    setInitialClassCode('');
    window.history.pushState(null, '', '/');
  };

  const themes = [
    { id: 'classic', name: 'Classic', color: '#769656' },
    { id: 'forest', name: 'Forest', color: '#5d8736' },
    { id: 'castle', name: 'Castle', color: '#b58863' },
    { id: 'space', name: 'Space', color: '#a855f7' },
    { id: 'ice', name: 'Ice Kingdom', color: '#7ea4c4' },
    { id: 'volcano', name: 'Volcano', color: '#ea580c' },
  ];

  return (
    <div style={styles.appWrapper}>
      {/* Top Floating Header Controls */}
      <div style={styles.themeControls}>
        <button 
          onClick={() => setShowThemeSelector(!showThemeSelector)} 
          style={styles.themeTrigger}
          className="glass-panel"
          title="Customize Theme"
        >
          <Palette size={20} color="var(--accent-primary)" />
          <span style={styles.themeLabel} className="theme-label">Theme: {theme.toUpperCase()}</span>
        </button>

        {showThemeSelector && (
          <div style={styles.themeDropdown} className="glass-panel">
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              CHOOSE A THEME
            </h4>
            <div style={styles.themeGrid}>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemeSelector(false);
                  }}
                  style={{
                    ...styles.themeOption,
                    border: theme === t.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ ...styles.themeDot, backgroundColor: t.color }}></span>
                  <span style={{ fontSize: '0.9rem', fontWeight: theme === t.id ? '600' : '400' }}>
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Page Routing */}
      {page === 'coach' && classId ? (
        <CoachDashboard 
          classId={classId} 
          onLeave={handleLeaveSession}
          onSwitchClass={handleStartCoach}
        />
      ) : page === 'student' && student && classId ? (
        <StudentDashboard 
          classId={classId} 
          student={student} 
          onLeave={handleLeaveSession}
        />
      ) : (
        <LandingPage 
          onStartCoach={handleStartCoach} 
          onJoinStudent={handleJoinStudent} 
          initialClassCode={initialClassCode || classId}
          hideRoleToggle={!!(initialClassCode || classId) || window.location.pathname.toLowerCase().includes('/coach')}
          forceRole={window.location.pathname.toLowerCase().includes('/coach') ? 'coach' : ''}
        />
      )}
    </div>
  );
}

const styles = {
  appWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'background-color 0.4s ease',
  },
  themeControls: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    zIndex: 1000,
  },
  themeTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    border: '1px solid var(--border-color)',
    borderRadius: '9999px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    boxShadow: '0 4px 6px var(--shadow-color)',
  },
  themeLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  themeDropdown: {
    position: 'absolute',
    top: '2.75rem',
    right: 0,
    width: '240px',
    padding: '1rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--panel-glow)',
  },
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '0.4rem',
  },
  themeOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  themeDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
  }
};
