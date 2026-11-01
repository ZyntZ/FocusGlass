import React, { useState } from 'react';
import { X, Play } from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';
import { GlassButton } from '../glass/GlassButton';
import { BiofeedbackConfig } from './BiofeedbackConfig';
import { DeviceSelector } from './DeviceSelector';

export const CalibrationSection: React.FC = () => {
  const settings = useFocusStore((s) => s.settings);
  const deviceStatus = useFocusStore((s) => s.deviceStatus);
  const isCalibrating = useFocusStore((s) => s.isCalibrating);
  const calibrationDurationSeconds = useFocusStore((s) => s.calibrationDurationSeconds);
  const setCalibrationDuration = useFocusStore((s) => s.setCalibrationDuration);
  const calibrationProgress = useFocusStore((s) => s.calibrationProgress);
  const calibrationRemainingSeconds = useFocusStore((s) => s.calibrationRemainingSeconds);
  const calibrationResult = useFocusStore((s) => s.calibrationResult);
  const startCalibration = useFocusStore((s) => s.startCalibration);
  const cancelCalibration = useFocusStore((s) => s.cancelCalibration);
  const applyCalibration = useFocusStore((s) => s.applyCalibration);

  const isStreamReady = settings.deviceSource === 'simulator' || deviceStatus.connected;

  return (
    <div className="bg-[#ffffff] border border-[rgba(17,24,39,0.12)] rounded-md overflow-hidden">
      <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[#111827]">
          Калибровка фоновой линии (отсев ЭОГ/ЭМГ и обрывов)
        </span>

        <div className="inline-flex items-center rounded-[5px] border border-[rgba(17,24,39,0.14)] bg-[#ffffff] overflow-hidden">
          {([10, 30] as const).map((sec) => (
            <button
              key={sec}
              type="button"
              disabled={isCalibrating}
              onClick={() => setCalibrationDuration(sec)}
              className={`px-2 h-6 text-[11px] font-mono tabular-nums transition-colors duration-120 cursor-pointer border-r last:border-r-0 border-[rgba(17,24,39,0.10)] disabled:opacity-40 ${
                calibrationDurationSeconds === sec
                  ? 'bg-[#eceff4] text-[#111827] font-medium'
                  : 'text-[#6b7487] hover:text-[#111827]'
              }`}
            >
              {sec} с
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {!isStreamReady && (
          <p className="text-xs text-[#dc2626]">
            Нет входного сигнала. Подключите BrainBit BLE или включите генератор на вкладке «Источник»
          </p>
        )}

        {isCalibrating ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#111827]">Запись фона — сохраняйте спокойную позу</span>
              <span className="font-mono tabular-nums text-[#4b5565]">
                осталось {calibrationRemainingSeconds} с ({calibrationProgress}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#eceff4] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1d5bbf] transition-[width] duration-150"
                style={{ width: `${calibrationProgress}%` }}
              />
            </div>
            <div className="flex justify-end">
              <GlassButton size="sm" variant="ghost" onClick={() => cancelCalibration()}>
                Отменить
              </GlassButton>
            </div>
          </div>
        ) : calibrationResult ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[rgba(17,24,39,0.10)] border border-[rgba(17,24,39,0.10)] rounded text-xs">
              <div className="p-2.5">
                <span className="text-[#6b7487] block">Фон β</span>
                <span className="text-base font-medium font-mono tabular-nums text-[#111827]">
                  {calibrationResult.baselineFocus}%
                </span>
              </div>
              <div className="p-2.5">
                <span className="text-[#6b7487] block">Фон α</span>
                <span className="text-base font-medium font-mono tabular-nums text-[#111827]">
                  {calibrationResult.baselineRelaxation}%
                </span>
              </div>
              <div className="p-2.5">
                <span className="text-[#6b7487] block">Расчётный порог</span>
                <span className="text-base font-medium font-mono tabular-nums text-[#1d5bbf]">
                  {calibrationResult.recommendedThreshold}%
                </span>
              </div>
              <div className="p-2.5">
                <span className="text-[#6b7487] block">Чистых эпох</span>
                <span className="text-base font-medium font-mono tabular-nums text-[#111827]">
                  {calibrationResult.sampleCount ?? 0}
                </span>
              </div>
            </div>

            {calibrationResult.baselineSpectrum && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4b5565] font-mono tabular-nums">
                <span className="font-sans text-[#6b7487]">Спектр покоя K_calib:</span>
                <span>
                  θ {calibrationResult.baselineSpectrum.theta.toFixed(1)}% · α{' '}
                  {calibrationResult.baselineSpectrum.alpha.toFixed(1)}% · β{' '}
                  {calibrationResult.baselineSpectrum.beta.toFixed(1)}%
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <GlassButton
                size="sm"
                variant="secondary"
                disabled={!isStreamReady}
                onClick={() => startCalibration()}
              >
                Перезаписать ({calibrationDurationSeconds} с)
              </GlassButton>
              <GlassButton
                size="sm"
                variant="primary"
                disabled={(calibrationResult.sampleCount ?? 0) === 0}
                onClick={() => applyCalibration()}
              >
                Применить порог {calibrationResult.recommendedThreshold}%
              </GlassButton>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-[#4b5565]">
              Вычисляет персональное среднее, СКО и коэффициент K_calib по чистому сигналу
            </span>
            <GlassButton
              variant="primary"
              size="sm"
              disabled={!isStreamReady}
              onClick={() => startCalibration()}
              icon={<Play size={13} strokeWidth={1.5} />}
            >
              Запустить ({calibrationDurationSeconds} с)
            </GlassButton>
          </div>
        )}
      </div>
    </div>
  );
};

export const ShortcutsSection: React.FC = () => {
  const rows = [
    { key: '1', title: 'Глубокий фокус', desc: 'β-доминирование (~92%), чистый экран' },
    { key: '2', title: 'Рабочий поток', desc: 'баланс α/β (~78%)' },
    { key: '3', title: 'Спад внимания', desc: 'просадка индекса (~42%), проверка затемнения' },
    { key: '4', title: 'Артефакт ЭОГ (240 мс)', desc: 'заморозка прозрачности на время помехи' },
    { key: '5', title: 'Альфа-релаксация', desc: 'затылочный α-ритм 8–13 Гц (~94%)' },
    { key: 'Space', title: 'Пауза / пуск', desc: 'остановка синтетического генератора' },
    { key: 'Ctrl+Shift+G', title: 'Снять сквозной клик', desc: 'глобальная клавиша возврата окна в Tauri' },
  ];

  return (
    <div className="bg-[#ffffff] border border-[rgba(17,24,39,0.12)] rounded-md overflow-hidden">
      <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex items-center">
        <span className="text-xs font-medium text-[#111827]">Горячие клавиши</span>
      </div>

      <table className="w-full text-xs border-collapse">
        <tbody className="divide-y divide-[rgba(17,24,39,0.08)]">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="py-2 px-4 w-32">
                <kbd className="kbd-cap">{r.key}</kbd>
              </td>
              <td className="py-2 px-3 text-[#111827] font-medium">{r.title}</td>
              <td className="py-2 px-4 text-[#6b7487] text-right">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const SettingsModal: React.FC = () => {
  const isSettingsOpen = useFocusStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useFocusStore((s) => s.setIsSettingsOpen);
  const [tab, setTab] = useState<'bci' | 'calibration' | 'device' | 'hotkeys'>('bci');

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-lg bg-[#f5f7fa] border border-[rgba(17,24,39,0.18)] shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
        <div className="h-10 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#ffffff] flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-[#111827]">Параметры FocusGlass</span>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="w-7 h-7 rounded inline-flex items-center justify-center text-[#6b7487] hover:text-[#111827] hover:bg-[#eceff4] cursor-pointer"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex border-b border-[rgba(17,24,39,0.10)] px-4 gap-4 bg-[#ffffff] shrink-0">
          {[
            { id: 'bci' as const, label: 'Контур БОС' },
            { id: 'calibration' as const, label: 'Калибровка' },
            { id: 'device' as const, label: 'Источник' },
            { id: 'hotkeys' as const, label: 'Клавиши' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2 text-xs border-b-2 transition-colors duration-120 cursor-pointer ${
                tab === t.id
                  ? 'border-[#1d5bbf] text-[#111827] font-medium'
                  : 'border-transparent text-[#6b7487] hover:text-[#111827]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto grow">
          {tab === 'bci' && <BiofeedbackConfig />}
          {tab === 'calibration' && <CalibrationSection />}
          {tab === 'device' && <DeviceSelector />}
          {tab === 'hotkeys' && <ShortcutsSection />}
        </div>
      </div>
    </div>
  );
};
