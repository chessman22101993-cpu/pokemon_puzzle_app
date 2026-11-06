import React, { useState, useEffect } from 'react';
import { getPokemonById, handlePokemonImageError } from '../data/pokemonData';


export default function PokemonCompanion({
  pokemonId = 'togepi',
  state = 'idle', // 'idle' | 'thinking' | 'correct' | 'incorrect' | 'help' | 'sleep'
  studentName = 'Player',
  customText = '',
  onFeedBerry,
  coins = 0,
}) {
  const pokemon = getPokemonById(pokemonId);
  const [speech, setSpeech] = useState('');
  const [berryAnim, setBerryAnim] = useState(false);

  // Update speech bubble based on companion state
  useEffect(() => {
    if (customText) {
      setSpeech(customText);
      return;
    }

    if (!pokemon || !pokemon.speeches) return;

    const speechesForState = pokemon.speeches[state] || pokemon.speeches.idle;
    const randomSpeech = speechesForState[Math.floor(Math.random() * speechesForState.length)];
    
    // Replace player placeholder in text
    const formattedSpeech = randomSpeech.replace('{studentName}', studentName).replace('Player', studentName);
    setSpeech(formattedSpeech);
  }, [state, pokemonId, customText, studentName, pokemon]);

  if (!pokemon) return null;

  // Rarity color border highlights
  const rarityColors = {
    starter: 'rgba(16, 185, 129, 0.4)', // emerald
    common: 'rgba(107, 114, 128, 0.3)', // gray
    rare: 'rgba(59, 130, 246, 0.6)', // blue glow
    epic: 'rgba(139, 92, 246, 0.7)', // purple glow
    legendary: 'rgba(245, 158, 11, 0.8)', // amber/gold glow
  };

  const handleFeedClick = () => {
    if (coins < 5) return;
    setBerryAnim(true);
    setTimeout(() => {
      setBerryAnim(false);
      if (onFeedBerry) onFeedBerry();
    }, 1000);
  };

  // State-specific animation class name
  let reactionClass = '';
  if (state === 'correct' || state === 'solved') reactionClass = 'poke-bounce';
  else if (state === 'incorrect') reactionClass = 'poke-shake';
  else if (state === 'thinking') reactionClass = 'poke-tilt';
  else if (state === 'sleep') reactionClass = 'poke-sleep';

  return (
    <div style={styles.container}>
      {/* Speech bubble */}
      <div style={styles.speechBubble} className="glass-panel">
        <p style={styles.speechText}>
          {speech || "..."}
        </p>
        <div style={styles.speechTail}></div>
      </div>

      {/* Pokémon Card Wrapper */}
      <div 
        style={{
          ...styles.pokemonCard,
          boxShadow: `0 10px 30px -5px ${rarityColors[pokemon.rarity] || 'rgba(0,0,0,0.1)'}`,
          borderColor: pokemon.rarity === 'legendary' || pokemon.rarity === 'epic' ? 'var(--accent-primary)' : 'var(--border-color)'
        }}
        className="glass-panel"
      >
        <div style={styles.badgeContainer}>
          <span style={{ ...styles.rarityBadge, backgroundColor: pokemon.rarity === 'legendary' ? '#f59e0b' : pokemon.rarity === 'epic' ? '#8b5cf6' : pokemon.rarity === 'rare' ? '#3b82f6' : '#10b981' }}>
            {pokemon.rarity.toUpperCase()}
          </span>
        </div>

        {/* Pokemon Image */}
        <div style={styles.imageWrapper}>
          <img
            src={pokemon.spriteUrl}
            alt={pokemon.name}
            onError={(e) => handlePokemonImageError(e, pokemon)}
            style={styles.sprite}
            className={`${reactionClass} poke-idle`}
          />
          {berryAnim && (
            <div style={styles.berryFloat} className="berry-float-anim">
              🍓
            </div>
          )}
        </div>

        <div style={styles.infoContainer}>
          <span style={styles.pokemonName}>{pokemon.name}</span>
          <span style={styles.pokedexNum}>#{pokemon.pokedexNumber.toString().padStart(3, '0')}</span>
        </div>
      </div>

      {/* Berry feeding option near companion */}
      <div style={styles.berryContainer}>
        <button
          className="btn btn-primary"
          style={{
            ...styles.berryBtn,
            opacity: coins < 5 ? 0.6 : 1,
            cursor: coins < 5 ? 'not-allowed' : 'pointer',
          }}
          disabled={coins < 5}
          onClick={handleFeedClick}
        >
          <span style={{ marginRight: '0.3rem' }}>🍓</span>
          Feed Berry (-5 🪙)
        </button>
        <span style={styles.berrySubtext}>Get 1 Chess Hint</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.8rem',
    width: '100%',
  },
  speechBubble: {
    position: 'relative',
    padding: '0.8rem 1rem',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    width: '100%',
    boxShadow: '0 4px 12px var(--shadow-color)',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechText: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  speechTail: {
    position: 'absolute',
    bottom: '-8px',
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
    width: '14px',
    height: '14px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    borderRight: '1px solid var(--border-color)',
  },
  pokemonCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1.2rem',
    borderRadius: '20px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1.5px solid var(--border-color)',
    width: '100%',
    maxWidth: '180px',
    position: 'relative',
    overflow: 'hidden',
  },
  badgeContainer: {
    position: 'absolute',
    top: '8px',
    right: '8px',
  },
  rarityBadge: {
    fontSize: '0.65rem',
    fontWeight: '800',
    color: '#fff',
    padding: '0.15rem 0.4rem',
    borderRadius: '9999px',
    letterSpacing: '0.5px',
  },
  imageWrapper: {
    width: '110px',
    height: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sprite: {
    width: '100px',
    height: '100px',
    objectFit: 'contain',
    userSelect: 'none',
  },
  berryFloat: {
    position: 'absolute',
    fontSize: '1.5rem',
    zIndex: 10,
  },
  infoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '0.5rem',
  },
  pokemonName: {
    fontSize: '1rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  pokedexNum: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginTop: '0.1rem',
  },
  berryContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.2rem',
    marginTop: '0.2rem',
  },
  berryBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.4rem 0.8rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    borderRadius: '10px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    backgroundColor: '#dc2626', // Red berry color
    borderColor: '#b91c1c',
    color: '#fff',
  },
  berrySubtext: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  }
};
