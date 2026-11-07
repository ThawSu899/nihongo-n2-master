import React from 'react';
import {
  PitchPattern,
  calculatePitchContour,
  PitchAccentDetails,
  PitchMora,
} from '../../domain/audio/pitch-accent';

export interface PitchAccentVisualizerProps {
  text: string;
  pattern: PitchPattern;
  dropMora?: number;
  showBadge?: boolean;
  showContour?: boolean;
  compact?: boolean;
  className?: string;
}

export const PitchAccentVisualizer: React.FC<PitchAccentVisualizerProps> = ({
  text,
  pattern,
  dropMora,
  showBadge = true,
  showContour = true,
  compact = false,
  className = '',
}) => {
  const details: PitchAccentDetails = calculatePitchContour(text, pattern, dropMora);
  const { moras, theme, nameJa, nameRomaji, typeNumber, explanationMy, particleLevel } = details;

  if (moras.length === 0) return null;

  // SVG Geometry Calculation
  const moraStepWidth = compact ? 22 : 32;
  const paddingX = compact ? 12 : 18;
  const highY = compact ? 8 : 10;
  const lowY = compact ? 26 : 32;
  const svgHeight = compact ? 36 : 46;
  const totalSvgWidth = paddingX * 2 + moras.length * moraStepWidth;

  // Generate SVG Step Path
  // High lines are at highY, Low lines are at lowY.
  // When pitch transitions between moras, a vertical step connects them.
  let stepPath = '';
  moras.forEach((m, idx) => {
    const startX = paddingX + idx * moraStepWidth;
    const endX = startX + moraStepWidth;
    const y = m.level === 'H' ? highY : lowY;

    if (idx === 0) {
      stepPath += `M ${startX} ${y} L ${endX} ${y}`;
    } else {
      const prevM = moras[idx - 1];
      const prevY = prevM.level === 'H' ? highY : lowY;
      if (prevY !== y) {
        // Vertical step transition
        stepPath += ` L ${startX} ${y} L ${endX} ${y}`;
      } else {
        stepPath += ` L ${endX} ${y}`;
      }
    }
  });

  return (
    <div
      className={`inline-flex flex-col gap-1.5 select-none ${className}`}
      data-testid="pitch-accent-visualizer"
    >
      {/* 1. Header Pitch Badge */}
      {showBadge && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center space-x-1.5 rounded-full font-bold border transition ${
              compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
            } ${theme.bg} ${theme.text} ${theme.border}`}
          >
            <span>{nameJa}</span>
            <span className="font-mono opacity-80 text-[10px]">{`[${typeNumber}型]`}</span>
            <span className="font-mono opacity-80">({nameRomaji})</span>
          </span>

          {!compact && (
            <span className="text-[11px] text-stone-400 font-myanmar">
              {explanationMy}
            </span>
          )}
        </div>
      )}

      {/* 2. Mora-Level SVG Pitch Contour & Step Line Graph */}
      {showContour && (
        <div className="overflow-x-auto max-w-full pb-1">
          <div
            className={`inline-block rounded-xl border border-stone-800/80 bg-stone-950/70 ${
              compact ? 'p-1.5' : 'p-2.5'
            }`}
          >
            <svg
              width={totalSvgWidth}
              height={svgHeight}
              className="overflow-visible"
              aria-label={`Pitch contour: ${nameJa} (${nameRomaji})`}
            >
              {/* Reference Grid Baseline */}
              <line
                x1={paddingX}
                y1={highY}
                x2={totalSvgWidth - paddingX}
                y2={highY}
                stroke="#3f3f46"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.35"
              />
              <line
                x1={paddingX}
                y1={lowY}
                x2={totalSvgWidth - paddingX}
                y2={lowY}
                stroke="#3f3f46"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.35"
              />

              {/* Main Contour Step Line */}
              <path
                d={stepPath}
                fill="none"
                stroke={theme.stroke}
                strokeWidth={compact ? 2 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Mora Nodes & Drop Markers */}
              {moras.map((m, idx) => {
                const centerX = paddingX + idx * moraStepWidth + moraStepWidth / 2;
                const nodeY = m.level === 'H' ? highY : lowY;

                return (
                  <g key={idx} className="cursor-default">
                    {/* Circle Node on line */}
                    <circle
                      cx={centerX}
                      cy={nodeY}
                      r={compact ? 3 : 4}
                      fill={m.isDropNucleus ? '#ef4444' : theme.fill}
                      stroke="#18181b"
                      strokeWidth="1.5"
                    />

                    {/* Accent Nucleus Drop Marker (下がり目) */}
                    {m.isDropNucleus && (
                      <g>
                        {/* Downward drop arrow / indicator */}
                        <path
                          d={`M ${centerX - 3.5} ${nodeY - 5} L ${centerX + 3.5} ${nodeY - 5} L ${centerX} ${nodeY - 1} Z`}
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

                    {/* Level Label (H / L) */}
                    <text
                      x={centerX}
                      y={nodeY - (compact ? 5 : 7)}
                      textAnchor="middle"
                      className="text-[9px] font-mono font-bold"
                      fill={m.level === 'H' ? theme.stroke : '#71717a'}
                    >
                      {m.level}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Kana Mora Labels Below the Curve */}
            <div
              className="flex"
              style={{
                paddingLeft: `${paddingX}px`,
                paddingRight: `${paddingX}px`,
              }}
            >
              {moras.map((m, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center"
                  style={{ width: `${moraStepWidth}px` }}
                >
                  <span
                    className={`font-japanese font-medium transition ${
                      compact ? 'text-xs' : 'text-sm'
                    } ${m.isDropNucleus ? 'text-rose-400 font-bold' : 'text-stone-200'}`}
                  >
                    {m.mora}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
