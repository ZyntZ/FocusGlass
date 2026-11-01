import React from 'react';
import { useFocusStore } from '../../stores/useFocusStore';
import { GlassSlider } from '../glass/GlassSlider';

export const BiofeedbackConfig: React.FC = () => {
  const settings = useFocusStore((s) => s.settings);
  const updateSettings = useFocusStore((s) => s.updateSettings);

  return (
    <div className="bg-[#ffffff] border border-[rgba(17,24,39,0.12)] rounded-md overflow-hidden">
      <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex items-center justify-between">
        <span className="text-xs font-medium text-[#111827]">Параметры контура БОС</span>
        <span className="text-[11px] font-mono text-[#6b7487]">250 Гц · скользящее окно</span>
      </div>

      <div className="px-4 divide-y divide-[rgba(17,24,39,0.08)]">
        {/* Выбор целевого ритма */}
        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4 py-3">
          <span className="sm:col-span-5 text-[13px] text-[#111827]">Целевой ритм тренинга</span>
          <div className="sm:col-span-7 flex justify-end">
            <div className="inline-flex rounded-[5px] border border-[rgba(17,24,39,0.14)] bg-[#f8f9fb] p-0.5">
              <button
                type="button"
                onClick={() => updateSettings({ mode: 'concentration' })}
                className={`px-3 h-7 rounded-[4px] text-xs transition-colors duration-120 cursor-pointer ${
                  settings.mode === 'concentration'
                    ? 'bg-[#ffffff] text-[#111827] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#6b7487] hover:text-[#111827]'
                }`}
              >
                Концентрация (β 14–30 Гц)
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ mode: 'relaxation' })}
                className={`px-3 h-7 rounded-[4px] text-xs transition-colors duration-120 cursor-pointer ${
                  settings.mode === 'relaxation'
                    ? 'bg-[#ffffff] text-[#111827] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#6b7487] hover:text-[#111827]'
                }`}
              >
                Релаксация (α 8–13 Гц)
              </button>
            </div>
          </div>
        </div>

        <GlassSlider
          label="Порог срабатывания БОС"
          value={settings.threshold}
          min={20}
          max={90}
          step={5}
          unit="%"
          accentColor="orange"
          onChange={(val) => updateSettings({ threshold: val })}
        />

        <GlassSlider
          label="Окно скользящего сглаживания"
          value={settings.sensitivitySeconds}
          min={0.5}
          max={5.0}
          step={0.5}
          unit=" с"
          accentColor="cyan"
          onChange={(val) => updateSettings({ sensitivitySeconds: val })}
        />

        <GlassSlider
          label="Предельное затемнение экрана"
          value={Math.round(settings.dimmingMaxOpacity * 100)}
          min={10}
          max={95}
          step={5}
          unit="%"
          accentColor="cyan"
          onChange={(val) => updateSettings({ dimmingMaxOpacity: val / 100 })}
        />

        <GlassSlider
          label="Радиус размытия периферии"
          value={settings.blurRadius}
          min={0}
          max={32}
          step={2}
          unit=" пкс"
          accentColor="cyan"
          onChange={(val) => updateSettings({ blurRadius: val })}
        />

        <label className="grid grid-cols-12 items-center gap-4 py-3 cursor-pointer">
          <span className="col-span-8 text-[13px] text-[#111827]">
            Аудиоканал БОС (модуляция розового шума ниже порога)
          </span>
          <div className="col-span-4 flex justify-end">
            <input
              type="checkbox"
              checked={settings.audioFeedbackEnabled}
              onChange={(e) => updateSettings({ audioFeedbackEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#1d5bbf] cursor-pointer"
            />
          </div>
        </label>
      </div>
    </div>
  );
};
