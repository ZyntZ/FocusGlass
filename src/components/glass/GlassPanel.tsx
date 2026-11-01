import React from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'card' | 'subtle';
  glow?: 'none' | 'orange' | 'cyan' | 'violet' | 'green';
  hasSpecular?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  variant = 'card',
  ...props
}) => {
  const surface =
    variant === 'subtle'
      ? 'bg-[#f8f9fb] border border-[rgba(17,24,39,0.10)] rounded-md'
      : 'bg-[#ffffff] border border-[rgba(17,24,39,0.10)] rounded-md';

  return (
    <div className={`${surface} ${className}`} {...props}>
      {children}
    </div>
  );
};
