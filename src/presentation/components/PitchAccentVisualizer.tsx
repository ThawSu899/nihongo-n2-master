import React from 'react';
import {
  PitchPattern,
  calculatePitchContour,
  PitchAccentDetails,
  segmentMoras,
  classifyPitchPattern,
} from '../../domain/audio/pitch-accent';

export interface PitchAccentVisualizerProps {
  text: string;
  pattern?: PitchPattern;
  dropIndex?: number;
  dropMora?: number;
  showBadge?: boolean;
  showContour?: boolean;
  compact?: boolean;
  className?: string;
}

export const PitchAccentVisualizer: React.FC<PitchAccentVisualizerProps> = ({
  text,
  pattern,
  dropIndex,
  dropMora,
  showBadge = true,
  showContour = true,
  compact = false,
  className = '',
}) => {
  const moras = segmentMoras(text);
  if (moras.length === 0) return null;

  // Resolve effective drop number and pattern
  const effectiveDrop = dropIndex !== undefined ? dropIndex : dropMora;
  const effectivePattern: PitchPattern =
    pattern ||
    (effectiveDrop !== undefined
      ? classifyPitchPattern(effectiveDrop, moras.length)
      : 'heiban');

  const details: PitchAccentDetails = calculatePitchContour(
    text,
    effectivePattern,
    effectiveDrop
  );
  const {
    moras: pitchMoras,
    theme,
    nameJa,
    nameRomaji,
    typeNumber,
    explanationMy,
    meaningEn,
  } = details;

  // SVG Geometry Calculation
  const moraStepWidth = compact ? 24 : 34;
  const paddingX = compact ? 14 : 20;
  const highY = compact ? 10 : 12;
  const lowY = compact ? 28 : 34;
  const svgHeight = compact ? 40 : 48;
  const totalSvgWidth = paddingX * 2 + pitchMoras.length * moraStepWidth;

  // Generate SVG Stepped Line Path
  // High lines are at highY, Low lines are at lowY.
  // When pitch transitions between moras, a vertical step connects them.
  let stepPath = '';
  pitchMoras.forEach((m, idx) => {
    const startX = paddingX + idx * moraStepWidth;
    const endX = startX + moraStepWidth;
    const y = m.level === 'H' ? highY : lowY;

    if (idx === 0) {
      stepPath += `M ${startX} ${y} L ${endX} ${y}`;
    } else {
      const prevM = pitchMoras[idx - 1];
      const prevY = prevM.level === 'H' ? highY : lowY;
      if (prevY !== y) {
        stepPath += ` L ${startX} ${y} L ${endX} ${y}`;
      } else {
        stepPath += ` L ${endX} ${y}`;
      }
    }
  });

  return (
    <div
      className={`inline-flex flex-col gap-2 select-none ${className}`}
      data-testid="pitch-accent-visualizer"
    >
      {/* 1. Header Pitch Badge — Obsidian Glass Tactile Pill */}
      {showBadge && (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center space-x-1.5 rounded-full font-bold border transition shadow-sm backdrop-blur-md ${
              compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
            } ${theme.bg} ${theme.text} ${theme.border}`}
          >
            <span>{nameJa}</span>
            <span className="font-mono opacity-85 text-[10px]">{`[${typeNumber}型]`}</span>
            <span className="font-mono opacity-85">({nameRomaji})</span>
          </span>

          {!compact && (
            <div className="flex items-center space-x-1.5 text-[11px] text-stone-600 font-myanmar">
              <span>{explanationMy}</span>
              <span className="text-stone-400 font-mono hidden sm:inline">•</span>
              <span className="text-stone-500 font-mono hidden sm:inline text-[10px]">
                {meaningEn}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. Mora-Level SVG Pitch Contour & Stepped Line Graph */}
      {showContour && (
        <div className="overflow-x-auto max-w-full pb-1">
          <div
            className={`inline-block rounded-2xl border border-stone-200 bg-stone-50 shadow-xs ${
              compact ? 'p-2' : 'p-3'
            }`}
          >
            <svg
              width={totalSvgWidth}
              height={svgHeight}
              className="overflow-visible"
              aria-label={`Pitch contour: ${nameJa} (${nameRomaji})`}
            >
              {/* Reference Grid Baselines */}
              <line
                x1={paddingX}
                y1={highY}
                x2={totalSvgWidth - paddingX}
                y2={highY}
                stroke="#e7e5e4"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.8"
              />
              <line
                x1={paddingX}
                y1={lowY}
                x2={totalSvgWidth - paddingX}
                y2={lowY}
                stroke="#e7e5e4"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.8"
              />

              {/* Stepped Pitch Line */}
              <path
                d={stepPath}
                fill="none"
                stroke="#4f46e5"
                strokeWidth={compact ? 2.5 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />

              {/* Mora Nodes & Drop Markers */}
              {pitchMoras.map((m, idx) => {
                const centerX = paddingX + idx * moraStepWidth + moraStepWidth / 2;
                const nodeY = m.level === 'H' ? highY : lowY;

                return (
                  <g key={idx} className="cursor-default">
                    {/* Animated Ripple on Drop Nucleus */}
                    {m.isDropNucleus && (
                      <circle
                        cx={centerX}
                        cy={nodeY}
                        r={compact ? 6 : 8}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.2"
                        opacity="0.45"
                        className="animate-ping"
                      />
                    )}

                    {/* Circle Node: High = Indigo, Low = Stone, Drop Nucleus = Rose */}
                    <circle
                      cx={centerX}
                      cy={nodeY}
                      r={compact ? 3.5 : 4.5}
                      fill={m.isDropNucleus ? '#ef4444' : m.level === 'H' ? '#4f46e5' : '#a8a29e'}
                      stroke="#ffffff"
                      strokeWidth={compact ? 1.5 : 2}
                    />

                    {/* Accent Nucleus Drop Marker Arrow & Fall Line */}
                    {m.isDropNucleus && (
                      <g>
                        <path
                          d={`M ${centerX - 3.5} ${nodeY - 6} L ${centerX + 3.5} ${nodeY - 6} L ${centerX} ${nodeY - 1.5} Z`}
                          fill="#ef4444"
                        />
                        <line
                          x1={centerX + moraStepWidth / 2}
                          y1={nodeY}
                          x2={centerX + moraStepWidth / 2}
                          y2={lowY}
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeDasharray="1,1"
                        />
                      </g>
                    )}

                    {/* Pitch Level Indicator (H / L) */}
                    <text
                      x={centerX}
                      y={nodeY - (compact ? 5 : 7)}
                      textAnchor="middle"
                      className="text-[9px] font-mono font-bold"
                      fill={m.isDropNucleus ? '#ef4444' : m.level === 'H' ? '#4f46e5' : '#78716c'}
                    >
                      {m.level}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Ruby / Furigana Aligned Kana Mora Labels Below the Curve */}
            <div
              className="flex items-center"
              style={{
                paddingLeft: `${paddingX}px`,
                paddingRight: `${paddingX}px`,
              }}
            >
              {pitchMoras.map((m, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center text-center"
                  style={{ width: `${moraStepWidth}px` }}
                >
                  <ruby className="flex flex-col items-center">
                    <span
                      className={`font-japanese font-semibold transition ${
                        compact ? 'text-xs' : 'text-sm'
                      } ${
                        m.isDropNucleus
                          ? 'text-red-700 font-bold'
                          : m.level === 'H'
                          ? 'text-indigo-700'
                          : 'text-stone-700'
                      }`}
                    >
                      {m.mora}
                    </span>
                    <rt className="text-[9px] font-mono text-stone-500 select-none">
                      {m.isDropNucleus ? '▼' : ''}
                    </rt>
                  </ruby>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
