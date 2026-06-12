// KPI cards + a live "what's in this frame right now" strip, fed by the latest
// snapshot the video engine pushes up.

import type { ComponentType } from 'react'
import { Boxes, Users, Truck, ShieldAlert, Clock, HardHat } from 'lucide-react'
import type { AnalysisSnapshot } from '../types'

export interface MetricsDashboardProps {
  snap: AnalysisSnapshot | null
}

export default function MetricsDashboard({ snap }: MetricsDashboardProps) {
  const m = snap?.metrics
  const cards: {
    icon: ComponentType<{ size?: number; className?: string }>
    label: string
    value: string
    accent: string
    note?: string
  }[] = [
    { icon: Boxes, label: 'Unique objects', value: fmt(m?.uniqueTracks), accent: 'text-sky-400' },
    { icon: Users, label: 'Workers', value: fmt(m?.workers), accent: 'text-cyan-400' },
    { icon: Truck, label: 'Transport', value: fmt(m?.vehicles), accent: 'text-amber-400' },
    {
      icon: ShieldAlert,
      label: 'Zone intrusions',
      value: fmt(m?.intrusions),
      accent: m && m.intrusions > 0 ? 'text-rose-400' : 'text-slate-300',
    },
    { icon: Clock, label: 'Avg dwell', value: m ? `${m.avgDwell.toFixed(1)}s` : '—', accent: 'text-violet-400' },
    {
      icon: HardHat,
      label: 'PPE est.',
      value: m ? `${m.ppeComplianceEst}%` : '—',
      accent: 'text-emerald-400',
      note: 'estimate',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-3"
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <c.icon size={15} className={c.accent} />
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                {c.label}
              </span>
            </div>
            <div className={`text-2xl font-bold ${c.accent}`}>{c.value}</div>
            {c.note && <div className="text-[10px] text-slate-500">{c.note}</div>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">
          In frame now {snap && <span className="text-slate-500">· {snap.liveLabels.length}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!snap?.liveLabels.length && (
            <span className="text-xs text-slate-500">
              Play the video to see live detections…
            </span>
          )}
          {snap?.liveLabels.map((l, i) => (
            <span
              key={`${l.label}-${i}`}
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                l.estimated
                  ? 'border border-orange-500/60 text-orange-300'
                  : 'bg-sky-500/15 text-sky-200'
              }`}
            >
              {l.label} {Math.round(l.score * 100)}%
              {l.estimated && ' (est.)'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function fmt(n: number | undefined): string {
  return n == null ? '—' : String(n)
}
