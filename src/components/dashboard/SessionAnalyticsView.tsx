import React from 'react';
import {
  TrendingUp,
  History,
  Download,
  RotateCcw,
  Trash2,
  Flame,
  Clock,
  Activity,
} from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';
import { GlassPanel } from '../glass/GlassPanel';
import { GlassBadge } from '../glass/GlassBadge';
import { GlassButton } from '../glass/GlassButton';

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const SessionAnalyticsView: React.FC = () => {
  const {
    sessionTimeline,
    sessionStats,
    sessionHistory,
    settings,
    resetSession,
    clearSessionHistory,
    exportSessionsCsv,
  } = useFocusStore();

  const width = 820;
  const height = 230;
  const padLeft = 38;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 26;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const points = sessionTimeline.slice(-180); // Last 3 minutes window for sharp resolution
  const n = points.length;

  const toX = (i: number) => (n <= 1 ? padLeft : padLeft + (i / (n - 1)) * innerW);
  const toY = (pct: number) =>
    padTop + innerH - (Math.max(0, Math.min(100, pct)) / 100) * innerH;

  const focusPath =
    n >= 2
      ? points
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.concentration).toFixed(1)}`)
          .join(' ')
      : '';

  const calmPath =
    n >= 2
      ? points
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.relaxation).toFixed(1)}`)
          .join(' ')
      : '';

  const smoothedPath =
    n >= 2
      ? points
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.smoothedMetric).toFixed(1)}`)
          .join(' ')
      : '';

  const thresholdY = toY(settings.threshold);

  const totalSavedDuration = sessionHistory.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalSavedFocus = sessionHistory.reduce((acc, s) => acc + s.timeInFocusSeconds, 0);
  const overallFlowPct =
    totalSavedDuration > 0 ? Math.round((totalSavedFocus / totalSavedDuration) * 100) : null;
  const overallAvgScore =
    sessionHistory.length > 0
      ? Math.round(
          sessionHistory.reduce((acc, s) => acc + s.averageFocusScore, 0) / sessionHistory.length
        )
      : null;

  const canExport = sessionStats.durationSeconds >= 1 || sessionHistory.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassPanel variant="card" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Completed Sessions</span>
            <span className="text-2xl font-black font-mono text-white mt-0.5 block">
              {sessionHistory.length}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-orange-500/15 text-[#FF6600]">
            <History className="w-5 h-5" />
          </div>
        </GlassPanel>

        <GlassPanel variant="card" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Cumulative Training Time</span>
            <span className="text-2xl font-black font-mono text-white mt-0.5 block">
              {formatDuration(totalSavedDuration + sessionStats.durationSeconds)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-[#00D2FF]">
            <Clock className="w-5 h-5" />
          </div>
        </GlassPanel>

        <GlassPanel variant="card" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Mean Historical Score / Flow</span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-0.5 block">
              {overallAvgScore !== null ? `${overallAvgScore}% · ${overallFlowPct}%` : '—'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Flame className="w-5 h-5" />
          </div>
        </GlassPanel>
      </div>

      {/* Live Session Trend Chart */}
      <GlassPanel variant="card" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-[#00D2FF]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Current Session Dynamics (Last 3 min · 1 Hz)
              </h3>
              <p className="text-xs text-slate-400">
                Active metric curve, raw Focus/Calm indices, and dimming intervals below threshold
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-0.5 bg-[#00D2FF] inline-block" /> Smoothed БОС
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-0.5 bg-[#FF6600] inline-block" /> Focus (β)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-0.5 bg-[#A78BFA] inline-block" /> Calm (α)
            </span>
            <GlassBadge variant="neutral">Cutoff {settings.threshold}%</GlassBadge>
          </div>
        </div>

        <div className="relative w-full bg-slate-950/70 rounded-xl border border-white/10 p-2 overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[220px] block select-none"
            preserveAspectRatio="none"
          >
            {/* Horizontal grid lines */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = toY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="rgba(148,163,184,0.8)"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

            {/* Shaded dimming spans */}
            {n >= 2 &&
              points.map((pt, idx) => {
                if (!pt.isDimmingActive || idx === n - 1) return null;
                const x1 = toX(idx);
                const x2 = toX(idx + 1);
                return (
                  <rect
                    key={pt.elapsedSeconds}
                    x={x1}
                    y={padTop}
                    width={Math.max(1, x2 - x1)}
                    height={innerH}
                    fill="rgba(255, 102, 0, 0.10)"
                  />
                );
              })}

            {/* Target threshold dashed line */}
            <line
              x1={padLeft}
              y1={thresholdY}
              x2={width - padRight}
              y2={thresholdY}
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth="1.2"
              strokeDasharray="5 4"
            />

            {/* Curves */}
            {n >= 2 && (
              <>
                <path
                  d={focusPath}
                  fill="none"
                  stroke="#FF6600"
                  strokeOpacity="0.55"
                  strokeWidth="1.5"
                />
                <path
                  d={calmPath}
                  fill="none"
                  stroke="#A78BFA"
                  strokeOpacity="0.55"
                  strokeWidth="1.5"
                />
                <path d={smoothedPath} fill="none" stroke="#00D2FF" strokeWidth="2.4" />
              </>
            )}

            {/* X-axis timestamps */}
            {n >= 2 && (
              <>
                <text
                  x={padLeft}
                  y={height - 6}
                  textAnchor="start"
                  fill="rgba(148,163,184,0.8)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {formatDuration(points[0].elapsedSeconds)}
                </text>
                <text
                  x={width - padRight}
                  y={height - 6}
                  textAnchor="end"
                  fill="rgba(148,163,184,0.8)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {formatDuration(points[n - 1].elapsedSeconds)}
                </text>
              </>
            )}
          </svg>

          {n < 2 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-white/10 text-xs font-mono text-slate-400 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#00D2FF]" />
                Collecting 1 Hz session points ({n}/2s)...
              </span>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Saved Session History Log */}
      <GlassPanel variant="card" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white">Local Training History</h3>
            <p className="text-xs text-slate-400">
              Persisted locally (AppData sessions.json in Tauri desktop / localStorage in web mode)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GlassButton
              size="sm"
              variant="secondary"
              disabled={sessionStats.durationSeconds < 3}
              onClick={() => resetSession(true)}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Finish & Save Current
            </GlassButton>
            <GlassButton
              size="sm"
              variant="primary"
              disabled={!canExport}
              onClick={() => exportSessionsCsv()}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </GlassButton>
            {sessionHistory.length > 0 && (
              <button
                onClick={() => clearSessionHistory()}
                title="Clear saved session history"
                className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {sessionHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No completed sessions saved yet. Run a session for at least 3 seconds and click{' '}
            <strong className="text-slate-200">Finish &amp; Save Current</strong> (or reset button
            on the Live Monitor card).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-medium">
                  <th className="py-2 pr-3">Ended</th>
                  <th className="py-2 px-3">Mode</th>
                  <th className="py-2 px-3">Source</th>
                  <th className="py-2 px-3 font-mono">Duration</th>
                  <th className="py-2 px-3 font-mono">In Flow</th>
                  <th className="py-2 px-3 font-mono">Avg / Cutoff</th>
                  <th className="py-2 px-3 font-mono">Dips</th>
                  <th className="py-2 pl-3 font-mono">Artifacts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessionHistory.map((rec) => {
                  const flowPct =
                    rec.durationSeconds > 0
                      ? Math.round((rec.timeInFocusSeconds / rec.durationSeconds) * 100)
                      : 0;
                  return (
                    <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pr-3 text-slate-300 whitespace-nowrap">
                        {formatDateTime(rec.endedAt)}
                      </td>
                      <td className="py-2.5 px-3">
                        <GlassBadge
                          variant={rec.mode === 'concentration' ? 'orange' : 'violet'}
                        >
                          {rec.mode === 'concentration' ? 'Focus (β)' : 'Calm (α)'}
                        </GlassBadge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 uppercase">
                        {rec.deviceSource === 'simulator' ? 'SIM' : 'BLE'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white">
                        {formatDuration(rec.durationSeconds)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400">{flowPct}%</td>
                      <td className="py-2.5 px-3 font-mono text-cyan-300">
                        {Math.round(rec.averageFocusScore)}% / {rec.threshold}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#FF6600]">
                        {rec.distractionEventsCount}
                      </td>
                      <td className="py-2.5 pl-3 font-mono text-slate-400">{rec.artifactCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};
