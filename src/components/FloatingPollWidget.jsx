import React, { useState } from 'react';
import { BarChart2, Maximize2, Minimize2, ExternalLink, X, Users, RefreshCw } from 'lucide-react';

export default function FloatingPollWidget({ 
  votes = {}, 
  onClose, 
  onPlayMove, 
  onClearVotes,
  fen,
  activeMove
}) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handlePopout = () => {
    const popup = window.open(
      '', 
      'LichessPollWidget', 
      'width=380,height=520,resizable=yes,scrollbars=yes,status=no'
    );
    if (popup) {
      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Live Student Polls</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #0f172a;
                color: #f8fafc;
                padding: 16px;
                margin: 0;
              }
              h3 { margin-top: 0; color: #38bdf8; font-size: 16px; display: flex; align-items: center; justify-content: space-between; }
              .stat-box { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
              .bar-row { margin-bottom: 8px; }
              .bar-header { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
              .bar-track { background: rgba(255,255,255,0.1); height: 12px; border-radius: 6px; overflow: hidden; }
              .bar-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); height: 100%; transition: width 0.3s; }
              .student-list { max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; }
              .student-item { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
            </style>
          </head>
          <body>
            <h3>📊 Live Move Polls <span style="font-size: 12px; background:#1e293b; padding:2px 8px; border-radius:12px;">${totalVotes} votes</span></h3>
            <div class="stat-box">
              ${sortedTallies.length === 0 ? '<div style="color:#94a3af; text-align:center; padding:12px;">No votes submitted yet</div>' : ''}
              ${sortedTallies.map(([move, count]) => {
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                return `
                  <div class="bar-row">
                    <div class="bar-header">
                      <span style="color:#60a5fa;">${move}</span>
                      <span>${count} (${pct}%)</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${pct}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <h4 style="margin-bottom: 8px;">Student Votes</h4>
            <div class="student-list">
              ${voteList.length === 0 ? '<div style="color:#94a3af; font-size:12px;">Waiting for responses...</div>' : ''}
              ${voteList.map(v => `
                <div class="student-item">
                  <span style="font-weight: 600; color:#f1f5f9;">${v.studentName}</span>
                  <span style="color:#38bdf8; font-weight: 700;">${v.moveSan}</span>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `);
      popup.document.close();
    }
  };

  return (
    <div style={styles.floatingContainer} className="animate-slide-up">
      {/* Floating Header */}
      <div style={styles.floatingHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Live Polls ({totalVotes})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button 
            onClick={handlePopout} 
            style={styles.iconBtn} 
            title="Pop out into separate window for Lichess"
          >
            <ExternalLink size={14} />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            style={styles.iconBtn}
            title={isExpanded ? "Collapse view" : "Expand view"}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          {onClose && (
            <button onClick={onClose} style={styles.iconBtn} title="Close widget">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Mini View: Bar Summary */}
      <div style={styles.floatingBody}>
        {sortedTallies.length === 0 ? (
          <div style={styles.emptyState}>No move votes yet</div>
        ) : (
          sortedTallies.slice(0, isExpanded ? 6 : 3).map(([move, count]) => {
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return (
              <div key={move} style={styles.barItem}>
                <div style={styles.barMeta}>
                  <button 
                    onClick={() => onPlayMove && onPlayMove(move)}
                    style={styles.moveTagBtn}
                    title={`Play ${move}`}
                  >
                    {move}
                  </button>
                  <span style={styles.pctLabel}>{count} ({pct}%)</span>
                </div>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })
        )}

        {/* Expanded Student List */}
        {isExpanded && (
          <div style={styles.expandedDetails}>
            <div style={styles.sectionHeader}>
              <Users size={14} />
              <span>Student Responses ({voteList.length})</span>
              {onClearVotes && (
                <button onClick={onClearVotes} style={styles.clearBtn} title="Reset votes">
                  <RefreshCw size={12} /> Clear
                </button>
              )}
            </div>
            <div style={styles.studentListScroll}>
              {voteList.map(v => (
                <div key={v.studentId || v.studentName} style={styles.studentRow}>
                  <span style={styles.studentName}>{v.studentName}</span>
                  <span style={styles.studentMoveBadge}>{v.moveSan}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  floatingContainer: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
    width: '320px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1.5px solid var(--border-color)',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px var(--shadow-color)',
    overflow: 'hidden',
    color: 'var(--text-primary)',
    transition: 'all 0.3s ease',
  },
  floatingHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBody: {
    padding: '12px 14px',
  },
  emptyState: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '8px 0',
  },
  barItem: {
    marginBottom: '8px',
  },
  barMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  moveTagBtn: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
    color: 'var(--accent-primary)',
    fontWeight: '800',
    fontSize: '0.85rem',
    padding: '2px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  pctLabel: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    fontWeight: '700',
  },
  barTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-primary), #60a5fa)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  expandedDetails: {
    marginTop: '12px',
    paddingTop: '10px',
    borderTop: '1px solid var(--border-color)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    fontWeight: '700',
    marginBottom: '8px',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  studentListScroll: {
    maxHeight: '160px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  studentRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 8px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '6px',
    fontSize: '0.82rem',
  },
  studentName: {
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  studentMoveBadge: {
    fontWeight: '800',
    color: 'var(--accent-primary)',
  },
};
