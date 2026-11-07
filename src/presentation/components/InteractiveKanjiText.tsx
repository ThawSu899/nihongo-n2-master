import React, { useRef, useEffect } from 'react';
import { isKanjiChar, getOrDecomposeKanji, KanjiDetail } from '../../domain/dictionary/kanji-catalog';

export interface InteractiveKanjiSpanProps {
  char: string;
  sentenceText?: string;
  onInspect: (char: string, sentenceText: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const InteractiveKanjiSpan: React.FC<InteractiveKanjiSpanProps> = ({
  char,
  sentenceText = '',
  onInspect,
  className = '',
  children,
}) => {
  const timerRef = useRef<any>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    timerRef.current = setTimeout(() => {
      onInspect(char, sentenceText);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // Ignore vibration error
        }
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      touchStartPos.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    touchStartPos.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInspect(char, sentenceText);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onInspect(char, sentenceText);
  };

  return (
    <span
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={`inline cursor-pointer transition-colors duration-150 hover:text-rose-300 hover:underline decoration-rose-400/50 decoration-1 underline-offset-2 ${className}`}
      title={`漢字: ${char} (長押し/ダブルクリック/右クリックで詳細)`}
    >
      {children || char}
    </span>
  );
};

export function renderTextWithKanji(
  text: string,
  sentenceText: string,
  onInspectKanji: (char: string, sentenceText: string) => void,
  kanjiClassName?: string
): React.ReactNode {
  const chars = Array.from(text);
  return chars.map((ch, idx) => {
    if (isKanjiChar(ch)) {
      return (
        <InteractiveKanjiSpan
          key={idx}
          char={ch}
          sentenceText={sentenceText}
          onInspect={onInspectKanji}
          className={kanjiClassName}
        />
      );
    }
    return ch;
  });
}

export interface InteractiveKanjiTextProps {
  text: string;
  sentenceContext?: string;
  onInspectKanji: (char: string, sentenceText: string) => void;
  className?: string;
  kanjiClassName?: string;
}

export const InteractiveKanjiText: React.FC<InteractiveKanjiTextProps> = ({
  text,
  sentenceContext,
  onInspectKanji,
  className = '',
  kanjiClassName = '',
}) => {
  return (
    <span className={className}>
      {renderTextWithKanji(text, sentenceContext || text, onInspectKanji, kanjiClassName)}
    </span>
  );
};
