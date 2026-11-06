import React, { useState, useMemo } from 'react';
import { 
  FOOTBALL_CARDS_CATALOG, 
  FOOTBALL_BOOSTER_PACK_PRICE, 
  FOOTBALL_DUPLICATE_REFUND,
  rollFootballBoosterPack 
} from '../data/footballCardsData';
import { Sparkles, Trophy, Lock, CheckCircle, Package, Search, Filter, Eye, Star, Zap } from 'lucide-react';

const PlayerPhoto = ({ src, alt, name = '', style }) => {
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    const initials = (name || alt || '⚽')
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: '#f59e0b',
          fontSize: '1.4rem',
          fontWeight: 900,
          border: '2px solid rgba(245, 158, 11, 0.4)',
          borderRadius: style?.borderRadius || '12px',
          boxShadow: 'inset 0 0 15px rgba(245, 158, 11, 0.2)',
          letterSpacing: '1px',
          userSelect: 'none'
        }}
      >
        <span style={{ fontSize: '1.6rem', marginBottom: '2px' }}>⚽</span>
        <span style={{ fontSize: '1rem', color: '#fff' }}>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
};

export default function FootballCardShop({
  coins = 0,
  ownedCards = [],
  onPurchaseCard, // (cardId, cost) => Promise
  onOpenBoosterPack, // () => Promise<rolledCard>
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' | 'mystery' | 'album'
  const [rarityFilter, setRarityFilter] = useState('all'); // 'all' | 'legendary' | 'epic' | 'rare' | 'common'
  const [positionFilter, setPositionFilter] = useState('all'); // 'all' | 'FW' | 'MF'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [confirmCard, setConfirmCard] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [unboxingState, setUnboxingState] = useState({ isOpening: false, revealedCard: null });
  const [selectedCardDetail, setSelectedCardDetail] = useState(null);

  // Filtered Cards for Shop Tab
  const filteredShopCards = useMemo(() => {
    return FOOTBALL_CARDS_CATALOG.filter(card => {
      // Rarity
      if (rarityFilter !== 'all' && card.rarity !== rarityFilter) return false;
      // Position
      if (positionFilter === 'FW' && !['ST', 'RW', 'LW'].includes(card.position)) return false;
      if (positionFilter === 'MF' && !['CAM', 'CM', 'CDM'].includes(card.position)) return false;
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = card.name.toLowerCase().includes(q) || card.shortName.toLowerCase().includes(q);
        const matchClub = card.club.toLowerCase().includes(q);
        const matchCountry = card.country.toLowerCase().includes(q);
        if (!matchName && !matchClub && !matchCountry) return false;
      }
      return true;
    });
  }, [rarityFilter, positionFilter, searchQuery]);

  const handleBuyDirect = (card) => {
    setConfirmCard(card);
  };

  const handleConfirmDirectPurchase = async () => {
    if (!confirmCard || isPurchasing) return;
    setIsPurchasing(true);
    try {
      await onPurchaseCard(confirmCard.id, confirmCard.price);
      setConfirmCard(null);
    } catch (e) {
      alert(e.message || 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleUnboxPack = async () => {
    if (coins < FOOTBALL_BOOSTER_PACK_PRICE || unboxingState.isOpening) return;
    setUnboxingState({ isOpening: true, revealedCard: null });
    
    try {
      const card = await onOpenBoosterPack();
      setTimeout(() => {
        setUnboxingState({ isOpening: false, revealedCard: card });
      }, 1600);
    } catch (e) {
      setUnboxingState({ isOpening: false, revealedCard: null });
      alert(e.message || 'Failed to open booster pack');
    }
  };

  const ownedCount = ownedCards.length;
  const totalCount = FOOTBALL_CARDS_CATALOG.length;
  const completionPct = Math.round((ownedCount / totalCount) * 100);

  const getRarityBadgeColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return '#f59e0b';
      case 'epic': return '#8b5cf6';
      case 'rare': return '#3b82f6';
      case 'common': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div style={styles.overlay} className="modal-backdrop">
      <div style={styles.modal} className="glass-panel scale-up-anim">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <span style={{ fontSize: '2rem' }}>⚽</span>
            <div>
              <h2 style={styles.title}>Football Card Shop & Album</h2>
              <span style={styles.coinBalance}>
                Your Coins: 🪙 <strong>{coins}</strong> | Collected: <strong>{ownedCount}/{totalCount}</strong> ({completionPct}%)
              </span>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Tab categories */}
        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'shop' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: activeTab === 'shop' ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('shop')}
          >
            🎴 Direct Card Shop
          </button>
          <button
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'mystery' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: activeTab === 'mystery' ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('mystery')}
          >
            🎁 Booster Packs (Mystery Box)
          </button>
          <button
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'album' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: activeTab === 'album' ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('album')}
          >
            📕 My Card Album ({ownedCount}/{totalCount})
          </button>
        </div>

        {/* Main Content Area */}
        <div style={styles.contentBody} className="custom-scrollbar">

          {/* ── TAB 1: DIRECT CARD SHOP ── */}
          {activeTab === 'shop' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Filter Controls Row */}
              <div style={styles.filterBar} className="glass-panel">
                {/* Search */}
                <div style={styles.searchWrapper}>
                  <Search size={16} color="var(--text-secondary)" />
                  <input
                    type="text"
                    placeholder="Search player, club, country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                      &times;
                    </button>
                  )}
                </div>

                {/* Rarity Filter */}
                <div style={styles.filterGroup}>
                  <span style={styles.filterLabel}>Rarity:</span>
                  <div style={styles.pillGroup}>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'legendary', label: '🟡 Legendary' },
                      { id: 'epic', label: '🟣 Epic' },
                      { id: 'rare', label: '🔵 Rare' },
                      { id: 'common', label: '🟢 Wonderkid' },
                    ].map(rf => (
                      <button
                        key={rf.id}
                        onClick={() => setRarityFilter(rf.id)}
                        style={{
                          ...styles.filterPill,
                          backgroundColor: rarityFilter === rf.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                          color: rarityFilter === rf.id ? '#fff' : 'var(--text-secondary)',
                        }}
                      >
                        {rf.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position Filter */}
                <div style={styles.filterGroup}>
                  <span style={styles.filterLabel}>Position:</span>
                  <div style={styles.pillGroup}>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'FW', label: '⚽ Attackers' },
                      { id: 'MF', label: '🎯 Midfield' },
                    ].map(pf => (
                      <button
                        key={pf.id}
                        onClick={() => setPositionFilter(pf.id)}
                        style={{
                          ...styles.filterPill,
                          backgroundColor: positionFilter === pf.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                          color: positionFilter === pf.id ? '#fff' : 'var(--text-secondary)',
                        }}
                      >
                        {pf.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              {filteredShopCards.length === 0 ? (
                <div style={styles.emptyState}>
                  <span>🔍</span>
                  <h4>No football cards found</h4>
                  <p>Try clearing your search query or adjusting your filters.</p>
                </div>
              ) : (
                <div style={styles.cardsGrid}>
                  {filteredShopCards.map(card => {
                    const isOwned = ownedCards.includes(card.id);
                    const canAfford = coins >= card.price;

                    return (
                      <div 
                        key={card.id} 
                        style={styles.fifaCardWrapper} 
                        className="glass-panel hover-card"
                        onClick={() => setSelectedCardDetail(card)}
                      >
                        {/* FIFA Card Header */}
                        <div style={{ ...styles.fifaCardHeader, background: card.cardColor }}>
                          <div style={styles.cardRatingGroup}>
                            <span style={styles.cardOvr}>{card.rating}</span>
                            <span style={styles.cardPos}>{card.position}</span>
                          </div>
                          <span style={styles.cardCountry}>{card.country.split(' ')[1] || '⚽'}</span>
                        </div>

                        {/* Player Photo */}
                        <div style={styles.cardImageContainer}>
                          <PlayerPhoto 
                            src={card.photoUrl} 
                            alt={card.name} 
                            name={card.name} 
                            style={styles.playerPhoto} 
                          />
                          <span 
                            style={{
                              ...styles.cardRarityBadge,
                              backgroundColor: getRarityBadgeColor(card.rarity)
                            }}
                          >
                            {card.rarity.toUpperCase()}
                          </span>
                        </div>

                        {/* Card Info Box */}
                        <div style={styles.cardInfoBox} onClick={e => e.stopPropagation()}>
                          <h4 style={styles.playerName} title={card.name}>{card.name}</h4>
                          <span style={styles.playerClub}>{card.club}</span>

                          {/* Stats Grid */}
                          <div style={styles.miniStatsRow}>
                            <span>PAC <strong>{card.stats.PAC}</strong></span>
                            <span>SHO <strong>{card.stats.SHO}</strong></span>
                            <span>PAS <strong>{card.stats.PAS}</strong></span>
                            <span>DRI <strong>{card.stats.DRI}</strong></span>
                            <span>DEF <strong>{card.stats.DEF}</strong></span>
                            <span>PHY <strong>{card.stats.PHY}</strong></span>
                          </div>

                          {isOwned ? (
                            <div style={styles.ownedBadge}>
                              <CheckCircle size={15} color="#10b981" /> In Collection
                            </div>
                          ) : (
                            <button
                              disabled={!canAfford}
                              onClick={() => handleBuyDirect(card)}
                              className="btn btn-accent"
                              style={{
                                width: '100%',
                                padding: '0.45rem',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                marginTop: '0.5rem',
                                opacity: canAfford ? 1 : 0.5,
                                cursor: canAfford ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <span>Buy for</span> 🪙 <strong>{card.price}</strong>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: FOOTBALL BOOSTER PACKS ── */}
          {activeTab === 'mystery' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', padding: '1rem 0' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.4rem 0' }}>
                  ⚽ Official Football Booster Pack
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto' }}>
                  Unbox cards at a massive discount! Open for <strong>🪙 {FOOTBALL_BOOSTER_PACK_PRICE} coins</strong> with a chance to pull Legendary superstars like <strong>Ronaldo</strong>, <strong>Messi</strong>, <strong>Mbappé</strong>, and <strong>Haaland</strong>!
                </p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>
                  ⚡ Duplicate Guarantee: If you unbox a card you already own, you get 🪙 {FOOTBALL_DUPLICATE_REFUND} coins refunded!
                </div>
              </div>

              {/* Booster Pack Graphic */}
              {!unboxingState.revealedCard ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
                  <div 
                    style={styles.packGraphic} 
                    className={unboxingState.isOpening ? 'pulse-active scale-up-anim' : 'animate-float'}
                  >
                    <span style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✨</span>
                    <Package size={64} color="#ffd700" />
                    <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.6rem' }}>
                      GOLDEN BOOSTER
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#ffd700', fontWeight: 800, marginTop: '0.2rem' }}>
                      🪙 {FOOTBALL_BOOSTER_PACK_PRICE} COINS / PACK
                    </span>
                  </div>

                  <button
                    disabled={coins < FOOTBALL_BOOSTER_PACK_PRICE || unboxingState.isOpening}
                    onClick={handleUnboxPack}
                    className="btn btn-accent"
                    style={{
                      padding: '0.85rem 2.2rem',
                      fontSize: '1.1rem',
                      fontWeight: 900,
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
                      opacity: coins >= FOOTBALL_BOOSTER_PACK_PRICE ? 1 : 0.5,
                      cursor: coins >= FOOTBALL_BOOSTER_PACK_PRICE ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {unboxingState.isOpening ? '🎁 Unboxing Booster Pack...' : `🔓 Open Booster Pack (🪙 ${FOOTBALL_BOOSTER_PACK_PRICE})`}
                  </button>
                </div>
              ) : (
                /* Card Revealed Screen */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="scale-up-anim">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontWeight: 900, fontSize: '1.3rem' }}>
                    <Sparkles /> {unboxingState.revealedCard.isDuplicate ? 'DUPLICATE CARD UNBOXED!' : 'NEW CARD UNLOCKED!'} <Sparkles />
                  </div>

                  {unboxingState.revealedCard.isDuplicate && (
                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.4rem 1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800 }}>
                      Already in collection! Refunded +🪙 {unboxingState.revealedCard.refundCoins || FOOTBALL_DUPLICATE_REFUND} coins to your wallet.
                    </div>
                  )}

                  {/* Revealed Card */}
                  <div style={{ ...styles.fifaCardWrapper, transform: 'scale(1.15)', margin: '1rem 0', width: '220px' }} className="glass-panel">
                    <div style={{ ...styles.fifaCardHeader, background: unboxingState.revealedCard.cardColor }}>
                      <div style={styles.cardRatingGroup}>
                        <span style={styles.cardOvr}>{unboxingState.revealedCard.rating}</span>
                        <span style={styles.cardPos}>{unboxingState.revealedCard.position}</span>
                      </div>
                      <span style={styles.cardCountry}>{unboxingState.revealedCard.country.split(' ')[1] || '⚽'}</span>
                    </div>

                    <div style={styles.cardImageContainer}>
                      <PlayerPhoto 
                        src={unboxingState.revealedCard.photoUrl} 
                        alt={unboxingState.revealedCard.name} 
                        name={unboxingState.revealedCard.name} 
                        style={styles.playerPhoto} 
                      />
                    </div>

                    <div style={styles.cardInfoBox}>
                      <h4 style={styles.playerName}>{unboxingState.revealedCard.name}</h4>
                      <span style={styles.playerClub}>{unboxingState.revealedCard.club}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => setUnboxingState({ isOpening: false, revealedCard: null })}
                      className="btn btn-primary"
                      style={{ padding: '0.6rem 1.5rem', fontWeight: 800, borderRadius: '12px' }}
                    >
                      Collect to Album 📕
                    </button>
                    {coins >= FOOTBALL_BOOSTER_PACK_PRICE && (
                      <button
                        onClick={handleUnboxPack}
                        className="btn btn-accent"
                        style={{ padding: '0.6rem 1.5rem', fontWeight: 800, borderRadius: '12px' }}
                      >
                        Open Another Pack (🪙 {FOOTBALL_BOOSTER_PACK_PRICE})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: MY CARD ALBUM ── */}
          {activeTab === 'album' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Progress Header */}
              <div style={styles.albumProgressHeader} className="glass-panel">
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>
                    📕 Football Card Album
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Collect all legendary superstars, champions, and rising wonderkids!
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--accent-primary)' }}>
                    {ownedCount} / {totalCount}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800 }}>
                    {completionPct}% Collected
                  </div>
                </div>
              </div>

              {/* Album Progress Bar */}
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${completionPct}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                    transition: 'width 0.4s ease'
                  }} 
                />
              </div>

              {/* Cards Grid */}
              <div style={styles.cardsGrid}>
                {FOOTBALL_CARDS_CATALOG.map(card => {
                  const isOwned = ownedCards.includes(card.id);

                  return (
                    <div
                      key={card.id}
                      onClick={() => isOwned && setSelectedCardDetail(card)}
                      style={{
                        ...styles.fifaCardWrapper,
                        opacity: isOwned ? 1 : 0.5,
                        filter: isOwned ? 'none' : 'grayscale(80%)',
                        cursor: isOwned ? 'pointer' : 'default',
                      }}
                      className="glass-panel hover-card"
                    >
                      <div style={{ ...styles.fifaCardHeader, background: isOwned ? card.cardColor : '#475569' }}>
                        <div style={styles.cardRatingGroup}>
                          <span style={styles.cardOvr}>{card.rating}</span>
                          <span style={styles.cardPos}>{card.position}</span>
                        </div>
                        <span style={styles.cardCountry}>{card.country.split(' ')[1] || '⚽'}</span>
                      </div>

                      <div style={styles.cardImageContainer}>
                        <PlayerPhoto 
                          src={card.photoUrl} 
                          alt={card.name} 
                          name={card.name} 
                          style={styles.playerPhoto} 
                        />
                        {!isOwned && (
                          <div style={styles.cardLockOverlay}>
                            <Lock size={26} color="#fff" />
                          </div>
                        )}
                      </div>

                      <div style={styles.cardInfoBox}>
                        <h4 style={styles.playerName}>{card.name}</h4>
                        <span style={styles.playerClub}>{card.club}</span>
                        {isOwned ? (
                          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 800, marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Eye size={12} /> Inspect Card
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.3rem', display: 'block' }}>
                            🪙 {card.price} in Shop
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmCard && (
        <div style={{ ...styles.overlay, zIndex: 10000 }}>
          <div className="glass-panel animate-float" style={{ ...styles.modal, maxWidth: '380px', padding: '2rem', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem' }}>⚽</span>
            <h3 style={{ margin: '0.5rem 0 0.4rem 0', fontWeight: 800 }}>Confirm Card Purchase</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.4rem' }}>
              Buy <strong>{confirmCard.name} ({confirmCard.rating} {confirmCard.position})</strong> for <strong>🪙 {confirmCard.price} coins</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => setConfirmCard(null)}
                disabled={isPurchasing}
              >
                Cancel
              </button>
              <button 
                className="btn btn-accent" 
                style={{ flex: 1, fontWeight: 800 }} 
                onClick={handleConfirmDirectPurchase}
                disabled={isPurchasing}
              >
                {isPurchasing ? 'Buying...' : 'Confirm Buy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Card Inspection Modal */}
      {selectedCardDetail && (
        <div style={{ ...styles.overlay, zIndex: 10000 }} onClick={() => setSelectedCardDetail(null)}>
          <div 
            className="glass-panel scale-up-anim" 
            style={{ ...styles.modal, maxWidth: '420px', padding: '2rem', textAlign: 'center' }} 
            onClick={e => e.stopPropagation()}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {selectedCardDetail.title}
            </span>
            <h3 style={{ margin: '0.2rem 0 0.8rem 0', fontWeight: 900, fontSize: '1.4rem' }}>
              {selectedCardDetail.name}
            </h3>

            {/* FIFA Card Preview */}
            <div style={{ ...styles.fifaCardWrapper, margin: '0 auto 1.2rem auto', width: '220px', boxShadow: '0 12px 30px rgba(0,0,0,0.4)' }}>
              <div style={{ ...styles.fifaCardHeader, background: selectedCardDetail.cardColor }}>
                <div style={styles.cardRatingGroup}>
                  <span style={styles.cardOvr}>{selectedCardDetail.rating}</span>
                  <span style={styles.cardPos}>{selectedCardDetail.position}</span>
                </div>
                <span style={styles.cardCountry}>{selectedCardDetail.country}</span>
              </div>
              <div style={styles.cardImageContainer}>
                <PlayerPhoto 
                  src={selectedCardDetail.photoUrl} 
                  alt={selectedCardDetail.name} 
                  name={selectedCardDetail.name} 
                  style={styles.playerPhoto} 
                />
              </div>
              <div style={styles.cardInfoBox}>
                <h4 style={styles.playerName}>{selectedCardDetail.name}</h4>
                <span style={styles.playerClub}>{selectedCardDetail.club}</span>
              </div>
            </div>

            {/* Full Stats Breakdown */}
            <div style={styles.fullStatsBox} className="glass-panel">
              <div style={styles.statLine}><span>⚡ PAC (Pace)</span><strong>{selectedCardDetail.stats.PAC}</strong></div>
              <div style={styles.statLine}><span>🎯 SHO (Shooting)</span><strong>{selectedCardDetail.stats.SHO}</strong></div>
              <div style={styles.statLine}><span>🪄 PAS (Passing)</span><strong>{selectedCardDetail.stats.PAS}</strong></div>
              <div style={styles.statLine}><span>🕺 DRI (Dribbling)</span><strong>{selectedCardDetail.stats.DRI}</strong></div>
              <div style={styles.statLine}><span>🛡️ DEF (Defending)</span><strong>{selectedCardDetail.stats.DEF}</strong></div>
              <div style={styles.statLine}><span>💪 PHY (Physicality)</span><strong>{selectedCardDetail.stats.PHY}</strong></div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '1rem 0 1.2rem 0', lineHeight: 1.4 }}>
              {selectedCardDetail.description}
            </p>

            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', padding: '0.6rem', fontWeight: 800, borderRadius: '12px' }} 
              onClick={() => setSelectedCardDetail(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(8px)',
  },
  modal: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    padding: '2rem',
    width: '92%',
    maxWidth: '920px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.8rem',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  title: {
    margin: 0,
    fontSize: '1.45rem',
    fontWeight: 800,
  },
  coinBalance: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '0.5rem 1.1rem',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 800,
    fontSize: '0.88rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterBar: {
    padding: '0.8rem 1rem',
    borderRadius: '14px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.8rem',
    alignItems: 'center',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '0.4rem 0.8rem',
    borderRadius: '10px',
    flex: '1 1 200px',
    border: '1px solid var(--border-color)',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '1.1rem',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  filterLabel: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
  },
  pillGroup: {
    display: 'flex',
    gap: '0.3rem',
    flexWrap: 'wrap',
  },
  filterPill: {
    border: '1px solid var(--border-color)',
    padding: '0.25rem 0.6rem',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  contentBody: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '0.4rem',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1.2rem',
  },
  fifaCardWrapper: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1.5px solid var(--border-color)',
    borderRadius: '18px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  fifaCardHeader: {
    padding: '0.4rem 0.7rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#000',
    fontWeight: 900,
  },
  cardRatingGroup: {
    display: 'flex',
    gap: '0.2rem',
    alignItems: 'baseline',
  },
  cardOvr: {
    fontSize: '1.25rem',
    fontWeight: 900,
  },
  cardPos: {
    fontSize: '0.75rem',
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  cardCountry: {
    fontSize: '1rem',
  },
  cardImageContainer: {
    width: '100%',
    height: '135px',
    backgroundColor: 'var(--bg-tertiary)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardRarityBadge: {
    position: 'absolute',
    bottom: '6px',
    right: '6px',
    fontSize: '0.58rem',
    fontWeight: 900,
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '6px',
    letterSpacing: '0.5px',
  },
  cardLockOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfoBox: {
    padding: '0.7rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  playerName: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: 800,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
  },
  playerClub: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.4rem',
  },
  miniStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.3rem 0.5rem',
    fontSize: '0.65rem',
    color: 'var(--text-secondary)',
    width: '100%',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '0.35rem 0.5rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    marginBottom: '0.3rem',
  },
  ownedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    color: '#10b981',
    fontWeight: 800,
    fontSize: '0.78rem',
    marginTop: '0.4rem',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '0.3rem 0.6rem',
    borderRadius: '8px',
  },
  packGraphic: {
    background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
    border: '3px solid #ffd700',
    borderRadius: '24px',
    width: '210px',
    height: '270px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
  },
  albumProgressHeader: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '1rem 1.4rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
  },
  fullStatsBox: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    width: '100%',
    padding: '0.8rem',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    textAlign: 'left',
  },
  statLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
  }
};

