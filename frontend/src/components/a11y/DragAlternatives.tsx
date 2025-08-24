/**
 * Drag Alternatives Component
 * WCAG 2.2 AA - Dragging Movements (2.5.7)
 * Provides keyboard and button alternatives to drag operations
 */

'use client';

import React, { useState } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Move,
  Check,
  X,
} from 'lucide-react';

interface DragAlternativesProps {
  onMove: (direction: 'up' | 'down' | 'left' | 'right', amount: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  currentIndex?: number;
  totalItems?: number;
  stepSize?: number;
  showMoveButtons?: boolean;
  showReorderButtons?: boolean;
  label?: string;
}

export function DragAlternatives({
  onMove,
  onReorder,
  currentIndex = 0,
  totalItems = 1,
  stepSize = 10,
  showMoveButtons = true,
  showReorderButtons = false,
  label = 'Move item',
}: DragAlternativesProps) {
  const [moveMode, setMoveMode] = useState(false);
  
  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    onMove(direction, stepSize);
  };
  
  const handleReorder = (direction: 'up' | 'down') => {
    if (!onReorder) return;
    
    const newIndex = direction === 'up' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(totalItems - 1, currentIndex + 1);
    
    if (newIndex !== currentIndex) {
      onReorder(currentIndex, newIndex);
    }
  };
  
  const buttonStyle = {
    minWidth: '44px',
    minHeight: '44px',
    padding: '8px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  };
  
  return (
    <div 
      className="drag-alternatives"
      role="group"
      aria-label={label}
    >
      {/* Move mode toggle */}
      {showMoveButtons && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => setMoveMode(!moveMode)}
            aria-pressed={moveMode}
            aria-label={moveMode ? 'Exit move mode' : 'Enter move mode'}
            style={{
              ...buttonStyle,
              backgroundColor: moveMode ? '#eff6ff' : 'white',
              borderColor: moveMode ? '#0052ff' : '#e5e7eb',
              minWidth: 'auto',
              padding: '8px 16px',
              gap: '8px',
            }}
          >
            {moveMode ? <X size={18} /> : <Move size={18} />}
            <span>{moveMode ? 'Exit Move' : 'Move Item'}</span>
          </button>
        </div>
      )}
      
      {/* Movement controls */}
      {showMoveButtons && moveMode && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 44px)',
          gap: '4px',
          marginBottom: '12px',
        }}>
          <div /> {/* Empty cell */}
          <button
            onClick={() => handleMove('up')}
            aria-label="Move up"
            style={buttonStyle}
          >
            <ArrowUp size={20} />
          </button>
          <div /> {/* Empty cell */}
          
          <button
            onClick={() => handleMove('left')}
            aria-label="Move left"
            style={buttonStyle}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => setMoveMode(false)}
            aria-label="Confirm position"
            style={{
              ...buttonStyle,
              backgroundColor: '#dcfce7',
              borderColor: '#86efac',
            }}
          >
            <Check size={20} color="#16a34a" />
          </button>
          <button
            onClick={() => handleMove('right')}
            aria-label="Move right"
            style={buttonStyle}
          >
            <ArrowRight size={20} />
          </button>
          
          <div /> {/* Empty cell */}
          <button
            onClick={() => handleMove('down')}
            aria-label="Move down"
            style={buttonStyle}
          >
            <ArrowDown size={20} />
          </button>
          <div /> {/* Empty cell */}
        </div>
      )}
      
      {/* Reorder controls */}
      {showReorderButtons && onReorder && (
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}>
          <button
            onClick={() => handleReorder('up')}
            disabled={currentIndex === 0}
            aria-label={`Move item up (currently position ${currentIndex + 1} of ${totalItems})`}
            style={{
              ...buttonStyle,
              opacity: currentIndex === 0 ? 0.5 : 1,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ArrowUp size={20} />
          </button>
          
          <span style={{
            fontSize: '14px',
            color: '#6b7280',
            minWidth: '60px',
            textAlign: 'center',
          }}>
            {currentIndex + 1} / {totalItems}
          </span>
          
          <button
            onClick={() => handleReorder('down')}
            disabled={currentIndex === totalItems - 1}
            aria-label={`Move item down (currently position ${currentIndex + 1} of ${totalItems})`}
            style={{
              ...buttonStyle,
              opacity: currentIndex === totalItems - 1 ? 0.5 : 1,
              cursor: currentIndex === totalItems - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ArrowDown size={20} />
          </button>
        </div>
      )}
      
      {/* Keyboard instructions */}
      <div 
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '8px',
        }}
      >
        {moveMode && (
          <span>Use arrow buttons to move. Press check to confirm.</span>
        )}
      </div>
      
      <style jsx>{`
        button:focus-visible {
          outline: 2px solid #0052ff;
          outline-offset: 2px;
        }
        
        button:hover:not(:disabled) {
          background-color: #f9fafb;
          transform: scale(1.05);
        }
        
        button:active:not(:disabled) {
          transform: scale(0.95);
        }
        
        @media (prefers-reduced-motion: reduce) {
          button {
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}