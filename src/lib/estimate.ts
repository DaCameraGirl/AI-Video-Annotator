// ---------------------------------------------------------------------------
// Heuristic PPE estimate — explicitly NOT a model detection.
//
// COCO-SSD has no "safety vest" or "hard hat" class, so we cannot truly detect
// PPE. When estimatePPE is on, we sample colors inside a worker's torso region
// and, if hi-vis colors dominate, surface "safety vest" as an ESTIMATE only.
// Every consumer of this value tags it "(est.)" so it is never mistaken for a
// confirmed detection. This is the honest version of the .txt files' color
// guessing — kept, but clearly labeled.
// ---------------------------------------------------------------------------

import type { BBox } from '../types'

/**
 * @param data    RGBA pixel buffer of the processing frame
 * @param imgW    width of that frame in pixels (stride for `data`)
 * @param imgH    height of that frame in pixels
 * @param bbox    person box in the SAME pixel space as `data`
 * @returns       e.g. ['safety vest'] or []
 */
export function estimateVest(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  bbox: BBox,
): string[] {
  const [x, y, w, h] = bbox
  // Torso = central, upper-middle slab of the person box.
  const tx0 = Math.max(0, Math.floor(x + w * 0.2))
  const tx1 = Math.min(imgW, Math.floor(x + w * 0.8))
  const ty0 = Math.max(0, Math.floor(y + h * 0.18))
  const ty1 = Math.min(imgH, Math.floor(y + h * 0.55))
  if (tx1 <= tx0 || ty1 <= ty0) return []

  let hiVis = 0
  let total = 0
  for (let py = ty0; py < ty1; py += 2) {
    for (let px = tx0; px < tx1; px += 2) {
      const i = (py * imgW + px) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      total++
      const orange = r > 185 && g > 80 && g < 185 && b < 110
      const limeYellow = r > 165 && g > 170 && b < 125
      if (orange || limeYellow) hiVis++
    }
  }
  return total > 0 && hiVis / total > 0.18 ? ['safety vest'] : []
}
