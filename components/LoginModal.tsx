import React, { useState, useEffect } from 'react';
import { X, Lock, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Theme } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  theme: Theme;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess, theme }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('lumina_admin_pwd');
      setIsSetupMode(!stored);
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSetupMode) {
      if (password.length < 4) {
        setError('密码太短');
        triggerShake(); return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        triggerShake(); return;
      }
      localStorage.setItem('lumina_admin_pwd', password);
      onLoginSuccess();
      onClose();
    } else {
      const stored = localStorage.getItem('lumina_admin_pwd');
      if (password === stored) {
        onLoginSuccess();
        onClose();
      } else {
        setError('密码错误');
        triggerShake();
      }
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  if (!isOpen) return null;

  const textPrimary = isDark ? "text-white" : "text-black";
  const textSecondary = isDark ? "text-white/50" : "text-black/50";
  const inputBg = isDark ? "bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/30 text-white placeholder:text-white/20" : "bg-black/5 border-black/10 focus:bg-black/5 focus:border-black/30 text-black placeholder:text-black/30";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in ${isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-white/60 backdrop-blur-md'}`}>
      <GlassCard className={`w-full max-w-sm p-8 ${shake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`} hoverEffect={false} theme={theme}>
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${isDark ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'}`}>
          <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10'}`}>
            {isSetupMode ? <ShieldCheck size={24} /> : <Lock size={24} />}
          </div>
          <h2 className={`text-2xl font-serif ${textPrimary}`}>
            {isSetupMode ? '首次设置' : '管理员登录'}
          </h2>
          <p className={`${textSecondary} text-sm mt-2 text-center`}>
            {isSetupMode ? '请设置一个安全密码' : '请输入密码继续访问'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound size={16} className={`absolute left-3 top-3.5 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
            <input 
              type="password" autoFocus
              placeholder={isSetupMode ? "设置新密码" : "输入密码"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none transition-all ${inputBg}`}
            />
          </div>

          {isSetupMode && (
            <div className="relative animate-fade-in">
              <KeyRound size={16} className={`absolute left-3 top-3.5 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
              <input 
                type="password" placeholder="确认新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none transition-all ${inputBg}`}
              />
            </div>
          )}

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button 
            type="submit"
            className={`w-full font-semibold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2
              ${isDark ? 'bg-white text-black' : 'bg-black text-white'}
            `}
          >
            {isSetupMode ? '设置并登录' : '登录'} <ArrowRight size={16} />
          </button>
        </form>
      </GlassCard>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};