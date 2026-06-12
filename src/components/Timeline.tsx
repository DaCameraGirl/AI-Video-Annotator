// Two read-outs from the latest snapshot: the zone-event log and the list of
// tracked objects with their dwell times.

import { AlertTriangle, LogIn } from 'lucide-react'
import type { AnalysisSnapshot } from '../types'
import { ZONE_TYPES } from '../types'
import { formatTimecode } from '../lib/format'

export interface TimelineProps {
  snap: AnalysisSnapshot | null
}

export default function Timeline({ snap }: TimelineProps) {
  const events = snap ? [...snap.events].reverse() : []
  const tracks = snap?.tracks ?? []

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-200">
          ZONE EVENT LOG <span className="text-slate-500">({events.length})</span>
        </h3>
        <ul className="scroll-thin max-h-72 space-y-1.5 overflow-y-auto">
          {events.length === 0 && (
            <li className="text-xs text-slate-500">
              No zone crossings yet. Draw a zone, then play the video.
            </li>
          )}
          {events.map((e, i) => {
            const intrusion = e.kind === 'intrusion'
            return (
              <li
                key={`${e.trackId}-${e.zoneId}-${e.ts}-${i}`}
                className="flex items-center gap-2 rounded-lg bg-slate-800/40 px-3 py-1.5 text-xs"
              >
                {intrusion ? (
                  <AlertTriangle size={13} className="shrink-0 text-rose-400" />
                ) : (
                  <LogIn size={13} className="shrink-0 text-sky-400" />
                )}
                <span className="font-mono text-slate-400">{formatTimecode(e.ts)}</span>
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ background: ZONE_TYPES[e.zoneType].color }}
                />
                <span className="text-slate-200">
                  {e.label} <span className="text-slate-500">#{e.trackId}</span>
                </span>
                <span className={`ml-auto ${intrusion ? 'font-semibold text-rose-400' : 'text-slate-400'}`}>
                  {intrusion ? 'INTRUSION' : 'enter'} → {e.zoneName}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-200">
          TRACKED OBJECTS <span className="text-slate-500">({tracks.length})</span>
        </h3>
        <ul className="scroll-thin max-h-72 space-y-1.5 overflow-y-auto">
          {tracks.length === 0 && (
            <li className="text-xs text-slate-500">Nothing tracked yet.</li>
          )}
          {tracks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-lg bg-slate-800/40 px-3 py-1.5 text-xs"
            >
              <span className="font-mono text-slate-500">#{t.id}</span>
              <span className="font-medium text-slate-200">{t.label}</span>
              {t.estimates.length > 0 && (
                <span className="rounded border border-orange-500/60 px-1 text-[10px] text-orange-300">
                  {t.estimates.join(', ')} est.
                </span>
              )}
              <span className="ml-auto text-slate-400">
                dwell {t.dwell.toFixed(1)}s · {Math.round(t.maxScore * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
