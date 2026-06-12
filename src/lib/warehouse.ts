// ---------------------------------------------------------------------------
// Warehouse terminology layer.
//
// The approved vocabulary and the incorrect->correct mappings below are taken
// verbatim from Angela's own terminology config in the companion repo
// DaCameraGirl/Warehouse-Annotator (config/terminology.json). The point of this
// project's annotator is to relabel what the vision model actually sees using
// THOSE approved terms — never to invent objects the model can't detect.
//
// COCO-SSD only outputs 80 generic classes (person, truck, car, keyboard, ...).
// We map a class to a warehouse term only when there is a defensible equivalent;
// otherwise the original COCO label is kept so nothing is fabricated.
// ---------------------------------------------------------------------------

import type { Category } from '../types'

/** Approved warehouse vocabulary, grouped (from terminology.json v1.0.0). */
export const APPROVED_TERMS: Record<string, string[]> = {
  'Desktop Equipment': [
    'Scale',
    'Cell phone',
    'Label printer',
    'Monitor',
    'Keyboard',
    'Scanner',
    'Tape dispenser',
  ],
  'Warehouse Machinery': [
    'Void fill machine',
    'Point of Sale Machine',
    'Bubble wrap machine',
    'Automatic conveyor belt',
    'Roller conveyor',
    'AMR (automatic mobile robot)',
  ],
  Transportation: [
    'Forklift',
    'Utility Cart',
    'Pallet Jack',
    'Automated Mobile Robot',
    'Metal Ladder',
  ],
  Storage: [
    'Wooden Pallet',
    'Metal cart with white boxes',
    'Cardboard box (fully built)',
    'Flattened cardboard box',
    'Blue Bin',
    'Tall metal shelving',
  ],
  'Recording-Related': ['Tripod', 'Clapperboard', 'Production Slate', 'Board'],
  'Clothing and Dress': [
    'T-shirt',
    'Polo shirt',
    'Long-sleeved shirt',
    'Safety Vest',
    'Safety helmet',
    'Headband',
    'Hair clip',
    'Glasses',
  ],
  Flooring: ['Anti-fatigue floor mat', 'Blue tape rectangles', 'Extension cords'],
  'Warehouse Design': ['Dock doors', 'Bay #', 'Canvas'],
  Misc: ['Trash can'],
}

/** Terms the rules forbid (gender guessing). Surfaced so the UI can prove it never uses them. */
export const BANNED_WORDS = ['man', 'woman', 'guy', 'lady']

interface Mapping {
  label: string
  category: Category
}

// Only defensible COCO -> warehouse mappings. Anything else keeps its COCO label.
const COCO_TO_WAREHOUSE: Record<string, Mapping> = {
  person: { label: 'worker', category: 'personnel' },
  truck: { label: 'Forklift', category: 'transportation' },
  car: { label: 'Utility Cart', category: 'transportation' },
  keyboard: { label: 'Keyboard', category: 'desktop' },
  laptop: { label: 'Monitor', category: 'desktop' },
  tv: { label: 'Monitor', category: 'desktop' },
  'cell phone': { label: 'Cell phone', category: 'desktop' },
  mouse: { label: 'Scanner', category: 'desktop' },
  remote: { label: 'Scanner', category: 'desktop' },
  clock: { label: 'Scale', category: 'desktop' },
  book: { label: 'Board', category: 'general' },
}

const TRANSPORT_COCO = new Set([
  'truck',
  'car',
  'bus',
  'motorcycle',
  'bicycle',
  'train',
])

function baseCategory(cocoClass: string): Category {
  if (cocoClass === 'person') return 'personnel'
  if (TRANSPORT_COCO.has(cocoClass)) return 'transportation'
  return 'general'
}

/**
 * Resolve a COCO class to a display label + category.
 * Category is always derived (so metrics work) even when warehouse terms are off.
 */
export function mapClass(
  cocoClass: string,
  useWarehouseTerms: boolean,
): { label: string; category: Category } {
  const m = COCO_TO_WAREHOUSE[cocoClass]
  const category = m?.category ?? baseCategory(cocoClass)
  const label = useWarehouseTerms && m ? m.label : cocoClass
  return { label, category }
}

export function isWorker(category: Category): boolean {
  return category === 'personnel'
}

export function isVehicle(category: Category): boolean {
  return category === 'transportation'
}

/** A short present-tense caption for one frame's detections, warehouse-styled. */
export function captionFor(labels: string[]): string {
  if (labels.length === 0) return 'No tracked objects in frame'
  const counts = new Map<string, number>()
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1)
  const parts = [...counts.entries()].map(([label, n]) =>
    n > 1 ? `${n} ${plural(label)}` : label,
  )
  const workers = parts.filter((p) => /worker/i.test(p))
  const gear = parts.filter((p) => !/worker/i.test(p))
  if (workers.length && gear.length) {
    return `${cap(workers.join(', '))} working with ${gear.join(', ')}`
  }
  return cap(parts.join(', ')) + ' in frame'
}

function plural(label: string): string {
  if (/worker$/i.test(label)) return label + 's'
  if (/(s|x|z|ch|sh)$/i.test(label)) return label + 'es'
  return label + 's'
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
