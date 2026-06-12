// Run the detector on a single video frame and return warehouse-relabeled,
// resolution-independent detections (intrinsic video pixels).

import type { ObjectDetection } from '@tensorflow-models/coco-ssd'
import type { BBox, RawDetection } from '../types'
import { mapClass } from '../lib/warehouse'
import { estimateVest } from '../lib/estimate'

/** Cap the inference resolution for speed; detections are scaled back up. */
export const MAX_PROCESS_WIDTH = 640

export interface DetectOptions {
  confidence: number
  useWarehouseTerms: boolean
  estimatePPE: boolean
}

export async function detectFrame(
  model: ObjectDetection,
  video: HTMLVideoElement,
  proc: HTMLCanvasElement,
  options: DetectOptions,
): Promise<RawDetection[]> {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return []

  const procW = Math.min(vw, MAX_PROCESS_WIDTH)
  const procH = Math.round(procW * (vh / vw))
  if (proc.width !== procW) proc.width = procW
  if (proc.height !== procH) proc.height = procH

  const ctx = proc.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.drawImage(video, 0, 0, procW, procH)

  const preds = await model.detect(proc, 20, options.confidence)
  if (preds.length === 0) return []

  const toIntrinsic = vw / procW
  const pixels =
    options.estimatePPE && preds.some((p) => p.class === 'person')
      ? ctx.getImageData(0, 0, procW, procH)
      : null

  const out: RawDetection[] = []
  for (const p of preds) {
    if (p.score < options.confidence) continue
    const { label, category } = mapClass(p.class, options.useWarehouseTerms)
    let estimates: string[] = []
    if (pixels && category === 'personnel') {
      estimates = estimateVest(pixels.data, procW, procH, p.bbox as BBox)
    }
    const bbox: BBox = [
      p.bbox[0] * toIntrinsic,
      p.bbox[1] * toIntrinsic,
      p.bbox[2] * toIntrinsic,
      p.bbox[3] * toIntrinsic,
    ]
    out.push({ label, cocoClass: p.class, category, score: p.score, bbox, estimates })
  }
  return out
}
