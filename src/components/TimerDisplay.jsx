import React, { useEffect, useState, useRef } from 'react';
import { parseStartedAt } from '../utils/timerUtils';
import {
  playRoundStart,
  playTenseTick,
  playCountdownBeep,
  playRoundEnd,
} from '../utils/soundEffects';

export default function TimerDisplay({
  startedAt,
  duration,
  extraTime = 0,
  status = 'active',
  onExpired,
  size = 'compact', // 'large' | 'compact'
  showControls = false,
  onAddTime,
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const hasExpiredTriggered = useRef(false);

  // Sound effect tracking refs
  const hasPlayedStartSound = useRef(null);   // tracks startMs for which start sound was played
  const hasPlayedEndSound = useRef(false);
  const lastTickedSecond = useRef(null);       // prevents double-playing in the same second

  const startMs = parseStartedAt(startedAt);
  const numericDuration = Number(duration) || 0;
  const numericExtra = Number(extraTime) || 0;
  const totalDuration = numericDuration + numericExtra;

  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  // Reset expiration state when a new round starts
  useEffect(() => {
    hasExpiredTriggered.current = false;
    hasPlayedStartSound.current = null;
    hasPlayedEndSound.current = false;
    lastTickedSecond.current = null;
  }, [startMs, numericDuration, totalDuration, status]);

  // Play round-start chime when a new round begins
  useEffect(() => {
    if (!startMs || numericDuration <= 0 || status !== 'active') return;
    if (hasPlayedStartSound.current === startMs) return; // already played for this round

    // Only play if we're within the first 5 seconds of the round (prevent replay on late join / rejoin)
    const elapsed = (Date.now() - startMs) / 1000;
    if (elapsed >= 0 && elapsed < 5) {
      playRoundStart();
    }
    hasPlayedStartSound.current = startMs;
    hasPlayedEndSound.current = false;
    lastTickedSecond.current = null;
  }, [startMs, numericDuration, status]);

  useEffect(() => {
    if (!startMs || numericDuration <= 0) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      // Do not count down or expire if round is not active
      if (status !== 'active') {
        if (status === 'ended') {
          setTimeLeft(0);
        }
        return;
      }

      const targetTime = startMs + totalDuration * 1000;
      const difference = targetTime - Date.now();
      const remainingSeconds = Math.max(0, Math.ceil(difference / 1000));

      setTimeLeft(remainingSeconds);

      // ── Sound effects based on remaining time ──
      if (remainingSeconds !== lastTickedSecond.current) {
        lastTickedSecond.current = remainingSeconds;

        if (remainingSeconds <= 0 && !hasPlayedEndSound.current) {
          // Round ended — play buzzer
          hasPlayedEndSound.current = true;
          playRoundEnd();
        } else if (remainingSeconds >= 1 && remainingSeconds <= 10) {
          // Last 10 seconds — urgent countdown beep (pitch rises)
          playCountdownBeep(remainingSeconds);
        } else if (remainingSeconds >= 11 && remainingSeconds <= 30) {
          // 30s to 11s — soft tense clock tick
          playTenseTick();
        }
      }

      if (remainingSeconds <= 0 && !hasExpiredTriggered.current) {
        hasExpiredTriggered.current = true;
        if (typeof onExpiredRef.current === 'function') {
          try {
            Promise.resolve(onExpiredRef.current()).catch(err => {
              console.error('Error in TimerDisplay onExpired callback:', err);
            });
          } catch (e) {
            console.error('Error executing onExpired:', e);
          }
        }
      }
    };

    updateTimer(); // run once immediately
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [startMs, numericDuration, numericExtra, totalDuration, status]);

  if (!startMs || numericDuration <= 0) {
    return null;
  }

  // Calculate percentage remaining
  const percentage = Math.min(100, Math.max(0, (timeLeft / totalDuration) * 100));

  // Determine state colors
  let colorClass = 'timer-green';
  let colorValue = '#10b981'; // Tailwind Emerald-500
  if (percentage <= 10 && timeLeft <= 10) {
    colorClass = 'timer-flashing';
    colorValue = '#ef4444'; // Tailwind Red-500
  } else if (percentage <= 25) {
    colorClass = 'timer-red';
    colorValue = '#ef4444';
  } else if (percentage <= 50) {
    colorClass = 'timer-yellow';
    colorValue = '#f59e0b'; // Tailwind Amber-500
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (size === 'large') {
    // Circle parameters
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div style={styles.largeContainer} className="glass-panel">
        <div style={styles.circleWrapper}>
          <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="transparent"
              stroke="var(--border-color)"
              strokeWidth="12"
              style={{ opacity: 0.3 }}
            />
            {/* Foreground progress circle */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="transparent"
              stroke={colorValue}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
              }}
              className={colorClass === 'timer-flashing' ? 'timer-pulse' : ''}
            />
          </svg>
          <div style={styles.timeLabelContainer}>
            <span style={{ ...styles.timeDigits, color: colorValue }} className={colorClass === 'timer-flashing' ? 'heartbeat-text' : ''}>
              {timeString}
            </span>
            <span style={styles.timeSubtext}>remaining</span>
          </div>
        </div>

        {showControls && onAddTime && (
          <div style={styles.controlsGrid}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)', gridColumn: '1 / -1', textAlign: 'center', marginBottom: '0.2rem' }}>
              ➕ ADD EXTRA TIME
            </span>
            <button className="btn btn-secondary" style={styles.controlBtn} onClick={() => onAddTime(30)}>
              +30s
            </button>
            <button className="btn btn-secondary" style={styles.controlBtn} onClick={() => onAddTime(60)}>
              +1 min
            </button>
            <button className="btn btn-secondary" style={styles.controlBtn} onClick={() => onAddTime(120)}>
              +2 min
            </button>
            <button className="btn btn-secondary" style={styles.controlBtn} onClick={() => onAddTime(300)}>
              +5 min
            </button>
          </div>
        )}
      </div>
    );
  }

  // Compact Mode (horizontal bar for students)
  return (
    <div style={styles.compactContainer} className="glass-panel">
      <div style={styles.progressBarBg}>
        <div
          style={{
            ...styles.progressBarFill,
            width: `${percentage}%`,
            backgroundColor: colorValue,
          }}
          className={colorClass === 'timer-flashing' ? 'timer-bar-flashing' : ''}
        />
      </div>
      <div style={{ ...styles.compactText, color: colorValue }} className={colorClass === 'timer-flashing' ? 'heartbeat-text' : ''}>
        ⏱️ {timeString}
      </div>
    </div>
  );
}

const styles = {
  largeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem',
    borderRadius: '24px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    boxShadow: '0 20px 40px var(--shadow-color)',
    width: '100%',
    maxWidth: '320px',
    margin: '0 auto',
  },
  circleWrapper: {
    position: 'relative',
    width: '220px',
    height: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabelContainer: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDigits: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '2.5rem',
    fontWeight: '800',
    letterSpacing: '-1px',
    lineHeight: '1',
    transition: 'color 0.5s ease',
  },
  timeSubtext: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginTop: '0.2rem',
  },
  controlsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.6rem',
    marginTop: '1.8rem',
    width: '100%',
  },
  controlBtn: {
    padding: '0.5rem',
    fontSize: '0.85rem',
    borderRadius: '10px',
    fontWeight: '700',
  },
  compactContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.6rem 1rem',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    width: '100%',
  },
  progressBarBg: {
    flex: 1,
    height: '8px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '9999px',
    transition: 'width 1s linear, background-color 0.5s ease',
  },
  compactText: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.1rem',
    fontWeight: '800',
    whiteSpace: 'nowrap',
    minWidth: '70px',
    textAlign: 'right',
  },
};
