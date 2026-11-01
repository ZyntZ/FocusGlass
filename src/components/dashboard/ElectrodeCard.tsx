import React from 'react';
import { useFocusStore } from '../../stores/useFocusStore';

export const ElectrodeCard: React.FC = () => {
  const deviceSource = useFocusStore((s) => s.settings.deviceSource);
  const connected = useFocusStore((s) => s.deviceStatus.connected);
  const setElectrodeContact = useFocusStore((s) => s.setElectrodeContact);
  const qt3 = useFocusStore((s) => s.telemetry?.signalQuality.t3 ?? true);
  const qt4 = useFocusStore((s) => s.telemetry?.signalQuality.t4 ?? true);
  const qo1 = useFocusStore((s) => s.telemetry?.signalQuality.o1 ?? true);
  const qo2 = useFocusStore((s) => s.telemetry?.signalQuality.o2 ?? true);
  const rt3 = useFocusStore((s) =>
    s.telemetry?.resistanceKOhm?.t3 != null ? Math.round(s.telemetry.resistanceKOhm.t3) : 134
  );
  const rt4 = useFocusStore((s) =>
    s.telemetry?.resistanceKOhm?.t4 != null ? Math.round(s.telemetry.resistanceKOhm.t4) : 128
  );
  const ro1 = useFocusStore((s) =>
    s.telemetry?.resistanceKOhm?.o1 != null ? Math.round(s.telemetry.resistanceKOhm.o1) : 115
  );
  const ro2 = useFocusStore((s) =>
    s.telemetry?.resistanceKOhm?.o2 != null ? Math.round(s.telemetry.resistanceKOhm.o2) : 121
  );

  const isSimulator = deviceSource === 'simulator';
  const isStreamActive = isSimulator || connected;

  const quality = isStreamActive
    ? { t3: qt3, t4: qt4, o1: qo1, o2: qo2 }
    : { t3: false, t4: false, o1: false, o2: false };

  const resistance = { t3: rt3, t4: rt4, o1: ro1, o2: ro2 };
  const allGood = isStreamActive && quality.t3 && quality.t4 && quality.o1 && quality.o2;

  const formatResistance = (ch: 't3' | 't4' | 'o1' | 'o2', ok: boolean): string => {
    if (!isStreamActive) return '—';
    if (!ok) return '> 2500 кОм';
    return `${resistance[ch]} кОм`;
  };

  const electrodes = [
    { id: 't3' as const, code: 'T3', zone: 'Левый височный', cx: 38, cy: 80, ok: quality.t3 },
    { id: 't4' as const, code: 'T4', zone: 'Правый височный', cx: 142, cy: 80, ok: quality.t4 },
    { id: 'o1' as const, code: 'O1', zone: 'Левый затылочный', cx: 68, cy: 126, ok: quality.o1 },
    { id: 'o2' as const, code: 'O2', zone: 'Правый затылочный', cx: 112, cy: 126, ok: quality.o2 },
  ];

  const handleToggle = (id: 't3' | 't4' | 'o1' | 'o2', currentOk: boolean) => {
    if (isSimulator) {
      setElectrodeContact(id, !currentOk);
    }
  };

  return (
    <div className="border-b border-[rgba(17,24,39,0.10)]">
      <div className="h-9 px-4 border-b border-[rgba(17,24,39,0.10)] bg-[#f8f9fb] flex items-center justify-between">
        <span className="text-xs font-medium text-[#111827]">Импеданс 10–20</span>
        <span
          className={`text-[11px] font-mono tabular-nums ${
            !isStreamActive
              ? 'text-[#6b7487]'
              : allGood
              ? 'text-[#15803d]'
              : 'text-[#dc2626]'
          }`}
        >
          {!isStreamActive ? 'нет связи' : allGood ? '< 1000 кОм' : 'обрыв канала'}
        </span>
      </div>

      <div className="px-4 py-3 bg-[#ffffff]">
        <div className="flex items-center justify-center py-1">
          <svg
            viewBox="0 0 180 154"
            className="w-[164px] h-[140px] select-none"
            aria-label="Схема отведений 10–20"
          >
            <path
              d="M 31 68 C 25 68, 25 92, 31 92"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.2"
            />
            <path
              d="M 149 68 C 155 68, 155 92, 149 92"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.2"
            />

            <path
              d="M 84 21 L 90 11 L 96 21"
              fill="none"
              stroke="#6b7487"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />

            <ellipse
              cx="90"
              cy="80"
              rx="58"
              ry="61"
              fill="#f8f9fb"
              stroke="#9ca3af"
              strokeWidth="1.2"
            />

            <line
              x1="90"
              y1="19"
              x2="90"
              y2="141"
              stroke="rgba(17,24,39,0.08)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <line
              x1="32"
              y1="80"
              x2="148"
              y2="80"
              stroke="rgba(17,24,39,0.08)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />

            {/* Биполярные отведения O1-T3 и O2-T4 */}
            <line
              x1="38"
              y1="80"
              x2="68"
              y2="126"
              stroke={quality.t3 && quality.o1 && isStreamActive ? '#1d5bbf' : '#cbd5e1'}
              strokeOpacity={quality.t3 && quality.o1 && isStreamActive ? '0.45' : '1'}
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />
            <line
              x1="142"
              y1="80"
              x2="112"
              y2="126"
              stroke={quality.t4 && quality.o2 && isStreamActive ? '#1d5bbf' : '#cbd5e1'}
              strokeOpacity={quality.t4 && quality.o2 && isStreamActive ? '0.45' : '1'}
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />

            {/* Референт Fpz */}
            <rect
              x="83"
              y="26"
              width="14"
              height="5"
              rx="1.5"
              fill="#ffffff"
              stroke="#6b7487"
              strokeWidth="1"
            />
            <text
              x="90"
              y="41"
              textAnchor="middle"
              fill="#6b7487"
              fontSize="8"
              fontFamily="IBM Plex Mono, monospace"
            >
              Fpz
            </text>

            {electrodes.map((el) => {
              const stroke = !isStreamActive
                ? '#9ca3af'
                : el.ok
                ? '#15803d'
                : '#dc2626';
              const fill = !isStreamActive
                ? '#ffffff'
                : el.ok
                ? '#f0fdf4'
                : '#fef2f2';
              const textFill = !isStreamActive
                ? '#6b7487'
                : el.ok
                ? '#111827'
                : '#dc2626';

              return (
                <g
                  key={el.id}
                  onClick={() => handleToggle(el.id, el.ok)}
                  className={isSimulator ? 'cursor-pointer' : 'cursor-default'}
                >
                  <circle cx={el.cx} cy={el.cy} r="10.5" fill={fill} stroke={stroke} strokeWidth="1.35" />
                  <text
                    x={el.cx}
                    y={el.cy + 3}
                    textAnchor="middle"
                    fill={textFill}
                    fontSize="8.5"
                    fontWeight="500"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {el.code}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <table className="w-full text-xs border-collapse mt-1">
          <tbody className="divide-y divide-[rgba(17,24,39,0.08)] border-t border-[rgba(17,24,39,0.08)]">
            {electrodes.map((el) => (
              <tr
                key={el.id}
                onClick={() => handleToggle(el.id, el.ok)}
                title={isSimulator ? 'Клик — имитация обрыва контакта' : undefined}
                className={isSimulator ? 'hover:bg-[#f5f7fa] cursor-pointer' : ''}
              >
                <td className="py-1.5 font-mono font-medium text-[#111827] w-8">{el.code}</td>
                <td className="py-1.5 text-[#4b5565]">{el.zone}</td>
                <td
                  className={`py-1.5 text-right font-mono tabular-nums ${
                    !isStreamActive
                      ? 'text-[#6b7487]'
                      : el.ok
                      ? 'text-[#111827]'
                      : 'text-[#dc2626]'
                  }`}
                >
                  {formatResistance(el.id, el.ok)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
