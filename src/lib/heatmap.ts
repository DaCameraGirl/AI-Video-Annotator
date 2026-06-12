// Activity heatmap accumulator. Buckets detection centroids into a coarse grid
// (in intrinsic video space) and renders a blue->red density overlay.

import { clamp } from './format'

export class HeatmapAccumulator {
  readonly cols: number
  readonly rows: number
  private grid: Float32Array
  private max = 0
  private w = 0
  private h = 0

  constructor(cols = 64, rows = 36) {
    this.cols = cols
    this.rows = rows
    this.grid = new Float32Array(cols * rows)
  }

  setDims(w: number, h: number): void {
    this.w = w
    this.h = h
  }

  reset(): void {
    this.grid.fill(0)
    this.max = 0
  }

  get peak(): number {
    return this.max
  }

  /** Add one centroid hit (intrinsic coords). */
  add(x: number, y: number): void {
    if (this.w <= 0 || this.h <= 0) return
    const cx = clamp(Math.floor((x / this.w) * this.cols), 0, this.cols - 1)
    const cy = clamp(Math.floor((y / this.h) * this.rows), 0, this.rows - 1)
    const idx = cy * this.cols + cx
    this.grid[idx] += 1
    if (this.grid[idx] > this.max) this.max = this.grid[idx]
  }

  /** Render onto a 2D context already sized to the display. */
  render(
    ctx: CanvasRenderingContext2D,
    displayW: number,
    displayH: number,
    alpha = 0.6,
  ): void {
    if (this.max <= 0) return
    const cellW = displayW / this.cols
    const cellH = displayH / this.rows
    const prevAlpha = ctx.globalAlpha
    const prevFilter = ctx.filter
    ctx.filter = `blur(${Math.max(4, cellW * 0.4)}px)`
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const v = this.grid[r * this.cols + c]
        if (v <= 0) continue
        const t = Math.sqrt(v / this.max)
        ctx.globalAlpha = alpha * t
        ctx.fillStyle = ramp(t)
        ctx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1)
      }
    }
    ctx.globalAlpha = prevAlpha
    ctx.filter = prevFilter
  }
}

/** Blue -> cyan -> green -> yellow -> red color ramp, t in 0..1. */
function ramp(t: number): string {
  const stops: [number, [number, number, number]][] = [
    [0.0, [30, 64, 175]],
    [0.35, [6, 182, 212]],
    [0.6, [34, 197, 94]],
    [0.8, [250, 204, 21]],
    [1.0, [239, 68, 68]],
  ]
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1]
      const [t1, c1] = stops[i]
      const f = (t - t0) / (t1 - t0 || 1)
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * f)
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * f)
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * f)
      return `rgb(${r},${g},${b})`
    }
  }
  return 'rgb(239,68,68)'
}
