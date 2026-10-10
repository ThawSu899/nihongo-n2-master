import React from 'react';
import * as wanakana from 'wanakana';

interface FuriganaRubyProps {
  kanji: string;
  kana: string;
  furiganaMode?: 'always' | 'unlearned' | 'never';
  showRomaji?: boolean;
  className?: string;
}

export const FuriganaRuby: React.FC<FuriganaRubyProps> = ({
  kanji,
  kana,
  furiganaMode = 'always',
  showRomaji = false,
  className = '',
}) => {
  const romaji = showRomaji ? wanakana.toRomaji(kana) : null;

  if (furiganaMode === 'never' || kanji === kana) {
    return (
      <span className={`inline-flex flex-col items-center ${className}`}>
        <span className="font-japanese text-stone-100">{kanji}</span>
        {romaji && <span className="text-[10px] text-stone-400 font-mono select-none">{romaji}</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <ruby className="font-japanese text-stone-100">
        {kanji}
        <rt className="text-[10px] text-rose-300 font-japanese select-none font-normal">
          {kana}
        </rt>
      </ruby>
      {romaji && <span className="text-[10px] text-stone-400 font-mono select-none">{romaji}</span>}
    </span>
  );
};
