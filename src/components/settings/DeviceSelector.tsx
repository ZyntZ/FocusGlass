import React, { useRef, useState } from 'react';
import { RefreshCw, Upload, Square, Download } from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';
import { tauriBridge } from '../../services/tauriBridge';
import type { DiscoveredBrainBitDevice } from '../../services/eegTypes';
import { GlassButton } from '../glass/GlassButton';

export const DeviceSelector: React.FC = () => {
  const settings = useFocusStore((s) => s.settings);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const deviceStatus = useFocusStore((s) => s.deviceStatus);
  const csvReplay = useFocusStore((s) => s.csvReplay);
  const loadCsvReplay = useFocusStore((s) => s.loadCsvReplay);
  const stopCsvReplay = useFocusStore((s) => s.stopCsvReplay);
  const exportRawEegCsv = useFocusStore((s) => s.exportRawEegCsv);
  const hasTelemetry = useFocusStore((s) => s.telemetry !== null);

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
      setCsvError(err instanceof Error ? err.message : 'Ошибка чтения CSV-файла ЭЭГ');
    }
  };

  const isSimulator = settings.deviceSource === 'simulator';
  const isBleConnected = !isSimulator && deviceStatus.connected;

  const displayDeviceName = (() => {
    const raw = deviceStatus.deviceName;
    if (raw === 'Synthetic EEG Generator (250 Hz)') return 'Синтетический генератор ЭЭГ (250 Гц)';
    if (raw === 'BrainBit BLE (not connected)') return 'BrainBit BLE (не подключено)';
    if (raw.startsWith('CSV Replay: ')) return `Файл CSV: ${raw.slice('CSV Replay: '.length)}`;
    return raw;
  })();

  const displayScanMessage =
    scanMessage && scanMessage.startsWith('NeuroSDK2 BLE transport is not linked')
      ? 'Транспорт Bluetooth LE (NeuroSDK2) недоступен в браузере'
      : scanMessage;

  return (
    <div className="space-y-4">
      <div className="bg-[#ffffff] border border-[rgba(17,24,39,0.12)] rounded-md overflow-hidden">
        <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex items-center justify-between">
          <span className="text-xs font-medium text-[#111827]">Источник сигнала</span>
          <span
            className={`text-[11px] font-mono ${
              isSimulator || isBleConnected ? 'text-[#15803d]' : 'text-[#dc2626]'
            }`}
          >
            {isSimulator
              ? csvReplay.active
                ? 'воспроизведение CSV'
                : 'симуляция 250 Гц'
              : isBleConnected
              ? `BLE · заряд ${deviceStatus.batteryPercentage}%`
              : 'нет соединения'}
          </span>
        </div>

        <div className="px-4 divide-y divide-[rgba(17,24,39,0.08)] text-xs">
          <div className="py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-[#111827]">Режим входа</span>
            <div className="inline-flex rounded-[5px] border border-[rgba(17,24,39,0.14)] bg-[#f8f9fb] p-0.5">
              <button
                type="button"
                onClick={() => {
                  setScanMessage(null);
                  updateSettings({ deviceSource: 'simulator' });
                }}
                className={`px-3 h-7 rounded-[4px] text-xs transition-colors duration-120 cursor-pointer ${
                  isSimulator
                    ? 'bg-[#ffffff] text-[#111827] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#6b7487] hover:text-[#111827]'
                }`}
              >
                Генератор / CSV
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ deviceSource: 'bluetooth' })}
                className={`px-3 h-7 rounded-[4px] text-xs transition-colors duration-120 cursor-pointer ${
                  !isSimulator
                    ? 'bg-[#ffffff] text-[#111827] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#6b7487] hover:text-[#111827]'
                }`}
              >
                BrainBit BLE (NeuroSDK2)
              </button>
            </div>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-4">
            <span className="text-[#6b7487]">Устройство</span>
            <span className="font-mono text-[#111827] truncate max-w-[340px]">
              {displayDeviceName}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-4">
            <span className="text-[#6b7487]">Дискретизация и монтаж</span>
            <span className="font-mono tabular-nums text-[#111827]">
              {deviceStatus.samplingRateHz} Гц · T3, T4, O1, O2 (O1−T3, O2−T4)
            </span>
          </div>

          {!isSimulator && (
            <div className="py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#6b7487]">Поиск гарнитуры по Bluetooth LE</span>
                <GlassButton
                  size="sm"
                  variant="secondary"
                  onClick={handleScan}
                  disabled={isScanning}
                  icon={
                    <RefreshCw
                      size={13}
                      strokeWidth={1.5}
                      className={isScanning ? 'animate-spin' : ''}
                    />
                  }
                >
                  {isScanning ? 'Поиск…' : 'Сканировать эфир'}
                </GlassButton>
              </div>

              {displayScanMessage && (
                <p className="text-xs text-[#6b7487]">{displayScanMessage}</p>
              )}

              {discoveredDevices.map((dev) => (
                <div
                  key={dev.address}
                  className="flex items-center justify-between py-1.5 font-mono text-xs"
                >
                  <span className="text-[#111827]">{dev.name}</span>
                  <span className="text-[#6b7487]">{dev.address}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Импорт и экспорт CSV */}
      <div className="bg-[#ffffff] border border-[rgba(17,24,39,0.12)] rounded-md overflow-hidden">
        <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex items-center justify-between">
          <span className="text-xs font-medium text-[#111827]">Файловый ввод-вывод ЭЭГ (CSV / MNE-Python)</span>
          <span className="text-[11px] font-mono text-[#6b7487]">T3, T4, O1, O2 · мкВ / В</span>
        </div>

        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleCsvFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload size={13} strokeWidth={1.5} />}
            >
              Открыть CSV (4 канала)
            </GlassButton>

            {csvReplay.active && (
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => stopCsvReplay()}
                icon={<Square size={12} strokeWidth={1.5} />}
              >
                Стоп ({csvReplay.fileName})
              </GlassButton>
            )}
          </div>

          <GlassButton
            size="sm"
            variant="secondary"
            disabled={!hasTelemetry}
            onClick={() => exportRawEegCsv()}
            icon={<Download size={13} strokeWidth={1.5} />}
          >
            Выгрузить буфер 250 Гц (.csv)
          </GlassButton>
        </div>

        {csvError && (
          <div className="px-4 pb-3 text-xs text-[#dc2626]">{csvError}</div>
        )}
      </div>
    </div>
  );
};
