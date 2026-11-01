import React from 'react';
import {
  MousePointerClick,
  Minimize2,
  X,
  Minus,
  Pin,
} from 'lucide-react';
import { useFocusStore } from './stores/useFocusStore';
import { GlassButton } from './components/glass/GlassButton';
import { BentoMetricGrid } from './components/dashboard/BentoMetricGrid';
import { SessionAnalyticsView } from './components/dashboard/SessionAnalyticsView';
import { FocusBarHUD } from './components/hud/FocusBarHUD';
import { BiofeedbackOverlay } from './components/overlay/BiofeedbackOverlay';
import {
  SettingsModal,
  CalibrationSection,
  ShortcutsSection,
} from './components/settings/SettingsModal';
import { BiofeedbackConfig } from './components/settings/BiofeedbackConfig';
import { DeviceSelector } from './components/settings/DeviceSelector';
import { tauriBridge } from './services/tauriBridge';
import neurotechLogo from './assets/neurotech-logo.png';

const TABS = [
  { id: 'monitor' as const, label: 'Мониторинг' },
  { id: 'analytics' as const, label: 'Журнал сеансов' },
  { id: 'calibration' as const, label: 'Калибровка и БОС' },
  { id: 'settings' as const, label: 'Источник' },
];

export const App: React.FC = () => {
  const viewMode = useFocusStore((s) => s.viewMode);
  const setViewMode = useFocusStore((s) => s.setViewMode);
  const isClickThrough = useFocusStore((s) => s.isClickThrough);
  const toggleClickThrough = useFocusStore((s) => s.toggleClickThrough);
  const isAlwaysOnTop = useFocusStore((s) => s.isAlwaysOnTop);
  const toggleAlwaysOnTop = useFocusStore((s) => s.toggleAlwaysOnTop);
  const activeTab = useFocusStore((s) => s.activeTab);
  const setActiveTab = useFocusStore((s) => s.setActiveTab);
  const settings = useFocusStore((s) => s.settings);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const deviceStatus = useFocusStore((s) => s.deviceStatus);
  const csvReplayActive = useFocusStore((s) => s.csvReplay.active);
  const sessionHistoryCount = useFocusStore((s) => s.sessionHistory.length);
  const isPaused = useFocusStore((s) => s.isPaused);
  const activeSensorsCount = useFocusStore((s) => {
    const active = s.settings.deviceSource === 'simulator' || s.deviceStatus.connected;
    if (!active) return 0;
    const q = s.telemetry?.signalQuality;
    if (!q) return 4;
    return [q.t3, q.t4, q.o1, q.o2].filter(Boolean).length;
  });

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  React.useEffect(() => {
    if (!isTauri) return;
    const unlisteners: Array<() => void> = [];
    let cancelled = false;

    import('@tauri-apps/api/event').then(async ({ listen }) => {
      const u1 = await listen('click-through-disabled', () => {
        useFocusStore.setState({ isClickThrough: false });
      });
      const u2 = await listen('tray-open-dashboard', () => {
        useFocusStore.setState({ viewMode: 'dashboard', isClickThrough: false });
      });
      const u3 = await listen('tray-open-hud', () => {
        useFocusStore.setState({ viewMode: 'hud' });
      });
      if (cancelled) {
        u1();
        u2();
        u3();
      } else {
        unlisteners.push(u1, u2, u3);
      }
    });

    return () => {
      cancelled = true;
      unlisteners.forEach((fn) => fn());
    };
  }, [isTauri]);

  const isSimulator = settings.deviceSource === 'simulator';
  const isBleConnected = !isSimulator && deviceStatus.connected;
  const isStreamActive = isSimulator || isBleConnected;

  const currentTab =
    activeTab === 'analytics' || activeTab === 'calibration' || activeTab === 'settings'
      ? activeTab
      : 'monitor';

  if (viewMode === 'hud') {
    return (
      <div
        className={`min-h-screen w-full relative font-sans ${
          isTauri ? 'bg-transparent' : 'bg-[#f5f7fa]'
        }`}
      >
        <BiofeedbackOverlay />
        <FocusBarHUD />
        <SettingsModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f5f7fa] text-[#111827] font-sans relative">
      {/* Верхняя панель прибора */}
      <header
        className="relative z-10 h-11 px-4 bg-[#ffffff] border-b border-[rgba(17,24,39,0.12)] flex items-center justify-between gap-4 shrink-0"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-4 min-w-0 h-full">
          <div className="flex items-center gap-2.5 shrink-0" data-tauri-drag-region>
            <span className="text-sm font-semibold tracking-[-0.01em] text-[#111827]">
              FocusGlass
            </span>
            <span className="h-3.5 w-px bg-[rgba(17,24,39,0.14)] hidden sm:inline-block" />
            <img
              src={neurotechLogo}
              alt="НМФ Нейротех"
              className="h-4 object-contain hidden sm:block"
            />
          </div>

          {/* Переключатель вкладок */}
          <nav className="flex items-center h-full gap-1 overflow-x-auto ml-1">
            {TABS.map((tab) => {
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-full px-2.5 text-xs border-b-2 transition-colors duration-120 cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                    active
                      ? 'border-[#1d5bbf] text-[#111827] font-medium'
                      : 'border-transparent text-[#6b7487] hover:text-[#111827]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id === 'analytics' && sessionHistoryCount > 0 && (
                    <span className="font-mono tabular-nums text-[11px] text-[#6b7487]">
                      {sessionHistoryCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Статус потока и управление режимом */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden xl:inline-flex items-center gap-2 text-[11px] font-mono tabular-nums text-[#4b5565]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !isStreamActive
                  ? 'bg-[#dc2626]'
                  : isPaused && isSimulator
                  ? 'bg-[#6b7487]'
                  : 'bg-[#15803d]'
              }`}
            />
            {!isStreamActive
              ? 'BLE откл.'
              : csvReplayActive
              ? 'CSV 250 Гц'
              : isSimulator
              ? 'Сим 250 Гц'
              : 'BLE 250 Гц'}{' '}
            · {activeSensorsCount}/4 электр.
          </span>

          <div className="hidden md:inline-flex items-center rounded-[5px] border border-[rgba(17,24,39,0.14)] bg-[#f8f9fb] p-0.5">
            <button
              type="button"
              onClick={() => updateSettings({ mode: 'concentration' })}
              className={`px-2 h-6 rounded-[4px] text-xs transition-colors duration-120 cursor-pointer ${
                settings.mode === 'concentration'
                  ? 'bg-[#ffffff] text-[#111827] font-medium shadow-[0_1px_1px_rgba(0,0,0,0.06)]'
                  : 'text-[#6b7487] hover:text-[#111827]'
              }`}
            >
              β Фокус
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ mode: 'relaxation' })}
              className={`px-2 h-6 rounded-[4px] text-xs transition-colors duration-120 cursor-pointer ${
                settings.mode === 'relaxation'
                  ? 'bg-[#ffffff] text-[#111827] font-medium shadow-[0_1px_1px_rgba(0,0,0,0.06)]'
                  : 'text-[#6b7487] hover:text-[#111827]'
              }`}
            >
              α Покой
            </button>
          </div>

          <GlassButton
            size="sm"
            variant="primary"
            onClick={() => setViewMode('hud')}
            icon={<Minimize2 size={13} strokeWidth={1.5} />}
          >
            Оверлей HUD
          </GlassButton>

          {isTauri && (
            <div className="flex items-center gap-1 pl-2 border-l border-[rgba(17,24,39,0.12)]">
              <button
                type="button"
                onClick={() => toggleClickThrough()}
                title="Сквозной клик (Ctrl+Shift+G)"
                className={`w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer ${
                  isClickThrough
                    ? 'bg-[#1d5bbf] text-white'
                    : 'text-[#6b7487] hover:text-[#111827] hover:bg-[#eceff4]'
                }`}
              >
                <MousePointerClick size={14} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => toggleAlwaysOnTop()}
                title="Поверх всех окон"
                className={`w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer ${
                  isAlwaysOnTop
                    ? 'bg-[#eceff4] text-[#1d5bbf]'
                    : 'text-[#6b7487] hover:text-[#111827] hover:bg-[#eceff4]'
                }`}
              >
                <Pin size={14} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => tauriBridge.minimizeWindow()}
                title="Свернуть"
                className="w-7 h-7 rounded inline-flex items-center justify-center text-[#6b7487] hover:text-[#111827] hover:bg-[#eceff4] cursor-pointer"
              >
                <Minus size={14} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => tauriBridge.closeWindow()}
                title="Закрыть"
                className="w-7 h-7 rounded inline-flex items-center justify-center text-[#6b7487] hover:text-[#dc2626] hover:bg-[#fef2f2] cursor-pointer"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Рабочая область */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0">
        {currentTab === 'monitor' ? (
          <BentoMetricGrid />
        ) : currentTab === 'analytics' ? (
          <SessionAnalyticsView />
        ) : currentTab === 'calibration' ? (
          <div className="p-5 max-w-3xl w-full mx-auto space-y-4">
            <CalibrationSection />
            <BiofeedbackConfig />
          </div>
        ) : (
          <div className="p-5 max-w-3xl w-full mx-auto space-y-4">
            <DeviceSelector />
            <ShortcutsSection />
          </div>
        )}
      </main>

      <SettingsModal />
    </div>
  );
};

export default App;
