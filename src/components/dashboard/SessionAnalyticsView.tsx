import React from 'react';
import { Download, RotateCcw, Trash2 } from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';
import { GlassButton } from '../glass/GlassButton';

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const SessionAnalyticsView: React.FC = () => {
  const sessionTimeline = useFocusStore((s) => s.sessionTimeline);
  const durationWholeSec = useFocusStore((s) => Math.floor(s.sessionStats.durationSeconds));
  const sessionHistory = useFocusStore((s) => s.sessionHistory);
  const threshold = useFocusStore((s) => s.settings.threshold);
  const resetSession = useFocusStore((s) => s.resetSession);
  const clearSessionHistory = useFocusStore((s) => s.clearSessionHistory);
  const exportSessionsCsv = useFocusStore((s) => s.exportSessionsCsv);

  const width = 920;
  const height = 240;
  const padLeft = 42;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 26;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const points = sessionTimeline.slice(-180);
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

  const thresholdY = toY(threshold);

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

  const canExport = durationWholeSec >= 1 || sessionHistory.length > 0;

  return (
    <div className="flex flex-col flex-1 bg-[#ffffff]">
      {/* Сводка по наработке */}
      <div className="border-b border-[rgba(17,24,39,0.10)] bg-[#ffffff] px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center divide-x divide-[rgba(17,24,39,0.10)] text-xs">
          <div className="pr-4 flex items-baseline gap-2">
            <span className="text-[#6b7487]">Завершено сеансов</span>
            <span className="text-sm font-medium font-mono tabular-nums text-[#111827]">
              {sessionHistory.length}
            </span>
          </div>
          <div className="px-4 flex items-baseline gap-2">
            <span className="text-[#6b7487]">Суммарная наработка</span>
            <span className="text-sm font-medium font-mono tabular-nums text-[#111827]">
              {formatDuration(totalSavedDuration + durationWholeSec)}
            </span>
          </div>
          <div className="pl-4 flex items-baseline gap-2">
            <span className="text-[#6b7487]">Средний индекс / в зоне</span>
            <span className="text-sm font-medium font-mono tabular-nums text-[#111827]">
              {overallAvgScore !== null ? `${overallAvgScore}% / ${overallFlowPct}%` : '—'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GlassButton
            size="sm"
            variant="secondary"
            disabled={durationWholeSec < 3}
            onClick={() => resetSession(true)}
            icon={<RotateCcw size={13} strokeWidth={1.5} />}
          >
            Завершить текущий
          </GlassButton>
          <GlassButton
            size="sm"
            variant="primary"
            disabled={!canExport}
            onClick={() => exportSessionsCsv()}
            icon={<Download size={13} strokeWidth={1.5} />}
          >
            Экспорт CSV
          </GlassButton>
          {sessionHistory.length > 0 && (
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => clearSessionHistory()}
              icon={<Trash2 size={13} strokeWidth={1.5} />}
            >
              Очистить
            </GlassButton>
          )}
        </div>
      </div>

      {/* График динамики текущего сеанса (1 Гц) */}
      <div className="border-b border-[rgba(17,24,39,0.10)]">
        <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-medium text-[#111827]">Тренд текущего сеанса (шаг 1 с, окно 3 мин)</span>
          <div className="flex items-center gap-4 text-[11px] text-[#4b5565]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-[2px] bg-[#1d5bbf] inline-block" /> Сглаженный БОС
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-[1.5px] bg-[#334155] inline-block" /> β-индекс
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-[1.5px] bg-[#94a3b8] inline-block" /> α-индекс
            </span>
            <span className="font-mono tabular-nums text-[#6b7487]">
              порог {threshold}%
            </span>
          </div>
        </div>

        <div className="relative w-full bg-[#ffffff] px-2 py-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[230px] block select-none"
            preserveAspectRatio="none"
          >
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = toY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="rgba(17,24,39,0.07)"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#6b7487"
                    fontSize="10"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

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
                    fill="rgba(220, 38, 38, 0.06)"
                  />
                );
              })}

            <line
              x1={padLeft}
              y1={thresholdY}
              x2={width - padRight}
              y2={thresholdY}
              stroke="#6b7487"
              strokeWidth="1"
              strokeDasharray="4 3"
            />

            {n >= 2 && (
              <>
                <path
                  d={focusPath}
                  fill="none"
                  stroke="#334155"
                  strokeOpacity="0.45"
                  strokeWidth="1.1"
                />
                <path
                  d={calmPath}
                  fill="none"
                  stroke="#94a3b8"
                  strokeOpacity="0.6"
                  strokeWidth="1.1"
                />
                <path d={smoothedPath} fill="none" stroke="#1d5bbf" strokeWidth="1.75" />
              </>
            )}

            {n >= 2 && (
              <>
                <text
                  x={padLeft}
                  y={height - 6}
                  textAnchor="start"
                  fill="#6b7487"
                  fontSize="10"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {formatDuration(points[0].elapsedSeconds)}
                </text>
                <text
                  x={width - padRight}
                  y={height - 6}
                  textAnchor="end"
                  fill="#6b7487"
                  fontSize="10"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {formatDuration(points[n - 1].elapsedSeconds)}
                </text>
              </>
            )}
          </svg>

          {n < 2 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-mono text-[#6b7487]">
                Накопление отсчётов ({n}/2 с)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Таблица сохранённых сеансов */}
      <div className="flex-1">
        <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex items-center justify-between text-xs">
          <span className="font-medium text-[#111827]">Архив завершённых сеансов</span>
          <span className="text-[#6b7487] font-mono">sessions.json / localStorage</span>
        </div>

        {sessionHistory.length === 0 ? (
          <div className="py-10 px-4 text-center text-xs text-[#6b7487]">
            Записей нет. Для сохранения сеанса нажмите «Завершить текущий» после 3 с работы
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[rgba(17,24,39,0.10)] bg-[#fcfcfd] text-[#6b7487]">
                  <th className="py-2 px-4 font-normal">Дата и время</th>
                  <th className="py-2 px-3 font-normal">Режим</th>
                  <th className="py-2 px-3 font-normal">Источник</th>
                  <th className="py-2 px-3 font-normal text-right">Длительность</th>
                  <th className="py-2 px-3 font-normal text-right">Доля в зоне</th>
                  <th className="py-2 px-3 font-normal text-right">Средний / порог</th>
                  <th className="py-2 px-3 font-normal text-right">Спады</th>
                  <th className="py-2 px-4 font-normal text-right">Артефакты</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(17,24,39,0.08)]">
                {sessionHistory.map((rec) => {
                  const flowPct =
                    rec.durationSeconds > 0
                      ? Math.round((rec.timeInFocusSeconds / rec.durationSeconds) * 100)
                      : 0;
                  return (
                    <tr key={rec.id} className="hover:bg-[#f8f9fb]">
                      <td className="py-2 px-4 font-mono tabular-nums text-[#4b5565] whitespace-nowrap">
                        {formatDateTime(rec.endedAt)}
                      </td>
                      <td className="py-2 px-3 text-[#111827]">
                        {rec.mode === 'concentration' ? 'Концентрация β' : 'Релаксация α'}
                      </td>
                      <td className="py-2 px-3 text-[#4b5565]">
                        {rec.deviceSource === 'simulator' ? 'Симулятор' : 'BrainBit BLE'}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-[#111827] text-right">
                        {formatDuration(rec.durationSeconds)}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-[#111827] text-right">
                        {flowPct}%
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-[#4b5565] text-right">
                        {Math.round(rec.averageFocusScore)}% / {rec.threshold}%
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-[#111827] text-right">
                        {rec.distractionEventsCount}
                      </td>
                      <td className="py-2 px-4 font-mono tabular-nums text-[#6b7487] text-right">
                        {rec.artifactCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
