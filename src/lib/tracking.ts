// Lightweight greedy IoU tracker. Gives each object a stable id across frames so
// we can compute dwell time, paths, and unique counts. No Kalman/Hungarian — for
// browser-side warehouse footage, greedy IoU matching is robust and cheap.

import type { BBox, Category, Detection, RawDetection, TrackSummary } from '../types'
import { iou } from './format'

const MIN_IOU = 0.25
const MAX_PATH = 240

interface Track {
  id: number
  label: string
  category: Category
  firstTs: number
  lastTs: number
  frames: number
  maxScore: number
  estimates: Set<string>
  path: { x: number; y: number; ts: number }[]
  lastBbox: BBox
  labelCounts: Map<string, number>
}

export class Tracker {
  private tracks = new Map<number, Track>()
  private nextId = 1

  reset(): void {
    this.tracks.clear()
    this.nextId = 1
  }

  get size(): number {
    return this.tracks.size
  }

  /** Match this frame's raw detections to tracks and return stamped Detections. */
  update(raws: RawDetection[], ts: number): Detection[] {
    const result: Detection[] = []
    const used = new Set<number>()
    const sorted = [...raws].sort((a, b) => b.score - a.score)

    for (const det of sorted) {
      let bestId = -1
      let bestIoU = MIN_IOU
      for (const [id, tr] of this.tracks) {
        if (used.has(id) || tr.category !== det.category) continue
        const overlap = iou(tr.lastBbox, det.bbox)
        if (overlap > bestIoU) {
          bestIoU = overlap
          bestId = id
        }
      }

      let track: Track
      if (bestId >= 0) {
        track = this.tracks.get(bestId)!
        used.add(bestId)
      } else {
        const id = this.nextId++
        track = {
          id,
          label: det.label,
          category: det.category,
          firstTs: ts,
          lastTs: ts,
          frames: 0,
          maxScore: 0,
          estimates: new Set(),
          path: [],
          lastBbox: det.bbox,
          labelCounts: new Map(),
        }
        this.tracks.set(id, track)
        used.add(id)
      }

      track.lastTs = ts
      track.frames++
      track.maxScore = Math.max(track.maxScore, det.score)
      track.lastBbox = det.bbox
      for (const e of det.estimates) track.estimates.add(e)
      track.labelCounts.set(det.label, (track.labelCounts.get(det.label) ?? 0) + 1)
      track.label = majority(track.labelCounts)
      track.path.push({
        x: det.bbox[0] + det.bbox[2] / 2,
        y: det.bbox[1] + det.bbox[3] / 2,
        ts,
      })
      if (track.path.length > MAX_PATH) track.path.shift()

      result.push({
        trackId: track.id,
        label: track.label,
        cocoClass: det.cocoClass,
        category: det.category,
        score: det.score,
        bbox: det.bbox,
        estimates: det.estimates,
      })
    }
    return result
  }

  summaries(): TrackSummary[] {
    const out: TrackSummary[] = []
    for (const tr of this.tracks.values()) {
      out.push({
        id: tr.id,
        label: tr.label,
        category: tr.category,
        firstTs: tr.firstTs,
        lastTs: tr.lastTs,
        frames: tr.frames,
        dwell: Math.max(0, tr.lastTs - tr.firstTs),
        maxScore: tr.maxScore,
        estimates: [...tr.estimates],
        path: tr.path.slice(),
      })
    }
    return out.sort((a, b) => a.id - b.id)
  }
}

function majority(counts: Map<string, number>): string {
  let best = ''
  let bestN = -1
  for (const [label, n] of counts) {
    if (n > bestN) {
      bestN = n
      best = label
    }
  }
  return best
}
