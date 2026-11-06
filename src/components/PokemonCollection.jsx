import React, { useState } from 'react';
import { POKEMON_CATALOG, handlePokemonImageError } from '../data/pokemonData';

export default function PokemonCollection({
  ownedPokemon = [],
  equippedPokemon = 'togepi',
  activeTeam = ['togepi'],
  pokemonXp = {},
  coins = 0,
  onEquip,
  onToggleTeam,
  onFeedBerry,
  onOpenFootballShop,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [evolvingPokemon, setEvolvingPokemon] = useState(null); // { fromName, toName, sprite }

  const tabs = [
    { id: 'all', name: 'All', icon: '🎒' },
    { id: 'starter', name: 'Starter', icon: '🥚' },
    { id: 'common', name: 'Common', icon: '⚪' },
    { id: 'rare', name: 'Rare', icon: '🔵' },
    { id: 'epic', name: 'Epic', icon: '🟣' },
    { id: 'legendary', name: 'Legendary', icon: '🟡' },
  ];

  const filteredPokemon = POKEMON_CATALOG.filter(p => {
    if (activeTab === 'all') return true;
    return p.rarity === activeTab;
  });

  const ownedCount = POKEMON_CATALOG.filter(p => ownedPokemon.includes(p.id)).length;

  const rarityStyles = {
    starter: { color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
    common: { color: '#6b7280', border: 'rgba(107, 114, 128, 0.2)' },
    rare: { color: '#3b82f6', border: 'rgba(59, 130, 246, 0.4)' },
    epic: { color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.5)' },
    legendary: { color: '#f59e0b', border: 'rgba(245, 158, 11, 0.6)' },
  };

  const handleFeed = async (pokeId, e) => {
    e.stopPropagation();
    if (coins < 5) return;
    const res = await onFeedBerry(pokeId);
    if (res && res.evolved) {
      const fromPoke = POKEMON_CATALOG.find(p => p.id === res.from);
      const toPoke = POKEMON_CATALOG.find(p => p.id === res.to);
      setEvolvingPokemon({
        fromName: fromPoke?.name || res.from,
        toName: toPoke?.name || res.to,
        sprite: toPoke?.spriteUrl || ''
      });
    }
  };

  return (
    <div style={styles.overlay} className="modal-backdrop">
      <div style={styles.modal} className="glass-panel scale-up-anim">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <span style={{ fontSize: '1.8rem' }}>🎒</span>
            <div>
              <h2 style={styles.title}>Your Pocket</h2>
              <span style={styles.subtitle}>
                Collected: {ownedCount} / {POKEMON_CATALOG.length} Pokémon | Wallet: 🪙 {coins}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {onOpenFootballShop && (
              <button 
                onClick={onOpenFootballShop} 
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', fontWeight: 800, border: '1px solid rgba(245, 158, 11, 0.4)' }}
                title="View Football Card Album & Shop"
              >
                ⚽ Football Cards
              </button>
            )}
            <button style={styles.closeBtn} onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        {/* Evolving Overlay celebration */}
        {evolvingPokemon && (
          <div style={styles.evoOverlay}>
            <div style={styles.evoCard} className="scale-up-anim">
              <span style={{ fontSize: '3rem', animation: 'bounce 1s infinite' }}>✨ Evolution! ✨</span>
              <div style={styles.evoSpritesRow}>
                <img src={evolvingPokemon.sprite} alt={evolvingPokemon.toName} onError={(e) => handlePokemonImageError(e, evolvingPokemon.toName)} style={styles.evoSprite} />
              </div>
              <h3 style={{ margin: '1rem 0 0.5rem 0', fontWeight: 800 }}>
                Congratulations!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.2rem' }}>
                Your <strong>{evolvingPokemon.fromName}</strong> evolved into <strong>{evolvingPokemon.toName}</strong>! Its skill has been upgraded. ♟🔥
              </p>
              <button className="btn btn-primary" onClick={() => setEvolvingPokemon(null)}>
                Awesome!
              </button>
            </div>
          </div>
        )}

        {/* Active Team of 6 Row */}
        <div style={styles.teamContainer} className="glass-panel">
          <div style={{ fontWeight: 'bold', fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            🎒 Active Team ({activeTeam.length} / 6)
          </div>
          {activeTeam.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              Your active team is empty. Add up to 6 owned Pokémon below to use their skills!
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {activeTeam.map(tId => {
                const poke = POKEMON_CATALOG.find(p => p.id === tId);
                if (!poke) return null;
                const isCompanion = equippedPokemon === tId;
                return (
                  <div 
                    key={tId} 
                    onClick={() => onToggleTeam(tId)}
                    style={{ 
                      ...styles.teamBubble, 
                      borderColor: isCompanion ? 'var(--accent-primary)' : 'var(--border-color)', 
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    title="Click to remove from active team"
                  >
                    <img src={poke.spriteUrl} alt={poke.name} onError={(e) => handlePokemonImageError(e, poke)} style={styles.teamSprite} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{poke.name}</span>
                    {isCompanion && <span style={{ fontSize: '0.6rem', color: 'var(--accent-primary)' }}>🐾</span>}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTeam(tId);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '0.7rem',
                        lineHeight: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        zIndex: 5
                      }}
                      title="Remove from Active Team"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                backgroundColor: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span> {tab.name}
            </button>
          ))}
        </div>

        {/* Grid List */}
        <div style={styles.gridContainer} className="custom-scrollbar">
          {filteredPokemon.map(p => {
            const isOwned = ownedPokemon.includes(p.id);
            const isEquipped = equippedPokemon === p.id;
            const inTeam = activeTeam.includes(p.id);
            const style = rarityStyles[p.rarity] || rarityStyles.common;
            const xp = pokemonXp[p.id] || 0;

            return (
              <div
                key={p.id}
                style={{
                  ...styles.card,
                  borderColor: isEquipped ? 'var(--accent-primary)' : 'var(--border-color)',
                  boxShadow: isEquipped 
                    ? `0 0 12px ${style.color}bb`
                    : 'none',
                  opacity: isOwned ? 1 : 0.7,
                }}
                className={`poke-card-hover ${isEquipped ? 'equipped-card-border' : ''}`}
              >
                {/* Rarity Tag */}
                <div style={{ ...styles.cardRarity, backgroundColor: style.color }}>
                  {p.rarity.toUpperCase()}
                </div>

                {/* Sprite Wrapper */}
                <div style={styles.spriteWrapper}>
                  <img
                    src={p.spriteUrl}
                    alt={p.name}
                    onError={(e) => handlePokemonImageError(e, p)}
                    style={{
                      ...styles.sprite,
                      filter: isOwned ? 'none' : 'brightness(0) contrast(1.2)', // silhouette
                    }}
                  />
                  {!isOwned && (
                    <div style={styles.lockOverlay}>
                      🔒
                    </div>
                  )}
                </div>

                {/* Details */}
                <span style={styles.cardName}>{isOwned ? p.name : '???'}</span>
                <span style={styles.cardPokedex}>#{p.pokedexNumber.toString().padStart(3, '0')}</span>

                {/* Skill Details */}
                {isOwned && p.skill && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '0.3rem 0', minHeight: '32px', overflow: 'hidden' }} title={p.skill.description}>
                    <strong>{p.skill.name}</strong>: {p.skill.description.substring(0, 48)}...
                  </div>
                )}

                {/* XP and Feed Berry */}
                {isOwned && (
                  <div style={{ width: '100%', marginTop: '0.4rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginBottom: '2px' }}>
                      <span>XP: {xp}/5</span>
                      {p.evolvesTo && <span style={{ color: 'var(--accent-primary)' }}>➔ Evo</span>}
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                      <div style={{ width: `${Math.min(100, (xp / 5) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
                    </div>
                    
                    <button
                      onClick={(e) => handleFeed(p.id, e)}
                      disabled={coins < 5}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '2px 4px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}
                    >
                      <span>🍇</span> Feed (5🪙)
                    </button>
                  </div>
                )}

                {/* Action buttons */}
                {isOwned ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    {/* Companion Button */}
                    <button 
                      style={{ 
                        ...styles.actionBtn, 
                        backgroundColor: isEquipped ? '#10b981' : 'var(--accent-primary)',
                        color: '#fff'
                      }} 
                      onClick={() => onEquip(p.id)}
                      disabled={isEquipped}
                    >
                      {isEquipped ? '🐾 Active Companion ✓' : '🐾 Set as Companion'}
                    </button>

                    {/* Team Button */}
                    <button
                      style={{
                        ...styles.actionBtn,
                        backgroundColor: inTeam ? '#ef4444' : '#3b82f6',
                        color: '#fff'
                      }}
                      onClick={() => onToggleTeam(p.id)}
                      disabled={!inTeam && activeTeam.length >= 6}
                    >
                      {inTeam ? '❌ Remove from Team' : '➕ Add to Active Team'}
                    </button>
                  </div>
                ) : (
                  <button style={{ ...styles.actionBtn, ...styles.lockedBtn }} disabled>
                    🔒 Locked
                  </button>
                )}
              </div>
            );
          })}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
    maxWidth: '850px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1rem',
    marginBottom: '1rem',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '2rem',
    lineHeight: '1',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '0.2rem',
    transition: 'color 0.2s',
  },
  teamContainer: {
    padding: '0.75rem',
    borderRadius: '14px',
    backgroundColor: 'var(--bg-tertiary)',
    marginBottom: '1rem',
    border: '1px solid var(--border-color)',
  },
  teamBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.25rem 0.6rem',
    borderRadius: '20px',
    backgroundColor: 'var(--bg-secondary)',
    border: '2px solid var(--border-color)',
  },
  teamSprite: {
    width: '28px',
    height: '28px',
    objectFit: 'contain',
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '1.2rem',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.4rem 0.8rem',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: '1rem',
    overflowY: 'auto',
    paddingRight: '0.5rem',
    flex: 1,
    minHeight: '200px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.8rem',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1.5px solid var(--border-color)',
    position: 'relative',
    overflow: 'visible',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  cardRarity: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: '0.55rem',
    fontWeight: '900',
    color: '#fff',
    padding: '0.15rem 0',
    letterSpacing: '0.5px',
  },
  spriteWrapper: {
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: '0.8rem',
  },
  sprite: {
    width: '75px',
    height: '75px',
    objectFit: 'contain',
    userSelect: 'none',
  },
  lockOverlay: {
    position: 'absolute',
    fontSize: '1.2rem',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: '0.85rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginTop: '0.4rem',
    textAlign: 'center',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    width: '100%',
  },
  cardPokedex: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginTop: '0.1rem',
  },
  actionBtn: {
    width: '100%',
    padding: '0.3rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  lockedBtn: {
    width: '100%',
    padding: '0.35rem',
    fontSize: '0.8rem',
    fontWeight: '700',
    borderRadius: '8px',
    border: 'none',
    marginTop: '0.6rem',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    cursor: 'not-allowed',
  },
  evoOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    borderRadius: '24px',
  },
  evoCard: {
    padding: '2.5rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    textAlign: 'center',
    maxWidth: '380px',
    color: 'var(--text-primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  evoSpritesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '1.5rem 0',
  },
  evoSprite: {
    width: '120px',
    height: '120px',
    objectFit: 'contain',
  }
};
