import React from 'react';
import { RotateCcw, Download } from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';
import { GlassSlider } from '../glass/GlassSlider';
import { GlassButton } from '../glass/GlassButton';
import { EEGOscilloscope } from './EEGOscilloscope';
import { ElectrodeCard } from './ElectrodeCard';

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const BentoMetricGrid: React.FC = () => {
  const settings = useFocusStore((s) => s.settings);
  const connected = useFocusStore((s) => s.deviceStatus.connected);
  const roundedMetric = useFocusStore((s) => Math.round(s.feedbackState.smoothedMetric));
  const isContactOk = useFocusStore((s) => s.feedbackState.isContactOk);
  const isDimmingActive = useFocusStore((s) => s.feedbackState.isDimmingActive);
  const roundedOpacityPct = useFocusStore((s) => Math.round(s.feedbackState.overlayOpacity * 100));
  const durationWholeSec = useFocusStore((s) => Math.floor(s.sessionStats.durationSeconds));
  const focusWholeSec = useFocusStore((s) => Math.floor(s.sessionStats.timeInFocusSeconds));
  const distractionEventsCount = useFocusStore((s) => s.sessionStats.distractionEventsCount);
  const artifactCount = useFocusStore((s) => s.sessionStats.artifactCount);
  const sessionHistoryCount = useFocusStore((s) => s.sessionHistory.length);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const resetSession = useFocusStore((s) => s.resetSession);
  const exportSessionsCsv = useFocusStore((s) => s.exportSessionsCsv);
  const setActiveTab = useFocusStore((s) => s.setActiveTab);

  const isConcentration = settings.mode === 'concentration';
  const isSimulator = settings.deviceSource === 'simulator';
  const isStreamActive = isSimulator || connected;

  const threshold = settings.threshold;
  const isBelowThreshold = isStreamActive && isContactOk && roundedMetric < threshold;

  const focusRatio =
    durationWholeSec > 0 ? Math.round((focusWholeSec / durationWholeSec) * 100) : 100;

  const canExport = durationWholeSec >= 1 || sessionHistoryCount > 0;
  const displayDimming = isStreamActive && isContactOk && isDimmingActive ? roundedOpacityPct : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Сводная полоса показателей текущего сеанса */}
      <div className="border-b border-[rgba(17,24,39,0.10)] bg-[#ffffff] px-4 py-2 flex flex-wrap items-center justify-between gap-y-2 gap-x-6 shrink-0">
        <div className="flex flex-wrap items-center divide-x divide-[rgba(17,24,39,0.10)] text-xs">
          <div className="pr-4 flex items-baseline gap-2">
            <span className="text-[#6b7487]">
              {isConcentration ? 'Концентрация β' : 'Релаксация α'}
            </span>
            <span
              className={`text-base font-medium font-mono tabular-nums ${
                !isStreamActive || !isContactOk
                  ? 'text-[#6b7487]'
                  : isBelowThreshold
                  ? 'text-[#dc2626]'
                  : 'text-[#1d5bbf]'
              }`}
            >
              {isStreamActive && isContactOk ? `${roundedMetric}%` : '—'}
            </span>
            <span className="font-mono tabular-nums text-[#6b7487]">/ {threshold}%</span>
          </div>

          <div className="px-4 flex items-baseline gap-2">
            <span className="text-[#6b7487]">Затемнение</span>
            <span
              className={`text-sm font-medium font-mono tabular-nums ${
                displayDimming > 0 ? 'text-[#dc2626]' : 'text-[#111827]'
              }`}
            >
              {displayDimming}%
            </span>
          </div>

          <div className="px-4 flex items-baseline gap-2">
            <span className="text-[#6b7487]">Сеанс / в зоне</span>
            <span className="text-sm font-mono tabular-nums text-[#111827]">
              {formatTime(durationWholeSec)}
            </span>
            <span className="font-mono tabular-nums text-[#6b7487]">({focusRatio}%)</span>
          </div>

          <div className="px-4 flex items-baseline gap-2">
            <span className="text-[#6b7487]">Спады</span>
            <span className="text-sm font-mono tabular-nums text-[#111827]">
              {distractionEventsCount}
            </span>
          </div>

          <div className="pl-4 flex items-baseline gap-2">
            <span className="text-[#6b7487]">Артефакты</span>
            <span className="text-sm font-mono tabular-nums text-[#111827]">
              {artifactCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isStreamActive && (
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => updateSettings({ deviceSource: 'simulator' })}
            >
              Включить симулятор
            </GlassButton>
          )}
          <GlassButton
            size="sm"
            variant="secondary"
            disabled={durationWholeSec < 3}
            onClick={() => resetSession(true)}
            icon={<RotateCcw size={13} strokeWidth={1.5} />}
          >
            Сохранить сеанс
          </GlassButton>
          <GlassButton
            size="sm"
            variant="ghost"
            disabled={!canExport}
            onClick={() => exportSessionsCsv()}
            icon={<Download size={13} strokeWidth={1.5} />}
          >
            CSV
          </GlassButton>
        </div>
      </div>

      {/* Основная сетка: осциллограф ЭЭГ + инспектор отведений и БОС */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col border-b lg:border-b-0 lg:border-r border-[rgba(17,24,39,0.10)] min-w-0">
          <EEGOscilloscope />
        </div>

        <aside className="lg:col-span-4 xl:col-span-3 bg-[#ffffff] flex flex-col justify-between">
          <div>
            <ElectrodeCard />

            {/* Оперативные настройки контура БОС */}
            <div>
              <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex items-center justify-between">
                <span className="text-xs font-medium text-[#111827]">Контур БОС</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('calibration')}
                  className="text-[11px] text-[#1d5bbf] hover:underline cursor-pointer"
                >
                  Калибровка →
                </button>
              </div>

              <div className="px-4 py-2.5 divide-y divide-[rgba(17,24,39,0.06)]">
                <GlassSlider
                  compact
                  label="Порог БОС"
                  value={settings.threshold}
                  min={20}
                  max={90}
                  step={5}
                  unit="%"
                  accentColor="orange"
                  onChange={(val) => updateSettings({ threshold: val })}
                />
                <GlassSlider
                  compact
                  label="Сглаживание"
                  value={settings.sensitivitySeconds}
                  min={0.5}
                  max={5.0}
                  step={0.5}
                  unit=" с"
                  accentColor="cyan"
                  onChange={(val) => updateSettings({ sensitivitySeconds: val })}
                />
                <GlassSlider
                  compact
                  label="Макс. затемнение"
                  value={Math.round(settings.dimmingMaxOpacity * 100)}
                  min={10}
                  max={95}
                  step={5}
                  unit="%"
                  accentColor="cyan"
                  onChange={(val) => updateSettings({ dimmingMaxOpacity: val / 100 })}
                />
                <GlassSlider
                  compact
                  label="Размытие"
                  value={settings.blurRadius}
                  min={0}
                  max={32}
                  step={2}
                  unit=" пкс"
                  accentColor="cyan"
                  onChange={(val) => updateSettings({ blurRadius: val })}
                />

                <label className="flex items-center justify-between py-2 text-xs text-[#4b5565] cursor-pointer">
                  <span>Аудиоканал (розовый шум)</span>
                  <input
                    type="checkbox"
                    checked={settings.audioFeedbackEnabled}
                    onChange={(e) =>
                      updateSettings({ audioFeedbackEnabled: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-[#1d5bbf] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
