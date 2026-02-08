
import React, { useEffect, useState } from 'react';
import { Track } from '../types';

interface UasHudProps {
  uasTrack?: Track;
  isDark: boolean;
}

const UasHud: React.FC<UasHudProps> = ({ uasTrack, isDark }) => {
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPitch(p => p + (Math.random() - 0.5) * 0.1);
      setRoll(r => r + (Math.random() - 0.5) * 0.2);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const heading = uasTrack?.heading || 0;

  return (
    <div className="absolute inset-0 pointer-events-none select-none font-mono">
      {/* Static HUD Lines */}
      <div className="absolute inset-0 border-[20px] border-emerald-500/10"></div>
      
      {/* Compass Tape Top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-6 overflow-hidden border-b border-emerald-500/50">
        <div 
          className="flex gap-8 transition-transform duration-300 whitespace-nowrap"
          style={{ transform: `translateX(${-((heading % 360) * 2)}px)` }}
        >
          {[...Array(24)].map((_, i) => (
            <span key={i} className="text-[10px] text-emerald-500 font-bold">
              {String((i * 15) % 360).padStart(3, '0')}
            </span>
          ))}
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-2 bg-emerald-500"></div>
      </div>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24">
        <div className="absolute top-1/2 left-0 w-8 h-px bg-emerald-500"></div>
        <div className="absolute top-1/2 right-0 w-8 h-px bg-emerald-500"></div>
        <div className="absolute top-0 left-1/2 w-px h-8 bg-emerald-500"></div>
        <div className="absolute bottom-0 left-1/2 w-px h-8 bg-emerald-500"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-emerald-500 rounded-full"></div>
      </div>

      {/* Telemetry Left */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 text-[10px] text-emerald-400 font-bold bg-black/40 px-2 py-2 rounded">
        <div>SPD: {uasTrack?.speed || 0} KT</div>
        <div>ALT: 12.4K MSL</div>
        <div>ROC: +120 FPM</div>
      </div>

      {/* Telemetry Right */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 text-[10px] text-emerald-400 font-bold bg-black/40 px-2 py-2 rounded text-right">
        <div>LAT: 51.16 N</div>
        <div>LON: 10.45 E</div>
        <div>ZULU: {new Date().toISOString().split('T')[1].slice(0, 8)}</div>
      </div>

      {/* Bottom Data */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-emerald-500/80 font-bold uppercase tracking-widest text-center">
        LRD: ACTIVE | LASER: ARMED<br/>
        <span className="text-emerald-300">SENSOR: EO/IR STABILIZED - POINT TRACK</span>
      </div>

      {/* Artificial Horizon Lines */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 transition-transform"
        style={{ transform: `translate(-50%, -50%) rotate(${roll}deg) translateY(${pitch * 10}px)` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-32 h-px bg-emerald-500/20"></div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-16 h-px bg-emerald-500/10"></div>
        <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-16 h-px bg-emerald-500/10"></div>
      </div>
    </div>
  );
};

export default UasHud;
