'use client';

import React, { useEffect, useState } from 'react';
import { soundEffects } from '@/utils/sound';

export function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-sand-900/60 p-2 backdrop-blur-sm transition-all sm:p-4">
      <div 
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-sand-0 p-5 shadow-2xl border border-sand-200 animate-in fade-in slide-in-from-bottom-4 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-sand-300/80" />
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-sand-200/60 pb-3">
          <div>
            <h3 className="font-serif text-2xl text-sand-900">{title}</h3>
            {subtitle && <p className="text-xs text-sand-600 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={() => {
              soundEffects.playClick();
              onClose();
            }}
            className="rounded-full bg-sand-100 px-3 py-1.5 text-xs font-medium text-sand-700 transition hover:bg-sand-200 active:scale-95"
          >
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Outcome({
  kicker,
  title,
  body,
  tone = 'neutral',
}: {
  kicker: string;
  title: string;
  body: string;
  tone?: 'neutral' | 'advisory' | 'success' | 'shield';
}) {
  const tones = {
    neutral: 'border-sand-300 bg-sand-100/70 text-sand-800',
    advisory: 'border-amber-400/80 bg-amber-50/90 text-amber-950',
    success: 'border-emerald-500/70 bg-emerald-50/90 text-emerald-950',
    shield: 'border-clay/60 bg-sand-100/90 text-sand-900',
  };

  const kickerTones = {
    neutral: 'text-sand-600',
    advisory: 'text-amber-800 font-semibold',
    success: 'text-emerald-800 font-semibold',
    shield: 'text-clay font-semibold',
  };

  return (
    <div className={`rounded-2xl border p-3.5 shadow-sm transition-all ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] uppercase tracking-[0.2em] ${kickerTones[tone]}`}>{kicker}</p>
        {tone === 'shield' && (
          <span className="text-[10px] tracking-wide text-sand-500 font-mono">AES-256 · K≥10</span>
        )}
      </div>
      <p className="mt-1 font-serif text-base font-medium leading-snug">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed opacity-90">{body}</p>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  badge,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        soundEffects.playClick();
        onClick?.();
      }}
      className={`group relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
        active
          ? 'bg-sand-900 text-sand-50 shadow-md ring-2 ring-clay/40'
          : 'bg-sand-100/90 text-sand-700 hover:bg-sand-200/90 border border-sand-300/40'
      }`}
    >
      <span>{children}</span>
      {badge && (
        <span
          className={`rounded-full px-1.5 py-0.2 text-[9px] ${
            active ? 'bg-clay text-sand-50' : 'bg-sand-200 text-sand-800'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function PriRing({
  value,
  previousValue,
  size = 148,
}: {
  value: number;
  previousValue?: number;
  size?: number;
}) {
  const [displayVal, setDisplayVal] = useState(value);
  const strokeWidth = 9;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  useEffect(() => {
    setDisplayVal(value);
  }, [value]);

  const delta = previousValue ? value - previousValue : 0;
  
  // Status classification strictly aligned with non-diagnostic wording rules
  const statusLabel =
    value >= 75 ? 'Optimal Band' : value >= 50 ? 'Within Baseline' : 'Advisory Variation';

  return (
    <div className="relative mx-auto flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="priGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8a5a3c" />
              <stop offset="60%" stopColor="#c4ad8c" />
              <stop offset="100%" stopColor="#6b432e" />
            </linearGradient>
            <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e6d8c3"
            strokeWidth={strokeWidth}
            className="opacity-70"
          />

          {/* Active progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#priGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            filter="url(#ringGlow)"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-5xl font-medium tracking-tight text-sand-900 transition-all">
            {displayVal}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sand-600">
            Resilience
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-sand-200/80 px-2.5 py-0.5 text-[11px] font-medium text-sand-800">
          <span className="h-1.5 w-1.5 rounded-full bg-clay" />
          {statusLabel}
        </span>
        {delta !== 0 && (
          <span
            className={`text-[11px] font-medium ${
              delta > 0 ? 'text-emerald-700' : 'text-amber-800'
            }`}
          >
            {delta > 0 ? `+${delta}` : delta} vs prior
          </span>
        )}
      </div>
    </div>
  );
}

export function Spark({
  values,
  height = 56,
}: {
  values: number[];
  height?: number;
}) {
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="relative">
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {values.map((v, i) => {
          const pct = Math.max(12, ((v - min) / (max - min)) * 100);
          const isLatest = i === values.length - 1;
          const isHovered = hoveredIdx === i;

          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group relative flex-1 cursor-pointer"
              style={{ height: '100%' }}
            >
              <div
                className={`w-full rounded-t transition-all duration-200 ${
                  isHovered
                    ? 'bg-clay shadow-sm'
                    : isLatest
                    ? 'bg-clay-deep'
                    : 'bg-sand-400/80 hover:bg-sand-500'
                }`}
                style={{
                  height: `${pct}%`,
                  marginTop: `${100 - pct}%`,
                }}
              />
            </div>
          );
        })}
      </div>

      {hoveredIdx !== null && (
        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-sand-900 px-2 py-0.5 text-[10px] text-sand-50 shadow">
          Day {hoveredIdx + 1}: {values[hoveredIdx]} PRI
        </div>
      )}
    </div>
  );
}

/**
 * Visual Gaussian distribution normal curve explaining >3 SD baseline deviation rule
 */
export function GaussianBaselineChart({
  metricLabel,
  currentValue,
  mean,
  stdDev,
  unit,
}: {
  metricLabel: string;
  currentValue: number;
  mean: number;
  stdDev: number;
  unit: string;
}) {
  const zScore = (currentValue - mean) / (stdDev || 1);
  const isDeviation = Math.abs(zScore) >= 3;

  // Generate SVG path points for standard Gaussian bell curve
  const points: [number, number][] = [];
  const width = 280;
  const height = 90;
  const padding = 15;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding;

  for (let x = -4; x <= 4; x += 0.2) {
    const y = Math.exp(-0.5 * x * x);
    const screenX = padding + ((x + 4) / 8) * plotWidth;
    const screenY = height - padding - y * (plotHeight - 10);
    points.push([screenX, screenY]);
  }

  const pathD = points.reduce(
    (acc, [x, y], i) => (i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`),
    '',
  );

  const markerX = Math.min(
    width - padding,
    Math.max(padding, padding + ((zScore + 4) / 8) * plotWidth),
  );

  return (
    <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-sand-500 font-semibold">
            30-Day Gaussian Baseline
          </span>
          <p className="font-serif text-base text-sand-900">{metricLabel}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            isDeviation ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-400' : 'bg-sand-200 text-sand-700'
          }`}
        >
          {zScore > 0 ? `+${zScore.toFixed(1)}σ` : `${zScore.toFixed(1)}σ`}
        </span>
      </div>

      <div className="relative mt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Bell curve line */}
          <path d={pathD} fill="none" stroke="#a8906e" strokeWidth="2" />
          
          {/* -3σ and +3σ deviation threshold markers */}
          <line
            x1={padding + (1 / 8) * plotWidth}
            y1={height - padding}
            x2={padding + (1 / 8) * plotWidth}
            y2={padding}
            stroke="#c4ad8c"
            strokeDasharray="2 2"
          />
          <line
            x1={padding + (7 / 8) * plotWidth}
            y1={height - padding}
            x2={padding + (7 / 8) * plotWidth}
            y2={padding}
            stroke="#c4ad8c"
            strokeDasharray="2 2"
          />

          {/* Current Observation Indicator */}
          <circle cx={markerX} cy={height / 2} r="4" fill="#8a5a3c" />
          <line
            x1={markerX}
            y1={padding}
            x2={markerX}
            y2={height - padding}
            stroke="#8a5a3c"
            strokeWidth="1.5"
          />
        </svg>

        <div className="flex justify-between text-[9px] text-sand-500 font-mono mt-1">
          <span>-3σ Alert</span>
          <span>μ ({mean}{unit})</span>
          <span>+3σ Alert</span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-sand-700">
        Current: <strong className="text-sand-900">{currentValue} {unit}</strong>. Advisory deviations trigger solely when an observation breaches the ±3 standard deviation envelope against personal history.
      </p>
    </div>
  );
}

/**
 * Ephemeral RAM Zero-Fill Visualizer
 */
export function RamWipeVisualizer({
  isWiping,
  onComplete,
}: {
  isWiping: boolean;
  onComplete?: () => void;
}) {
  const [hexGrid, setHexGrid] = useState<string[]>([]);

  useEffect(() => {
    if (!isWiping) {
      // Show synthetic audio spectral buffer addresses
      setHexGrid(
        Array.from({ length: 16 }, () =>
          Math.floor(Math.random() * 255)
            .toString(16)
            .padStart(2, '0')
            .toUpperCase(),
        ),
      );
      return;
    }

    // Step-by-step zero-fill wipe simulation
    soundEffects.playWipe();
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setHexGrid((prev) =>
        prev.map((byte, idx) => (idx < step * 3 ? '00' : byte)),
      );
      if (step >= 6) {
        clearInterval(interval);
        setHexGrid(Array(16).fill('00'));
        onComplete?.();
      }
    }, 60);

    return () => clearInterval(interval);
  }, [isWiping, onComplete]);

  return (
    <div className="rounded-2xl border border-sand-800/20 bg-sand-900 p-3.5 text-sand-100 font-mono">
      <div className="flex items-center justify-between text-[10px] text-sand-400">
        <span>RAM SEGMENT: 0x7FFE5B84</span>
        <span className={isWiping ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}>
          {isWiping ? 'ZERO-FILLING MEMORY...' : 'RING BUFFER ALLOCATED'}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-8 gap-1 text-center text-xs font-semibold">
        {hexGrid.map((byte, i) => (
          <span
            key={i}
            className={`rounded py-0.5 transition-colors duration-150 ${
              byte === '00'
                ? 'bg-emerald-950 text-emerald-400'
                : 'bg-sand-800 text-sand-200'
            }`}
          >
            {byte}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-sand-400 border-t border-sand-800 pt-2">
        <span>Length: 10,240 bytes</span>
        <span>Storage: RAM only (0b disk)</span>
      </div>
    </div>
  );
}
