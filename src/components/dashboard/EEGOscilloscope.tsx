import React, { useEffect, useRef, useState } from 'react';
import { simulationEngine } from '../../services/simulationEngine';
import { useFocusStore } from '../../stores/useFocusStore';

const CHANNELS = [
  { key: 't3', code: 'T3', sub: 'висок Л', color: '#334155' },
  { key: 't4', code: 'T4', sub: 'висок П', color: '#334155' },
  { key: 'o1', code: 'O1', sub: 'затыл Л', color: '#1d5bbf' },
  { key: 'o2', code: 'O2', sub: 'затыл П', color: '#1d5bbf' },
] as const;

export const EEGOscilloscope: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [timeScale, setTimeScale] = useState<number>(2);

  const deviceSource = useFocusStore((s) => s.settings.deviceSource);
  const connected = useFocusStore((s) => s.deviceStatus.connected);
  const isPaused = useFocusStore((s) => s.isPaused);
  const activePreset = useFocusStore((s) => s.activePreset);
  const setPreset = useFocusStore((s) => s.setPreset);
  const togglePause = useFocusStore((s) => s.togglePause);
  const thetaText = useFocusStore((s) =>
    s.telemetry?.spectrum ? s.telemetry.spectrum.theta.toFixed(1) : null
  );
  const alphaText = useFocusStore((s) =>
    s.telemetry?.spectrum ? s.telemetry.spectrum.alpha.toFixed(1) : null
  );
  const betaText = useFocusStore((s) =>
    s.telemetry?.spectrum ? s.telemetry.spectrum.beta.toFixed(1) : null
  );

  const isSimulator = deviceSource === 'simulator';
  const isStreamActive = isSimulator || connected;

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssWidth = canvas.clientWidth || 760;
      const cssHeight = canvas.clientHeight || 400;

      if (
        canvas.width !== Math.round(cssWidth * dpr) ||
        canvas.height !== Math.round(cssHeight * dpr)
      ) {
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const gutterW = 64;
      const axisBottomH = 22;
      const plotW = Math.max(100, cssWidth - gutterW);
      const plotH = Math.max(120, cssHeight - axisBottomH);
      const channelHeight = plotH / 4;
      // Масштаб по амплитуде (пикс/мкВ)
      const pxPerUv = Math.min(0.56, (channelHeight * 0.38) / 35);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      ctx.fillStyle = '#f8f9fb';
      ctx.fillRect(0, 0, gutterW, cssHeight);

      ctx.fillStyle = '#f8f9fb';
      ctx.fillRect(0, plotH, cssWidth, axisBottomH);

      // Временная сетка: шаг 0.2 с, основные деления 1.0 с
      const minorSteps = timeScale * 5;
      for (let i = 1; i <= minorSteps; i++) {
        const x = Math.round(gutterW + (i / minorSteps) * plotW) + 0.5;
        const isMajor = i % 5 === 0;
        ctx.strokeStyle = isMajor ? 'rgba(29, 91, 191, 0.14)' : 'rgba(29, 91, 191, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, plotH);
        ctx.stroke();

        if (isMajor) {
          const secAgo = timeScale - i / 5;
          ctx.fillStyle = '#6b7487';
          ctx.font = '400 10px "IBM Plex Mono", monospace';
          ctx.textAlign = i === minorSteps ? 'right' : 'center';
          ctx.fillText(
            secAgo === 0 ? '0.0 с' : `−${secAgo.toFixed(1)} с`,
            i === minorSteps ? cssWidth - 8 : x,
            plotH + 14
          );
        }
      }

      ctx.fillStyle = '#6b7487';
      ctx.font = '400 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`−${timeScale.toFixed(1)} с`, gutterW + 6, plotH + 14);

      ctx.strokeStyle = 'rgba(17, 24, 39, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gutterW + 0.5, 0);
      ctx.lineTo(gutterW + 0.5, cssHeight);
      ctx.moveTo(0, plotH + 0.5);
      ctx.lineTo(cssWidth, plotH + 0.5);
      ctx.stroke();

      const buffer = simulationEngine.getRawBuffer();
      const samplesNeeded = Math.min(buffer.length, Math.round(timeScale * 250));
      const slice = buffer.slice(-samplesNeeded);

      const q = useFocusStore.getState().telemetry?.signalQuality ?? {
        t3: true,
        t4: true,
        o1: true,
        o2: true,
      };

      CHANNELS.forEach((ch, index) => {
        const laneTop = channelHeight * index;
        const centerY = laneTop + channelHeight / 2;
        const isOk = q[ch.key];

        if (index > 0) {
          const yDiv = Math.round(laneTop) + 0.5;
          ctx.strokeStyle = 'rgba(17, 24, 39, 0.08)';
          ctx.beginPath();
          ctx.moveTo(0, yDiv);
          ctx.lineTo(cssWidth, yDiv);
          ctx.stroke();
        }

        // Нулевая линия 0 мкВ
        ctx.strokeStyle = 'rgba(17, 24, 39, 0.09)';
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(gutterW + 1, Math.round(centerY) + 0.5);
        ctx.lineTo(cssWidth, Math.round(centerY) + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = isOk ? '#111827' : '#dc2626';
        ctx.font = '500 12px "IBM Plex Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(ch.code, 10, centerY - 5);

        ctx.fillStyle = '#6b7487';
        ctx.font = '400 10px "IBM Plex Sans", sans-serif';
        ctx.fillText(ch.sub, 10, centerY + 9);

        if (slice.length > 1) {
          ctx.strokeStyle = isOk ? ch.color : '#dc2626';
          ctx.lineWidth = 1.15;
          ctx.lineJoin = 'round';
          ctx.beginPath();

          const dx = (plotW - 2) / (slice.length - 1);
          for (let i = 0; i < slice.length; i++) {
            const rawVal = slice[i].rawChannels[ch.key];
            const clampedY = Math.max(
              laneTop + 5,
              Math.min(laneTop + channelHeight - 5, centerY - rawVal * pxPerUv)
            );
            const x = gutterW + 1 + i * dx;
            if (i === 0) {
              ctx.moveTo(x, clampedY);
            } else {
              ctx.lineTo(x, clampedY);
            }
          }
          ctx.stroke();

          const lastVal = slice[slice.length - 1].rawChannels[ch.key];
          ctx.fillStyle = '#6b7487';
          ctx.font = '400 10px "IBM Plex Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(
            `${lastVal >= 0 ? '+' : ''}${lastVal.toFixed(0)} мкВ`,
            10,
            centerY + 22
          );
        }
      });

      // Калибровочная скоба 50 мкВ
      const scaleBarH = Math.round(50 * pxPerUv);
      const barX = cssWidth - 16.5;
      const barTop = 14.5;
      const barBottom = barTop + scaleBarH;
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(barX - 3, barTop);
      ctx.lineTo(barX, barTop);
      ctx.lineTo(barX, barBottom);
      ctx.lineTo(barX - 3, barBottom);
      ctx.stroke();

      ctx.fillStyle = '#4b5565';
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('50 мкВ', barX - 6, barTop + scaleBarH / 2 + 3);

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [timeScale]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#ffffff]">
      <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium text-[#111827]">ЭЭГ (T3, T4, O1, O2)</span>
          <span className="text-[#6b7487] hidden sm:inline">
            250 Гц · режектор 50 Гц · полоса 4–30 Гц
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono tabular-nums text-[#6b7487]">
            {!isStreamActive
              ? 'нет пакетов'
              : isPaused && isSimulator
              ? 'пауза'
              : 'приём 250 Гц'}
          </span>

          <div className="inline-flex items-center rounded-[5px] border border-[rgba(17,24,39,0.14)] bg-[#ffffff] overflow-hidden">
            {[1, 2, 4].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setTimeScale(sec)}
                className={`px-2 h-6 text-[11px] font-mono tabular-nums transition-colors duration-120 cursor-pointer border-r last:border-r-0 border-[rgba(17,24,39,0.10)] ${
                  timeScale === sec
                    ? 'bg-[#eceff4] text-[#111827] font-medium'
                    : 'text-[#6b7487] hover:text-[#111827]'
                }`}
              >
                {sec} с
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-[380px] w-full">
        <canvas ref={canvasRef} className="w-full h-full block" />
        {!isStreamActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-[#ffffff]/80">
            <span className="px-3 py-1.5 rounded border border-[rgba(17,24,39,0.14)] bg-[#f8f9fb] text-xs font-mono text-[#4b5565]">
              Ожидание потока SignalData от BrainBit
            </span>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
          <span className="font-sans text-[#6b7487]">Спектр O1−T3, O2−T4:</span>
          <span className="text-[#4b5565]">
            θ 4–7 Гц{' '}
            <span className="text-[#111827] font-medium">
              {isStreamActive && thetaText !== null ? `${thetaText}%` : '—'}
            </span>
          </span>
          <span className="text-[#4b5565]">
            α 8–13 Гц{' '}
            <span className="text-[#111827] font-medium">
              {isStreamActive && alphaText !== null ? `${alphaText}%` : '—'}
            </span>
          </span>
          <span className="text-[#4b5565]">
            β 14–30 Гц{' '}
            <span className="text-[#111827] font-medium">
              {isStreamActive && betaText !== null ? `${betaText}%` : '—'}
            </span>
          </span>
        </div>

        {isSimulator && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: 'Фокус', preset: 'high_focus' as const, key: '1' },
              { label: 'Поток', preset: 'calm_flow' as const, key: '2' },
              { label: 'Спад', preset: 'attention_drift' as const, key: '3' },
              { label: 'Альфа', preset: 'meditation' as const, key: '5' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.preset)}
                className={`h-6 px-2 rounded text-[11px] inline-flex items-center gap-1.5 border transition-colors duration-120 cursor-pointer ${
                  activePreset === p.preset
                    ? 'bg-[#1d5bbf] text-white border-[#1d5bbf]'
                    : 'bg-[#ffffff] text-[#4b5565] hover:text-[#111827] border-[rgba(17,24,39,0.14)]'
                }`}
              >
                <span className="font-mono opacity-80">{p.key}</span>
                <span>{p.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => simulationEngine.injectArtifact()}
              className="h-6 px-2 rounded text-[11px] inline-flex items-center gap-1.5 border bg-[#ffffff] text-[#4b5565] hover:text-[#111827] border-[rgba(17,24,39,0.14)] transition-colors duration-120 cursor-pointer"
            >
              <span className="font-mono opacity-80">4</span>
              <span>Артефакт</span>
            </button>

            <button
              type="button"
              onClick={() => togglePause()}
              className="h-6 px-2 rounded text-[11px] inline-flex items-center gap-1.5 border bg-[#ffffff] text-[#4b5565] hover:text-[#111827] border-[rgba(17,24,39,0.14)] transition-colors duration-120 cursor-pointer"
            >
              <span className="font-mono opacity-80">Space</span>
              <span>{isPaused ? 'Пуск' : 'Пауза'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
