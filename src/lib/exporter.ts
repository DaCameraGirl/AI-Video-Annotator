// Build and download analysis reports (human-readable .txt + machine .json).

import type { Metrics, Settings, TrackSummary, Zone, ZoneEvent } from '../types'
import { formatTimecode } from './format'

export interface ReportInput {
  fileName: string
  durationSec: number
  modelInfo: string
  settings: Settings
  metrics: Metrics
  tracks: TrackSummary[]
  events: ZoneEvent[]
  zones: Zone[]
}

export function buildTextReport(r: ReportInput): string {
  const L: string[] = []
  L.push('WAREHOUSE VIDEO ANALYSIS REPORT')
  L.push('AI Video Annotator Suite · DaCameraGirl')
  L.push(`Generated: ${new Date().toISOString()}`)
  L.push(`Source video: ${r.fileName || 'unknown'}`)
  L.push(`Duration: ${formatTimecode(r.durationSec)}`)
  L.push(`Detector: ${r.modelInfo}`)
  L.push(
    `Settings: confidence ${r.settings.confidence}, warehouse terms ${r.settings.useWarehouseTerms ? 'on' : 'off'}, PPE estimate ${r.settings.estimatePPE ? 'on' : 'off'}`,
  )
  L.push('')
  L.push('SUMMARY METRICS')
  L.push(`  Unique tracked objects : ${r.metrics.uniqueTracks}`)
  L.push(`  Workers                : ${r.metrics.workers}`)
  L.push(`  Transport / vehicles   : ${r.metrics.vehicles}`)
  L.push(`  Zone intrusions        : ${r.metrics.intrusions}`)
  L.push(`  Avg dwell time (s)     : ${r.metrics.avgDwell.toFixed(1)}`)
  L.push(`  Est. PPE compliance    : ${r.metrics.ppeComplianceEst}%  (heuristic estimate, not a confirmed detection)`)
  L.push('')

  L.push(`ZONES (${r.zones.length})`)
  for (const z of r.zones) {
    L.push(`  [${z.type}] ${z.name}  rect=${z.rect.map((n) => Math.round(n)).join(',')}`)
  }
  L.push('')

  L.push(`TRACKED OBJECTS (${r.tracks.length})`)
  for (const t of r.tracks) {
    const est = t.estimates.length ? `  est: ${t.estimates.join(', ')} (unconfirmed)` : ''
    L.push(
      `  #${t.id} ${t.label} · seen ${formatTimecode(t.firstTs)}–${formatTimecode(t.lastTs)} · dwell ${t.dwell.toFixed(1)}s · peak conf ${(t.maxScore * 100).toFixed(0)}%${est}`,
    )
  }
  L.push('')

  L.push(`ZONE EVENTS (${r.events.length})`)
  for (const e of r.events) {
    L.push(
      `  [${formatTimecode(e.ts)}] ${e.kind.toUpperCase()} — ${e.label} (track #${e.trackId}) → ${e.zoneName}`,
    )
  }
  L.push('')
  L.push('Note: object labels are COCO-SSD detections relabeled with approved')
  L.push('warehouse terminology. Items tagged "est." are color heuristics, not')
  L.push('confirmed model detections.')
  return L.join('\n')
}

export function buildJsonReport(r: ReportInput): string {
  return JSON.stringify(
    {
      tool: 'AI Video Annotator Suite',
      author: 'DaCameraGirl',
      generatedAt: new Date().toISOString(),
      source: { fileName: r.fileName, durationSec: r.durationSec },
      detector: r.modelInfo,
      settings: r.settings,
      metrics: r.metrics,
      zones: r.zones,
      tracks: r.tracks,
      events: r.events,
    },
    null,
    2,
  )
}

export function downloadFile(name: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
