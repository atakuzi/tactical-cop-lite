
import { 
  Track, TrackType, TrackSource, TrackConfidence, UnitRole, UnitEchelon,
  Alert, FMVFeed, NamedArea, ControlMeasure, ControlMeasureType 
} from './types';

export const INITIAL_TRACKS: Track[] = [
  // AVIATION / UAS
  {
    id: 'uas-1',
    callsign: 'GRIFFIN 01',
    label: 'MQ-9 REAPER',
    type: TrackType.AIR,
    role: UnitRole.AVIATION,
    source: TrackSource.TAK,
    pos: { x: 400, y: 300 },
    timestamp: Date.now(),
    lastSeen: Date.now(),
    confidence: TrackConfidence.HIGH,
    staleAfter: 5000,
    expireAfter: 30000,
    heading: 0,
    speed: 120,
    metadata: { sensor: 'MX-20', endurance: '14h' },
    composition: ['1x MQ-9 Block 5', '4x AGM-114 Hellfire', '2x GBU-12 Paveway II']
  },
  {
    id: 'uas-2',
    callsign: 'GRIFFIN 02',
    label: 'MQ-1C GRAY EAGLE',
    type: TrackType.AIR,
    role: UnitRole.AVIATION,
    source: TrackSource.TAK,
    pos: { x: 200, y: 150 },
    timestamp: Date.now(),
    lastSeen: Date.now(),
    confidence: TrackConfidence.HIGH,
    staleAfter: 5000,
    expireAfter: 30000,
    heading: 180,
    speed: 110,
    composition: ['1x MQ-1C', '4x AGM-114 Hellfire', 'STARLite Radar']
  },
  
  // FRIENDLY GROUND
  {
    id: 'f1',
    callsign: 'GHOST 1-1',
    label: 'INF PLT (STRYKER)',
    type: TrackType.FRIENDLY,
    role: UnitRole.INFANTRY,
    echelon: UnitEchelon.PLATOON,
    source: TrackSource.BFT,
    pos: { x: 450, y: 350 },
    timestamp: Date.now(),
    lastSeen: Date.now(),
    confidence: TrackConfidence.HIGH,
    staleAfter: 60000,
    expireAfter: 300000,
    heading: 45,
    health: 95,
    composition: ['4x M1126 Stryker ICV', '36x Personnel', '2x M240L Machine Guns', '4x Javelin CLU']
  },
  {
    id: 'f2',
    callsign: 'IRON 2-1',
    label: 'ARMOR PLT (M1A2)',
    type: TrackType.FRIENDLY,
    role: UnitRole.ARMOR,
    echelon: UnitEchelon.PLATOON,
    source: TrackSource.BFT,
    pos: { x: 420, y: 380 },
    timestamp: Date.now(),
    lastSeen: Date.now(),
    confidence: TrackConfidence.HIGH,
    staleAfter: 60000,
    expireAfter: 300000,
    heading: 90,
    composition: ['4x M1A2 SEPv3 Abrams', '16x Personnel', '120mm Smoothbore Main Gun']
  },
  {
    id: 'f3',
    callsign: 'THUNDER 6',
    label: 'FA BTRY (M109)',
    type: TrackType.FRIENDLY,
    role: UnitRole.ARTILLERY,
    echelon: UnitEchelon.COMPANY,
    source: TrackSource.BFT,
    pos: { x: 300, y: 550 },
    timestamp: Date.now(),
    lastSeen: Date.now(),
    confidence: TrackConfidence.HIGH,
    staleAfter: 300000,
    expireAfter: 600000,
    composition: ['6x M109A7 Paladin', '6x M992A3 FAASV', '85x Personnel']
  },

  // ENEMY GROUND
  {
    id: 'e1',
    callsign: 'T-72 PLT',
    label: 'OPFOR ARMOR',
    type: TrackType.ENEMY,
    role: UnitRole.ARMOR,
    echelon: UnitEchelon.PLATOON,
    source: TrackSource.MANUAL,
    pos: { x: 600, y: 450 },
    timestamp: Date.now() - 300000,
    lastSeen: Date.now() - 300000,
    confidence: TrackConfidence.MEDIUM,
    staleAfter: 600000,
    expireAfter: 1200000,
    composition: ['3x T-72B3', '1x BMP-2', '12x Personnel']
  },
  {
    id: 'e2',
    callsign: 'BMP SECT',
    label: 'OPFOR MECH INF',
    type: TrackType.ENEMY,
    role: UnitRole.INFANTRY,
    echelon: UnitEchelon.SECTION,
    source: TrackSource.MANUAL,
    pos: { x: 650, y: 420 },
    timestamp: Date.now() - 100000,
    lastSeen: Date.now() - 100000,
    confidence: TrackConfidence.LOW,
    staleAfter: 300000,
    expireAfter: 600000,
    composition: ['2x BMP-3', '16x Personnel', 'AT-10 Stabber']
  }
];

export const CONTROL_MEASURES: ControlMeasure[] = [
  {
    id: 'nfa-1',
    type: ControlMeasureType.NFA,
    name: 'NFA HOSPITAL',
    strokeColor: '#ef4444',
    fillColor: '#ef4444',
    opacity: 0.2,
    points: [
      { x: 300, y: 300 },
      { x: 350, y: 300 },
      { x: 350, y: 350 },
      { x: 300, y: 350 }
    ]
  },
  {
    id: 'boundary-alpha',
    type: ControlMeasureType.BOUNDARY,
    name: 'BNDRY ALPHA/BRAVO',
    strokeColor: '#94a3b8',
    points: [
      { x: 0, y: 400 },
      { x: 1000, y: 400 }
    ]
  }
];

export const INITIAL_ALERTS: Alert[] = [
  {
    id: 'a1',
    type: 'CONTACT',
    severity: 'CRITICAL',
    message: 'Enemy Armor platoon identified at OBJ COBRA vicinity.',
    timestamp: Date.now(),
    pos: { x: 600, y: 450 }
  },
  {
    id: 'a2',
    type: 'BFT_STALE',
    severity: 'WARNING',
    message: 'THUNDER 6 telemetry aging. Check backhaul.',
    timestamp: Date.now() - 600000
  }
];

export const FMV_FEEDS: FMVFeed[] = [
  {
    id: 'uas-1',
    name: 'GRIFFIN 01 (MQ-9)',
    url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=800',
    status: 'ACTIVE',
    bitrate: '4.2 Mbps',
    latency: '180ms'
  },
  {
    id: 'uas-2',
    name: 'GRIFFIN 02 (GRAY EAGLE)',
    url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&q=80&w=800',
    status: 'ACTIVE',
    bitrate: '3.1 Mbps',
    latency: '240ms'
  },
  {
    id: 'watchman-01',
    name: 'WATCHMAN 01 (EO/IR)',
    url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=800',
    status: 'ACTIVE',
    bitrate: '8.5 Mbps',
    latency: '450ms'
  }
];

export const LAYERS = [
  { id: 'friendly', label: 'Blue Force (BFT)' },
  { id: 'enemy', label: 'Red Force (Intel)' },
  { id: 'air', label: 'Airspace/UAS' },
  { id: 'footprint', label: 'Sensor Coverage' },
  { id: 'fires', label: 'Fire Support' },
  { id: 'control_measures', label: 'Tactical Graphics' }
];

export const NAMED_AREAS: NamedArea[] = [
  {
    id: 'ao_alpha',
    name: 'AO ALPHA',
    points: [{ x: 100, y: 100 }, { x: 500, y: 100 }, { x: 500, y: 500 }, { x: 100, y: 500 }]
  },
  {
    id: 'obj_cobra',
    name: 'OBJ COBRA',
    points: [{ x: 550, y: 400 }, { x: 750, y: 400 }, { x: 750, y: 600 }, { x: 550, y: 600 }]
  }
];
