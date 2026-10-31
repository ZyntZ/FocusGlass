import React, { useRef, useState } from 'react';
import {
  Bluetooth,
  Radio,
  BatteryCharging,
  RefreshCw,
  Smartphone,
  AlertTriangle,
  FileSpreadsheet,
  Upload,
  Square,
  Download,
} from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';
import { tauriBridge } from '../../services/tauriBridge';
import type { DiscoveredBrainBitDevice } from '../../services/eegTypes';
import { GlassButton } from '../glass/GlassButton';
import { GlassBadge } from '../glass/GlassBadge';

export const DeviceSelector: React.FC = () => {
  const {
    settings,
    updateSettings,
    deviceStatus,
    csvReplay,
    loadCsvReplay,
    stopCsvReplay,
    exportRawEegCsv,
    telemetry,
  } = useFocusStore();

  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredBrainBitDevice[]>([]);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const res = await tauriBridge.scanBrainBitDevices();
      setDiscoveredDevices(res.devices);
      setScanMessage(res.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCsvError(null);
    try {
      const text = await file.text();
      loadCsvReplay(file.name, text);
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'Failed to parse EEG CSV file.');
    }
  };

  const isSimulator = settings.deviceSource === 'simulator';
  const isBleConnected = !isSimulator && deviceStatus.connected;

  return (
    <div className="space-y-4">
      {/* Device Mode Toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setScanMessage(null);
            updateSettings({ deviceSource: 'simulator' });
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            isSimulator
              ? 'bg-[#FF6600]/15 border-[#FF6600]/50 shadow-[0_0_16px_rgba(255,102,0,0.25)]'
              : 'bg-white/5 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#FF6600]" />{' '}
              {csvReplay.active ? 'CSV Dataset Replay' : 'Synthetic Simulator'}
            </span>
            {isSimulator && (
              <GlassBadge variant={csvReplay.active ? 'cyan' : 'orange'}>
                {csvReplay.active ? 'Replay' : 'Active'}
              </GlassBadge>
            )}
          </div>
          <p className="text-[11px] text-slate-300">
            250 Hz offline stream (synthetic rhythms or recorded 4-channel EEG dataset).
          </p>
        </button>

        <button
          onClick={() => updateSettings({ deviceSource: 'bluetooth' })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            !isSimulator
              ? 'bg-[#00D2FF]/15 border-[#00D2FF]/50 shadow-[0_0_16px_rgba(0,210,255,0.25)]'
              : 'bg-white/5 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Bluetooth className="w-3.5 h-3.5 text-[#00D2FF]" /> Physical BrainBit BLE
            </span>
            {!isSimulator && (
              <GlassBadge variant={isBleConnected ? 'cyan' : 'red'}>
                {isBleConnected ? 'Connected' : 'No Signal'}
              </GlassBadge>
            )}
          </div>
          <p className="text-[11px] text-slate-300">
            Hardware transport via NeuroSDK2 + EmotionalMath (4 dry channels: T3, T4, O1, O2).
          </p>
        </button>
      </div>

      {/* Connection & BLE Status Card */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-white">Active Source Status</span>
          </div>
          <div className="flex items-center gap-2">
            {isSimulator ? (
              csvReplay.active ? (
                <>
                  <span className="text-xs text-cyan-300 font-mono">DATASET</span>
                  <GlassBadge variant="cyan">CSV Replay</GlassBadge>
                </>
              ) : (
                <>
                  <span className="text-xs text-amber-300 font-mono">VIRTUAL</span>
                  <GlassBadge variant="orange">Simulated</GlassBadge>
                </>
              )
            ) : isBleConnected ? (
              <>
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                  <BatteryCharging className="w-3.5 h-3.5" /> {deviceStatus.batteryPercentage}%
                </span>
                <GlassBadge variant="green">Connected</GlassBadge>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-500 font-mono">Battery: —</span>
                <GlassBadge variant="red">Disconnected</GlassBadge>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-slate-400">Source</span>
            <span className="font-mono text-white truncate max-w-[260px]">
              {deviceStatus.deviceName}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-slate-400">Target Sampling Rate</span>
            <span className="font-mono text-white">
              {deviceStatus.samplingRateHz} Hz (4 ms packet)
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-slate-400">Montage (10-20)</span>
            <span className="font-mono text-white">
              4 ch (T3, T4, O1, O2 · bipolar O1-T3 / O2-T4)
            </span>
          </div>
        </div>

        {deviceStatus.statusMessage && (
          <div
            className={`mt-3 p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
              isSimulator || isBleConnected
                ? 'bg-white/5 border-white/10 text-slate-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            {!isSimulator && !isBleConnected && (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <span>{deviceStatus.statusMessage}</span>
          </div>
        )}

        {/* BLE Scanning UI */}
        {!isSimulator && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Bluetooth LE Discovery</span>
              <GlassButton
                size="sm"
                variant="secondary"
                onClick={handleScan}
                disabled={isScanning}
                icon={<RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />}
              >
                {isScanning ? 'Checking Adapter...' : 'Scan BrainBit BLE'}
              </GlassButton>
            </div>

            {scanMessage && (
              <p className="text-[11px] text-slate-400 mt-2 p-2 rounded-lg bg-black/30 border border-white/10">
                {scanMessage}
              </p>
            )}

            {discoveredDevices.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {discoveredDevices.map((dev) => (
                  <div
                    key={dev.address}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                  >
                    <div>
                      <span className="font-mono block">{dev.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{dev.address}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Offline EEG Dataset Replay & Raw 250 Hz Export (MNE-Python / BrainBit CSV) */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#00D2FF]" />
            <div>
              <span className="text-xs font-semibold text-white block">
                Recorded EEG Dataset (CSV Replay &amp; MNE Export)
              </span>
              <span className="text-[11px] text-slate-400">
                Stream a 4-channel CSV (T3, T4, O1, O2 in uV or V) through the live 250 Hz DSP
              </span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleCsvFileChange}
            className="hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GlassButton
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Load 4-ch EEG CSV
          </GlassButton>

          {csvReplay.active && (
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => stopCsvReplay()}
              icon={<Square className="w-3 h-3" />}
            >
              Stop Replay (Back to Synth)
            </GlassButton>
          )}

          <GlassButton
            size="sm"
            variant="primary"
            disabled={!telemetry}
            onClick={() => exportRawEegCsv()}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Raw 250 Hz Buffer (.csv)
          </GlassButton>
        </div>

        {csvError && (
          <p className="text-[11px] text-rose-300 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
            {csvError}
          </p>
        )}
      </div>
    </div>
  );
};
