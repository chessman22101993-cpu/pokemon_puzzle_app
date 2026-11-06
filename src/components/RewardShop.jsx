import React, { useState } from 'react';
import { POKEMON_CATALOG, handlePokemonImageError } from '../data/pokemonData';
import { SHOP_CATEGORIES, SHOP_ITEMS } from '../data/shopItems';

export default function RewardShop({
  coins = 0,
  ownedPokemon = [],
  ownedItems = [],
  equippedPokemon = 'togepi',
  equippedItems = {},
  activeTeam = [],
  onPurchasePokemon, // (pokemonId, cost)
  onPurchaseShopItem, // (itemId, cost, isConsumable)
  onEquipPokemon, // (pokemonId)
  onEquipShopItem, // (slot, itemId)
  onToggleTeam,
  onClose,
  onOpenMysteryBox, // link directly to mystery box popup
  onOpenFootballShop, // link directly to football card shop
}) {
  const [activeTab, setActiveTab] = useState('pokemon');
  const [confirmItem, setConfirmItem] = useState(null); // { type: 'pokemon'|'item', data: obj, cost: num }

  // Filter items based on active tab
  const getTabContent = () => {
    if (activeTab === 'pokemon') {
      // Direct purchase Pokémon are only the Commons
      return POKEMON_CATALOG.filter(p => p.rarity === 'common');
    }
    return SHOP_ITEMS.filter(item => item.category === activeTab);
  };

  const handleBuyClick = (type, data, cost) => {
    setConfirmItem({ type, data, cost });
  };

  const handleConfirmPurchase = async () => {
    if (!confirmItem) return;
    try {
      if (confirmItem.type === 'pokemon') {
        await onPurchasePokemon(confirmItem.data.id, confirmItem.cost);
      } else {
        await onPurchaseShopItem(confirmItem.data.id, confirmItem.cost, confirmItem.data.isConsumable);
      }
      setConfirmItem(null);
    } catch (e) {
      alert(e.message || 'Purchase failed');
    }
  };

  const equippedTheme = equippedItems.theme || null;
  const equippedCelebration = equippedItems.celebration || null;
  const equippedBorder = equippedItems.border || null;
  const equippedTitle = equippedItems.title || null;

  return (
    <div style={styles.overlay} className="modal-backdrop">
      <div style={styles.modal} className="glass-panel scale-up-anim">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <span style={{ fontSize: '1.8rem' }}>🏪</span>
            <div>
              <h2 style={styles.title}>Reward Shop</h2>
              <span style={styles.coinBalance}>
                Your Coins: 🪙 <strong>{coins}</strong>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {onOpenFootballShop && (
              <button 
                onClick={onOpenFootballShop} 
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', fontWeight: 800, border: '1px solid rgba(245, 158, 11, 0.4)' }}
                title="Open Football Card Shop"
              >
                ⚽ Football Shop
              </button>
            )}
            <button style={styles.closeBtn} onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        {/* Tab categories */}
        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'pokemon' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: activeTab === 'pokemon' ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('pokemon')}
          >
            🐾 Pokémon
          </button>
          <button
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'mysterybox' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: activeTab === 'mysterybox' ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('mysterybox')}
          >
            🎁 Mystery Box
          </button>
          {SHOP_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              style={{
                ...styles.tab,
                backgroundColor: activeTab === cat.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: activeTab === cat.id ? '#fff' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab(cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
          {onOpenFootballShop && (
            <button
              style={{
                ...styles.tab,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.4)',
              }}
              onClick={onOpenFootballShop}
            >
              ⚽ Football Shop ➔
            </button>
          )}
        </div>

        {/* Content Area */}
        <div style={styles.shopContent} className="custom-scrollbar">
          {activeTab === 'mysterybox' ? (
            <div style={styles.mysteryTab}>
              <div style={styles.mysteryGlow} className="gift-wiggle-idle">🎁</div>
              <h3 style={styles.mysteryTitle}>Roll a Mystery Box!</h3>
              <p style={styles.mysteryDesc}>
                Open for <strong>150 🪙</strong>. Guaranteed to roll a Rare, Epic, or Legendary Pokémon! 
                If you get a duplicate, you'll receive <strong>20 🪙</strong> back.
              </p>
              <button 
                className="btn btn-accent" 
                style={styles.mysteryOpenBtn}
                onClick={onOpenMysteryBox}
              >
                Go to Mystery Box Panel
              </button>
            </div>
          ) : (
            <div style={styles.grid}>
              {getTabContent().map(item => {
                let isOwned = false;
                let isEquipped = false;
                let detailsLabel = '';

                if (activeTab === 'pokemon') {
                  isOwned = ownedPokemon.includes(item.id);
                  isEquipped = equippedPokemon === item.id;
                  detailsLabel = `Common • Sprite #${item.pokedexNumber}`;
                } else {
                  isOwned = ownedItems.includes(item.id);
                  if (item.category === 'themes') isEquipped = equippedTheme === item.id;
                  if (item.category === 'celebrations') isEquipped = equippedCelebration === item.id;
                  if (item.category === 'flair') {
                    if (item.id.includes('border')) isEquipped = equippedBorder === item.id;
                    if (item.id.includes('title') || item.id.includes('crown') || item.id.includes('lightning')) isEquipped = equippedTitle === item.id;
                  }
                  detailsLabel = item.description;
                }

                return (
                  <div key={item.id} style={styles.card} className="glass-panel">
                    {/* Icon/Preview */}
                    <div style={styles.cardPreview}>
                      {activeTab === 'pokemon' ? (
                        <img src={item.spriteUrl} alt={item.name} onError={(e) => handlePokemonImageError(e, item)} style={styles.spriteImage} />
                      ) : (
                        <span style={styles.emojiIcon}>{item.icon}</span>
                      )}
                    </div>

                    {/* Card Info */}
                    <div style={styles.cardInfo}>
                      <span style={styles.cardName}>{item.name}</span>
                      <span style={styles.cardDesc}>{detailsLabel}</span>
                    </div>

                    {/* Action Button */}
                    <div style={styles.cardAction}>
                      {isOwned ? (
                        item.isConsumable ? (
                          <div style={styles.purchaseRow}>
                            <button
                              className="btn btn-secondary"
                              style={styles.cardBtn}
                              onClick={() => handleBuyClick('item', item, item.price)}
                              disabled={coins < item.price}
                            >
                              Buy More (🪙 {item.price})
                            </button>
                          </div>
                        ) : activeTab === 'pokemon' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%' }}>
                            <button
                              className="btn"
                              style={{
                                ...styles.cardBtn,
                                backgroundColor: isEquipped ? '#10b981' : 'var(--accent-primary)',
                                color: '#fff',
                                border: 'none',
                                cursor: isEquipped ? 'default' : 'pointer'
                              }}
                              onClick={() => {
                                if (!isEquipped) onEquipPokemon(item.id);
                              }}
                              disabled={isEquipped}
                            >
                              {isEquipped ? 'Companion ✓' : 'Set Companion'}
                            </button>

                            <button
                              className="btn"
                              style={{
                                ...styles.cardBtn,
                                backgroundColor: activeTeam.includes(item.id) ? '#ef4444' : '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                              onClick={() => onToggleTeam(item.id)}
                            >
                              {activeTeam.includes(item.id) ? 'Remove Team' : 'Add Team'}
                            </button>
                          </div>
                        ) : isEquipped ? (
                          <button className="btn btn-secondary" style={{ ...styles.cardBtn, ...styles.equippedBtn }} disabled>
                            Equipped ✓
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary"
                            style={styles.cardBtn}
                            onClick={() => {
                              let slot = 'theme';
                              if (item.category === 'celebrations') slot = 'celebration';
                              if (item.category === 'flair') {
                                slot = item.id.includes('border') ? 'border' : 'title';
                              }
                              onEquipShopItem(slot, item.id);
                            }}
                          >
                            Equip
                          </button>
                        )
                      ) : (
                        <button
                          className="btn btn-accent"
                          style={{
                            ...styles.cardBtn,
                            opacity: coins < item.price ? 0.6 : 1,
                          }}
                          onClick={() => handleBuyClick(activeTab === 'pokemon' ? 'pokemon' : 'item', item, item.price)}
                          disabled={coins < item.price}
                        >
                          🪙 {item.price}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Modal Overlay */}
        {confirmItem && (
          <div style={styles.confirmOverlay}>
            <div style={styles.confirmBox} className="glass-panel scale-up-anim">
              <span style={{ fontSize: '2.5rem' }}>🛒</span>
              <h4 style={styles.confirmTitle}>Confirm Purchase</h4>
              <p style={styles.confirmText}>
                Are you sure you want to buy <strong>{confirmItem.data.name}</strong> for{' '}
                <strong>{confirmItem.cost} coins</strong>?
              </p>
              <div style={styles.confirmActions}>
                <button className="btn btn-secondary" onClick={() => setConfirmItem(null)}>
                  Cancel
                </button>
                <button className="btn btn-accent" onClick={handleConfirmPurchase}>
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        )}
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
    height: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    position: 'relative',
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
  coinBalance: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#f59e0b',
    display: 'block',
    marginTop: '0.1rem',
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
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '1.2rem',
  },
  tab: {
    padding: '0.4rem 0.8rem',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  shopContent: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '0.5rem',
  },
  mysteryTab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    padding: '2rem',
  },
  mysteryGlow: {
    fontSize: '6rem',
    marginBottom: '1.5rem',
    userSelect: 'none',
  },
  mysteryTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.5rem',
    fontWeight: '800',
    margin: '0 0 0.8rem 0',
  },
  mysteryDesc: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    maxWidth: '450px',
    lineHeight: '1.5',
    margin: '0 0 1.8rem 0',
  },
  mysteryOpenBtn: {
    padding: '0.7rem 1.8rem',
    fontSize: '1rem',
    fontWeight: '800',
    borderRadius: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1rem',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1.2rem',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardPreview: {
    width: '90px',
    height: '90px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '12px',
    marginBottom: '0.8rem',
  },
  spriteImage: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
  },
  emojiIcon: {
    fontSize: '2.5rem',
  },
  cardInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    width: '100%',
    marginBottom: '1rem',
  },
  cardName: {
    fontSize: '1rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  cardDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.3',
    fontWeight: '600',
  },
  cardAction: {
    width: '100%',
  },
  cardBtn: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.85rem',
    borderRadius: '10px',
    fontWeight: '700',
  },
  equippedBtn: {
    backgroundColor: '#10b981',
    color: '#fff',
    borderColor: '#059669',
  },
  purchaseRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  confirmBox: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '1.8rem',
    maxWidth: '340px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  confirmTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.2rem',
    fontWeight: '800',
    margin: '0.8rem 0 0.5rem 0',
  },
  confirmText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    margin: '0 0 1.5rem 0',
  },
  confirmActions: {
    display: 'flex',
    gap: '0.8rem',
    width: '100%',
    justifyContent: 'center',
  }
};
