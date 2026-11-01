import React from 'react';
import { useFocusStore } from '../../stores/useFocusStore';

export const BiofeedbackOverlay: React.FC = () => {
  const { feedbackState, settings, deviceStatus } = useFocusStore();

  const { overlayOpacity, blurRadius, isDimmingActive, isContactOk } = feedbackState;
  const isStreamActive = settings.deviceSource === 'simulator' || deviceStatus.connected;

  const canDim = isStreamActive && isContactOk && isDimmingActive;
  const displayOpacity = canDim ? overlayOpacity : 0;
  const displayBlur = canDim ? blurRadius : 0;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden"
      style={{
        backgroundColor: `rgba(10, 10, 11, ${displayOpacity})`,
        backdropFilter: displayBlur > 0 ? `blur(${displayBlur}px)` : 'none',
        WebkitBackdropFilter: displayBlur > 0 ? `blur(${displayBlur}px)` : 'none',
      }}
    >
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
        style={{
          opacity: displayOpacity > 0 ? Math.min(1, displayOpacity * 1.25) : 0,
          background:
            'radial-gradient(circle at center, transparent 42%, rgba(10, 10, 11, 0.38) 72%, rgba(6, 6, 7, 0.88) 100%)',
        }}
      />
    </div>
  );
};
