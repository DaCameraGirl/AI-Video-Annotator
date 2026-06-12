// Pure canvas drawing for the live overlay: detection boxes, virtual-fence
// zones, track trails, the heatmap, and the in-progress zone rectangle.
// No React here — VideoPlayer calls drawOverlay() on each detection tick.

import type {
  BBox,
  Category,
  Detection,
  Settings,
  TrackSummary,
  Zone,
} from '../types'
import { ZONE_TYPES } from '../types'
import type { HeatmapAccumulator } from '../lib/heatmap'

const CATEGORY_COLOR: Record<Category, string> = {
  personnel: '#22d3ee',
  transportation: '#f59e0b',
  machinery: '#a855f7',
  storage: '#3b82f6',
  desktop: '#94a3b8',
  safety: '#10b981',
  general: '#cbd5e1',
}

export interface DrawArgs {
  ctx: CanvasRenderingContext2D
  cssW: number
  cssH: number
  /** intrinsic video px -> CSS px */
  scale: number
  settings: Settings
  detections: Detection[]
  zones: Zone[]
  occupancy: Map<number, number>
  paths: TrackSummary[]
  heatmap: HeatmapAccumulator
  /** zone being drawn, in CSS px */
  draft: BBox | null
}

export function drawOverlay(a: DrawArgs): void {
  const { ctx, cssW, cssH, scale } = a
  ctx.clearRect(0, 0, cssW, cssH)

  if (a.settings.showHeatmap) a.heatmap.render(ctx, cssW, cssH, 0.6)
  if (a.settings.showZones) {
    for (const z of a.zones) drawZone(ctx, z, scale, a.occupancy.get(z.id) ?? 0)
  }
  if (a.settings.showTracks) {
    for (const t of a.paths) drawPath(ctx, t, scale)
  }
  if (a.settings.showBoxes) {
    for (const d of a.detections) drawBox(ctx, d, scale)
  }
  if (a.draft) drawDraft(ctx, a.draft)
}

function drawBox(ctx: CanvasRenderingContext2D, d: Detection, s: number): void {
  const x = d.bbox[0] * s
  const y = d.bbox[1] * s
  const w = d.bbox[2] * s
  const h = d.bbox[3] * s
  const color = CATEGORY_COLOR[d.category]
  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.strokeRect(x, y, w, h)

  const conf = `${Math.round(d.score * 100)}%`
  const estTag = d.estimates.length ? ` · ${d.estimates.join(', ')} (est.)` : ''
  chip(ctx, `#${d.trackId} ${d.label} ${conf}${estTag}`, x, y, color, d.estimates.length > 0)
}

function drawZone(
  ctx: CanvasRenderingContext2D,
  z: Zone,
  s: number,
  occ: number,
): void {
  const color = ZONE_TYPES[z.type].color
  const x = z.rect[0] * s
  const y = z.rect[1] * s
  const w = z.rect[2] * s
  const h = z.rect[3] * s
  const intruded = z.type === 'restricted' && occ > 0
  ctx.save()
  ctx.lineWidth = intruded ? 3 : 2
  ctx.setLineDash([8, 5])
  ctx.strokeStyle = color
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])
  ctx.globalAlpha = intruded ? 0.22 : 0.1
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
  ctx.restore()
  const label = `${z.name}${occ > 0 ? `  ·  ${occ}` : ''}${intruded ? '  ⚠' : ''}`
  chip(ctx, label, x, y, color, false)
}

function drawPath(ctx: CanvasRenderingContext2D, t: TrackSummary, s: number): void {
  if (t.path.length < 2) return
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1.5
  ctx.strokeStyle = CATEGORY_COLOR[t.category]
  ctx.beginPath()
  ctx.moveTo(t.path[0].x * s, t.path[0].y * s)
  for (let i = 1; i < t.path.length; i++) ctx.lineTo(t.path[i].x * s, t.path[i].y * s)
  ctx.stroke()
  ctx.restore()
}

function drawDraft(ctx: CanvasRenderingContext2D, rect: BBox): void {
  ctx.save()
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.strokeStyle = '#f8fafc'
  ctx.strokeRect(rect[0], rect[1], rect[2], rect[3])
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(rect[0], rect[1], rect[2], rect[3])
  ctx.restore()
}

function chip(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  dashed: boolean,
): void {
  ctx.save()
  ctx.font = '600 12px Inter, system-ui, sans-serif'
  const padX = 6
  const tw = ctx.measureText(text).width
  const chipH = 18
  const cy = y - chipH - 2 < 0 ? y + 2 : y - chipH - 2
  ctx.globalAlpha = 0.92
  ctx.fillStyle = dashed ? '#0b0d12' : color
  ctx.fillRect(x, cy, tw + padX * 2, chipH)
  if (dashed) {
    ctx.globalAlpha = 1
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.strokeRect(x, cy, tw + padX * 2, chipH)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = dashed ? color : '#08121a'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padX, cy + chipH / 2 + 0.5)
  ctx.restore()
}
