
import React, { useRef, useEffect, useState } from 'react';
import { Track, TrackType, UnitRole, UnitEchelon, Position, AppState } from '../types';

declare const L: any;

interface MapProps {
  tracks: Track[];
  onSelectTrack: (id: string | null) => void;
  appState: AppState;
  onFinishDrawing: (points: Position[]) => void;
}

const TOC_CENTER = [51.1657, 10.4515]; 

const TacticalMap: React.FC<MapProps> = ({ tracks, onSelectTrack, appState, onFinishDrawing }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const footprintRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: TOC_CENTER,
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    footprintRef.current = L.polygon([], {
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.15,
      weight: 1,
      dashArray: '2, 4'
    }).addTo(mapRef.current);

    setIsMapLoaded(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current);

    const tileUrl = appState.theme === 'dark' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 20 }).addTo(mapRef.current);
  }, [appState.theme, isMapLoaded]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    tracks.forEach(track => {
      const isStale = (Date.now() - track.lastSeen) > track.staleAfter;
      const isSelected = appState.selectedTrackId === track.id;
      
      const color = isStale ? (appState.theme === 'dark' ? '#64748b' : '#94a3b8') : 
                    track.type === TrackType.FRIENDLY ? '#3b82f6' : 
                    track.type === TrackType.ENEMY ? '#ef4444' : 
                    track.type === TrackType.AIR ? '#10b981' : '#7c3aed';

      const labelColor = appState.theme === 'dark' ? 'white' : 'black';
      const latlng = mapRef.current.containerPointToLatLng(L.point(track.pos.x, track.pos.y));

      const renderRole = (role?: UnitRole) => {
        switch (role) {
          case UnitRole.INFANTRY:
            return '<path d="M-8,-6 L8,6 M8,-6 L-8,6" stroke="currentColor" stroke-width="1.5" />';
          case UnitRole.ARMOR:
            return '<ellipse cx="0" cy="0" rx="8" ry="4" stroke="currentColor" stroke-width="1.5" fill="none" />';
          case UnitRole.ARTILLERY:
            return '<circle cx="0" cy="0" r="2.5" fill="currentColor" />';
          case UnitRole.RECON:
            return '<line x1="-8" y1="6" x2="8" y2="-6" stroke="currentColor" stroke-width="1.5" />';
          case UnitRole.AVIATION:
            return '<path d="M-8,-4 L8,4 M8,-4 L-8,4" stroke="currentColor" stroke-width="1.5" />';
          default:
            return '';
        }
      };

      const renderEchelon = (echelon?: UnitEchelon) => {
        switch (echelon) {
          case UnitEchelon.SECTION: return '<line x1="0" y1="-14" x2="0" y2="-18" stroke="currentColor" stroke-width="2" />';
          case UnitEchelon.PLATOON: return '<line x1="-3" y1="-14" x2="-3" y2="-18" stroke="currentColor" stroke-width="2" /><line x1="3" y1="-14" x2="3" y2="-18" stroke="currentColor" stroke-width="2" />';
          case UnitEchelon.COMPANY: return '<line x1="0" y1="-14" x2="0" y2="-20" stroke="currentColor" stroke-width="2" />';
          default: return '';
        }
      };

      const getIconHtml = () => `
        <div style="color: ${color}; position: relative; width: 44px; height: 44px; margin-left: -22px; margin-top: -22px;">
          <svg viewBox="-22 -22 44 44" width="44" height="44" style="overflow: visible">
            ${isSelected ? '<circle r="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2" style="animation: spin 8s linear infinite;" />' : ''}
            
            <g>
              ${track.type === TrackType.FRIENDLY 
                ? '<rect x="-12" y="-10" width="24" height="20" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2" />' 
                : '<polygon points="0,-14 14,0 0,14 -14,0" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2" />'
              }
              ${renderRole(track.role)}
              ${renderEchelon(track.echelon)}
            </g>

            <text y="24" font-size="9" font-weight="900" fill="${labelColor}" text-anchor="middle" style="text-transform: uppercase; paint-order: stroke; stroke: ${appState.theme === 'dark' ? '#000' : '#fff'}; stroke-width: 3px; letter-spacing: -0.5px;">${track.callsign}</text>
          </svg>
        </div>
      `;

      if (markersRef.current[track.id]) {
        markersRef.current[track.id].setLatLng(latlng);
        markersRef.current[track.id].setIcon(L.divIcon({ className: 'tactical-icon', html: getIconHtml(), iconSize: [0, 0] }));
      } else {
        const marker = L.marker(latlng, { icon: L.divIcon({ className: 'tactical-icon', html: getIconHtml(), iconSize: [0, 0] }) }).addTo(mapRef.current);
        marker.on('click', (e: any) => { L.DomEvent.stopPropagation(e); onSelectTrack(track.id); });
        markersRef.current[track.id] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!tracks.find(t => t.id === id)) {
        mapRef.current.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
  }, [tracks, appState.selectedTrackId, isMapLoaded, appState.theme]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${appState.theme === 'dark' ? 'bg-[#020617]' : 'bg-slate-100'}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {appState.theme === 'dark' && <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_200px_rgba(0,0,0,0.7)]"></div>}
    </div>
  );
};

export default TacticalMap;
