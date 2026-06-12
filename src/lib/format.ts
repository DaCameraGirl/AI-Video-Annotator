/** Small formatting + math helpers shared across the app. */

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${pad(mins, 2)}:${pad(secs, 2)}.${pad(ms, 3)}`
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${pad(mins, 1)}:${pad(secs, 2)}`
}

export function pad(n: number, width: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(width, '0')
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Intersection-over-union of two [x,y,w,h] boxes. */
export function iou(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
): number {
  const ax2 = a[0] + a[2]
  const ay2 = a[1] + a[3]
  const bx2 = b[0] + b[2]
  const by2 = b[1] + b[3]
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a[0], b[0]))
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a[1], b[1]))
  const inter = ix * iy
  if (inter <= 0) return 0
  const union = a[2] * a[3] + b[2] * b[3] - inter
  return union > 0 ? inter / union : 0
}

export function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
