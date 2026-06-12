// COCO-SSD loader (singleton). Loads TensorFlow.js, picks the WebGL backend when
// available, then the lite MobileNet-v2 detector — the fast variant that keeps
// live frame-by-frame inference responsive in the browser.

import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import type { ModelStatus } from '../types'

type StatusFn = (status: ModelStatus, detail?: string) => void

let model: cocoSsd.ObjectDetection | null = null
let inflight: Promise<cocoSsd.ObjectDetection> | null = null

export function currentModel(): cocoSsd.ObjectDetection | null {
  return model
}

export async function loadModel(onStatus?: StatusFn): Promise<cocoSsd.ObjectDetection> {
  if (model) return model
  if (inflight) return inflight

  onStatus?.('loading', 'Starting TensorFlow.js…')
  inflight = (async () => {
    try {
      await tf.ready()
      try {
        await tf.setBackend('webgl')
      } catch {
        // WebGL unavailable — tfjs falls back to CPU automatically.
      }
      await tf.ready()
      onStatus?.('loading', `Loading detector (backend: ${tf.getBackend()})…`)
      const loaded = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
      model = loaded
      onStatus?.('ready', `Detector ready · ${tf.getBackend()} backend`)
      return loaded
    } catch (err) {
      inflight = null
      const message = err instanceof Error ? err.message : String(err)
      onStatus?.('error', message)
      throw err
    }
  })()

  return inflight
}
