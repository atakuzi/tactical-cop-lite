
export enum UserRole {
  COMMANDER = 'COMMANDER',
  BATTLE_CAPTAIN = 'BATTLE_CAPTAIN'
}

export enum TrackType {
  FRIENDLY = 'FRIENDLY',
  ENEMY = 'ENEMY',
  AIR = 'AIR',
  NEUTRAL = 'NEUTRAL',
  UNKNOWN = 'UNKNOWN'
}

export enum UnitRole {
  INFANTRY = 'INFANTRY',
  ARMOR = 'ARMOR',
  ARTILLERY = 'ARTILLERY',
  RECON = 'RECON',
  AVIATION = 'AVIATION',
  HQ = 'HQ'
}

export enum UnitEchelon {
  SECTION = 'SECTION',
  PLATOON = 'PLATOON',
  COMPANY = 'COMPANY',
  BATTALION = 'BATTALION',
  BRIGADE = 'BRIGADE'
}

export enum TrackSource {
  TAK = 'TAK',
  BFT = 'BFT',
  MANUAL = 'S2_MANUAL',
  AIS = 'AIS'
}

export enum TrackConfidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum ControlMeasureType {
  BOUNDARY = 'BOUNDARY',
  AO = 'AREA_OF_OPERATIONS',
  NFA = 'NO_FIRE_AREA',
  RFA = 'RESTRICTIVE_FIRE_AREA',
  FSCM = 'FIRE_SUPPORT_CONTROL_MEASURE',
  ROZ = 'RESTRICTED_OPERATING_ZONE'
}

export interface Position {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
}

export interface Track {
  id: string;
  type: TrackType;
  source: TrackSource;
  pos: Position;
  timestamp: number;
  callsign: string;
  label: string;
  role?: UnitRole;
  echelon?: UnitEchelon;
  lastSeen: number; 
  staleAfter: number;
  expireAfter: number;
  confidence: TrackConfidence;
  heading?: number;
  speed?: number;
  health?: number;
  altitude?: number;
  isOffline?: boolean;
  metadata?: Record<string, string | number>;
  // Added for detailed unit composition
  composition?: string[]; 
}

export interface ControlMeasure {
  id: string;
  type: ControlMeasureType;
  name: string;
  points: Position[];
  strokeColor: string;
  fillColor?: string;
  opacity?: number;
  effectiveTimeStart?: number;
  effectiveTimeEnd?: number;
  owner?: string;
}

export interface Alert {
  id: string;
  type: 'CONTACT' | 'BOUNDARY_VIOLATION' | 'BFT_STALE' | 'FIRES_CONFLICT' | 'EW_WARNING';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  timestamp: number;
  pos?: Position;
  trackId?: string;
  acknowledged?: boolean;
}

export interface FMVFeed {
  id: string;
  name: string;
  url: string;
  status: 'ACTIVE' | 'OFFLINE';
  bitrate: string;
  latency: string;
  thumbnail?: string;
  sensorMetadata?: {
    heading: number;
    fov: number;
    aimPoint: Position;
  };
}

export interface NamedArea {
  id: string;
  name: string;
  points: Position[];
}

export interface GeospatialFilter {
  type: 'POLYGON' | 'SEARCH' | 'NONE';
  points?: Position[];
  query?: string;
}

export interface UserPreferences {
  role: UserRole;
  theme: 'light' | 'dark';
  activeLayers: string[];
  favorites?: string[];
  mapCenter?: Position;
  zoomLevel?: number;
}

export interface AppState extends UserPreferences {
  isOnline: boolean;
  selectedTrackId: string | null;
  fmvPipEnabled: boolean;
  activeFMVFeed: string | null;
  focusMode: boolean;
  geospatialFilter: GeospatialFilter;
  filterConfig: {
    types: TrackType[];
    sources: TrackSource[];
    confidences: TrackConfidence[];
  };
  isDrawing: boolean;
  currentZoom?: number;
  mapOffset?: Position;
}

export interface GroundingLink {
  uri: string;
  title: string;
}
