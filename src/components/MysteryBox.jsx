import React, { useState } from 'react';
import { getPokemonById, handlePokemonImageError } from '../data/pokemonData';

export default function MysteryBox({
  coins = 0,
  activeTeam = [],
  onOpenBox, // Callback that rolls the pokemon, deducts coins, returns rolled ID
  onToggleTeam,
  onClose,
}) {
  const [openingState, setOpeningState] = useState('idle'); // 'idle' | 'shaking' | 'revealed'
  const [rolledPokemon, setRolledPokemon] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenClick = async (boxType = 'standard', cost = 150) => {
    if (coins < cost || openingState !== 'idle') return;

    setErrorMsg('');
    setOpeningState('shaking');

    try {
      // Execute the parent callback which handles database deductions and rolls
      const result = await onOpenBox(boxType, cost);
      
      // Delay for shaking animation (1.8s)
      setTimeout(() => {
        if (result && result.pokemonId) {
          const pokemon = getPokemonById(result.pokemonId);
          setRolledPokemon(pokemon);
          setIsDuplicate(result.duplicate || false);
          setOpeningState('revealed');
        } else {
          setOpeningState('idle');
          setErrorMsg('Oops, something went wrong opening the box.');
        }
      }, 1800);
      
    } catch (e) {
      console.error(e);
      setOpeningState('idle');
      setErrorMsg(e.message || 'Error opening mystery box.');
    }
  };

  const handleReset = () => {
    setOpeningState('idle');
    setRolledPokemon(null);
    setIsDuplicate(false);
  };

  const rarityColors = {
    rare: '#3b82f6',
    epic: '#8b5cf6',
    legendary: '#f59e0b',
  };

  return (
    <div style={styles.overlay} className="modal-backdrop">
      <div style={styles.modal} className="glass-panel scale-up-anim">
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🎁 Pokémon Mystery Box</h2>
          <button style={styles.closeBtn} onClick={onClose} disabled={openingState === 'shaking'}>
            &times;
          </button>
        </div>

        {/* Content Area */}
        <div style={styles.content}>
          {openingState === 'idle' && (
            <div style={styles.idleView}>
              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                
                {/* Standard Mystery Box */}
                <div style={{ flex: 1, minWidth: '220px', padding: '1.2rem', borderRadius: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={styles.boxDisplay} className="gift-wiggle-idle">
                    📦
                  </div>
                  <h3 style={{ margin: '0.4rem 0', fontWeight: 800, fontSize: '1rem' }}>Standard Box</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                    Roll a random Pokémon companion (60% Rare, 30% Epic, 10% Legendary).
                  </p>
                  <button
                    className="btn btn-accent"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      fontWeight: 800,
                      opacity: coins < 150 ? 0.6 : 1,
                      cursor: coins < 150 ? 'not-allowed' : 'pointer',
                    }}
                    disabled={coins < 150}
                    onClick={() => handleOpenClick('standard', 150)}
                  >
                    Open Box (150 🪙)
                  </button>
                </div>

                {/* Legendary Mystery Box */}
                <div style={{ flex: 1, minWidth: '220px', padding: '1.2rem', borderRadius: '16px', backgroundColor: 'var(--bg-secondary)', border: '2px solid #f59e0b', boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={styles.boxDisplay} className="gift-wiggle-idle">
                    👑
                  </div>
                  <h3 style={{ margin: '0.4rem 0', fontWeight: 900, fontSize: '1rem', color: '#f59e0b' }}>
                    👑 Legendary Box
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                    <strong>100% Guaranteed</strong> Legendary or Epic God-tier Pokémon drop!
                  </p>
                  <button
                    className="btn btn-accent"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      fontWeight: 900,
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                      opacity: coins < 1000 ? 0.6 : 1,
                      cursor: coins < 1000 ? 'not-allowed' : 'pointer',
                    }}
                    disabled={coins < 1000}
                    onClick={() => handleOpenClick('legendary', 1000)}
                  >
                    Open Legendary Box (1000 🪙)
                  </button>
                </div>

              </div>

              {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
            </div>
          )}

          {openingState === 'shaking' && (
            <div style={styles.shakingView}>
              <div style={styles.shakingBox} className="gift-wiggle-intense">
                🎁
              </div>
              <p style={styles.shakingText}>Opening... get ready!</p>
              <div style={styles.lightBeamBg}></div>
            </div>
          )}

          {openingState === 'revealed' && rolledPokemon && (
            <div style={styles.revealView}>
              <div 
                style={{
                  ...styles.revealWrapper,
                  boxShadow: `0 0 40px ${rarityColors[rolledPokemon.rarity] || '#8b5cf6'}cc`,
                }}
                className="poke-glow-anim"
              >
                <img
                  src={rolledPokemon.spriteUrl}
                  alt={rolledPokemon.name}
                  onError={(e) => handlePokemonImageError(e, rolledPokemon)}
                  style={styles.revealedSprite}
                  className="poke-bounce"
                />
              </div>

              <span style={{ 
                ...styles.rarityLabel, 
                backgroundColor: rarityColors[rolledPokemon.rarity] || '#6b7280' 
              }}>
                {rolledPokemon.rarity.toUpperCase()}
              </span>

              <h3 style={styles.pokemonName}>{rolledPokemon.name}</h3>

              {isDuplicate ? (
                <div style={styles.duplicateBanner} className="glass-panel">
                  <p style={styles.duplicateText}>
                    You already have {rolledPokemon.name}!
                  </p>
                  <span style={styles.refundText}>🪙 +20 Coins Refunded</span>
                </div>
              ) : (
                <p style={styles.newText}>🎉 NEW companion unlocked!</p>
              )}

              <div style={styles.revealActions}>
                {!isDuplicate && (
                  <button
                    className="btn"
                    style={{
                      ...styles.doneBtn,
                      backgroundColor: activeTeam.includes(rolledPokemon.id) ? '#ef4444' : '#3b82f6',
                      color: '#fff',
                      border: 'none',
                    }}
                    onClick={() => onToggleTeam(rolledPokemon.id)}
                  >
                    {activeTeam.includes(rolledPokemon.id) ? 'Remove Team' : 'Add Team'}
                  </button>
                )}
                <button className="btn btn-secondary" style={styles.doneBtn} onClick={handleReset}>
                  Open Another
                </button>
                <button className="btn btn-primary" style={styles.doneBtn} onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
    backdropFilter: 'blur(8px)',
  },
  modal: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '1.8rem',
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.8rem',
    marginBottom: '1.2rem',
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '2rem',
    lineHeight: '1',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '0.2rem',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleView: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  boxDisplay: {
    fontSize: '5.5rem',
    margin: '1rem 0',
    userSelect: 'none',
  },
  infoText: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 1.2rem 0',
    lineHeight: '1.4',
  },
  oddsTable: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '0.8rem 1.2rem',
    width: '100%',
    maxWidth: '260px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1.5rem',
    fontSize: '0.85rem',
  },
  oddsTitle: {
    fontWeight: '800',
    color: 'var(--text-secondary)',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.2rem',
    marginBottom: '0.2rem',
  },
  oddsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: '700',
  },
  openBtn: {
    width: '100%',
    maxWidth: '280px',
    padding: '0.8rem',
    fontSize: '1rem',
    fontWeight: '800',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(var(--accent-rgb), 0.2)',
  },
  insufficientText: {
    fontSize: '0.75rem',
    color: '#ef4444',
    fontWeight: '700',
    marginTop: '0.4rem',
  },
  shakingView: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem 0',
    position: 'relative',
    width: '100%',
  },
  shakingBox: {
    fontSize: '6.5rem',
    userSelect: 'none',
    zIndex: 2,
  },
  shakingText: {
    marginTop: '1.5rem',
    fontSize: '1.1rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    animation: 'pulse 1.2s infinite',
  },
  lightBeamBg: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '200px',
    height: '200px',
    background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
    zIndex: 1,
    animation: 'spin 4s linear infinite',
  },
  revealView: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    padding: '0.5rem 0',
  },
  revealWrapper: {
    width: '140px',
    height: '140px',
    backgroundColor: 'var(--bg-secondary)',
    border: '2px solid var(--border-color)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  revealedSprite: {
    width: '120px',
    height: '120px',
    objectFit: 'contain',
  },
  rarityLabel: {
    fontSize: '0.7rem',
    fontWeight: '900',
    color: '#fff',
    padding: '0.2rem 0.6rem',
    borderRadius: '9999px',
    letterSpacing: '1px',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  pokemonName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '0.6rem 0 0.2rem 0',
  },
  newText: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#10b981',
    margin: '0 0 1.5rem 0',
  },
  duplicateBanner: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '0.6rem 1rem',
    margin: '0.4rem 0 1.5rem 0',
    width: '100%',
    maxWidth: '280px',
  },
  duplicateText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    margin: 0,
  },
  refundText: {
    fontSize: '0.9rem',
    color: '#f59e0b',
    fontWeight: '800',
    display: 'block',
    marginTop: '0.2rem',
  },
  revealActions: {
    display: 'flex',
    gap: '0.8rem',
    width: '100%',
    justifyContent: 'center',
  },
  doneBtn: {
    padding: '0.5rem 1.2rem',
    fontSize: '0.9rem',
    borderRadius: '10px',
    fontWeight: '700',
  },
  errorText: {
    fontSize: '0.85rem',
    color: '#ef4444',
    fontWeight: '700',
    margin: '0.5rem 0',
  }
};
