import React from 'react';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'orange' | 'cyan' | 'violet' | 'red' | 'neutral';
  pulse?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  icon,
}) => {
  const textColors = {
    green: 'text-[#15803d]',
    orange: 'text-[#1d5bbf]',
    cyan: 'text-[#1d5bbf]',
    violet: 'text-[#4b5565]',
    red: 'text-[#dc2626]',
    neutral: 'text-[#6b7487]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-mono tabular-nums ${textColors[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
