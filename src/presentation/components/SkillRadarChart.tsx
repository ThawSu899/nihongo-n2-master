import React, { useMemo } from 'react';

export interface SkillScoreData {
  skill: 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening';
  label: string;
  scorePct: number; // 0 - 100
  thresholdPct: number; // e.g. 90, 85, 85, 80, 80
  testedCount: number;
  correctCount: number;
}

interface SkillRadarChartProps {
  skills: SkillScoreData[];
  size?: number;
  showComparisonTarget?: boolean;
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({
  skills,
  size = 280,
  showComparisonTarget = true,
}) => {
  const center = size / 2;
  const radius = size * 0.38;
  const levels = [0.25, 0.5, 0.75, 1.0]; // Concentric grid rings (25%, 50%, 75%, 100%)

  // 5 vertices for a regular pentagon, top vertex at -90 degrees (-PI/2)
  const angleStep = (2 * Math.PI) / skills.length;
  const startAngle = -Math.PI / 2;

  const getCoordinates = (valueNormalized: number, index: number) => {
    const angle = startAngle + index * angleStep;
    const r = radius * Math.max(0, Math.min(1, valueNormalized));
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Generate background grid polygons
  const gridPolygons = levels.map((lvl) => {
    const points = skills
      .map((_, i) => {
        const { x, y } = getCoordinates(lvl, i);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return { level: lvl, points };
  });

  // User actual performance polygon
  const userPoints = useMemo(() => {
    return skills
      .map((s, i) => {
        const { x, y } = getCoordinates(s.scorePct / 100, i);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [skills, radius, center]);

  // Target threshold polygon
  const targetPoints = useMemo(() => {
    return skills
      .map((s, i) => {
        const { x, y } = getCoordinates(s.thresholdPct / 100, i);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [skills, radius, center]);

  // Axis spokes and label positions
  const spokesAndLabels = skills.map((skill, i) => {
    const outer = getCoordinates(1.0, i);
    const angle = startAngle + i * angleStep;
    const labelDistance = radius + 28;
    const lx = center + labelDistance * Math.cos(angle);
    const ly = center + labelDistance * Math.sin(angle);

    // Subtle alignment adjustment depending on angle quadrant
    let textAnchor: 'middle' | 'start' | 'end' = 'middle';
    if (Math.cos(angle) > 0.3) textAnchor = 'start';
    else if (Math.cos(angle) < -0.3) textAnchor = 'end';

    return {
      skill,
      axisX: outer.x,
      axisY: outer.y,
      lx,
      ly,
      textAnchor,
      userCoord: getCoordinates(skill.scorePct / 100, i),
      targetCoord: getCoordinates(skill.thresholdPct / 100, i),
    };
  });

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible select-none"
      >
        <defs>
          {/* Glowing rose gradient for user polygon */}
          <radialGradient id="radarUserFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
            <stop offset="85%" stopColor="#e11d48" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#9f1239" stopOpacity="0.08" />
          </radialGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Concentric grid pentagons */}
        {gridPolygons.map(({ level, points }) => (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="#292524" // stone-800
            strokeWidth={level === 1 ? '1.5' : '1'}
            strokeDasharray={level < 1 ? '3 3' : undefined}
          />
        ))}

        {/* Spokes from center to perimeter */}
        {spokesAndLabels.map((spoke, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={spoke.axisX}
            y2={spoke.axisY}
            stroke="#44403c" // stone-700
            strokeWidth="1"
          />
        ))}

        {/* Level Percentage Markers along Top Spoke */}
        {levels.map((lvl) => {
          const y = center - radius * lvl;
          return (
            <text
              key={lvl}
              x={center + 4}
              y={y + 3}
              fill="#78716c" // stone-500
              fontSize="8"
              fontFamily="monospace"
            >
              {Math.round(lvl * 100)}%
            </text>
          );
        })}

        {/* JLPT Target Benchmark Polygon (Indigo dotted outline) */}
        {showComparisonTarget && (
          <polygon
            points={targetPoints}
            fill="rgba(99, 102, 241, 0.06)"
            stroke="#6366f1"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="transition-all duration-300"
          />
        )}

        {/* User Actual Performance Polygon */}
        <polygon
          points={userPoints}
          fill="url(#radarUserFill)"
          stroke="#f43f5e"
          strokeWidth="2"
          filter="url(#radarGlow)"
          className="transition-all duration-500"
        />

        {/* User Data Points Dots */}
        {spokesAndLabels.map((item, i) => (
          <g key={i}>
            {/* Target vertex tick */}
            {showComparisonTarget && (
              <circle
                cx={item.targetCoord.x}
                cy={item.targetCoord.y}
                r="3"
                fill="#312e81"
                stroke="#818cf8"
                strokeWidth="1.5"
              />
            )}
            {/* User vertex marker */}
            <circle
              cx={item.userCoord.x}
              cy={item.userCoord.y}
              r="4.5"
              fill="#fb7185"
              stroke="#881337"
              strokeWidth="1.5"
            />
          </g>
        ))}

        {/* Outer Labels */}
        {spokesAndLabels.map((item, i) => {
          const isPassing = item.skill.scorePct >= item.skill.thresholdPct;
          return (
            <g key={i} className="pointer-events-none">
              <text
                x={item.lx}
                y={item.ly - 6}
                textAnchor={item.textAnchor}
                fill={isPassing ? '#f43f5e' : '#e7e5e4'}
                fontSize="11"
                fontWeight="600"
                className="tracking-tight"
              >
                {item.skill.label}
              </text>
              <text
                x={item.lx}
                y={item.ly + 7}
                textAnchor={item.textAnchor}
                fill={isPassing ? '#34d399' : '#a8a29e'}
                fontSize="10"
                fontFamily="monospace"
                fontWeight="500"
              >
                {item.skill.scorePct}%
                <tspan fill="#78716c" fontSize="9">
                  {' '}/ {item.skill.thresholdPct}%
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend below chart */}
      <div className="flex items-center space-x-5 mt-4 text-[11px] font-medium">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500/30 border border-rose-500 inline-block" />
          <span className="text-stone-300">Your Current Mastery</span>
        </div>
        {showComparisonTarget && (
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-indigo-400 inline-block" />
            <span className="text-stone-400">Target JLPT Threshold</span>
          </div>
        )}
      </div>
    </div>
  );
};
