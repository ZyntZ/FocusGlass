import React from 'react';
import { RotateCcw, Download } from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';
import { GlassButton } from '../glass/GlassButton';

export const SessionStatsCard: React.FC = () => {
  const { sessionStats, sessionHistory, resetSession, exportSessionsCsv } = useFocusStore();

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const canExport = sessionStats.durationSeconds >= 1 || sessionHistory.length > 0;

  return (
    <div className="border-b border-[rgba(17,24,39,0.10)] bg-[#ffffff] px-4 py-2 flex items-center justify-between gap-4 text-xs">
      <span className="font-mono tabular-nums text-[#4b5565]">
        Сеанс: {formatTime(sessionStats.durationSeconds)} · записей: {sessionHistory.length}
      </span>

      <div className="flex items-center gap-2">
        <GlassButton
          size="sm"
          variant="secondary"
          disabled={sessionStats.durationSeconds < 3}
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
  );
};
