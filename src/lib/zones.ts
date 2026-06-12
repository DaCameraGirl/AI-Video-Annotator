// Virtual-fence zones: geometry helpers + a monitor that tracks which objects
// occupy which zones and emits enter / intrusion events once per crossing.

import type { BBox, Detection, Zone, ZoneEvent } from '../types'

export function centroid(b: BBox): { x: number; y: number } {
  return { x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 }
}

export function rectContains(rect: BBox, x: number, y: number): boolean {
  return (
    x >= rect[0] && x <= rect[0] + rect[2] && y >= rect[1] && y <= rect[1] + rect[3]
  )
}

/** Build a normalized [x,y,w,h] rect from two drag corner points. */
export function rectFromDrag(x0: number, y0: number, x1: number, y1: number): BBox {
  return [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)]
}

export class ZoneMonitor {
  /** key = `${trackId}:${zoneId}` -> currently inside? */
  private membership = new Map<string, boolean>()

  reset(): void {
    this.membership.clear()
  }

  /**
   * Per-frame evaluation. Returns live occupancy counts and any new boundary
   * events. An "intrusion" is a worker entering a Restricted zone.
   */
  evaluate(
    zones: Zone[],
    detections: Detection[],
    ts: number,
  ): { occupancy: Map<number, number>; events: ZoneEvent[] } {
    const occupancy = new Map<number, number>()
    const events: ZoneEvent[] = []
    for (const z of zones) occupancy.set(z.id, 0)

    for (const d of detections) {
      const c = centroid(d.bbox)
      for (const z of zones) {
        const key = `${d.trackId}:${z.id}`
        const inside = rectContains(z.rect, c.x, c.y)
        if (inside) {
          occupancy.set(z.id, (occupancy.get(z.id) ?? 0) + 1)
          if (!this.membership.get(key)) {
            this.membership.set(key, true)
            const kind =
              z.type === 'restricted' && d.category === 'personnel'
                ? 'intrusion'
                : 'enter'
            events.push({
              ts,
              zoneId: z.id,
              zoneName: z.name,
              zoneType: z.type,
              label: d.label,
              trackId: d.trackId,
              kind,
            })
          }
        } else if (this.membership.get(key)) {
          this.membership.set(key, false)
        }
      }
    }
    return { occupancy, events }
  }
}
