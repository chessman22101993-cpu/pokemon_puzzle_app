import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { getFenMetadata } from '../utils/chessEngine';
import { Chess } from 'chess.js';

// Safe parser for FEN strings to prevent chess.js throwing Invalid FEN exceptions
export function safeCreateChess(rawFen) {
  if (!rawFen || rawFen === 'start') {
    return new Chess();
  }
  const cleanFen = String(rawFen).trim();
  try {
    return new Chess(cleanFen);
  } catch {
    // If partial FEN (e.g. 1 field piece placement string), append standard fields
    const parts = cleanFen.split(/\s+/);
    if (parts.length < 6) {
      const fullParts = [
        parts[0],
        parts[1] || 'w',
        parts[2] || 'KQkq',
        parts[3] || '-',
        parts[4] || '0',
        parts[5] || '1',
      ];
      try {
        return new Chess(fullParts.join(' '));
      } catch {
        return new Chess();
      }
    }
    return new Chess();
  }
}

// Mapping themes to react-chessboard colors
export const BOARD_THEME_COLORS = {
  classic: { light: '#eeeed2', dark: '#769656' },
  forest: { light: '#e2e8c0', dark: '#5d8736' },
  castle: { light: '#f0d9b5', dark: '#b58863' },
  space: { light: '#8a7dbb', dark: '#3b2c6f' },
  ice: { light: '#e3ecf5', dark: '#7ea4c4' },
  volcano: { light: '#f2c7a4', dark: '#c4542d' },
};

export default function ChessboardWrapper({
  position,
  onMove,
  theme = 'classic',
  interactive = true,
  puzzleFen = '',
  orientation: propOrientation = '',
  maxWidth = '1200px',
  customArrows = [],
  onArrowsChange,
  arePiecesDraggable: propArePiecesDraggable,
}) {
  const arePiecesDraggable = propArePiecesDraggable !== undefined ? propArePiecesDraggable : interactive;
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [currentTurn, setCurrentTurn] = useState('white');
  const [boardWidth, setBoardWidth] = useState(400);
  const containerRef = useRef(null);
  const themeColors = BOARD_THEME_COLORS[theme] || BOARD_THEME_COLORS.classic;

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});

  // Reset clicks on position change
  useEffect(() => {
    setSelectedSquare(null);
    setOptionSquares({});
  }, [position]);

  // Determine board orientation
  useEffect(() => {
    if (propOrientation) {
      setBoardOrientation(propOrientation);
      return;
    }
    const targetFen = puzzleFen || position;
    if (targetFen) {
      const meta = getFenMetadata(targetFen);
      if (meta) {
        setBoardOrientation(meta.sideToMove);
      }
    }
  }, [puzzleFen, position, propOrientation]);

  // Determine current turn
  useEffect(() => {
    if (position) {
      const meta = getFenMetadata(position);
      if (meta) {
        setCurrentTurn(meta.sideToMove);
      }
    }
  }, [position]);

  // Board width measurement — use getBoundingClientRect for accuracy
  const measureWidth = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const w = Math.floor(rect.width);
    if (w > 100) {
      setBoardWidth((prev) => {
        if (Math.abs(prev - w) > 3) {
          return w;
        }
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    // Measure after initial render
    requestAnimationFrame(() => measureWidth());

    const observer = new ResizeObserver(() => {
      measureWidth();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', measureWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureWidth);
    };
  }, [measureWidth]);

  const handleArrowsChange = (newArrows) => {
    if (onArrowsChange) {
      onArrowsChange(newArrows);
    }
  };

  // react-chessboard v4 calls onPieceDrop(source, target, piece)
  const handlePieceDrop = (sourceSquare, targetSquare, piece) => {
    if (!interactive) return false;
    if (typeof onMove === 'function') {
      return onMove(sourceSquare, targetSquare, piece);
    }
    return false;
  };

  const getMoveOptions = (square) => {
    if (!position) return;
    try {
      let game = safeCreateChess(position);
      const piece = game.get(square);
      if (!piece) {
        setOptionSquares({});
        return;
      }

      if (piece.color !== game.turn()) {
        const currentFen = game.fen();
        const parts = currentFen.split(' ');
        parts[1] = piece.color;
        game = safeCreateChess(parts.join(' '));
      }

      const moves = game.moves({ square, verbose: true });
      if (moves.length === 0) {
        setOptionSquares({});
        return;
      }

      const newSquares = {};
      moves.forEach((move) => {
        const isCapture = move.flags.includes('c') || move.flags.includes('e');
        newSquares[move.to] = {
          background: isCapture
            ? 'radial-gradient(circle, transparent 65%, rgba(239, 68, 68, 0.7) 65%, rgba(239, 68, 68, 0.7) 100%)'
            : 'radial-gradient(circle, rgba(139, 92, 246, 0.5) 25%, transparent 25%)',
          borderRadius: '50%',
        };
      });

      newSquares[square] = {
        background: 'rgba(139, 92, 246, 0.2)',
        boxShadow: 'inset 0 0 0 3px #8b5cf6',
      };

      setOptionSquares(newSquares);
    } catch (e) {
      console.warn('Error calculating move options:', e);
    }
  };

  const handleSquareClick = (square) => {
    if (!interactive || !position) return;

    try {
      const game = safeCreateChess(position);
      const piece = game.get(square);

      // If a piece is already selected and user clicks a different square, attempt move
      if (selectedSquare && square !== selectedSquare) {
        let success = false;
        if (typeof onMove === 'function') {
          success = onMove(selectedSquare, square);
        }
        setSelectedSquare(null);
        setOptionSquares({});
        if (success) return;
      }

      // Select any clicked piece
      if (piece) {
        setSelectedSquare(square);
        getMoveOptions(square);
      } else {
        setSelectedSquare(null);
        setOptionSquares({});
      }
    } catch (e) {
      console.warn('Error handling square click:', e);
      setSelectedSquare(null);
      setOptionSquares({});
    }
  };


  const boardPosition = position ? (position.includes(' ') ? position.split(' ')[0] : position) : 'start';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
      width: '100%',
      maxWidth,
      margin: '0 auto',
    }}>
      {/* Board sizing container — NO transform, NO backdrop-filter */}
      <div
        ref={containerRef}
        style={{ width: '100%', aspectRatio: '1 / 1', position: 'relative' }}
      >
        {position ? (
          <Chessboard
            id="main-board"
            position={boardPosition}
            onPieceDrop={handlePieceDrop}
            onSquareClick={handleSquareClick}
            boardOrientation={boardOrientation}
            arePiecesDraggable={arePiecesDraggable}
            allowDragOutsideBoard={true}
            autoPromoteToQueen={true}
            snapToCursor={true}
            customLightSquareStyle={{ backgroundColor: themeColors.light }}
            customDarkSquareStyle={{ backgroundColor: themeColors.dark }}
            boardWidth={boardWidth}
            customSquareStyles={optionSquares}
            customBoardStyle={{
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 10px 28px -4px rgba(0, 0, 0, 0.2)',
              touchAction: 'none',
              margin: '0 auto',
            }}
            animationDuration={200}
            customArrows={customArrows}
            onArrowsChange={handleArrowsChange}
            areArrowsAllowed={true}
          />
        ) : (
          <div style={{
            height: '360px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}>
            Loading chessboard...
          </div>
        )}
      </div>
      {interactive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          boxShadow: '0 2px 4px var(--shadow-color)',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary)',
            display: 'inline-block',
          }} className={currentTurn === 'white' ? 'pulse-active' : ''} />
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            To Move: {currentTurn.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
