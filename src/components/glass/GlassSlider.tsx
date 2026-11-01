import React from 'react';

interface GlassSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  accentColor?: 'orange' | 'cyan' | 'violet';
  description?: string;
  compact?: boolean;
  onChange: (val: number) => void;
}

export const GlassSlider: React.FC<GlassSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  accentColor = 'orange',
  compact = false,
  onChange,
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const fillBg = accentColor === 'orange' ? 'bg-[#1d5bbf]' : 'bg-[#4b5565]';

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 py-1.5">
        <span className="text-xs text-[#4b5565] truncate">{label}</span>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex items-center w-[116px] h-4">
            <div className="absolute inset-x-0 h-1 bg-[#dfe3eb] rounded-full overflow-hidden">
              <div className={`h-full ${fillBg}`} style={{ width: `${percentage}%` }} />
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="absolute inset-x-0 w-full h-4 opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute w-3 h-3 -ml-1.5 rounded-full bg-[#ffffff] border border-[#111827]/45 shadow-[0_1px_2px_rgba(0,0,0,0.12)] pointer-events-none"
              style={{ left: `${percentage}%` }}
            />
          </div>
          <span className="text-xs font-mono tabular-nums text-[#111827] w-14 text-right">
            {value}
            {unit}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4 py-2.5">
      <span className="sm:col-span-5 text-[13px] text-[#111827]">{label}</span>
      <div className="sm:col-span-7 flex items-center gap-3 justify-end">
        <div className="relative flex items-center w-full sm:w-[200px] h-5">
          <div className="absolute inset-x-0 h-1 bg-[#dfe3eb] rounded-full overflow-hidden">
            <div className={`h-full ${fillBg}`} style={{ width: `${percentage}%` }} />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-x-0 w-full h-5 opacity-0 cursor-pointer z-10"
          />
          <div
            className="absolute w-3.5 h-3.5 -ml-[7px] rounded-full bg-[#ffffff] border border-[#111827]/50 shadow-[0_1px_2px_rgba(0,0,0,0.12)] pointer-events-none"
            style={{ left: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-mono tabular-nums text-[#111827] w-16 text-right shrink-0">
          {value}
          {unit}
        </span>
      </div>
    </div>
  );
};
