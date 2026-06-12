// ---------------------------------------------------------------------------
// Shared domain types for the AI Video Annotator Suite.
//
// Canonical coordinate space everywhere in the app is *intrinsic video pixels*
// (videoWidth x videoHeight). Detections and zones are stored in that space so
// they survive window resizing; they are scaled to the display only at draw time.
// ---------------------------------------------------------------------------

/** [x, y, width, height] in intrinsic video pixels. */
export type BBox = [number, number, number, number]

export type Category =
  | 'personnel'
  | 'transportation'
  | 'machinery'
  | 'storage'
  | 'desktop'
  | 'safety'
  | 'general'

/** A single object found in one frame, after warehouse relabeling + tracking. */
export interface Detection {
  trackId: number
  /** Warehouse-facing label, e.g. "worker", "forklift". */
  label: string
  /** Original COCO-SSD class the model actually returned, e.g. "person". */
  cocoClass: string
  category: Category
  /** Model confidence, 0..1. */
  score: number
  bbox: BBox
  /** Heuristic, clearly-flagged guesses (e.g. ["safety vest"]). Never confirmed. */
  estimates: string[]
}

/** Detector output before a stable track id is assigned. */
export type RawDetection = Omit<Detection, 'trackId'>

export const ZONE_TYPES = {
  restricted: { name: 'Restricted', color: '#ef4444', desc: 'No-entry zone' },
  safety: { name: 'Safety / PPE', color: '#10b981', desc: 'PPE required' },
  loading: { name: 'Loading Dock', color: '#3b82f6', desc: 'Forklift area' },
  walking: { name: 'Walking Path', color: '#8b5cf6', desc: 'Pedestrian only' },
  storage: { name: 'Storage', color: '#f59e0b', desc: 'Inventory area' },
} as const

export type ZoneTypeKey = keyof typeof ZONE_TYPES

export interface Zone {
  id: number
  type: ZoneTypeKey
  name: string
  /** Rectangle in intrinsic video pixels. */
  rect: BBox
}

export type ZoneEventKind = 'enter' | 'intrusion'

export interface ZoneEvent {
  ts: number
  zoneId: number
  zoneName: string
  zoneType: ZoneTypeKey
  label: string
  trackId: number
  kind: ZoneEventKind
}

export interface TrackSummary {
  id: number
  label: string
  category: Category
  firstTs: number
  lastTs: number
  frames: number
  /** Seconds the object was continuously observed (lastTs - firstTs). */
  dwell: number
  maxScore: number
  estimates: string[]
  /** Centroid trail in intrinsic pixels (capped length). */
  path: { x: number; y: number; ts: number }[]
}

export interface Metrics {
  framesAnalyzed: number
  totalDetections: number
  uniqueTracks: number
  workers: number
  vehicles: number
  intrusions: number
  /** Mean dwell time across tracks, seconds. */
  avgDwell: number
  /** Estimated PPE compliance: % of worker tracks with a vest estimate. Heuristic. */
  ppeComplianceEst: number
}

export interface Settings {
  /** Minimum model confidence to keep a detection, 0..1. */
  confidence: number
  /** Throttle for live detection in milliseconds. */
  detectEveryMs: number
  /** Frame sampling step for a full offline scan, in seconds. */
  sampleInterval: number
  useWarehouseTerms: boolean
  estimatePPE: boolean
  showBoxes: boolean
  showZones: boolean
  showHeatmap: boolean
  showTracks: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  confidence: 0.45,
  detectEveryMs: 140,
  sampleInterval: 0.75,
  useWarehouseTerms: true,
  estimatePPE: true,
  showBoxes: true,
  showZones: true,
  showHeatmap: false,
  showTracks: true,
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

/** A snapshot the live engine pushes up to React for the dashboard/timeline. */
export interface AnalysisSnapshot {
  metrics: Metrics
  tracks: TrackSummary[]
  events: ZoneEvent[]
  currentTime: number
  liveLabels: { label: string; score: number; estimated: boolean }[]
}
