// Virtual-fence manager: pick a zone type, toggle draw mode, review zones with
// their live event counts, and save/load the whole layout locally.

import { Pencil, Trash2, Save, FolderOpen, X, ShieldAlert } from 'lucide-react'
import type { Zone, ZoneEvent, ZoneTypeKey } from '../types'
import { ZONE_TYPES } from '../types'
import type { ProjectRecord } from '../lib/db'

export interface ZoneEditorProps {
  zones: Zone[]
  events: ZoneEvent[]
  drawMode: boolean
  pendingType: ZoneTypeKey
  hasVideo: boolean
  savedProjects: ProjectRecord[]
  onPendingType: (t: ZoneTypeKey) => void
  onToggleDraw: () => void
  onDelete: (id: number) => void
  onClear: () => void
  onSaveLayout: () => void
  onLoadLayout: (id: number) => void
  onDeleteLayout: (id: number) => void
}

export default function ZoneEditor(p: ZoneEditorProps) {
  const zoneKeys = Object.keys(ZONE_TYPES) as ZoneTypeKey[]
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert size={18} className="text-sky-400" />
        <h3 className="text-sm font-semibold tracking-wide text-slate-200">
          VIRTUAL FENCE ZONES
        </h3>
      </div>

      <label className="mb-1 block text-xs text-slate-400">Zone type</label>
      <div className="mb-3 grid grid-cols-1 gap-1.5">
        {zoneKeys.map((key) => {
          const z = ZONE_TYPES[key]
          const active = p.pendingType === key
          return (
            <button
              key={key}
              onClick={() => p.onPendingType(key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                active
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: z.color }}
              />
              <span className="font-medium text-slate-200">{z.name}</span>
              <span className="ml-auto text-xs text-slate-500">{z.desc}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={p.onToggleDraw}
        disabled={!p.hasVideo}
        className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
          p.drawMode
            ? 'bg-sky-500 text-slate-950'
            : 'bg-slate-700 text-slate-100 hover:bg-slate-600'
        }`}
      >
        <Pencil size={15} />
        {p.drawMode ? 'Drawing… click-drag on video' : 'Draw a zone'}
      </button>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">
          Zones ({p.zones.length})
        </span>
        {p.zones.length > 0 && (
          <button
            onClick={p.onClear}
            className="text-xs text-slate-500 hover:text-rose-400"
          >
            Clear all
          </button>
        )}
      </div>

      <ul className="scroll-thin max-h-44 space-y-1.5 overflow-y-auto">
        {p.zones.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-center text-xs text-slate-500">
            No zones yet. Pick a type and draw one on the video.
          </li>
        )}
        {p.zones.map((z) => {
          const evts = p.events.filter((e) => e.zoneId === z.id)
          const intr = evts.filter((e) => e.kind === 'intrusion').length
          return (
            <li
              key={z.id}
              className="flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-sm"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: ZONE_TYPES[z.type].color }}
              />
              <span className="truncate font-medium text-slate-200">{z.name}</span>
              <span className="ml-auto whitespace-nowrap text-xs text-slate-400">
                {evts.length} evt{intr > 0 && <span className="text-rose-400"> · {intr} ⚠</span>}
              </span>
              <button
                onClick={() => p.onDelete(z.id)}
                className="text-slate-500 hover:text-rose-400"
                aria-label="Delete zone"
              >
                <Trash2 size={14} />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 border-t border-slate-700/60 pt-4">
        <div className="mb-2 text-xs font-medium text-slate-400">Saved layouts</div>
        <button
          onClick={p.onSaveLayout}
          disabled={p.zones.length === 0}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={14} /> Save current layout
        </button>
        <ul className="scroll-thin max-h-28 space-y-1 overflow-y-auto">
          {p.savedProjects.map((proj) => (
            <li
              key={proj.id}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800/60"
            >
              <button
                onClick={() => proj.id != null && p.onLoadLayout(proj.id)}
                className="flex flex-1 items-center gap-1.5 truncate text-left"
              >
                <FolderOpen size={12} className="text-sky-400" />
                <span className="truncate">{proj.name}</span>
                <span className="ml-auto text-slate-600">{proj.zones.length}z</span>
              </button>
              <button
                onClick={() => proj.id != null && p.onDeleteLayout(proj.id)}
                className="text-slate-600 hover:text-rose-400"
                aria-label="Delete layout"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
