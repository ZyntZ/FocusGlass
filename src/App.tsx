import React from 'react';
import {
  MousePointerClick,
  Minimize2,
  X,
  Minus,
  Pin,
  Activity,
  Sliders,
  BarChart3,
} from 'lucide-react';
import { useFocusStore } from './stores/useFocusStore';
import { GlassPanel } from './components/glass/GlassPanel';
import { GlassButton } from './components/glass/GlassButton';
import { GlassBadge } from './components/glass/GlassBadge';
import { BentoMetricGrid } from './components/dashboard/BentoMetricGrid';
import { SessionAnalyticsView } from './components/dashboard/SessionAnalyticsView';
import { FocusBarHUD } from './components/hud/FocusBarHUD';
import { BiofeedbackOverlay } from './components/overlay/BiofeedbackOverlay';
import { SettingsModal } from './components/settings/SettingsModal';
import { tauriBridge } from './services/tauriBridge';

import neurotechLogo from './assets/neurotech-logo.png';
import brainbitIcon from './assets/brainbit-icon.png';

export const App: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    isClickThrough,
    toggleClickThrough,
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    setIsSettingsOpen,
    activeTab,
    setActiveTab,
    settings,
    deviceStatus,
    csvReplay,
    telemetry,
    isPaused,
  } = useFocusStore();

  // Синхронизация событий от глобального хоткея Ctrl+Shift+G и системного трея Windows
  React.useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
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
  }, []);

  const isSimulator = settings.deviceSource === 'simulator';
  const isBleConnected = !isSimulator && deviceStatus.connected;

  const quality = telemetry?.signalQuality ?? { t3: true, t4: true, o1: true, o2: true };
  const activeSensorsCount = isSimulator || isBleConnected
    ? [quality.t3, quality.t4, quality.o1, quality.o2].filter(Boolean).length
    : 0;

  return (
    <div className="min-h-screen w-full relative flex flex-col font-sans overflow-x-hidden">
      {/* Background Ambient Biofeedback Screen Overlay */}
      <BiofeedbackOverlay />

      {/* Floating HUD View (Minimalist "Шкала-столбик" Over Active Desktop) */}
      {viewMode === 'hud' ? (
        <FocusBarHUD />
      ) : (
        /* Full Dashboard View */
        <div className="relative z-10 flex flex-col flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-4">
          {/* Top Liquid Glass App Bar */}
          <GlassPanel
            variant="primary"
            className="px-5 py-3.5 flex items-center justify-between shadow-xl border-white/20"
            data-tauri-drag-region
          >
            {/* Left: Branding & Logos */}
            <div className="flex items-center gap-4" data-tauri-drag-region>
              <div className="flex items-center gap-2.5">
                <img
                  src={brainbitIcon}
                  alt="BrainBit"
                  className="w-8 h-8 rounded-xl object-contain shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-extrabold tracking-tight text-white">
                      FocusGlass
                    </h1>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-[#FF6600] font-mono font-semibold">
                      v0.2-MVP
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>BrainBit Biofeedback</span>
                    <span>•</span>
                    <span className="text-slate-300 font-medium">ООО НМФ «Нейротех»</span>
                  </div>
                </div>
              </div>

              {/* Partner Neurotech Logo */}
              <div className="hidden sm:flex items-center pl-4 border-l border-white/10">
                <img
                  src={neurotechLogo}
                  alt="Нейротех"
                  className="h-5 object-contain opacity-80 hover:opacity-100 transition-opacity"
                />
              </div>
            </div>

            {/* Center: Device Badge */}
            <div className="hidden md:flex items-center gap-2">
              {isSimulator ? (
                csvReplay.active ? (
                  <GlassBadge variant="cyan" pulse={!isPaused}>
                    CSV Replay · 250 Hz
                  </GlassBadge>
                ) : (
                  <GlassBadge variant="orange" pulse={!isPaused}>
                    Simulator · 250 Hz
                  </GlassBadge>
                )
              ) : isBleConnected ? (
                <GlassBadge variant="cyan" pulse={true}>
                  BrainBit BLE · Connected
                </GlassBadge>
              ) : (
                <GlassBadge variant="red" pulse={false}>
                  BrainBit BLE · Disconnected
                </GlassBadge>
              )}

              <GlassBadge variant="neutral">
                {settings.mode === 'concentration'
                  ? 'Focus Training (Beta)'
                  : 'Calm Training (Alpha)'}
              </GlassBadge>
            </div>

            {/* Right: Window & Mode Controls */}
            <div className="flex items-center gap-2">
              {/* Switch to Minimal HUD */}
              <GlassButton
                size="sm"
                variant="primary"
                onClick={() => setViewMode('hud')}
                icon={<Minimize2 className="w-3.5 h-3.5" />}
                title="Switch to Floating Screen Overlay HUD"
              >
                Floating HUD
              </GlassButton>

              {/* Click-Through Toggle */}
              <GlassButton
                size="sm"
                variant={isClickThrough ? 'cyan' : 'secondary'}
                onClick={() => toggleClickThrough()}
                icon={<MousePointerClick className="w-3.5 h-3.5" />}
                title="Toggle Click-Through Mode (Ctrl+Shift+G to restore)"
              >
                {isClickThrough ? 'Click-Thru' : 'Interactive'}
              </GlassButton>

              {/* Pin Window Always On Top */}
              <button
                onClick={() => toggleAlwaysOnTop()}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isAlwaysOnTop
                    ? 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Always on Top"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              {/* Settings Trigger */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title="Open Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {/* Window Minimize & Close for Tauri */}
              <div className="hidden sm:flex items-center pl-2 ml-1 border-l border-white/10 gap-1">
                <button
                  onClick={() => tauriBridge.minimizeWindow()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Minimize"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => tauriBridge.closeWindow()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </GlassPanel>

          {/* Main Dashboard View Switcher */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-950/50 border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setActiveTab('monitor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab !== 'analytics'
                    ? 'bg-[#FF6600]/25 text-white border border-[#FF6600]/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#FF6600]" />
                Live Monitor
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-[#00D2FF]/20 text-white border border-[#00D2FF]/45 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#00D2FF]" />
                Session Analytics
              </button>
            </div>
          </div>

          {/* Main Dashboard Content */}
          <main className="flex-1">
            {activeTab === 'analytics' ? <SessionAnalyticsView /> : <BentoMetricGrid />}
          </main>

          {/* Bottom Status Ribbon */}
          <footer className="py-2 px-4 rounded-xl bg-slate-950/40 border border-white/5 backdrop-blur-md flex flex-wrap items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              {isSimulator ? (
                <span className="flex items-center gap-1.5 text-amber-300 font-mono">
                  <Activity className="w-3 h-3" />
                  {isPaused
                    ? 'Stream Paused'
                    : csvReplay.active
                    ? `250 Hz CSV Replay (${csvReplay.fileName})`
                    : '250 Hz Synthetic Telemetry'}
                </span>
              ) : isBleConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                  <Activity className="w-3 h-3" />
                  250 Hz BrainBit Stream
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400 font-mono">
                  <Activity className="w-3 h-3" />
                  BLE Disconnected (NeuroSDK2 pending)
                </span>
              )}
              <span>•</span>
              <span className={activeSensorsCount === 4 ? 'text-slate-300' : 'text-amber-300'}>
                Contact OK: {activeSensorsCount}/4 (T3, T4, O1, O2)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span>
                {isSimulator
                  ? 'Keys 1-5: Demo Presets · Space: Pause'
                  : 'Ctrl+Shift+G: Exit Click-Through'}
              </span>
              <span>•</span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-[#FF6600] hover:underline cursor-pointer"
              >
                Configure Biofeedback (БОС)
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  );
};

export default App;
