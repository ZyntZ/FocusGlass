import React from 'react';
import {
  Sliders,
  MousePointerClick,
  Maximize2,
  Play,
  Pause,
  Move,
} from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';

export const FocusBarHUD: React.FC = () => {
  const roundedScore = useFocusStore((s) => Math.round(s.feedbackState.smoothedMetric));
  const isContactOk = useFocusStore((s) => s.feedbackState.isContactOk);
  const isArtifactFrozen = useFocusStore((s) => s.feedbackState.isArtifactFrozen);
  const roundedOpacityPct = useFocusStore((s) => Math.round(s.feedbackState.overlayOpacity * 100));
  const qt3 = useFocusStore((s) => s.telemetry?.signalQuality.t3 ?? true);
  const qt4 = useFocusStore((s) => s.telemetry?.signalQuality.t4 ?? true);
  const qo1 = useFocusStore((s) => s.telemetry?.signalQuality.o1 ?? true);
  const qo2 = useFocusStore((s) => s.telemetry?.signalQuality.o2 ?? true);
  const mode = useFocusStore((s) => s.settings.mode);
  const deviceSource = useFocusStore((s) => s.settings.deviceSource);
  const threshold = useFocusStore((s) => s.settings.threshold);
  const connected = useFocusStore((s) => s.deviceStatus.connected);
  const isClickThrough = useFocusStore((s) => s.isClickThrough);
  const toggleClickThrough = useFocusStore((s) => s.toggleClickThrough);
  const setActiveTab = useFocusStore((s) => s.setActiveTab);
  const setViewMode = useFocusStore((s) => s.setViewMode);
  const hudCorner = useFocusStore((s) => s.hudCorner);
  const cycleHudCorner = useFocusStore((s) => s.cycleHudCorner);
  const isPaused = useFocusStore((s) => s.isPaused);
  const togglePause = useFocusStore((s) => s.togglePause);
  const activePreset = useFocusStore((s) => s.activePreset);
  const setPreset = useFocusStore((s) => s.setPreset);

  const isConcentration = mode === 'concentration';
  const isSimulator = deviceSource === 'simulator';
  const isStreamActive = isSimulator || connected;

  const isBelowThreshold = isStreamActive && isContactOk && roundedScore < threshold;
  const qualityMap = { t3: qt3, t4: qt4, o1: qo1, o2: qo2 };

  const cornerClass =
    hudCorner === 'bottom-right'
      ? 'bottom-4 right-4'
      : hudCorner === 'bottom-left'
      ? 'bottom-4 left-4'
      : hudCorner === 'top-left'
      ? 'top-4 left-4'
      : 'top-4 right-4';

  return (
    <div className={`fixed ${cornerClass} z-50 select-none`}>
      <div
        className="w-[268px] rounded-md bg-[#ffffff]/96 border border-[rgba(17,24,39,0.18)] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] text-[#111827]"
        data-tauri-drag-region
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-[#111827]">
            {isConcentration ? 'Концентрация β' : 'Релаксация α'}
          </span>

          <div className="flex items-center gap-0.5">
            {isSimulator && (
              <button
                onClick={() => togglePause()}
                title={isPaused ? 'Пуск (Space)' : 'Пауза (Space)'}
                className="w-6 h-6 rounded inline-flex items-center justify-center text-[#6b7487] hover:text-[#111827] hover:bg-[#eceff4] cursor-pointer"
              >
                {isPaused ? <Play size={13} strokeWidth={1.5} /> : <Pause size={13} strokeWidth={1.5} />}
              </button>
            )}
            <button
              onClick={() => cycleHudCorner()}
              title="Угол экрана"
              className="w-6 h-6 rounded inline-flex items-center justify-center text-[#6b7487] hover:text-[#111827] hover:bg-[#eceff4] cursor-pointer"
            >
              <Move size={13} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => {
                setActiveTab('calibration');
                setViewMode('dashboard');
              }}
              title="Параметры БОС"
              className="w-6 h-6 rounded inline-flex items-center justify-center text-[#6b7487] hover:text-[#111827] hover:bg-[#eceff4] cursor-pointer"
            >
              <Sliders size={13} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              title="Развернуть окно"
              className="w-6 h-6 rounded inline-flex items-center justify-center text-[#6b7487] hover:text-[#111827] hover:bg-[#eceff4] cursor-pointer"
            >
              <Maximize2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-medium font-mono tabular-nums ${
                !isStreamActive || !isContactOk
                  ? 'text-[#6b7487]'
                  : isBelowThreshold
                  ? 'text-[#dc2626]'
                  : 'text-[#1d5bbf]'
              }`}
            >
              {isStreamActive && isContactOk ? `${roundedScore}%` : '—'}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[#6b7487]">
              / {threshold}%
            </span>
          </div>

          <span className="text-[11px] font-mono text-[#6b7487]">
            {!isStreamActive
              ? 'нет связи'
              : !isContactOk
              ? 'обрыв'
              : isArtifactFrozen
              ? 'артефакт'
              : isBelowThreshold
              ? `затемн. ${roundedOpacityPct}%`
              : 'норма'}
          </span>
        </div>

        {/* Шкала текущего индекса с засечкой порога */}
        <div className="relative h-1.5 bg-[#dfe3eb] rounded-sm mb-2.5 overflow-visible">
          <div
            className={`h-full rounded-sm transition-[width,background-color] duration-150 ${
              isBelowThreshold ? 'bg-[#dc2626]' : 'bg-[#1d5bbf]'
            }`}
            style={{
              width: `${
                isStreamActive && isContactOk ? Math.max(2, Math.min(100, roundedScore)) : 0
              }%`,
            }}
          />
          <div
            className="absolute -top-1 -bottom-1 w-[1.5px] bg-[#111827]"
            style={{ left: `${threshold}%` }}
            title={`Порог: ${threshold}%`}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[rgba(17,24,39,0.10)] text-[11px]">
          <div className="flex items-center gap-2 font-mono">
            {(['t3', 't4', 'o1', 'o2'] as const).map((ch) => {
              const ok = isStreamActive ? qualityMap[ch] : false;
              return (
                <span
                  key={ch}
                  className={ok ? 'text-[#15803d]' : 'text-[#dc2626] line-through'}
                >
                  {ch.toUpperCase()}
                </span>
              );
            })}
          </div>

          <button
            onClick={() => toggleClickThrough()}
            className={`h-6 px-2 rounded inline-flex items-center gap-1 border text-[11px] cursor-pointer ${
              isClickThrough
                ? 'bg-[#1d5bbf] text-white border-[#1d5bbf]'
                : 'bg-[#f8f9fb] text-[#4b5565] hover:text-[#111827] border-[rgba(17,24,39,0.14)]'
            }`}
            title="Пропускать клики сквозь окно (Ctrl+Shift+G)"
          >
            <MousePointerClick size={12} strokeWidth={1.5} />
            <span>{isClickThrough ? 'Сквозной' : 'Окно'}</span>
          </button>
        </div>

        {isSimulator && (
          <div className="mt-2 pt-1.5 border-t border-[rgba(17,24,39,0.08)] flex items-center justify-between text-[11px]">
            <span className="text-[#6b7487]">Режим:</span>
            <div className="flex items-center gap-1">
              {(
                [
                  { k: '1', p: 'high_focus', t: 'Фокус' },
                  { k: '2', p: 'calm_flow', t: 'Поток' },
                  { k: '3', p: 'attention_drift', t: 'Спад' },
                  { k: '5', p: 'meditation', t: 'Альфа' },
                ] as const
              ).map((item) => (
                <button
                  key={item.k}
                  type="button"
                  onClick={() => setPreset(item.p)}
                  title={item.t}
                  className={`px-1.5 h-5 rounded text-[11px] font-mono border cursor-pointer ${
                    activePreset === item.p
                      ? 'bg-[#1d5bbf] text-white border-[#1d5bbf]'
                      : 'bg-[#f8f9fb] text-[#4b5565] border-[rgba(17,24,39,0.14)]'
                  }`}
                >
                  {item.k}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
