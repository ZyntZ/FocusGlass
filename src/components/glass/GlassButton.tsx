import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'cyan' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-[5px]',
    md: 'h-8 px-3 text-xs gap-1.5 rounded-[6px]',
    lg: 'h-9 px-4 text-[13px] gap-2 rounded-[6px]',
  };

  const variantClasses = {
    primary:
      'bg-[#1d5bbf] hover:bg-[#184da3] text-white font-medium border border-[#184da3]',
    cyan:
      'bg-[#eceff4] hover:bg-[#e2e7ef] text-[#1d5bbf] font-medium border border-[#1d5bbf]/40',
    secondary:
      'bg-[#ffffff] hover:bg-[#f5f7fa] text-[#111827] font-normal border border-[rgba(17,24,39,0.14)] shadow-[0_1px_1px_rgba(0,0,0,0.03)]',
    ghost:
      'bg-transparent hover:bg-[#eceff4] text-[#4b5565] hover:text-[#111827] font-normal border border-transparent',
    danger:
      'bg-[#ffffff] hover:bg-[#fef2f2] text-[#dc2626] font-normal border border-[#dc2626]/30',
  };

  return (
    <button
      className={`inline-flex items-center justify-center transition-[background-color,border-color,color,transform] duration-120 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1d5bbf] cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
};
