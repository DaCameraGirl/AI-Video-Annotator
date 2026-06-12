// The live stage: a <video> with a transparent <canvas> overlay. On every
// detection tick it runs the detector on the current frame, updates the tracker
// / zone monitor / heatmap, draws the overlay, and throttles a snapshot up to
// React for the dashboard. In "draw zone" mode the overlay captures the mouse so
// the user can rubber-band a virtual fence.

import { useEffect, useRef } from 'react'
import type { ObjectDetection } from '@tensorflow-models/coco-ssd'
import type {
  AnalysisSnapshot,
  BBox,
  Detection,
  Settings,
  Zone,
  ZoneEvent,
} from '../types'
import { Tracker } from '../lib/tracking'
import { ZoneMonitor, rectFromDrag } from '../lib/zones'
import { HeatmapAccumulator } from '../lib/heatmap'
import { detectFrame } from '../ml/runInference'
import { drawOverlay } from './CanvasOverlay'

export interface VideoPlayerProps {
  videoUrl: string
  model: ObjectDetection | null
  settings: Settings
  zones: Zone[]
  drawMode: boolean
  /** Bump to clear tracker/heatmap/events without changing the video. */
  resetKey: number
  onCreateZone: (rect: BBox) => void
  onSnapshot: (snap: AnalysisSnapshot) => void
  onDuration: (seconds: number) => void
}

export default function VideoPlayer(props: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const procRef = useRef<HTMLCanvasElement | null>(null)

  // Engine state lives in refs so the rAF loop never re-subscribes.
  const tracker = useRef(new Tracker())
  const monitor = useRef(new ZoneMonitor())
  const heat = useRef(new HeatmapAccumulator())
  const events = useRef<ZoneEvent[]>([])
  const frames = useRef(0)
  const lastDets = useRef<Detection[]>([])
  const occupancy = useRef<Map<number, number>>(new Map())
  const draft = useRef<BBox | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const busy = useRef(false)
  const lastDetectAt = useRef(0)
  const lastSnapAt = useRef(0)

  // Latest props for the loop / handlers, refreshed after each render so the
  // long-lived rAF loop and pointer handlers always see current values. Updated
  // in an effect (never mutated during render).
  const settingsRef = useRef(props.settings)
  const zonesRef = useRef(props.zones)
  const modelRef = useRef(props.model)
  const drawModeRef = useRef(props.drawMode)
  const cbRef = useRef(props)
  useEffect(() => {
    settingsRef.current = props.settings
    zonesRef.current = props.zones
    modelRef.current = props.model
    drawModeRef.current = props.drawMode
    cbRef.current = props
  })

  function getProc(): HTMLCanvasElement {
    if (!procRef.current) procRef.current = document.createElement('canvas')
    return procRef.current
  }

  function redraw() {
    const video = videoRef.current
    const overlay = overlayRef.current
    if (!video || !overlay || !video.videoWidth) return
    const cssW = video.clientWidth
    const cssH = video.clientHeight
    if (cssW === 0 || cssH === 0) return
    const dpr = window.devicePixelRatio || 1
    const bw = Math.round(cssW * dpr)
    const bh = Math.round(cssH * dpr)
    if (overlay.width !== bw || overlay.height !== bh) {
      overlay.width = bw
      overlay.height = bh
      overlay.style.width = `${cssW}px`
      overlay.style.height = `${cssH}px`
    }
    const ctx = overlay.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    heat.current.setDims(video.videoWidth, video.videoHeight)
    drawOverlay({
      ctx,
      cssW,
      cssH,
      scale: cssW / video.videoWidth,
      settings: settingsRef.current,
      detections: lastDets.current,
      zones: zonesRef.current,
      occupancy: occupancy.current,
      paths: tracker.current.summaries(),
      heatmap: heat.current,
      draft: draft.current,
    })
  }

  function pushSnapshot(ts: number, dets: Detection[]) {
    const summaries = tracker.current.summaries()
    const workerTracks = summaries.filter((t) => t.category === 'personnel')
    const vestTracks = workerTracks.filter((t) => t.estimates.includes('safety vest'))
    const intrusions = events.current.filter((e) => e.kind === 'intrusion').length
    const avgDwell =
      summaries.length > 0
        ? summaries.reduce((s, t) => s + t.dwell, 0) / summaries.length
        : 0
    const snap: AnalysisSnapshot = {
      metrics: {
        framesAnalyzed: frames.current,
        totalDetections: summaries.reduce((s, t) => s + t.frames, 0),
        uniqueTracks: summaries.length,
        workers: workerTracks.length,
        vehicles: summaries.filter((t) => t.category === 'transportation').length,
        intrusions,
        avgDwell,
        ppeComplianceEst:
          workerTracks.length > 0
            ? Math.round((vestTracks.length / workerTracks.length) * 100)
            : 0,
      },
      tracks: summaries,
      events: events.current.slice(),
      currentTime: ts,
      liveLabels: dets.map((d) => ({
        label: d.label,
        score: d.score,
        estimated: d.estimates.length > 0,
      })),
    }
    cbRef.current.onSnapshot(snap)
  }

  // Reset the engine when the video changes or the user clears the analysis.
  useEffect(() => {
    tracker.current.reset()
    monitor.current.reset()
    heat.current.reset()
    events.current = []
    frames.current = 0
    lastDets.current = []
    occupancy.current = new Map()
    draft.current = null
    redraw()
  }, [props.videoUrl, props.resetKey])

  // Detection loop.
  useEffect(() => {
    let raf = 0
    const loop = async (t: number) => {
      raf = requestAnimationFrame(loop)
      const video = videoRef.current
      const model = modelRef.current
      if (!video || !model || !video.videoWidth || busy.current) return
      const s = settingsRef.current
      if (t - lastDetectAt.current < s.detectEveryMs) return
      lastDetectAt.current = t
      busy.current = true
      try {
        const raws = await detectFrame(model, video, getProc(), {
          confidence: s.confidence,
          useWarehouseTerms: s.useWarehouseTerms,
          estimatePPE: s.estimatePPE,
        })
        const ts = video.currentTime
        const dets = tracker.current.update(raws, ts)
        lastDets.current = dets
        for (const d of dets) {
          heat.current.add(d.bbox[0] + d.bbox[2] / 2, d.bbox[1] + d.bbox[3] / 2)
        }
        const result = monitor.current.evaluate(zonesRef.current, dets, ts)
        occupancy.current = result.occupancy
        if (result.events.length) events.current.push(...result.events)
        frames.current++
        redraw()
        if (t - lastSnapAt.current > 350) {
          lastSnapAt.current = t
          pushSnapshot(ts, dets)
        }
      } catch {
        // transient frame error (e.g. seeking) — skip this tick
      } finally {
        busy.current = false
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---- Zone drawing ----
  function pointerPos(e: React.PointerEvent): { x: number; y: number } {
    const r = overlayRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function onPointerDown(e: React.PointerEvent) {
    if (!drawModeRef.current) return
    dragStart.current = pointerPos(e)
    overlayRef.current?.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return
    const p = pointerPos(e)
    draft.current = rectFromDrag(dragStart.current.x, dragStart.current.y, p.x, p.y)
    redraw()
  }
  function onPointerUp() {
    const d = draft.current
    dragStart.current = null
    draft.current = null
    const video = videoRef.current
    if (d && video && d[2] > 8 && d[3] > 8) {
      const scale = video.clientWidth / video.videoWidth
      cbRef.current.onCreateZone([d[0] / scale, d[1] / scale, d[2] / scale, d[3] / scale])
    }
    redraw()
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        src={props.videoUrl}
        controls
        playsInline
        className="block h-auto w-full"
        onLoadedMetadata={(e) => props.onDuration(e.currentTarget.duration)}
      />
      <canvas
        ref={overlayRef}
        className="absolute inset-0"
        style={{
          cursor: props.drawMode ? 'crosshair' : 'default',
          pointerEvents: props.drawMode ? 'auto' : 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  )
}
