
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  UserRole, AppState, Track, Alert, TrackType, UnitRole,
  TrackSource, TrackConfidence, Position, GeospatialFilter, GroundingLink 
} from './types';
import { INITIAL_TRACKS, INITIAL_ALERTS, FMV_FEEDS, LAYERS, NAMED_AREAS } from './constants';
import TacticalMap from './components/TacticalMap';
import UasHud from './components/UasHud';

const isPointInPolygon = (point: Position, polygon: Position[]): boolean => {
  let x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].x, yi = polygon[i].y;
    let xj = polygon[j].x, yj = polygon[j].y;
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    role: UserRole.BATTLE_CAPTAIN,
    isOnline: true,
    activeLayers: ['friendly', 'enemy', 'air', 'footprint', 'control_measures'],
    selectedTrackId: null,
    fmvPipEnabled: true,
    activeFMVFeed: FMV_FEEDS[0].id,
    focusMode: false,
    currentZoom: 1,
    mapOffset: { x: 0, y: 0 },
    geospatialFilter: { type: 'NONE' },
    filterConfig: {
      types: [TrackType.FRIENDLY, TrackType.ENEMY, TrackType.AIR, TrackType.NEUTRAL],
      sources: [TrackSource.TAK, TrackSource.BFT, TrackSource.MANUAL],
      confidences: [TrackConfidence.HIGH, TrackConfidence.MEDIUM, TrackConfidence.LOW]
    },
    isDrawing: false,
    theme: 'dark'
  });

  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJumpMenu, setShowJumpMenu] = useState(false);

  const [orbitAngle, setOrbitAngle] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tactical Simulation Loop
  useEffect(() => {
    if (!appState.isOnline) return;

    const simTimer = setInterval(() => {
      setOrbitAngle(prev => (prev + 0.005) % (Math.PI * 2));

      setTracks(prev => prev.map(t => {
        if (t.type === TrackType.AIR) {
          const radius = t.id === 'uas-1' ? 120 : 180;
          const speed = t.id === 'uas-1' ? 1 : 0.6;
          const offset = t.id === 'uas-1' ? 0 : Math.PI;
          
          return {
            ...t,
            pos: {
              x: 400 + Math.cos(orbitAngle * speed + offset) * radius,
              y: 350 + Math.sin(orbitAngle * speed + offset) * radius
            },
            heading: ((orbitAngle * speed + offset) * (180 / Math.PI)) + 90,
            lastSeen: Date.now()
          };
        }
        return t;
      }));
    }, 100);

    return () => clearInterval(simTimer);
  }, [appState.isOnline, orbitAngle]);

  const handleToggleLayer = (id: string) => {
    if (appState.role === UserRole.COMMANDER) return;
    setAppState(prev => ({
      ...prev,
      activeLayers: prev.activeLayers.includes(id) ? prev.activeLayers.filter(l => l !== id) : [...prev.activeLayers, id]
    }));
  };

  const toggleFilter = <T extends keyof AppState['filterConfig']>(category: T, value: AppState['filterConfig'][T][number]) => {
    if (appState.role === UserRole.COMMANDER) return;
    setAppState(prev => {
      const current = prev.filterConfig[category] as any[];
      const next = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return {
        ...prev,
        filterConfig: { ...prev.filterConfig, [category]: next }
      };
    });
  };

  const toggleTheme = () => setAppState(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  
  const toggleRole = () => {
    const isNowCommander = appState.role === UserRole.BATTLE_CAPTAIN;
    setAppState(prev => ({
      ...prev,
      role: isNowCommander ? UserRole.COMMANDER : UserRole.BATTLE_CAPTAIN,
      // Commander gets a clean map by default, TOC gets the management rail
      focusMode: isNowCommander ? true : false,
      selectedTrackId: null
    }));
  };

  const filteredTracks = useMemo(() => {
    return tracks.filter(t => {
      if (t.type === TrackType.FRIENDLY && !appState.activeLayers.includes('friendly')) return false;
      if (t.type === TrackType.ENEMY && !appState.activeLayers.includes('enemy')) return false;
      if (t.type === TrackType.AIR && !appState.activeLayers.includes('air')) return false;
      
      if (!appState.filterConfig.types.includes(t.type)) return false;
      if (!appState.filterConfig.sources.includes(t.source)) return false;
      if (!appState.filterConfig.confidences.includes(t.confidence)) return false;

      // Filter by search query if applicable
      if (searchQuery && !t.callsign.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    });
  }, [tracks, appState.activeLayers, appState.filterConfig, searchQuery]);

  const selectedTrack = tracks.find(t => t.id === appState.selectedTrackId);
  const activeFMV = FMV_FEEDS.find(f => f.id === appState.activeFMVFeed) || FMV_FEEDS[0];

  const requestInsight = () => {
    setLoadingSummary(true);
    // Local sitrep generation
    setTimeout(() => {
      const friendlyCount = tracks.filter(t => t.type === TrackType.FRIENDLY).length;
      const enemyCount = tracks.filter(t => t.type === TrackType.ENEMY).length;
      const criticals = alerts.filter(a => a.severity === 'CRITICAL').length;
      
      const sitrep = `COMMANDER'S TACTICAL UPDATE: ${friendlyCount} friendly elements active. ${enemyCount} red-force tracks identified. Recon orbits GRIFFIN 01/02 holding steady in AO ALPHA. ${criticals > 0 ? `ACTION REQUIRED: ${criticals} critical boundary or contact alerts detected.` : 'All sectors nominal.'}`;
      setSummary(sitrep);
      setLoadingSummary(false);
    }, 800);
  };

  const jumpTo = (trackId: string) => {
    setAppState(prev => ({ ...prev, selectedTrackId: trackId }));
    setShowJumpMenu(false);
  };

  const isDark = appState.theme === 'dark';
  const isCommander = appState.role === UserRole.COMMANDER;

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {isDark && <div className="scanline"></div>}
      
      {/* Header Bar */}
      <header className={`h-12 flex items-center justify-between px-4 border-b shrink-0 z-40 transition-colors ${isDark ? 'bg-[#0f172a] border-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className={`w-7 h-7 rounded flex items-center justify-center border transition-all ${isDark ? 'bg-slate-800 border-slate-600 group-hover:border-blue-500' : 'bg-slate-100 border-slate-200'}`}>
              <span className="text-blue-500 font-black text-[12px] italic">COP</span>
            </div>
            <h1 className="font-black tracking-tighter text-sm uppercase italic">Tactical COP <span className="text-blue-500 font-normal ml-1 tracking-normal not-italic opacity-70">Lite v3.5</span></h1>
          </div>
          <div className="flex items-center gap-4 border-l pl-4 mono text-[10px] opacity-60">
             <div className="flex flex-col">
               <span className="text-[8px] uppercase tracking-widest opacity-50">ZULU TIME</span>
               <span className="font-bold">{currentTime.toISOString().split('T')[1].slice(0, 8)}</span>
             </div>
             <div className="flex flex-col ml-4">
               <span className="text-[8px] uppercase tracking-widest opacity-50">NETWORK</span>
               <span className={appState.isOnline ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
                 {appState.isOnline ? 'ACTIVE' : 'DEGRADED'}
               </span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
            {isDark ? 'Dark Ops' : 'Day Mode'}
          </button>
          
          <div className="h-6 w-px bg-slate-800 mx-2"></div>

          <button 
            onClick={toggleRole} 
            className={`px-4 py-1.5 rounded-md font-black text-[10px] uppercase transition-all shadow-lg ${
              isCommander 
                ? 'bg-blue-600 text-white hover:bg-blue-500 ring-2 ring-blue-500/20' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {isCommander ? 'CDR VIEW: ON' : 'ENTER CDR MODE'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex relative">
        
        {/* Left Action Rail (Jump/Focus) */}
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
           <button 
             onClick={() => setShowJumpMenu(!showJumpMenu)}
             className={`p-3 rounded-lg border shadow-2xl transition-all ${isDark ? 'bg-slate-900 border-slate-700 hover:border-blue-500' : 'bg-white border-slate-200'} ${showJumpMenu ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}
             title="Jump to Unit"
           >
             <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
           </button>
           
           {!isCommander && (
             <button 
               onClick={() => setAppState(p => ({ ...p, focusMode: !p.focusMode }))}
               className={`p-3 rounded-lg border shadow-2xl transition-all ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
               title="Toggle UI"
             >
               <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
             </button>
           )}

           {/* Jump Menu Overlay */}
           {showJumpMenu && (
             <div className={`absolute left-14 top-0 w-64 border rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.4)] animate-slide-in overflow-hidden z-50 ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Jump to Unit</span>
                  <button onClick={() => setShowJumpMenu(false)} className="text-slate-500 hover:text-white">✕</button>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {tracks.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => jumpTo(t.id)}
                      className={`w-full text-left px-3 py-2 rounded text-[11px] font-bold transition-colors flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                    >
                      <span>{t.callsign}</span>
                      <span className={`text-[9px] uppercase px-1 rounded ${t.type === TrackType.FRIENDLY ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>{t.type}</span>
                    </button>
                  ))}
                </div>
             </div>
           )}
        </div>

        {/* Map View */}
        <div className="flex-1 relative z-10">
          <TacticalMap 
            tracks={filteredTracks} 
            onSelectTrack={(id) => setAppState(p => ({ ...p, selectedTrackId: id }))} 
            appState={appState} 
            onFinishDrawing={() => {}} 
          />
        </div>

        {/* Commander's Decision Support Overlay */}
        {isCommander && (
          <div className="absolute top-4 right-4 w-80 space-y-4 z-30 pointer-events-none transition-all animate-slide-in">
            {/* Quick Info Overlay for Commander when a track is selected */}
            {selectedTrack && (
              <div className="bg-[#0f172a]/95 border-2 border-blue-500 rounded-xl p-5 backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.7)] pointer-events-auto ring-1 ring-blue-400/20 animate-slide-in">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter text-white">{selectedTrack.callsign}</h2>
                      <p className="text-[10px] mono text-blue-400 font-bold uppercase tracking-widest">{selectedTrack.label}</p>
                    </div>
                    <button onClick={() => setAppState(p => ({ ...p, selectedTrackId: null }))} className="text-slate-500 hover:text-white">✕</button>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                       <div className="bg-slate-900/50 p-2 border border-slate-800 rounded">
                         <span className="text-[8px] text-slate-500 uppercase font-black block">Status</span>
                         <span className="text-[11px] font-bold text-emerald-400">READY</span>
                       </div>
                       <div className="bg-slate-900/50 p-2 border border-slate-800 rounded">
                         <span className="text-[8px] text-slate-500 uppercase font-black block">Confidence</span>
                         <span className="text-[11px] font-bold text-white">{selectedTrack.confidence}</span>
                       </div>
                    </div>

                    <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                       <h4 className="text-[9px] font-black uppercase text-blue-500 mb-2 tracking-widest">Composition</h4>
                       <ul className="space-y-1.5">
                         {selectedTrack.composition?.map((item, idx) => (
                           <li key={idx} className="text-[10px] font-bold text-slate-300 flex items-center gap-2">
                             <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                             {item}
                           </li>
                         )) || <li className="text-[10px] italic opacity-40">No composition data</li>}
                       </ul>
                    </div>
                 </div>
              </div>
            )}

            {/* Mission Stats */}
            <div className="bg-[#0f172a]/95 border border-blue-500/40 rounded-xl p-4 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.6)] pointer-events-auto ring-1 ring-blue-500/20">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div> DECISION SUPPORT
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] mono border-b border-slate-800 pb-2">
                  <span className="text-slate-400 uppercase">Blue Force Strength</span>
                  <span className="text-emerald-400 font-bold">Combat Effective (92%)</span>
                </div>
                <div className="flex justify-between items-center text-[10px] mono border-b border-slate-800 pb-2">
                  <span className="text-slate-400 uppercase">Enemy Proximity</span>
                  <span className="text-red-400 font-bold">14km (Decreasing)</span>
                </div>
                <div className="flex justify-between items-center text-[10px] mono border-b border-slate-800 pb-2">
                  <span className="text-slate-400 uppercase">Air Dominance</span>
                  <span className="text-emerald-400 font-bold">Local Superiority</span>
                </div>
                <div className="flex justify-between items-center text-[10px] mono">
                  <span className="text-slate-400 uppercase">Comms Resilience</span>
                  <span className="text-amber-400 font-bold">L-Band Backup Active</span>
                </div>
              </div>
            </div>

            {/* Critical Alerts for Commander */}
            <div className="space-y-2 pointer-events-auto">
              {alerts.filter(a => a.severity === 'CRITICAL').map(alert => (
                <div key={alert.id} className="bg-red-950/90 border border-red-500/50 rounded-lg p-3 shadow-2xl animate-pulse">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-200">{alert.type}</span>
                  </div>
                  <p className="text-[11px] font-bold text-white leading-tight">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOC Sidebar (Non-Commander Only) */}
        {!isCommander && (
          <aside className={`w-96 border-l z-30 flex flex-col transition-all duration-500 ease-in-out shadow-[-10px_0_30px_rgba(0,0,0,0.3)] ${appState.focusMode ? 'translate-x-full' : 'translate-x-0'} ${isDark ? 'bg-[#0f172a]/95 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-hide">
              
              {/* Layer Management */}
              <section>
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Tactical Layers</h3>
                   <span className="text-[8px] mono px-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">BATTALION NET</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {LAYERS.map(layer => (
                    <label key={layer.id} className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${appState.activeLayers.includes(layer.id) ? (isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200') : (isDark ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-100')}`}>
                      <span className={`text-[10px] uppercase font-bold transition-colors ${appState.activeLayers.includes(layer.id) ? 'text-blue-500' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{layer.label}</span>
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 rounded-sm border-0 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-slate-800" 
                        checked={appState.activeLayers.includes(layer.id)} 
                        onChange={() => handleToggleLayer(layer.id)} 
                      />
                    </label>
                  ))}
                </div>
              </section>

              {/* Selected Track Management */}
              <section className="pt-6 border-t border-slate-800">
                {selectedTrack ? (
                  <div className="space-y-6 animate-slide-in">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <h2 className="text-3xl font-black tracking-tighter leading-none">{selectedTrack.callsign}</h2>
                           <button onClick={() => setAppState(p => ({...p, selectedTrackId: null}))} className="text-slate-500 hover:text-white">✕</button>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-[9px] mono font-bold text-blue-500 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20 uppercase tracking-widest">{selectedTrack.label}</span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${selectedTrack.confidence === TrackConfidence.HIGH ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>CONF: {selectedTrack.confidence}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Unit Composition Section */}
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-inner">
                       <h3 className="text-[10px] font-black uppercase text-blue-500 mb-3 tracking-[0.2em] flex items-center justify-between">
                         Unit Composition
                         <span className="text-[8px] mono opacity-40">MIL-STD-2525D</span>
                       </h3>
                       <div className="space-y-2">
                         {selectedTrack.composition?.map((item, idx) => (
                           <div key={idx} className="flex items-center gap-3 p-1.5 hover:bg-slate-800 rounded transition-colors group">
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-transform group-hover:scale-125"></div>
                              <span className="text-[11px] font-bold text-slate-200">{item}</span>
                           </div>
                         )) || <p className="text-[10px] italic opacity-30 text-center py-2">No metadata for this unit slice.</p>}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] mono">
                      {[
                        { label: 'Speed', val: `${selectedTrack.speed || 0}KT` },
                        { label: 'Heading', val: `${Math.round(selectedTrack.heading || 0)}°` },
                        { label: 'Health', val: `${selectedTrack.health || 100}%` },
                        { label: 'Source', val: selectedTrack.source }
                      ].map((item, i) => (
                        <div key={i} className="p-2.5 border border-slate-800 bg-slate-900/50 rounded-lg flex flex-col hover:border-blue-500/30 transition-colors">
                           <span className="text-[8px] text-slate-500 uppercase font-black mb-0.5">{item.label}</span>
                           <span className="font-bold text-white text-[11px]">{item.val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2">
                       <button className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/10 active:scale-95 transition-all">Establish Voice Link</button>
                       <button className="w-full py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Manual Pos Update</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 opacity-20 select-none grayscale">
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                    <p className="text-[10px] text-center font-black uppercase tracking-widest mt-5">Select track on map for details</p>
                  </div>
                )}
              </section>
            </div>
            
            <div className="p-5 border-t border-slate-800 bg-black/60 backdrop-blur-md">
               <div className="flex justify-between items-center text-[8px] mono text-slate-500 uppercase mb-2">
                 <span>Data Sync Baseline</span>
                 <span className="text-emerald-500 font-bold tracking-tighter">● CONNECTION NOMINAL</span>
               </div>
               <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-blue-600 h-full w-[85%] animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
               </div>
            </div>
          </aside>
        )}

        {/* FMV PIP Window */}
        {appState.fmvPipEnabled && (
          <div className={`absolute bottom-6 right-6 ${isCommander ? 'w-[36rem]' : 'w-[28rem]'} rounded-xl bg-black border border-slate-700 shadow-[0_10px_60px_rgba(0,0,0,0.8)] overflow-hidden z-40 transition-all duration-500 ring-1 ring-slate-700 group`}>
            <div className={`h-9 flex items-center justify-between px-3 border-b transition-colors ${isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse border border-red-400"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{activeFMV.name}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-full">
                {FMV_FEEDS.map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => setAppState(p => ({ ...p, activeFMVFeed: f.id }))} 
                    className={`w-2.5 h-2.5 rounded-full transition-all border ${appState.activeFMVFeed === f.id ? 'bg-blue-500 border-blue-400 scale-110' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
                    title={f.name}
                  />
                ))}
              </div>
              <button 
                onClick={() => setAppState(p => ({ ...p, fmvPipEnabled: false }))}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="aspect-video relative overflow-hidden bg-slate-950">
               <img src={activeFMV.url} alt="Tactical Feed" className="w-full h-full object-cover grayscale brightness-50 contrast-125" />
               <UasHud uasTrack={tracks.find(t => t.id === appState.activeFMVFeed)} isDark={isDark} />
               <div className="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
                 <span className="text-[8px] bg-black/60 px-1 rounded text-red-500 mono font-black">LAT: {activeFMV.latency}</span>
                 <span className="text-[8px] bg-black/60 px-1 rounded text-slate-300 mono font-black">BW: {activeFMV.bitrate}</span>
               </div>
            </div>
          </div>
        )}

        {/* Global Alerts Feed Overlay (Left Bottom) */}
        <div className="absolute bottom-6 left-6 max-h-[30vh] w-80 flex flex-col gap-2 z-40 pointer-events-none">
          {alerts.slice(0, 3).map(alert => (
            <div 
              key={alert.id} 
              className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all animate-slide-in flex items-start gap-4 ring-1 ${
                alert.severity === 'CRITICAL' 
                  ? 'bg-red-950/85 border-red-500/50 text-white ring-red-500/20' 
                  : 'bg-amber-950/85 border-amber-500/50 text-white ring-amber-500/20'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${alert.severity === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'bg-amber-500'} animate-pulse`}></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{alert.type}</span>
                  <span className="text-[8px] mono opacity-40">T-{Math.round((Date.now() - alert.timestamp)/1000)}S</span>
                </div>
                <p className="text-[12px] font-bold leading-tight mb-2">{alert.message}</p>
                <div className="flex gap-4">
                   <button className="text-[9px] font-black uppercase text-white/50 hover:text-white transition-colors border-b border-white/10">Acknowledge</button>
                   <button onClick={() => jumpTo(alert.trackId || '')} className="text-[9px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors border-b border-blue-400/20">Snap to Source</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Sitrep Result Modal */}
      {summary && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-2xl border-2 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden transition-all duration-500 animate-slide-in ${isDark ? 'bg-[#0f172a] border-blue-500/30' : 'bg-white border-blue-200'}`}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <span className="text-[11px] font-black text-blue-500 tracking-[0.4em] uppercase">Tactical Sitrep Report</span>
              <button onClick={() => setSummary(null)} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">✕</button>
            </div>
            <div className="p-10">
              <div className={`p-8 rounded-xl border leading-relaxed text-base font-medium italic shadow-inner ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                "{summary}"
              </div>
              <div className="mt-10 grid grid-cols-2 gap-6">
                 <button onClick={() => setSummary(null)} className="py-4 rounded-xl border border-slate-700 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all">Dismiss</button>
                 <button onClick={() => setSummary(null)} className="py-4 rounded-xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all border-b-4 border-blue-800">Relay to Net</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav / Search Area */}
      <nav className={`h-16 border-t flex items-center justify-between px-6 shrink-0 z-40 transition-colors ${isDark ? 'bg-[#0f172a] border-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-1">
          <button className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg transition-all ${isDark ? 'text-blue-500 bg-blue-500/10' : 'text-blue-600'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">PRIMARY COP</span>
          </button>
          
          <button onClick={() => setAppState(p => ({ ...p, fmvPipEnabled: true }))} className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg transition-all ${isDark ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">VIDEO LINKS</span>
          </button>
        </div>

        <div className="flex-1 max-w-xl mx-8 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder={isCommander ? "COMMANDER OVERRIDE - VIEW ONLY" : "SEARCH ENTITIES, AREAS, OR GRIDS..."} 
            disabled={isCommander}
            className={`w-full border-0 rounded-xl px-12 py-3.5 text-xs font-black tracking-tight transition-all focus:ring-2 focus:ring-blue-500/50 ${
              isDark 
                ? 'bg-black/50 text-white placeholder-slate-700' 
                : 'bg-slate-100 text-slate-900 placeholder-slate-400'
            } ${isCommander ? 'opacity-30 cursor-not-allowed shadow-inner' : 'opacity-100 shadow-lg'}`} 
          />
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={requestInsight} 
            disabled={loadingSummary} 
            className={`px-12 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 border-b-4 border-blue-700 hover:translate-y-[-2px] ${
              loadingSummary ? 'opacity-50 grayscale cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-500 ring-2 ring-blue-500/20'
            }`}
          >
            {loadingSummary ? 'ANALYST SYNC...' : (isCommander ? 'SITREP ESTIMATE' : 'GENERATE SITREP')}
          </button>
        </div>
      </nav>
      
      <style>{`
        @keyframes slide-in {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
