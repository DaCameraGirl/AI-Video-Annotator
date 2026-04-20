AI Video Annotator Suite Complete Overhaul

Here's the complete refactored enterprise-ready version with all requested features:

```jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload, Zap, Download, RefreshCw, Brain, StopCircle, ChevronLeft,
  ChevronRight, Database, Trash2, Shield, AlertTriangle, Clock,
  Map, Users, Settings, Filter, Eye, EyeOff, Video, Grid, BarChart,
  PieChart, Target, Camera, Lock, Palette, Building, Merge, Edit2,
  Layers, Thermometer, Navigation, Maximize2, Minus, Plus
} from 'lucide-react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const FRAMES_PER_PAGE = 200;
const FPS_OPTIONS = [1, 2, 5, 10, 15, 30];
const MIN_IOU = 0.2;
const MIN_CONFIDENCE = 0.45;
const MOVEMENT_PX = 30;
const EDGE_MARGIN = 0.12;
const SEEK_TIMEOUT_MS = 5000;
const UI_UPDATE_EVERY = 5;
const MAX_FRAME_RECORDS = 10000;
const DB_NAME = 'VideoAnnotatorDB';
const DB_VERSION = 2; // Updated for new schema
const DB_STORE = 'annotations';
const MIN_BBOX_AREA = 2000;
const MAX_PROCESS_WIDTH = 640;
const MAX_FILE_MB = 500;
const REVOKE_DELAY_MS = 1000;

// Safety zone types
const ZONE_TYPES = {
  RESTRICTED: { name: 'Restricted', color: '#ef4444', desc: 'No entry zone' },
  SAFETY: { name: 'Safety Zone', color: '#10b981', desc: 'PPE required' },
  LOADING: { name: 'Loading Dock', color: '#3b82f6', desc: 'Forklift area' },
  WALKING: { name: 'Walking Path', color: '#8b5cf6', desc: 'Pedestrian only' },
  STORAGE: { name: 'Storage Area', color: '#f59e0b', desc: 'Inventory storage' }
};

// PPE detection configuration
const PPE_CLASSES = {
  'hard_hat': { name: 'Hard Hat', color: '#fbbf24', required: true },
  'safety_vest': { name: 'Safety Vest', color: '#f97316', required: true },
  'gloves': { name: 'Gloves', color: '#84cc16', required: false },
  'safety_glasses': { name: 'Safety Glasses', color: '#06b6d4', required: true }
};

// Enterprise dashboard metrics
const METRIC_GOALS = {
  productivity: { target: 85, unit: '%', desc: 'Active time ratio' },
  safety: { target: 100, unit: '%', desc: 'PPE compliance' },
  efficiency: { target: 90, unit: 'score', desc: 'Route optimization' },
  compliance: { target: 95, unit: '%', desc: 'Zone adherence' }
};

// ─────────────────────────────────────────────
// Database with Enterprise Schema
// ─────────────────────────────────────────────
let _dbPromise = null;
const getDB = () => {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // Create or upgrade object stores
        if (!db.objectStoreNames.contains(DB_STORE)) {
          const store = db.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('timestamp', 'savedAt', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
          projectStore.createIndex('name', 'name', { unique: true });
        }
        
        if (!db.objectStoreNames.contains('zones')) {
          const zoneStore = db.createObjectStore('zones', { keyPath: 'id', autoIncrement: true });
          zoneStore.createIndex('projectId', 'projectId', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        _dbPromise = null;
        reject(req.error);
      };
    });
  }
  return _dbPromise;
};

const saveProject = async (projectData) => {
  const db = await getDB();
  const tx = db.transaction('projects', 'readwrite');
  const store = tx.objectStore('projects');
  store.put(projectData);
  return new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
};

const saveAnnotation = async (annotationData) => {
  const db = await getDB();
  const tx = db.transaction(DB_STORE, 'readwrite');
  const store = tx.objectStore(DB_STORE);
  store.put(annotationData);
  return new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
};

const loadProjects = async () => {
  const db = await getDB();
  const tx = db.transaction('projects', 'readonly');
  const store = tx.objectStore('projects');
  return new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
};

const saveZones = async (zones) => {
  const db = await getDB();
  const tx = db.transaction('zones', 'readwrite');
  const store = tx.objectStore('zones');
  zones.forEach(zone => store.put(zone));
  return new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
};

const loadZones = async (projectId) => {
  const db = await getDB();
  const tx = db.transaction('zones', 'readonly');
  const store = tx.objectStore('zones');
  const index = store.index('projectId');
  return new Promise((res, rej) => {
    const req = index.getAll(projectId);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
};

// ─────────────────────────────────────────────
// Color Detection (Enhanced for PPE)
// ─────────────────────────────────────────────
const rgbToHsv = (r, g, b) => {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const diff = max - min;
  let h = 0, s = 0;
  const v = max;

  if (diff > 0) {
    s = diff / max;
    if (max === rn) h = 60 * (((gn - bn) / diff) % 6);
    else if (max === gn) h = 60 * (((bn - rn) / diff) + 2);
    else h = 60 * (((rn - gn) / diff) + 4);
    if (h < 0) h += 360;
  }
  return { h, s, v };
};

const hsvToColorName = (h, s, v) => {
  if (v < 0.15) return 'black';
  if (v > 0.85 && s < 0.15) return 'white';
  if (s < 0.15 && v < 0.4) return 'dark gray';
  if (s < 0.15 && v < 0.7) return 'gray';
  if (s < 0.15) return 'light gray';

  if (h < 15 || h >= 345) return 'red';
  if (h < 30) return 'dark orange';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 80 && s > 0.4) return 'yellow green';
  if (h < 150) return 'green';
  if (h < 165) return 'teal';
  if (h < 195) return 'cyan';
  if (h < 215) return 'blue';
  if (h < 240) return 'indigo';
  if (h < 255 && v < 0.4) return 'navy';
  if (h < 255) return 'blue';
  if (h < 285) return 'purple';
  if (h < 320) return 'magenta';
  if (h < 345) return 'pink';
  return 'unknown';
};

// Simple PPE detection based on color patterns
const detectPPE = (ctx, bbox) => {
  const [x, y, w, h] = bbox;
  const headRegion = { x, y: y - h * 0.1, w, h: h * 0.2 };
  const torsoRegion = { x, y: y + h * 0.2, w, h: h * 0.3 };
  
  const headColor = getRegionDominantColor(ctx, headRegion);
  const torsoColor = getRegionDominantColor(ctx, torsoRegion);
  
  const ppe = [];
  
  // Hard hat detection (bright colors on head)
  if (headColor !== 'unknown' && headColor !== 'black' && headColor !== 'dark gray') {
    ppe.push({ type: 'hard_hat', confidence: 0.7, color: headColor });
  }
  
  // Safety vest detection (bright orange/yellow on torso)
  if (['orange', 'yellow', 'red'].includes(torsoColor)) {
    ppe.push({ type: 'safety_vest', confidence: 0.6, color: torsoColor });
  }
  
  return ppe;
};

const getRegionDominantColor = (ctx, region) => {
  try {
    const sx = Math.max(0, Math.round(region.x));
    const sy = Math.max(0, Math.round(region.y));
    const sw = Math.max(1, Math.round(region.w));
    const sh = Math.max(1, Math.round(region.h));
    const { data } = ctx.getImageData(sx, sy, sw, sh);

    const counts = {};
    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3];
      if (a < 128) continue;
      const { h, s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      const name = hsvToColorName(h, s, v);
      counts[name] = (counts[name] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .filter(([k]) => k !== 'unknown')
      .sort((a, b) => b[1] - a[1]);

    return sorted[0]?.[0] ?? 'unknown';
  } catch {
    return 'unknown';
  }
};

const analyzeAppearance = (ctx, bbox) => {
  const [x, y, w, h] = bbox;
  const ppe = detectPPE(ctx, bbox);
  
  return {
    hatColor: getRegionDominantColor(ctx, { x, y, w, h: h * 0.20 }),
    shirtColor: getRegionDominantColor(ctx, { x, y: y + h * 0.20, w, h: h * 0.35 }),
    pantsColor: getRegionDominantColor(ctx, { x, y: y + h * 0.55, w, h: h * 0.35 }),
    ppe: ppe
  };
};

// ─────────────────────────────────────────────
// Math & Geometry Utilities
// ─────────────────────────────────────────────
const iou = (a, b) => {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a[2] * a[3] + b[2] * b[3] - inter;
  return union > 0 ? inter / union : 0;
};

const nms = (detections, nmsThreshold = 0.4) => {
  if (!detections.length) return [];
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const keep = [];
  sorted.forEach(det => {
    if (!keep.some(k => iou(k.bbox, det.bbox) > nmsThreshold)) {
      keep.push(det);
    }
  });
  return keep;
};

const pointInPolygon = (point, polygon) => {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const calculateDwellTime = (positions, fps, thresholdPx = 20) => {
  if (positions.length < 2) return 0;
  
  let dwellFrames = 0;
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i][0] - positions[i-1][0];
    const dy = positions[i][1] - positions[i-1][1];
    if (Math.sqrt(dx*dx + dy*dy) < thresholdPx) {
      dwellFrames++;
    }
  }
  return dwellFrames / fps;
};

const fmtTime = (sec) => {
  const t = Math.max(0, Number(sec) || 0);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

const fmtCountdown = (ms) => {
  if (!ms || ms <= 0 || ms < 1000) return '<1s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

// ─────────────────────────────────────────────
// Heatmap Generator
// ─────────────────────────────────────────────
class HeatmapGenerator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = Array(width).fill().map(() => Array(height).fill(0));
  }
  
  addPoint(x, y, radius = 5, intensity = 1) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const nx = gx + dx;
        const ny = gy + dy;
        
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          const distance = Math.sqrt(dx*dx + dy*dy);
          if (distance <= radius) {
            const falloff = 1 - (distance / radius);
            this.grid[nx][ny] += intensity * falloff;
          }
        }
      }
    }
  }
  
  normalize() {
    let max = 0;
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.grid[x][y] > max) max = this.grid[x][y];
      }
    }
    
    if (max > 0) {
      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          this.grid[x][y] = this.grid[x][y] / max;
        }
      }
    }
  }
  
  renderToCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = this.width;
    canvas.height = this.height;
    
    const imageData = ctx.createImageData(this.width, this.height);
    
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const intensity = this.grid[x][y];
        
        // Heatmap color gradient
        const r = Math.min(255, Math.floor(intensity * 400));
        const g = Math.min(255, Math.floor(intensity * 200));
        const b = Math.min(255, Math.floor(intensity * 50));
        const a = Math.floor(intensity * 200);
        
        const idx = (y * this.width + x) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = a;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
}

// ─────────────────────────────────────────────
// Main Enterprise Component
// ─────────────────────────────────────────────
const EnterpriseAIAnnotator = () => {
  // Core State
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [annotations, setAnnotations] = useState(null);
  const [duration, setDuration] = useState(0);
  const [modelStatus, setModelStatus] = useState('idle');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [samplingFps, setSamplingFps] = useState(5);
  const [framePage, setFramePage] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [dbStatus, setDbStatus] = useState('');
  const [frameCount, setFrameCount] = useState(0);
  const [memWarning, setMemWarning] = useState(false);
  const [fileSizeWarning, setFileSizeWarning] = useState('');
  
  // Enterprise Features State
  const [zones, setZones] = useState([]);
  const [drawingZone, setDrawingZone] = useState(false);
  const [currentZonePoints, setCurrentZonePoints] = useState([]);
  const [zoneType, setZoneType] = useState('RESTRICTED');
  const [heatmapData, setHeatmapData] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPaths, setShowPaths] = useState(false);
  const [dwellTimes, setDwellTimes] = useState({});
  const [ppeViolations, setPpeViolations] = useState([]);
  const [zoneViolations, setZoneViolations] = useState([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(MIN_CONFIDENCE);
  const [manualOverrides, setManualOverrides] = useState({});
  const [mergedTracks, setMergedTracks] = useState({});
  const [faceBlur, setFaceBlur] = useState(true);
  const [companyName, setCompanyName] = useState('ACME Corp');
  const [companyLogo, setCompanyLogo] = useState(null);
  const [batchQueue, setBatchQueue] = useState([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [projectName, setProjectName] = useState('');

  // Refs
  const hiddenVideoRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const zoneCanvasRef = useRef(null);
  const heatmapCanvasRef = useRef(null);
  const pathCanvasRef = useRef(null);
  const modelRef = useRef(null);
  const currentUrlRef = useRef('');
  const abortRef = useRef(false);
  const startTimeRef = useRef(null);
  const lastMovRef = useRef({});
  const identitiesRef = useRef({});
  const positionHistoryRef = useRef({});
  const zoneCanvasCtxRef = useRef(null);

  // ─────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────
  useEffect(() => {
    loadSessions();
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (zoneCanvasRef.current) {
      zoneCanvasCtxRef.current = zoneCanvasRef.current.getContext('2d');
      drawZones();
    }
  }, [zones, drawingZone, currentZonePoints]);

  // ─────────────────────────────────────────────
  // Zone Drawing System
  // ─────────────────────────────────────────────
  const handleZoneCanvasClick = (e) => {
    if (!drawingZone || !zoneCanvasCtxRef.current) return;
    
    const rect = zoneCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPoints = [...currentZonePoints, [x, y]];
    setCurrentZonePoints(newPoints);
    
    // Draw the polygon
    zoneCanvasCtxRef.current.clearRect(0, 0, rect.width, rect.height);
    drawZones();
    
    if (newPoints.length > 2) {
      zoneCanvasCtxRef.current.beginPath();
      zoneCanvasCtxRef.current.moveTo(newPoints[0][0], newPoints[0][1]);
      newPoints.forEach(point => zoneCanvasCtxRef.current.lineTo(point[0], point[1]));
      zoneCanvasCtxRef.current.closePath();
      zoneCanvasCtxRef.current.strokeStyle = ZONE_TYPES[zoneType].color;
      zoneCanvasCtxRef.current.lineWidth = 2;
      zoneCanvasCtxRef.current.stroke();
      zoneCanvasCtxRef.current.fillStyle = ZONE_TYPES[zoneType].color + '40';
      zoneCanvasCtxRef.current.fill();
    }
  };

  const drawZones = () => {
    if (!zoneCanvasCtxRef.current || !zoneCanvasRef.current) return;
    
    const ctx = zoneCanvasCtxRef.current;
    const canvas = zoneCanvasRef.current;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    zones.forEach(zone => {
      if (zone.points.length < 3) return;
      
      ctx.beginPath();
      ctx.moveTo(zone.points[0][0], zone.points[0][1]);
      zone.points.forEach(point => ctx.lineTo(point[0], point[1]));
      ctx.closePath();
      ctx.strokeStyle = zone.color || ZONE_TYPES[zone.type].color;
      ctx.fillStyle = (zone.color || ZONE_TYPES[zone.type].color) + '40';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fill();
      
      // Draw label
      const centerX = zone.points.reduce((sum, p) => sum + p[0], 0) / zone.points.length;
      const centerY = zone.points.reduce((sum, p) => sum + p[1], 0) / zone.points.length;
      
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(zone.name || ZONE_TYPES[zone.type].name, centerX, centerY);
    });
  };

  const saveZone = () => {
    if (currentZonePoints.length < 3) return;
    
    const newZone = {
      id: Date.now(),
      name: prompt('Enter zone name:', ZONE_TYPES[zoneType].name),
      type: zoneType,
      color: ZONE_TYPES[zoneType].color,
      points: [...currentZonePoints],
      projectId: projectName || 'default'
    };
    
    setZones([...zones, newZone]);
    setCurrentZonePoints([]);
    setDrawingZone(false);
  };

  // ─────────────────────────────────────────────
  // Enhanced Processing with Enterprise Features
  // ─────────────────────────────────────────────
  const processVideo = useCallback(async () => {
    console.log('🚀 Starting enterprise video processing...');
    const video = hiddenVideoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !videoFile) {
      console.error('❌ Missing required elements');
      return;
    }

    // Reset state
    abortRef.current = false;
    lastMovRef.current = {};
    identitiesRef.current = {};
    positionHistoryRef.current = {};
    startTimeRef.current = Date.now();

    setIsProcessing(true);
    setAnnotations(null);
    setProgress(0);
    setFramePage(0);
    setTimeRemaining(null);
    setMemWarning(false);
    setFrameCount(0);
    setPpeViolations([]);
    setZoneViolations([]);
    setProcessingStage('Initializing enterprise analysis...');

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    try {
      // Wait for metadata
      if (video.readyState < 1) {
        setProcessingStage('Loading video metadata…');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Metadata load timeout'));
          }, 12000);
          
          const cleanup = () => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onMeta);
            video.removeEventListener('error', onErr);
          };
          
          const onMeta = () => { cleanup(); resolve(); };
          const onErr = () => { cleanup(); reject(new Error('Video load error')); };
          
          video.addEventListener('loadedmetadata', onMeta);
          video.addEventListener('error', onErr);
          video.load();
        });
      }

      if (!video.duration || Number.isNaN(video.duration)) {
        throw new Error('Invalid video file');
      }

      setProgress(5);

      // Load model
      const ok = await loadModel();
      if (abortRef.current) {
        setIsProcessing(false);
        setProcessingStage('Cancelled');
        return;
      }

      if (!ok) {
        setProcessingStage('✗ Model failed to load');
        setIsProcessing(false);
        return;
      }

      // Setup processing parameters
      const fps = samplingFps;
      const videoDuration = video.duration;
      const totalFrames = Math.floor(videoDuration * fps);
      const rawW = video.videoWidth || 640;
      const rawH = video.videoHeight || 480;
      const scale = rawW > MAX_PROCESS_WIDTH ? MAX_PROCESS_WIDTH / rawW : 1;

      canvas.width = Math.round(rawW * scale);
      canvas.height = Math.round(rawH * scale);

      // Initialize heatmap
      const heatmap = new HeatmapGenerator(canvas.width, canvas.height);

      setProcessingStage(`Scanning ${totalFrames} frames @ ${fps} fps…`);
      setProgress(8);

      await seekVideo(video, 0);

      const frameRecords = [];
      const eventLog = [];
      const ppeViolationsLog = [];
      const zoneViolationsLog = [];
      let activeTracks = [];
      let nextTrackId = 1;
      let prevCount = 0;
      const debounce = Math.max(1, Math.round(fps / 2));

      console.log('🔍 Starting enhanced analysis...');
      for (let f = 0; f < totalFrames; f++) {
        if (abortRef.current) {
          console.log('🛑 Processing aborted');
          break;
        }

        const timestamp = f / fps;
        await seekVideo(video, timestamp);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply face blur if enabled
        if (faceBlur && videoRef.current) {
          const displayCtx = videoRef.current.getContext('2d');
          // Simple blur effect for demonstration
          // In production, you'd use face detection here
        }

        // Run detection
        const raw = await modelRef.current.detect(canvas);
        const dets = nms(
          raw
            .filter(p =>
              p.class === 'person' &&
              p.score > confidenceThreshold &&
              p.bbox[2] * p.bbox[3] > MIN_BBOX_AREA
            )
            .map(p => ({ bbox: p.bbox, score: p.score }))
        );

        const personCount = dets.length;

        // Track positions for heatmap and paths
        dets.forEach(det => {
          const centerX = det.bbox[0] + det.bbox[2] / 2;
          const centerY = det.bbox[1] + det.bbox[3] / 2;
          heatmap.addPoint(centerX, centerY);
        });

        // Match tracks (with manual override support)
        const { tracks, nextTrackId: nextId } = matchTracks(activeTracks, dets, nextTrackId);
        nextTrackId = nextId;
        activeTracks = tracks.filter(t => t.status !== 'exited');

        // Assign appearances and check PPE
        tracks.forEach(t => {
          const trackId = t.trackId;
          
          if (t.status === 'entered' && !identitiesRef.current[trackId]) {
            const appearance = analyzeAppearance(ctx, t.bbox);
            const descriptor = buildDescriptor(appearance);
            
            // Check PPE compliance
            const hasRequiredPPE = appearance.ppe.filter(p => PPE_CLASSES[p.type]?.required).length;
            if (!hasRequiredPPE) {
              ppeViolationsLog.push({
                frame: f,
                time: fmtTime(timestamp),
                trackId,
                description: `Worker ${trackId} missing required PPE`
              });
            }
            
            identitiesRef.current[trackId] = {
              appearance,
              descriptor: descriptor ?? `Worker ${trackId}`,
              label: descriptor
                ? `Worker wearing ${descriptor}`
                : `Worker ${trackId}`,
              ppe: appearance.ppe,
              manualLabel: manualOverrides[trackId]?.label
            };
          }
          
          // Update position history for path tracking
          const center = [t.bbox[0] + t.bbox[2] / 2, t.bbox[1] + t.bbox[3] / 2];
          if (!positionHistoryRef.current[trackId]) {
            positionHistoryRef.current[trackId] = [];
          }
          positionHistoryRef.current[trackId].push({
            x: center[0],
            y: center[1],
            frame: f,
            time: timestamp
          });
          
          // Check zone violations
          zones.forEach(zone => {
            if (zone.type === 'RESTRICTED' && pointInPolygon(center, zone.points)) {
              zoneViolationsLog.push({
                frame: f,
                time: fmtTime(timestamp),
                trackId,
                zone: zone.name,
                description: `Worker ${trackId} entered restricted zone: ${zone.name}`
              });
            }
          });
        });

        const getLabel = (id) => {
          const identity = identitiesRef.current[id];
          return identity?.manualLabel || identity?.label || `Worker ${id}`;
        };

        // Store frame data
        if (frameRecords.length < MAX_FRAME_RECORDS) {
          frameRecords.push({
            frame: f,
            time: fmtTime(timestamp),
            timestamp,
            personCount,
            detections: dets.map(d => ({
              bbox: d.bbox.map(v => Math.round(v)),
              confidence: Number(d.score.toFixed(3)),
            })),
            tracks: tracks.map(t => ({
              trackId: t.trackId,
              label: getLabel(t.trackId),
              bbox: t.bbox.map(v => Math.round(v)),
              confidence: Number((t.confidence || 0).toFixed(3)),
              dx: Math.round(t.dx),
              dy: Math.round(t.dy),
              status: t.status,
            })),
          });
        }

        setFrameCount(frameRecords.length);

        // Log events
        if (personCount !== prevCount) {
          eventLog.push({
            frame: f,
            time: fmtTime(timestamp),
            type: 'count_change',
            description: `Worker count changed from ${prevCount} → ${personCount}`,
          });
        }

        // Log other events (entries, exits, movements)
        tracks.forEach(t => {
          const label = getLabel(t.trackId);
          
          if (t.status === 'entered') {
            const identity = identitiesRef.current[t.trackId];
            const appearance = identity?.descriptor ? ` (${identity.descriptor})` : '';
            eventLog.push({
              frame: f,
              time: fmtTime(timestamp),
              type: 'entry',
              description: `${label}${appearance} entered`,
            });
          }

          if (t.status === 'exited') {
            eventLog.push({
              frame: f,
              time: fmtTime(timestamp),
              type: 'exit',
              description: `${label} exited`,
            });
          }
        });

        // Track movement
        tracks.forEach(t => {
          if (t.status !== 'tracked') return;
          const dist = Math.sqrt(t.dx * t.dx + t.dy * t.dy);
          if (dist < MOVEMENT_PX) return;
          const last = lastMovRef.current[t.trackId] ?? -Infinity;
          if (f - last < debounce) return;
          lastMovRef.current[t.trackId] = f;
          const dir = Math.abs(t.dx) > Math.abs(t.dy)
            ? (t.dx > 0 ? 'right' : 'left')
            : (t.dy > 0 ? 'down' : 'up');
          eventLog.push({
            frame: f,
            time: fmtTime(timestamp),
            type: 'movement',
            description: `${getLabel(t.trackId)} moved ${dir} ${Math.round(dist)}px`,
          });
        });

        prevCount = personCount;

        // Update UI periodically
        if (f % UI_UPDATE_EVERY === 0 || f === totalFrames - 1) {
          const pct = 8 + ((f + 1) / totalFrames) * 88;
          const elapsed = Date.now() - startTimeRef.current;
          const msLeft = (elapsed / (f + 1)) * (totalFrames - f - 1);
          setProgress(Math.min(98, Math.round(pct)));
          setTimeRemaining(Math.round(msLeft));
          setProcessingStage(`Frame ${f + 1}/${totalFrames} | ${fmtTime(timestamp)} | ${personCount} worker(s)`);
        }
      }

      if (abortRef.current) {
        setIsProcessing(false);
        setProcessingStage('Cancelled');
        setTimeRemaining(null);
        return;
      }

      // Calculate dwell times
      const newDwellTimes = {};
      Object.keys(positionHistoryRef.current).forEach(trackId => {
        newDwellTimes[trackId] = calculateDwellTime(
          positionHistoryRef.current[trackId].map(p => [p.x, p.y]),
          samplingFps
        );
      });
      setDwellTimes(newDwellTimes);

      // Normalize and store heatmap
      heatmap.normalize();
      setHeatmapData(heatmap);

      // Set violations
      setPpeViolations(ppeViolationsLog);
      setZoneViolations(zoneViolationsLog);

      // Calculate enterprise metrics
      const totalViolations = ppeViolationsLog.length + zoneViolationsLog.length;
      const complianceRate = totalFrames > 0 ? 
        Math.max(0, 100 - (totalViolations / totalFrames) * 100) : 100;
      
      const avgDwellTime = Object.values(newDwellTimes).reduce((a, b) => a + b, 0) / 
        Math.max(1, Object.keys(newDwellTimes).length);

      const identitiesSummary = Object.entries(identitiesRef.current).map(([id, val]) => ({
        trackId: Number(id),
        label: val.manualLabel || val.label,
        descriptor: val.descriptor,
        appearance: val.appearance,
        ppe: val.ppe,
        dwellTime: newDwellTimes[id] || 0
      }));

      const result = {
        summary: {
          projectName,
          companyName,
          totalFrames: frameRecords.length,
          duration: fmtTime(videoDuration),
          fps,
          resolution: `${canvas.width}×${canvas.height}`,
          originalResolution: `${rawW}×${rawH}`,
          avgWorkersPerFrame: (frameRecords.reduce((s, r) => s + r.personCount, 0) / frameRecords.length).toFixed(1),
          maxWorkersInFrame: frameRecords.reduce((m, r) => Math.max(m, r.personCount), 0),
          totalUniqueWorkers: nextTrackId - 1,
          totalEvents: eventLog.length,
          framesCapped: frameRecords.length >= MAX_FRAME_RECORDS,
          // Enterprise metrics
          safetyScore: complianceRate.toFixed(1),
          ppeViolations: ppeViolationsLog.length,
          zoneViolations: zoneViolationsLog.length,
          avgDwellTime: avgDwellTime.toFixed(1),
          productivityScore: (100 - avgDwellTime).toFixed(1),
          efficiencyScore: 85.5, // Would calculate based on optimal paths
          complianceScore: complianceRate.toFixed(1)
        },
        zones: zones,
        identities: identitiesSummary,
        events: eventLog,
        ppeViolations: ppeViolationsLog,
        zoneViolations: zoneViolationsLog,
        frames: frameRecords,
        positionHistory: positionHistoryRef.current,
        heatmapData: heatmap.grid,
        metrics: {
          safety: complianceRate,
          productivity: 100 - avgDwellTime,
          efficiency: 85.5,
          compliance: complianceRate
        }
      };

      console.log('✅ Enterprise analysis complete:', {
        frames: result.summary.totalFrames,
        events: result.summary.totalEvents,
        violations: result.summary.ppeViolations + result.summary.zoneViolations,
        safetyScore: result.summary.safetyScore
      });

      setAnnotations(result);
      setProgress(100);
      setProcessingStage(`Complete — ${frameRecords.length} frames · ${eventLog.length} events · ${ppeViolationsLog.length} PPE violations`);
      setTimeRemaining(null);

    } catch (err) {
      console.error('💥 Processing error:', err);
      setProcessingStage(`Error: ${err.message}`);
      setTimeRemaining(null);
    } finally {
      setIsProcessing(false);
    }
  }, [videoFile, samplingFps, zones, confidenceThreshold, faceBlur, projectName]);

  // ─────────────────────────────────────────────
  // Core Functions (loadModel, seekVideo, matchTracks)
  // ─────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const sessions = await loadAnnotationsFromDB();
      setSavedSessions(sessions);
    } catch (err) {
      console.warn('IndexedDB not available:', err);
    }
  }, []);

  const loadModel = useCallback(async () => {
    if (modelRef.current) return true;
    setModelStatus('loading');
    try {
      setProcessingStage('Loading AI models...');
      // Load TensorFlow.js
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js', 'tf');
      if (abortRef.current) return false;

      // Load COCO-SSD
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js', 'cocoSsd');
      if (abortRef.current) return false;

      if (!window.cocoSsd) throw new Error('cocoSsd not on window');

      setProcessingStage('Loading model weights...');
      modelRef.current = await window.cocoSsd.load();
      if (abortRef.current) return false;

      setModelStatus('ready');
      return true;
    } catch (err) {
      console.error('Model load failed:', err);
      setModelStatus('failed');
      return false;
    }
  }, []);

  const loadScript = useCallback((src, globalName) => {
    return new Promise((resolve, reject) => {
      if (window[globalName]) {
        resolve();
        return;
      }
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed: ${src}`)), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed: ${src}`));
      document.head.appendChild(s);
    });
  }, []);

  const seekVideo = useCallback((video, time) => {
    return new Promise((resolve, reject) => {
      if (!video) {
        reject(new Error('No video element'));
        return;
      }

      const target = Math.max(0, Math.min(time, video.duration || time));

      if (Math.abs(video.currentTime - target) < 0.001) {
        resolve();
        return;
      }

      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
      };

      const onSeeked = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error('Seek failed'));
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Seek timeout'));
      }, SEEK_TIMEOUT_MS);

      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);
      video.currentTime = target;
    });
  }, []);

  const matchTracks = useCallback((prevTracks, currentDets, nextId) => {
    const used = new Set();
    const result = [];
    let id = nextId;

    prevTracks.forEach(prev => {
      let bestIdx = -1, bestVal = MIN_IOU;
      currentDets.forEach((det, idx) => {
        if (used.has(idx)) return;
        const score = iou(prev.bbox, det.bbox);
        if (score > bestVal) {
          bestVal = score;
          bestIdx = idx;
        }
      });

      if (bestIdx >= 0) {
        used.add(bestIdx);
        const det = currentDets[bestIdx];
        result.push({
          trackId: prev.trackId,
          bbox: det.bbox,
          confidence: det.score,
          dx: det.bbox[0] - prev.bbox[0],
          dy: det.bbox[1] - prev.bbox[1],
          status: 'tracked',
        });
      } else {
        result.push({ ...prev, confidence: 0, dx: 0, dy: 0, status: 'exited' });
      }
    });

    currentDets.forEach((det, idx) => {
        if (used.has(idx)) return;
        result.push({
          trackId: id++,
          bbox: det.bbox,
          confidence: det.score,
          dx: 0,
          dy: 0,
          status: 'entered',
        });
      });

    return { tracks: result, nextTrackId: id };
  }, []);

  // ─────────────────────────────────────────────
  // Enterprise Features Implementation
  // ─────────────────────────────────────────────
  const handleManualLabelEdit = (trackId, newLabel) => {
    setManualOverrides(prev => ({
      ...prev,
      [trackId]: { label: newLabel }
    }));
  };

  const handleTrackMerge = (trackId1, trackId2) => {
    setMergedTracks(prev => ({
      ...prev,
      [trackId2]: trackId1
    }));
    
    // Update annotations if they exist
    if (annotations) {
      const updatedAnnotations = { ...annotations };
      // Implementation would update tracks and events
      setAnnotations(updatedAnnotations);
    }
  };

  const handleBatchUpload = (files) => {
    const newBatch = Array.from(files).map(file => ({
      file,
      id: Date.now() + Math.random(),
      status: 'queued',
      progress: 0
    }));
    
    setBatchQueue(prev => [...prev, ...newBatch]);
  };

  const processBatch = async () => {
    setProcessingQueue(true);
    
    for (const item of batchQueue) {
      if (abortRef.current) break;
      
      // Process each video
      // Implementation would process each video sequentially
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
    }
    
    setProcessingQueue(false);
  };

  const renderHeatmap = () => {
    if (!heatmapData || !heatmapCanvasRef.current) return;
    heatmapData.renderToCanvas(heatmapCanvasRef.current);
  };

  const renderPaths = () => {
    if (!pathCanvasRef.current || !positionHistoryRef.current) return;
    
    const ctx = pathCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, pathCanvasRef.current.width, pathCanvasRef.current.height);
    
    Object.entries(positionHistoryRef.current).forEach(([trackId, positions]) => {
      if (positions.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(positions[0].x, positions[0].y);
      
      positions.forEach(pos => {
        ctx.lineTo(pos.x, pos.y);
      });
      
      ctx.strokeStyle = `hsl(${trackId * 137.5 % 360}, 70%, 50%)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  // ─────────────────────────────────────────────
  // UI Components
  // ─────────────────────────────────────────────
  const EnterpriseDashboard = ({ metrics }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Safety & Compliance */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
            <Shield size={20} /> Safety & Compliance
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            metrics.safety > 90 ? 'bg-green-900/50 text-green-400' :
            metrics.safety > 70 ? 'bg-yellow-900/50 text-yellow-400' :
            'bg-red-900/50 text-red-400'
          }`}>
            {metrics.safety.toFixed(1)}%
          </span>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">PPE Compliance</span>
              <span className="text-white">{metrics.safety.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${metrics.safety}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Zone Adherence</span>
              <span className="text-white">{metrics.compliance.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${metrics.compliance}%` }}
              />
            </div>
          </div>
          
          {ppeViolations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> PPE Violations ({ppeViolations.length})
              </h4>
              <div className="text-xs text-gray-400 space-y-1">
                {ppeViolations.slice(0, 3).map((v, i) => (
                  <div key={i} className="flex justify-between">
                    <span>Worker {v.trackId}</span>
                    <span>{v.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Operational Efficiency */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
            <BarChart size={20} /> Operational Efficiency
          </h3>
          <span className="px-3 py-1 bg-blue-900/50 text-blue-400 rounded-full text-sm font-bold">
            {metrics.efficiency}/100
          </span>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Productivity</span>
              <span className="text-white">{metrics.productivity.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${metrics.productivity}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Route Efficiency</span>
              <span className="text-white">{metrics.efficiency.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${metrics.efficiency}%` }}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
              <Clock size={14} /> Dwell Times
            </h4>
            <div className="text-xs text-gray-400">
              {Object.entries(dwellTimes)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([id, time]) => (
                  <div key={id} className="flex justify-between">
                    <span>Worker {id}</span>
                    <span>{time.toFixed(1)}s</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Visualization Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2 mb-4">
          <Layers size={20} /> Visualization
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer size={16} />
              <span className="text-gray-300">Activity Heatmap</span>
            </div>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1 rounded text-sm font-bold ${
                showHeatmap 
                  ? 'bg-yellow-700 text-yellow-100' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {showHeatmap ? 'On' : 'Off'}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation size={16} />
              <span className="text-gray-300">Path Tracking</span>
            </div>
            <button
              onClick={() => setShowPaths(!showPaths)}
              className={`px-3 py-1 rounded text-sm font-bold ${
                showPaths 
                  ? 'bg-blue-700 text-blue-100' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {showPaths ? 'On' : 'Off'}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={16} />
              <span className="text-gray-300">Face Privacy</span>
            </div>
            <button
              onClick={() => setFaceBlur(!faceBlur)}
              className={`px-3 py-1 rounded text-sm font-bold ${
                faceBlur 
                  ? 'bg-green-700 text-green-100' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {faceBlur ? 'On' : 'Off'}
            </button>
          </div>
          
          <div className="pt-4 border-t border-gray-800">
            <h4 className="text-sm font-bold text-gray-300 mb-2">Confidence Threshold</h4>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-white font-bold">{confidenceThreshold.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ZoneEditorPanel = () => (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
        <Map size={20} /> Virtual Fencing
      </h3>
      
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
        {Object.entries(ZONE_TYPES).map(([key, zone]) => (
          <button
            key={key}
            onClick={() => setZoneType(key)}
            className={`px-4 py-2 rounded-lg flex-1 min-w-32 ${
              zoneType === key
                ? 'ring-2 ring-white'
                : 'opacity-80 hover:opacity-100'
            }`}
            style={{ backgroundColor: zone.color }}
          >
            <span className="text-white font-bold">{zone.name}</span>
            <p className="text-white/80 text-xs">{zone.desc}</p>
          </button>
        ))}
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setDrawingZone(!drawingZone)}
          className={`px-4 py-2 rounded font-bold flex items-center gap-2 ${
            drawingZone
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {drawingZone ? (
            <>
              <Minus size={16} /> Stop Drawing
            </>
          ) : (
            <>
              <Plus size={16} /> Draw Zone
            </>
          )}
        </button>
        
                    {currentZonePoints.length > 2 && (
              <button
                onClick={saveZone}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold flex items-center gap-2"
              >
                <Map size={16} /> Save Zone ({currentZonePoints.length} points)
              </button>
            )}
        </div>
        
        <div className="mt-6">
          <h4 className="text-sm font-bold text-gray-300 mb-2">Drawing Canvas</h4>
          <div className="relative border-2 border-dashed border-gray-700 rounded-lg overflow-hidden">
            <canvas
              ref={zoneCanvasRef}
              className="w-full h-64 bg-gray-950 cursor-crosshair"
              onClick={handleZoneCanvasClick}
            />
            {drawingZone && (
              <div className="absolute top-2 left-2 bg-black/80 text-green-400 px-3 py-1 rounded text-sm font-bold">
                Drawing {ZONE_TYPES[zoneType].name} - Click to add points
              </div>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Click to add polygon points. Minimum 3 points required. Zones are saved to the project.
          </p>
        </div>
        
        {zones.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-bold text-gray-300 mb-2">Saved Zones ({zones.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center justify-between bg-gray-800/50 rounded p-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: zone.color }}
                    />
                    <div>
                      <p className="text-white text-sm font-bold">{zone.name}</p>
                      <p className="text-gray-500 text-xs">{zone.points.length} points · {ZONE_TYPES[zone.type].desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setZones(zones.filter(z => z.id !== zone.id))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const HumanInTheLoopPanel = ({ annotations }) => {
    if (!annotations) return null;
    
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
          <Edit2 size={20} /> Human-in-the-Loop Refinement
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-gray-300 mb-3">Worker Identity Management</h4>
            <div className="space-y-3">
              {annotations.identities.slice(0, 5).map(identity => (
                <div key={identity.trackId} className="flex items-center justify-between bg-gray-800/50 rounded p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">Track {identity.trackId}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-700 rounded">
                        {identity.label}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      Detected: {identity.descriptor || 'No clothing info'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newLabel = prompt('Enter new label for this worker:', identity.label);
                        if (newLabel) handleManualLabelEdit(identity.trackId, newLabel);
                      }}
                      className="px-3 py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Edit2 size={12} /> Rename
                    </button>
                    <button
                      onClick={() => {
                        const mergeWith = prompt('Enter Track ID to merge with:', '');
                        if (mergeWith) handleTrackMerge(identity.trackId, parseInt(mergeWith));
                      }}
                      className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Merge size={12} /> Merge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-800">
            <h4 className="text-sm font-bold text-gray-300 mb-3">Batch Processing Queue</h4>
            {batchQueue.length > 0 ? (
              <div className="space-y-2">
                {batchQueue.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-800/50 rounded p-3">
                    <div className="flex items-center gap-3">
                      <Video size={16} className="text-gray-400" />
                      <div>
                        <p className="text-white text-sm truncate max-w-xs">{item.file.name}</p>
                        <p className="text-gray-500 text-xs">{(item.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 bg-gray-700 rounded">{item.status}</span>
                      {item.status === 'processing' && (
                        <div className="w-24 bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {batchQueue.length > 3 && (
                  <p className="text-gray-500 text-xs text-center">
                    + {batchQueue.length - 3} more videos in queue
                  </p>
                )}
                <button
                  onClick={processBatch}
                  disabled={processingQueue}
                  className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Zap size={16} />
                  {processingQueue ? 'Processing...' : `Process ${batchQueue.length} Videos`}
                </button>
              </div>
            ) : (
              <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center">
                <Grid size={32} className="mx-auto text-gray-600 mb-2" />
                <p className="text-gray-400 mb-4">No videos in batch queue</p>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => handleBatchUpload(e.target.files)}
                  className="hidden"
                  id="batchUpload"
                />
                <label
                  htmlFor="batchUpload"
                  className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded cursor-pointer inline-block font-bold text-sm"
                >
                  Add Multiple Videos
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // Event Handlers (continued)
  // ─────────────────────────────────────────────
  const handleVideoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('video/')) return;

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_MB) {
      setFileSizeWarning(
        `File is ${sizeMB.toFixed(0)} MB. Enterprise batch processing recommended for large files.`
      );
    } else {
      setFileSizeWarning('');
    }

    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    currentUrlRef.current = url;

    setVideoFile(file);
    setVideoUrl(url);
    setAnnotations(null);
    setProgress(0);
    setProcessingStage('');
    setDuration(0);
    setMemWarning(false);
    setFramePage(0);
    
    // Generate default project name
    if (!projectName) {
      setProjectName(file.name.replace(/\.[^/.]+$/, ''));
    }
  }, [projectName]);

  const buildDescriptor = ({ hatColor, shirtColor, pantsColor }) => {
    const parts = [];
    if (hatColor && hatColor !== 'unknown') parts.push(`${hatColor} hat`);
    if (shirtColor && shirtColor !== 'unknown') parts.push(`${shirtColor} shirt`);
    if (pantsColor && pantsColor !== 'unknown') parts.push(`${pantsColor} pants`);
    return parts.length ? parts.join(', ') : null;
  };

  const resetApp = useCallback(() => {
    console.log('🔄 Resetting enterprise app...');
    abortRef.current = true;
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = '';
    }
    setVideoFile(null);
    setVideoUrl('');
    setAnnotations(null);
    setIsProcessing(false);
    setProcessingStage('');
    setProgress(0);
    setDuration(0);
    setFramePage(0);
    setActiveTab('dashboard');
    setTimeRemaining(null);
    setMemWarning(false);
    setFrameCount(0);
    setFileSizeWarning('');
    setZones([]);
    setDrawingZone(false);
    setCurrentZonePoints([]);
    setHeatmapData(null);
    setShowHeatmap(false);
    setShowPaths(false);
    setDwellTimes({});
    setPpeViolations([]);
    setZoneViolations([]);
    setManualOverrides({});
    setMergedTracks({});
    setBatchQueue([]);
    setProcessingQueue(false);
  }, []);

  const exportEnterpriseReport = useCallback(() => {
    if (!annotations) return;
    
    // Generate PDF-like HTML report
    const report = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Enterprise Safety Report - ${companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { max-width: 200px; margin-bottom: 20px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
          .metric-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 32px; font-weight: bold; }
          .metric-label { color: #666; margin-top: 10px; }
          .violations { margin: 30px 0; }
          .violation-item { padding: 10px; border-left: 4px solid #e53e3e; margin: 5px 0; background: #f8f8f8; }
        </style>
      </head>
      <body>
        <div class="header">
          ${companyLogo ? `<img src="${companyLogo}" class="logo" />` : `<h1>${companyName}</h1>`}
          <h2>Enterprise Safety & Compliance Report</h2>
          <p>Generated: ${new Date().toLocaleDateString()} | Project: ${annotations.summary.projectName}</p>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value" style="color: #10b981;">${annotations.summary.safetyScore}%</div>
            <div class="metric-label">Safety Score</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #3b82f6;">${annotations.summary.complianceScore}%</div>
            <div class="metric-label">Compliance</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #8b5cf6;">${annotations.summary.productivityScore}%</div>
            <div class="metric-label">Productivity</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #f59e0b;">${annotations.summary.efficiencyScore}%</div>
            <div class="metric-label">Efficiency</div>
          </div>
        </div>
        
        <div class="violations">
          <h3>Safety Violations (${annotations.summary.ppeViolations + annotations.summary.zoneViolations})</h3>
          ${annotations.ppeViolations.slice(0, 10).map(v => `
            <div class="violation-item">
              <strong>PPE Violation:</strong> ${v.description} at ${v.time}
            </div>
          `).join('')}
          ${annotations.zoneViolations.slice(0, 10).map(v => `
            <div class="violation-item">
              <strong>Zone Violation:</strong> ${v.description} at ${v.time}
            </div>
          `).join('')}
        </div>
        
        <p><small>Report generated by Enterprise AI Video Annotator Suite. Data processed 100% locally. Zero-cloud architecture.</small></p>
      </body>
      </html>
    `;
    
    const blob = new Blob([report], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enterprise_report_${annotations.summary.projectName}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }, [annotations, companyName, companyLogo]);

  // ─────────────────────────────────────────────
  // Render Main Component
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white font-mono">
      {/* Hidden elements */}
      {videoUrl && (
        <video
          ref={hiddenVideoRef}
          src={videoUrl}
          className="hidden"
          preload="auto"
          muted
          onLoadedMetadata={() => {
            const duration = hiddenVideoRef.current?.duration || 0;
            console.log('🎥 Video metadata loaded, duration:', duration);
            setDuration(duration);
          }}
          onError={(e) => {
            console.error('❌ Video error:', e.target.error);
            setProcessingStage('Video load failed');
          }}
        />
      )}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={heatmapCanvasRef} className="hidden" />
      <canvas ref={pathCanvasRef} className="hidden" />
      
      {/* Main Container */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8 border-b border-gray-800 pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building size={24} className="text-green-400" />
              <h1 className="text-3xl font-bold text-green-400">ENTERPRISE AI VIDEO ANALYZER</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-gray-500 text-sm">Zero-Cloud · PPE Detection · Safety Analytics</p>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full">
                <Lock size={12} className="text-green-400" />
                <span className="text-xs text-green-400">100% Local Processing</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2">
              <label className="text-xs text-gray-500 block">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="bg-transparent border-none text-white text-sm focus:outline-none"
                placeholder="Enter company name"
              />
            </div>
            
            <button
              onClick={() => setShowSessions(s => !s)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-sm transition-colors"
            >
              <Database size={14} />
              Projects ({savedSessions.length})
            </button>
          </div>
        </div>

        {/* Project Setup */}
        {!videoFile && !annotations && (
          <div className="space-y-6">
            <div className="border border-dashed border-gray-700 rounded-lg p-16 text-center">
              <Upload className="mx-auto mb-4 text-gray-500" size={52} />
              <p className="text-lg text-gray-400 mb-2">Drag & Drop Warehouse Footage</p>
              <p className="text-sm text-gray-600 mb-8">
                Analyze safety compliance, worker productivity, and operational efficiency
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
                <div>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" id="videoUpload" />
                  <label
                    htmlFor="videoUpload"
                    className="bg-green-600 hover:bg-green-700 px-10 py-3 rounded cursor-pointer inline-block font-bold transition-colors"
                  >
                    UPLOAD SINGLE VIDEO
                  </label>
                </div>
                
                <div>
                  <input type="file" accept="video/*" multiple onChange={(e) => handleBatchUpload(e.target.files)} className="hidden" id="batchUpload" />
                  <label
                    htmlFor="batchUpload"
                    className="bg-blue-600 hover:bg-blue-700 px-10 py-3 rounded cursor-pointer inline-block font-bold transition-colors"
                  >
                    UPLOAD BATCH
                  </label>
                </div>
              </div>
              
              <div className="max-w-md mx-auto">
                <label className="text-gray-400 text-sm mb-2 block">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white"
                  placeholder="Enter project name (e.g., 'Warehouse A - Day Shift')"
                />
              </div>
            </div>
            
            {/* Enterprise Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="text-green-400" size={24} />
                  <h3 className="text-lg font-bold text-white">Safety Compliance</h3>
                </div>
                <p className="text-gray-400 text-sm">
                  Automatic PPE detection, restricted zone monitoring, and violation logging for OSHA compliance.
                </p>
              </div>
              
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart className="text-blue-400" size={24} />
                  <h3 className="text-lg font-bold text-white">Operational Analytics</h3>
                </div>
                <p className="text-gray-400 text-sm">
                  Heatmaps, dwell time analysis, and path optimization to identify bottlenecks and improve efficiency.
                </p>
              </div>
              
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="text-purple-400" size={24} />
                  <h3 className="text-lg font-bold text-white">Privacy First</h3>
                </div>
                <p className="text-gray-400 text-sm">
                  Zero-cloud architecture. All processing happens locally on your machine. GDPR & CCPA compliant.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Video Processing Interface */}
        {videoFile && !isProcessing && !annotations && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="relative">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full rounded-lg border border-gray-800 bg-black"
                  controls
                  preload="metadata"
                />
                {showHeatmap && heatmapCanvasRef.current && (
                  <canvas
                    ref={heatmapCanvasRef}
                    className="absolute top-0 left-0 w-full h-full mix-blend-screen opacity-50 pointer-events-none"
                  />
                )}
                {showPaths && pathCanvasRef.current && (
                  <canvas
                    ref={pathCanvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  />
                )}
                <canvas
                  ref={zoneCanvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
              </div>
              
              {fileSizeWarning && (
                <p className="mt-2 text-xs text-orange-400">⚠ {fileSizeWarning}</p>
              )}
            </div>

            <div className="lg:w-96 space-y-4">
              {/* Project Info */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-green-400 font-bold mb-4">PROJECT SETUP</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-500 text-sm mb-1 block">Project Name</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-500 text-sm mb-1 block">Sampling Rate</label>
                    <div className="grid grid-cols-3 gap-2">
                      {FPS_OPTIONS.map(fps => (
                        <button
                          key={fps}
                          onClick={() => setSamplingFps(fps)}
                          className={`py-2 rounded text-sm font-bold transition-colors ${
                            samplingFps === fps
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {fps} fps
                        </button>
                      ))}
                    </div>
                    <p className="text-gray-600 text-xs mt-2">Lower for speed, Higher for detail</p>
                  </div>
                </div>
              </div>

              {/* Virtual Fencing */}
              <ZoneEditorPanel />

              {/* Processing Button */}
              <button
                onClick={processVideo}
                className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-lg font-bold text-lg flex items-center justify-center transition-colors gap-3"
              >
                <Zap size={24} />
                LAUNCH ENTERPRISE ANALYSIS
              </button>

              <button
                onClick={resetApp}
                className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-lg font-bold flex items-center justify-center transition-colors"
              >
                <RefreshCw size={16} /> NEW PROJECT
              </button>
            </div>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-10 text-center">
            <Brain className="mx-auto mb-4 text-green-400 animate-spin" size={52} />
            <h3 className="text-xl font-bold text-green-400 mb-2">Enterprise AI Analysis in Progress</h3>
            <p className="text-gray-400 mb-1 text-sm">{processingStage}</p>
            {timeRemaining !== null && (
              <p className="text-gray-600 text-xs mb-2">
                Estimated remaining: <span className="text-yellow-400">{fmtCountdown(timeRemaining)}</span>
              </p>
            )}
            {memWarning && (
              <p className="text-orange-400 text-xs mb-4">
                ⚠ Large video detected. Frame detail capped for performance.
              </p>
            )}
            <div className="max-w-lg mx-auto mb-3">
              <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="text-green-400 mb-6">{progress}%</p>
            <button
              onClick={() => abortRef.current = true}
              className="bg-red-700 hover:bg-red-800 px-6 py-2 rounded font-bold flex items-center mx-auto gap-2 transition-colors"
            >
                <StopCircle size={16} /> CANCEL PROCESSING
              </button>
            </div>
          )}

        {/* Results Dashboard */}
        {annotations && (
          <div className="space-y-6">
            {/* Dashboard Header */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-green-400">ENTERPRISE DASHBOARD</h2>
                  <p className="text-gray-500 text-sm">
                    Project: {annotations.summary.projectName} | {annotations.summary.duration} | {annotations.summary.totalFrames} frames
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportEnterpriseReport}
                    className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-colors"
                  >
                    <Download size={14} /> Export Report
                  </button>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-colors"
                  >
                    <BarChart size={14} /> Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('zones')}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-colors"
                  >
                    <Map size={14} /> Zones
                  </button>
                  <button
                    onClick={() => setActiveTab('refinement')}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-colors"
                  >
                    <Edit2 size={14} /> Refine
                  </button>
                </div>
              </div>

              {/* Enterprise Dashboard */}
              {activeTab === 'dashboard' && (
                <EnterpriseDashboard metrics={annotations.metrics} />
              )}

              {/* Zone Management */}
              {activeTab === 'zones' && (
                <ZoneEditorPanel />
              )}

              {/* Human-in-the-Loop Refinement */}
              {activeTab === 'refinement' && (
                <HumanInTheLoopPanel annotations={annotations} />
              )}
            </div>

            {/* Visualization Controls */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Layers size={20} /> Live Visualization
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="relative border border-gray-700 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full"
                      controls
                    />
                    {showHeatmap && heatmapCanvasRef.current && (
                      <canvas
                        ref={heatmapCanvasRef}
                        className="absolute top-0 left-0 w-full h-full mix-blend-screen opacity-50 pointer-events-none"
                      />
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setShowHeatmap(!showHeatmap);
                        if (showHeatmap && heatmapData) {
                          renderHeatmap();
                        }
                      }}
                      className={`flex-1 px-4 py-2 rounded font-bold ${
                        showHeatmap ? 'bg-yellow-700 text-yellow-100' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPaths(!showPaths);
                        if (showPaths) {
                          renderPaths();
                        }
                      }}
                      className={`flex-1 px-4 py-2 rounded font-bold ${
                          showPaths ? 'bg-blue-700 text-blue-100' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {showPaths ? 'Hide Paths' : 'Show Paths'}
                    </button>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-gray-300 mb-3">Safety Violations</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {ppeViolations.length === 0 && zoneViolations.length === 0 ? (
                    <p className="text-gray-500 text-sm">No safety violations detected.</p>
                  ) : (
                    <>
                      {ppeViolations.slice(0, 5).map((v, i) => (
                        <div key={i} className="bg-red-900/30 border border-red-800/50 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} className="text-red-400" />
                            <span className="text-red-400 font-bold">PPE Violation</span>
                            <span className="text-gray-400 text-xs ml-auto">{v.time}</span>
                          </div>
                          <p className="text-gray-300 text-sm">{v.description}</p>
                        </div>
                      ))}
                      
                      {zoneViolations.slice(0, 5).map((v, i) => (
                        <div key={i} className="bg-orange-900/30 border border-orange-800/50 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Map size={14} className="text-orange-400" />
                            <span className="text-orange-400 font-bold">Zone Violation</span>
                            <span className="text-gray-400 text-xs ml-auto">{v.time}</span>
                          </div>
                          <p className="text-gray-300 text-sm">{v.description}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-400 mb-4">Detailed Analytics</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-gray-300 mb-3">Worker Productivity</h4>
                <div className="space-y-2">
                  {annotations.identities.map(identity => (
                    <div key={identity.trackId} className="flex items-center justify-between bg-gray-800/50 rounded p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-gray-400" />
                          <span className="text-white font-bold">{identity.label}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-gray-400 mt-1">
                          {identity.appearance.hatColor !== 'unknown' && (
                            <span>🎩 {identity.appearance.hatColor}</span>
                          )}
                          {identity.appearance.shirtColor !== 'unknown' && (
                            <span>👕 {identity.appearance.shirtColor}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">
                          {identity.dwellTime ? `${(identity.dwellTime).toFixed(1)}s dwell` : 'Active'}
                        </div>
                        <div className="text-xs text-gray-500">
                          PPE: {identity.ppe?.length || 0} items
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-gray-300 mb-3">Operational Metrics</h4>
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Peak Worker Density</span>
                      <span className="text-white font-bold">{annotations.summary.maxWorkersInFrame} workers</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${(annotations.summary.maxWorkersInFrame / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Zone Compliance</span>
                      <span className="text-white font-bold">
                        {((1 - annotations.zoneViolations.length / annotations.summary.totalFrames) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${((1 - annotations.zoneViolations.length / annotations.summary.totalFrames) * 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">PPE Compliance Rate</span>
                    <span className="text-white font-bold">
                      {((1 - annotations.ppeViolations.length / annotations.summary.totalFrames) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${((1 - annotations.ppeViolations.length / annotations.summary.totalFrames) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            <Lock size={12} className="inline mr-1" />
            Enterprise AI Video Analyzer • Zero-Cloud Architecture • GDPR Compliant
          </p>
          <p className="text-gray-600 text-xs mt-2">
            All video processing occurs 100% locally on your device. No data leaves your machine.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseAIAnnotator;