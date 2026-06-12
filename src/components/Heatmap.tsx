// Activity heatmap control + legend. The heatmap itself is rendered on the video
// overlay (see CanvasOverlay/heatmap.ts); this panel toggles it and explains it.

import { Flame } from 'lucide-react'

export interface HeatmapProps {
  enabled: boolean
  onToggle: () => void
}

export default function Heatmap({ enabled, onToggle }: HeatmapProps) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-orange-400" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-200">
            ACTIVITY HEATMAP
          </h3>
        </div>
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={enabled}
          className={`relative h-6 w-11 rounded-full transition ${
            enabled ? 'bg-sky-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              enabled ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        Where objects spend the most time accumulates as warmer color — useful for
        spotting bottlenecks and high-traffic lanes.
      </p>
      <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-blue-700 via-emerald-500 via-yellow-400 to-rose-500" />
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-slate-500">
        <span>Low</span>
        <span>High</span>
      </div>
    </section>
  )
}
