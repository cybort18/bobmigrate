import React, { useState, useEffect } from 'react';
import { Cpu, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 1800
}) => {
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(10);
  const [statusText, setStatusText] = useState('Initializing Autonomous Engine...');

  useEffect(() => {
    // Dynamic status text updates
    const t1 = setTimeout(() => {
      setStatusText('Loading Granite 3.8B Neural Weights...');
    }, 500);

    const t2 = setTimeout(() => {
      setStatusText('Syncing Monolith AST Dependency Graph...');
    }, 1100);

    const t3 = setTimeout(() => {
      setStatusText('Modernization Engine Ready.');
    }, 1500);

    // Progress bar ticker
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        const increment = Math.floor(Math.random() * 20) + 12;
        return Math.min(prev + increment, 100);
      });
    }, 140);

    // Start fading out before completion
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, durationMs);

    // Completely unmount after fade transition (650ms)
    const finishTimer = setTimeout(() => {
      onComplete();
    }, durationMs + 650);

    // Keyboard listener to skip on any key
    const handleKeyDown = () => {
      handleSkip();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(progressInterval);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [durationMs, onComplete]);

  const handleSkip = () => {
    if (fadingOut) return;
    setFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 350);
  };

  return (
    <div
      onClick={handleSkip}
      role="banner"
      aria-label="BobMigrate Splash Screen"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07090e] cursor-pointer select-none overflow-hidden transition-all duration-700 ease-out ${
        fadingOut
          ? 'opacity-0 scale-105 pointer-events-none filter blur-[4px]'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[650px] h-[500px] sm:h-[650px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/10 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Cybernetic grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Main Content Card */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-lg w-full text-center">
        {/* Animated Brand Logo (Clean & Borderless) */}
        <div className="relative group mb-6 transition-transform duration-700 hover:scale-[1.02]">
          {/* Subtle Ambient Logo Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[440px] h-28 bg-gradient-to-r from-blue-600/30 via-indigo-500/25 to-purple-600/20 rounded-full blur-2xl opacity-75 pointer-events-none" />

          {/* Clean Frameless SVG Logo Graphic */}
          <img
            src="/logo.svg"
            alt="BobMigrate Logo"
            className="relative z-10 w-[290px] sm:w-[380px] md:w-[440px] h-auto object-contain filter drop-shadow-[0_10px_25px_rgba(15,98,254,0.4)]"
          />
        </div>

        {/* Hackathon Badge & Description */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium mb-5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>IBM Bob 2.0 Autonomous Modernization Engine</span>
        </div>

        {/* Techy Progress Bar */}
        <div className="w-56 sm:w-64 h-1.5 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800/60 mb-3 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-200 ease-out shadow-[0_0_10px_rgba(15,98,254,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic Status Text */}
        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
          <Cpu className="w-3 h-3 text-blue-400 animate-pulse" />
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
};
