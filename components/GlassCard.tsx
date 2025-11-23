import React from 'react';
import { Theme } from '../types';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
  theme?: Theme;
  square?: boolean;
  flat?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hoverEffect = true, 
  onClick,
  theme = 'dark',
  square = false,
  flat = false
}) => {
  const isDark = theme === 'dark';

  const baseStyles = isDark 
    ? `bg-white/5 border-white/10 ${flat ? '' : 'shadow-xl shadow-white/5'}` 
    : `bg-white/90 border-black/5 ${flat ? '' : 'shadow-[0_8px_30px_rgb(0,0,0,0.12)]'}`;

  const hoverStyles = hoverEffect 
    ? (isDark 
        ? "hover:scale-[1.02] hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5" 
        : "hover:scale-[1.02] hover:bg-white/100 hover:shadow-[0_20px_40px_rgb(0,0,0,0.15)]")
    : "";

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        backdrop-blur-xl border
        transition-all duration-300 ease-out
        ${square ? 'rounded-none' : 'rounded-2xl'}
        ${baseStyles}
        ${hoverStyles}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Glossy gradient overlay - subtly different per theme */}
      <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none opacity-50 ${isDark ? 'from-white/10 via-transparent to-transparent' : 'from-white/40 via-transparent to-transparent'}`} />
      {children}
    </div>
  );
};
